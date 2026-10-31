// Shared byte-level contract; independent of the UI and cryptographic runtime.
const encoder = new TextEncoder();
export const bytes = (value) => encoder.encode(JSON.stringify(value));
export const positive = (value) => Number.isSafeInteger(value) && value > 0;
export const uuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
export function encode(value) {
  let text = '';
  for (const byte of new Uint8Array(value)) {
    text += String.fromCharCode(byte);
  }
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decode(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 12000) {
    throw new Error('invalid_encoding');
  }
  const result = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
    c.charCodeAt(0),
  );
  if (encode(result) !== value || (length !== undefined && result.length !== length)) {
    throw new Error('invalid_encoding');
  }
  return result;
}
export function exact(value, fields) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((key) => Object.hasOwn(value, key))
  );
}
export function storageAAD(context, generation, revision) {
  return bytes([
    'rainfrog-card-storage-v1',
    context.origin,
    context.appId,
    context.userId,
    'own-card',
    generation,
    revision,
  ]);
}
export function transferInfo(input) {
  const m = input.manifest;
  return bytes([
    input.version === 2 ? 'rainfrog-card-transfer-chacha-v2' : 'rainfrog-card-transfer-v1',
    m.origin,
    m.appId,
    m.userId,
    input.providerKeyId,
    input.clientPublicKey,
  ]);
}
export function transferAAD(input) {
  const m = input.manifest;
  return bytes([
    input.version === 2 ? 'rainfrog-card-use-chacha-v2' : 'rainfrog-card-use-v1',
    m.origin,
    m.appId,
    m.userId,
    m.operationId,
    'own-card',
    'card-number-check',
    m.itemRevision,
    input.providerKeyId,
    input.clientPublicKey,
    input.salt,
    input.iv,
  ]);
}
export function validateEnvelope(input, context, version = 1) {
  if (
    !exact(input, [
      'version',
      'manifest',
      'providerKeyId',
      'clientPublicKey',
      'salt',
      'iv',
      'ciphertext',
    ]) ||
    input.version !== version ||
    !exact(input.manifest, [
      'appId',
      'userId',
      'origin',
      'operationId',
      'target',
      'purpose',
      'itemRevision',
    ])
  ) {
    throw new Error('invalid_request');
  }
  const m = input.manifest;
  if (m.appId !== context.appId || m.userId !== context.userId || m.origin !== context.origin) {
    throw new Error('context_mismatch');
  }
  if (
    !uuid(m.operationId) ||
    m.target !== 'own-card' ||
    m.purpose !== 'card-number-check' ||
    !positive(m.itemRevision) ||
    typeof input.providerKeyId !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(input.providerKeyId)
  ) {
    throw new Error('invalid_request');
  }
  decode(input.clientPublicKey, 32);
  decode(input.salt, 32);
  decode(input.iv, 12);
  const encrypted = decode(input.ciphertext);
  if (encrypted.length < 29 || encrypted.length > 35) {
    throw new Error('invalid_request');
  }
}
export function cardBytes(text) {
  const normalized = text.replace(/[\s-]/g, '');
  if (!/^[0-9]{13,19}$/.test(normalized)) {
    throw new Error('invalid_card_number');
  }
  return encoder.encode(normalized);
}
export function validCard(value) {
  return (
    value.length >= 13 && value.length <= 19 && value.every((byte) => byte >= 48 && byte <= 57)
  );
}
