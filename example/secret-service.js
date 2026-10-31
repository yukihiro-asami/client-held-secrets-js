import {
  createHash,
  createPublicKey,
  diffieHellman,
  hkdfSync,
  createDecipheriv,
  sign,
  timingSafeEqual,
} from 'node:crypto';
import {
  bytes,
  encode,
  decode,
  exact,
  uuid,
  validateEnvelope,
  transferAAD,
  transferInfo,
  validCard,
} from './secret-wire.js';
import * as custom from './custom-primitives.js';
import { publicRaw } from './secret-keys.js';
export class SecretError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
}
const response = (row) => ({
  payload: encode(row.receipt_payload),
  signature: encode(row.signature),
});
export class SecretService {
  constructor(pool, keys, origin, mode = 'webcrypto') {
    this.pool = pool;
    this.keys = keys;
    this.origin = origin;
    this.mode = mode;
  }
  async ready() {
    await this.pool.query('SELECT id FROM roster.secret_use_records_pii LIMIT 0');
  }
  publicKeys() {
    return {
      providerKeyId: this.keys.transferId,
      publicKey: publicRaw(this.keys.transfer),
      receiptKeys: this.keys.receiptKeys,
    };
  }
  context(identity) {
    return { appId: identity.appId, userId: identity.userId, origin: this.origin };
  }
  async result(input, identity) {
    if (!exact(input, ['operationId']) || !uuid(input.operationId)) {
      throw new SecretError('invalid_request');
    }
    const { rows } = await this.pool.query(
      'SELECT receipt_payload, signature FROM roster.secret_use_records_pii WHERE app_id=$1 AND user_id_pii=$2 AND operation_id=$3',
      [identity.appId, identity.userId, input.operationId],
    );
    return rows.length ? response(rows[0]) : { status: 'not_found' };
  }
  async use(input, raw, identity) {
    try {
      validateEnvelope(input, this.context(identity), this.mode === 'custom' ? 2 : 1);
    } catch {
      throw new SecretError('invalid_secret_request');
    }
    if (input.providerKeyId !== this.keys.transferId) {
      throw new SecretError('provider_key_changed', 409);
    }
    const hash = createHash('sha512').update(raw).digest();
    const m = input.manifest;
    const db = await this.pool.connect();
    let shared, key, plain, encrypted, head;
    try {
      await db.query('BEGIN');
      // Transaction-scoped lock also serializes the first insertion. Hash collisions only serialize unrelated requests.
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        JSON.stringify([identity.appId, identity.userId, m.operationId]),
      ]);
      const existing = await db.query(
        'SELECT request_hash, receipt_payload, signature FROM roster.secret_use_records_pii WHERE app_id=$1 AND user_id_pii=$2 AND operation_id=$3',
        [identity.appId, identity.userId, m.operationId],
      );
      if (existing.rows.length) {
        const row = existing.rows[0];
        if (!timingSafeEqual(hash, row.request_hash)) {
          throw new SecretError('operation_conflict', 409);
        }
        await db.query('COMMIT');
        return response(row);
      }
      try {
        if (this.mode === 'custom') {
          const jwk = this.keys.transfer.export({ format: 'jwk' });
          const secret = decode(jwk.d, 32);
          try {
            shared = custom.sharedSecret(secret, decode(input.clientPublicKey, 32));
            key = custom.deriveKey(shared, decode(input.salt, 32), transferInfo(input));
            encrypted = decode(input.ciphertext);
            plain = custom.decrypt(encrypted, transferAAD(input), decode(input.iv, 12), key);
          } finally {
            secret.fill(0);
          }
        } else {
          const publicKey = createPublicKey({
            key: { kty: 'OKP', crv: 'X25519', x: input.clientPublicKey },
            format: 'jwk',
          });
          shared = diffieHellman({ privateKey: this.keys.transfer, publicKey });
          if (shared.every((v) => v === 0)) {
            throw new Error('zero');
          }
          key = Buffer.from(
            hkdfSync('sha512', shared, decode(input.salt, 32), transferInfo(input), 32),
          );
          shared.fill(0);
          encrypted = Buffer.from(decode(input.ciphertext));
          const decipher = createDecipheriv('aes-256-gcm', key, decode(input.iv, 12));
          decipher.setAAD(transferAAD(input));
          decipher.setAuthTag(encrypted.subarray(-16));
          head = decipher.update(encrypted.subarray(0, -16));
          plain = Buffer.concat([head, decipher.final()]);
          head.fill(0);
        }
        if (!validCard(plain)) {
          throw new Error('format');
        }
      } catch {
        throw new SecretError('invalid_secret_envelope');
      }
      // Allocate before signing: the signature covers the final database identifier.
      const { rows: ids } = await db.query(
        "SELECT nextval(pg_get_serial_sequence('roster.secret_use_records_pii', 'id'))::text AS id",
      );
      const id = ids[0].id;
      const payload = Buffer.from(
        bytes([
          'rainfrog-secret-receipt-v1',
          id,
          identity.appId,
          identity.userId,
          m.operationId,
          'own-card',
          'card-number-check',
          m.itemRevision,
          new Date().toISOString(),
          'format-checked',
          this.keys.signingId,
        ]),
      );
      let signature;
      if (this.mode === 'custom') {
        const seed = decode(this.keys.signing.export({ format: 'jwk' }).d, 32);
        try {
          signature = Buffer.from(custom.signRecord(payload, seed));
        } finally {
          seed.fill(0);
        }
      } else {
        signature = sign(null, payload, this.keys.signing);
      }
      await db.query(
        'INSERT INTO roster.secret_use_records_pii (id, app_id, user_id_pii, operation_id, request_hash, receipt_payload, signature, signing_key_id) OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          id,
          identity.appId,
          identity.userId,
          m.operationId,
          hash,
          payload,
          signature,
          this.keys.signingId,
        ],
      );
      await db.query('COMMIT');
      return response({ receipt_payload: payload, signature });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      shared?.fill(0);
      key?.fill(0);
      plain?.fill(0);
      head?.fill(0);
      encrypted?.fill(0);
      hash.fill(0);
      db.release();
    }
  }
}
