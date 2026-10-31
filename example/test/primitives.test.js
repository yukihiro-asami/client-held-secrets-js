import test from 'node:test';
import assert from 'node:assert/strict';
import {
  randomBytes,
  generateKeyPairSync,
  diffieHellman,
  createPublicKey,
  hkdfSync,
  createCipheriv,
  sign,
} from 'node:crypto';
import * as custom from '../custom-primitives.js';
import { encode, decode, cardBytes, bytes, validateEnvelope } from '../secret-wire.js';
import {
  storageKey,
  seal,
  open,
  envelope as webEnvelope,
  exchangeKey as webExchange,
  verifyReceipt,
} from '../browser/secret-crypto.js';
import { exchangeKey, envelope, verifyReceipt as customVerify } from '../browser/custom-crypto.js';
const context = { origin: 'http://127.0.0.1:3130', appId: 'test', userId: 'demo-user' };

test('custom X25519, HKDF, ChaCha20-Poly1305 and Ed25519 agree with Node', () => {
  const peer = generateKeyPairSync('x25519');
  const d = decode(peer.privateKey.export({ format: 'jwk' }).d, 32);
  const pk = decode(peer.publicKey.export({ format: 'jwk' }).x, 32);
  assert.deepEqual(custom.publicKey(d), pk);
  const own = randomBytes(32);
  const ownPublic = custom.publicKey(own);
  const shared = custom.sharedSecret(own, pk);
  const nativeShared = diffieHellman({
    privateKey: peer.privateKey,
    publicKey: createPublicKey({
      key: { kty: 'OKP', crv: 'X25519', x: encode(ownPublic) },
      format: 'jwk',
    }),
  });
  assert.deepEqual(Buffer.from(shared), nativeShared);
  const salt = randomBytes(32),
    info = bytes(['purpose', 'test']);
  const key = custom.deriveKey(shared, salt, info);
  assert.deepEqual(Buffer.from(key), Buffer.from(hkdfSync('sha512', shared, salt, info, 32)));
  const plain = cardBytes('4242424242424242'),
    aad = bytes(['target']),
    iv = randomBytes(12);
  const encrypted = custom.encrypt(plain, aad, iv, key);
  const cipher = createCipheriv('chacha20-poly1305', key, iv, { authTagLength: 16 });
  cipher.setAAD(aad, { plaintextLength: plain.length });
  const expected = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  assert.deepEqual(Buffer.from(encrypted), expected);
  assert.deepEqual(custom.decrypt(encrypted, aad, iv, key), plain);
  encrypted[0] ^= 1;
  assert.throws(() => custom.decrypt(encrypted, aad, iv, key), /invalid_tag/);
  const signing = generateKeyPairSync('ed25519');
  const seed = decode(signing.privateKey.export({ format: 'jwk' }).d, 32);
  const signature = custom.signRecord(info, seed);
  assert.deepEqual(Buffer.from(signature), sign(null, info, signing.privateKey));
  const signingPublic = decode(signing.publicKey.export({ format: 'jwk' }).x, 32);
  assert.equal(custom.verifyRecord(signature, info, signingPublic), true);
  signature[0] ^= 1;
  assert.equal(custom.verifyRecord(signature, info, signingPublic), false);
  for (const b of [d, own, shared, key, plain, seed]) b.fill(0);
});

test('non-extractable storage, wrapped custom key, suite and identity separation', async () => {
  const aes = await storageKey();
  await assert.rejects(crypto.subtle.exportKey('raw', aes));
  const plain = cardBytes('4242 4242 4242 4242');
  const card = await seal(plain, aes, context, 1, 1);
  assert.deepEqual(await open(card, aes, context), plain);
  await assert.rejects(open(card, aes, { ...context, userId: 'other' }));
  const exchange = await exchangeKey(aes, context);
  assert.equal(typeof exchange.wrapped, 'string');
  assert.equal(exchange.privateKey, undefined);
  const provider = {
    providerKeyId: 'p1',
    publicKey: generateKeyPairSync('x25519').publicKey.export({ format: 'jwk' }).x,
  };
  const id = crypto.randomUUID();
  const input = await envelope(plain, exchange, provider, context, id, 1, aes);
  validateEnvelope(input, context, 2);
  assert.throws(() => validateEnvelope(input, context, 1));
  await assert.rejects(
    envelope(plain, exchange, provider, { ...context, userId: 'other' }, id, 1, aes),
  );
  await assert.rejects(
    envelope(
      plain,
      exchange,
      { ...provider, publicKey: encode(new Uint8Array(32)) },
      context,
      id,
      1,
      aes,
    ),
  );
  const web = await webEnvelope(plain, await webExchange(), provider, context, id, 1);
  validateEnvelope(web, context, 1);
  assert.throws(() => validateEnvelope(web, context, 2));
});

test('both receipt verifiers bind record to user and operation', async () => {
  const signing = generateKeyPairSync('ed25519');
  const pending = { operationId: crypto.randomUUID(), itemRevision: 2 };
  const payload = bytes([
    'rainfrog-secret-receipt-v1',
    '1',
    context.appId,
    context.userId,
    pending.operationId,
    'own-card',
    'card-number-check',
    2,
    new Date().toISOString(),
    'format-checked',
    's1',
  ]);
  const keys = { s1: signing.publicKey.export({ format: 'jwk' }).x };
  const receipt = {
    payload: encode(payload),
    signature: encode(
      custom.signRecord(payload, decode(signing.privateKey.export({ format: 'jwk' }).d, 32)),
    ),
  };
  for (const verify of [verifyReceipt, customVerify]) {
    assert.equal((await verify(receipt, keys, context, pending)).recordId, '1');
    await assert.rejects(verify(receipt, keys, { ...context, userId: 'other' }, pending));
    await assert.rejects(
      verify(receipt, keys, context, { ...pending, operationId: crypto.randomUUID() }),
    );
    const altered = decode(receipt.signature);
    altered[0] ^= 1;
    await assert.rejects(
      verify({ ...receipt, signature: encode(altered) }, keys, context, pending),
    );
  }
});
