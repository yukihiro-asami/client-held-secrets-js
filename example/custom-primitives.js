// Adapter only: vendored cryptographic modules remain unchanged.
import { scalarmultCurve25519 } from './vendor/cryptos-js/src/curve25519/x25519/scalarmult-curve25519.js';
import { scalarmultCurve25519Base } from './vendor/cryptos-js/src/curve25519/x25519/scalarmult-curve25519-base.js';
import { hkdfSha512Extract } from './vendor/cryptos-js/src/crypto/sha512/hkdf-sha512-extract.js';
import { hkdfSha512Expand } from './vendor/cryptos-js/src/crypto/sha512/hkdf-sha512-expand.js';
import { chacha20poly1305Encrypt } from './vendor/cryptos-js/src/crypto/chacha20poly1305/chacha20poly1305-encrypt.js';
import { chacha20poly1305Decrypt } from './vendor/cryptos-js/src/crypto/chacha20poly1305/chacha20poly1305-decrypt.js';
import { keyPair } from './vendor/cryptos-js/src/curve25519/ed25519/key-pair.js';
import { signDetached } from './vendor/cryptos-js/src/curve25519/ed25519/sign-detached.js';
import { verifyDetached } from './vendor/cryptos-js/src/curve25519/ed25519/verify-detached.js';

const toBytes = (n) =>
  Uint8Array.from({ length: 32 }, (_, i) => Number((n >> BigInt(i * 8)) & 255n));
export function publicKey(secret) {
  const n = secret.reduceRight((n, byte) => (n << 8n) | BigInt(byte), 0n);
  return toBytes(scalarmultCurve25519Base(n));
}
export function sharedSecret(secret, peer) {
  const shared = toBytes(scalarmultCurve25519(secret, peer));
  if (shared.every((v) => v === 0)) {
    throw new Error('zero_shared_secret');
  }
  return shared;
}
export function deriveKey(shared, salt, info) {
  const prk = new Uint8Array(64);
  const key = new Uint8Array(32);
  try {
    hkdfSha512Extract(prk, salt, shared);
    hkdfSha512Expand(key, info, prk);
    return key;
  } finally {
    prk.fill(0);
  }
}
export function encrypt(plain, aad, nonce, key) {
  const encrypted = new Uint8Array(plain.length + 16);
  if (chacha20poly1305Encrypt(encrypted, plain, aad, nonce, key) !== 0) {
    throw new Error('encryption_failed');
  }
  return encrypted;
}
export function decrypt(encrypted, aad, nonce, key) {
  const plain = new Uint8Array(encrypted.length - 16);
  if (chacha20poly1305Decrypt(plain, encrypted, aad, nonce, key) !== 0) {
    plain.fill(0);
    throw new Error('invalid_tag');
  }
  return plain;
}
export function signRecord(payload, seed) {
  const pk = new Uint8Array(32);
  const sk = new Uint8Array(64);
  try {
    keyPair(pk, sk, seed);
    const signature = new Uint8Array(64);
    if (signDetached(signature, payload, sk) !== 0) {
      throw new Error('signature_failed');
    }
    return signature;
  } finally {
    sk.fill(0);
  }
}
export function verifyRecord(signature, payload, pk) {
  return verifyDetached(signature, payload, pk) === 0;
}
