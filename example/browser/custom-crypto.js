import { storageKey, seal, open, verifyReceipt as checkReceipt } from './secret-crypto.js';
import { bytes, encode, decode, transferAAD, transferInfo } from '../secret-wire.js';
import * as custom from '../custom-primitives.js';
export { storageKey, seal, open };
const wrapAAD = (context, publicKey) =>
  bytes(['reference-custom-x-key-v1', context.origin, context.appId, context.userId, publicKey]);
export function isExchangeKey(exchange) {
  return (
    exchange?.version === 2 &&
    typeof exchange.wrapped === 'string' &&
    typeof exchange.iv === 'string' &&
    typeof exchange.publicKey === 'string'
  );
}
export async function exchangeKey(aes, context) {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  try {
    const publicKey = encode(custom.publicKey(secret));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: wrapAAD(context, publicKey) },
      aes,
      secret,
    );
    return { version: 2, publicKey, iv: encode(iv), wrapped: encode(wrapped) };
  } finally {
    secret.fill(0);
  }
}
export async function envelope(plain, exchange, provider, context, operationId, revision, aes) {
  const input = {
    version: 2,
    manifest: {
      ...context,
      operationId,
      target: 'own-card',
      purpose: 'card-number-check',
      itemRevision: revision,
    },
    providerKeyId: provider.providerKeyId,
    clientPublicKey: exchange.publicKey,
    salt: encode(crypto.getRandomValues(new Uint8Array(32))),
    iv: encode(crypto.getRandomValues(new Uint8Array(12))),
  };
  let secret, shared, key;
  try {
    secret = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: decode(exchange.iv, 12),
          additionalData: wrapAAD(context, exchange.publicKey),
        },
        aes,
        decode(exchange.wrapped, 48),
      ),
    );
    shared = custom.sharedSecret(secret, decode(provider.publicKey, 32));
    key = custom.deriveKey(shared, decode(input.salt, 32), transferInfo(input));
    input.ciphertext = encode(custom.encrypt(plain, transferAAD(input), decode(input.iv, 12), key));
    return input;
  } finally {
    secret?.fill(0);
    shared?.fill(0);
    key?.fill(0);
  }
}
export function verifyReceipt(receipt, keys, context, pending) {
  return checkReceipt(receipt, keys, context, pending, custom.verifyRecord);
}
