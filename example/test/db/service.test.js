import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { createPool } from '../../pool.js';
import * as web from '../../browser/secret-crypto.js';
import * as custom from '../../browser/custom-crypto.js';
import { SecretService } from '../../secret-service.js';
import { publicRaw } from '../../secret-keys.js';
import { cardBytes, encode, decode } from '../../secret-wire.js';
import { envelope, exchangeKey, verifyReceipt } from '../../browser/secret-crypto.js';
import { secretRoute } from '../../server.js';

assert.equal(process.env.PGDATABASE, 'rainfrog_secret_reference_test');

for (const [mode, adapter] of [
  ['webcrypto', web],
  ['custom', custom],
]) {
  test(`${mode}: PostgreSQL concurrency, scope, tampering and receipt persistence`, async () => {
    const pool = createPool();
    const admin = createPool();
    const transfer = generateKeyPairSync('x25519').privateKey;
    const signing = generateKeyPairSync('ed25519').privateKey;
    const keys = {
      transfer,
      signing,
      transferId: 'transfer-1',
      signingId: 'receipt-1',
      receiptKeys: { 'receipt-1': publicRaw(signing) },
    };
    const context = {
      origin: 'https://roster.example',
      appId: 'test-roster',
      userId: randomUUID(),
    };
    const service = new SecretService(pool, keys, context.origin, mode);
    const aes = await web.storageKey();
    const exchange = await adapter.exchangeKey(aes, context);
    const plain = cardBytes('4242 4242 4242 4242');
    const make = () =>
      adapter.envelope(plain, exchange, service.publicKeys(), context, randomUUID(), 1, aes);
    const use = (input) => service.use(input, Buffer.from(JSON.stringify(input)), context);
    try {
      await service.ready();
      const input = await make();
      const results = await Promise.all(Array.from({ length: 8 }, () => use(input)));
      assert.ok(results.every((result) => JSON.stringify(result) === JSON.stringify(results[0])));
      const verified = await adapter.verifyReceipt(
        results[0],
        keys.receiptKeys,
        context,
        input.manifest,
      );
      assert.match(verified.recordId, /^[1-9][0-9]*$/);
      const reopened = new SecretService(pool, keys, context.origin, mode);
      assert.deepEqual(
        await reopened.result({ operationId: input.manifest.operationId }, context),
        results[0],
      );
      const newSigning = generateKeyPairSync('ed25519').privateKey;
      const rotated = new SecretService(
        pool,
        {
          ...keys,
          transfer: generateKeyPairSync('x25519').privateKey,
          transferId: 'transfer-2',
          signing: newSigning,
          signingId: 'receipt-2',
          receiptKeys: { ...keys.receiptKeys, 'receipt-2': publicRaw(newSigning) },
        },
        context.origin,
        mode,
      );
      const oldReceipt = await rotated.result({ operationId: input.manifest.operationId }, context);
      await adapter.verifyReceipt(
        oldReceipt,
        rotated.publicKeys().receiptKeys,
        context,
        input.manifest,
      );
      await assert.rejects(
        rotated.use(input, Buffer.from(JSON.stringify(input)), context),
        /provider_key_changed/,
      );
      for (const identity of [
        { ...context, userId: 'other' },
        { ...context, appId: 'other' },
      ]) {
        assert.deepEqual(
          await service.result({ operationId: input.manifest.operationId }, identity),
          { status: 'not_found' },
        );
        await assert.rejects(
          service.use(input, Buffer.from(JSON.stringify(input)), identity),
          /invalid_secret_request/,
        );
      }
      await assert.rejects(
        service.use(input, Buffer.from(JSON.stringify(input, null, 2)), context),
        /operation_conflict/,
      );
      for (const mutate of [
        (value) => {
          value.manifest.purpose = 'payment';
        },
        (value) => {
          value.manifest.origin = 'https://other.example';
        },
        (value) => {
          value.providerKeyId = 'old';
        },
        (value) => {
          value.clientPublicKey = encode(new Uint8Array(32));
        },
        (value) => {
          const bytes = decode(value.ciphertext);
          bytes[0] ^= 1;
          value.ciphertext = encode(bytes);
        },
        (value) => {
          const bytes = decode(value.ciphertext);
          bytes[bytes.length - 1] ^= 1;
          value.ciphertext = encode(bytes);
        },
        (value) => {
          value.manifest.itemRevision += 1;
        },
      ]) {
        const bad = await make();
        mutate(bad);
        await assert.rejects(use(bad));
      }
      // Keep shape and authenticated identity consistent so rejection reaches AEAD verification.
      const movedOperation = await make();
      movedOperation.manifest.operationId = randomUUID();
      await assert.rejects(use(movedOperation), /invalid_secret_envelope/);
      const movedUser = await make();
      const otherIdentity = { ...context, userId: randomUUID() };
      movedUser.manifest.userId = otherIdentity.userId;
      await assert.rejects(
        service.use(movedUser, Buffer.from(JSON.stringify(movedUser)), otherIdentity),
        /invalid_secret_envelope/,
      );
      assert.deepEqual(
        await service.result({ operationId: movedUser.manifest.operationId }, otherIdentity),
        { status: 'not_found' },
      );
      const row = (
        await admin.query('SELECT * FROM roster.secret_use_records_pii WHERE user_id_pii=$1', [
          context.userId,
        ])
      ).rows;
      assert.equal(row.length, 1);
      assert.equal(row[0].request_hash.length, 64);
      const record = JSON.stringify(row) + row[0].receipt_payload.toString('utf8');
      assert.ok(!record.includes('4242424242424242'));
      assert.ok(!record.includes('4242'));
      assert.ok(!record.includes(input.ciphertext));
      assert.ok(!record.includes(input.clientPublicKey));
      const route = secretRoute(service, 'use');
      const raw = Buffer.from(JSON.stringify(input));
      await assert.rejects(route.handle({ identity: { ...context, userId: 'other' }, body: raw }), {
        status: 403,
      });
      assert.ok(raw.every((byte) => byte === 0));
      await assert.rejects(
        route.handle({ identity: { ...context, userId: 'demo-user' }, body: Buffer.alloc(8193) }),
        { status: 413 },
      );
      console.log(
        'Verified one persistent signed receipt for eight concurrent requests; rejected altered envelopes and foreign identities.',
      );
    } finally {
      plain.fill(0);
      await admin.query('DELETE FROM roster.secret_use_records_pii WHERE user_id_pii=$1', [
        context.userId,
      ]);
      await pool.end();
      await admin.end();
    }
  });
}
