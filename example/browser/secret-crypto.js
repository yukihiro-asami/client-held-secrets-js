import {
  encode,
  decode,
  storageAAD,
  transferAAD,
  transferInfo,
  validCard,
} from '../secret-wire.js';

export async function storageKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function exchangeKey() {
  const pair = await crypto.subtle.generateKey('X25519', false, ['deriveBits']);
  return {
    privateKey: pair.privateKey,
    publicKey: encode(await crypto.subtle.exportKey('raw', pair.publicKey)),
  };
}
export async function seal(plain, key, context, generation, revision) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: storageAAD(context, generation, revision),
      tagLength: 128,
    },
    key,
    plain,
  );
  return {
    version: 1,
    storageKeyGeneration: generation,
    itemRevision: revision,
    iv: encode(iv),
    ciphertext: encode(ciphertext),
  };
}
export async function open(card, key, context) {
  if (
    !card ||
    card.version !== 1 ||
    !Number.isSafeInteger(card.storageKeyGeneration) ||
    card.storageKeyGeneration < 1 ||
    !Number.isSafeInteger(card.itemRevision) ||
    card.itemRevision < 1
  ) {
    throw new Error('unreadable_card');
  }
  const plain = new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: decode(card.iv, 12),
        additionalData: storageAAD(context, card.storageKeyGeneration, card.itemRevision),
        tagLength: 128,
      },
      key,
      decode(card.ciphertext),
    ),
  );
  if (!validCard(plain)) {
    plain.fill(0);
    throw new Error('unreadable_card');
  }
  return plain;
}
export async function envelope(plain, exchange, provider, context, operationId, revision) {
  const input = {
    version: 1,
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
  let shared;
  try {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      decode(provider.publicKey, 32),
      'X25519',
      false,
      [],
    );
    shared = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'X25519', public: publicKey },
        exchange.privateKey,
        256,
      ),
    );
    if (shared.every((value) => value === 0)) {
      throw new Error('invalid_provider_key');
    }
    const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-512', salt: decode(input.salt, 32), info: transferInfo(input) },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );
    input.ciphertext = encode(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: decode(input.iv, 12),
          additionalData: transferAAD(input),
          tagLength: 128,
        },
        key,
        plain,
      ),
    );
    return input;
  } finally {
    shared?.fill(0);
  }
}
export async function verifyReceipt(receipt, keys, context, pending, verifier) {
  const payload = decode(receipt.payload);
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload));
  if (
    !Array.isArray(data) ||
    data.length !== 11 ||
    data[0] !== 'rainfrog-secret-receipt-v1' ||
    typeof data[1] !== 'string' ||
    !/^[1-9][0-9]*$/.test(data[1]) ||
    data[2] !== context.appId ||
    data[3] !== context.userId ||
    data[4] !== pending.operationId ||
    data[5] !== 'own-card' ||
    data[6] !== 'card-number-check' ||
    data[7] !== pending.itemRevision ||
    typeof data[8] !== 'string' ||
    !Number.isFinite(Date.parse(data[8])) ||
    new Date(data[8]).toISOString() !== data[8] ||
    data[9] !== 'format-checked' ||
    !Object.hasOwn(keys, data[10])
  ) {
    throw new Error('invalid_receipt');
  }
  let valid;
  if (verifier) {
    valid = verifier(decode(receipt.signature, 64), payload, decode(keys[data[10]], 32));
  } else {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      decode(keys[data[10]], 32),
      'Ed25519',
      false,
      ['verify'],
    );
    valid = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      decode(receipt.signature, 64),
      payload,
    );
  }
  if (!valid) {
    throw new Error('invalid_receipt');
  }
  return { completedAt: data[8], purpose: data[6], recordId: data[1] };
}

export function isExchangeKey(exchange) {
  return (
    exchange?.privateKey instanceof CryptoKey &&
    !exchange.privateKey.extractable &&
    exchange.privateKey.algorithm.name === 'X25519'
  );
}
