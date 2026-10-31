export const encoder = new TextEncoder();

export function bytes(value) {
  return encoder.encode(JSON.stringify(value));
}

export function base64url(value) {
  let binary = '';
  for (const byte of new Uint8Array(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decode(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid base64url');
  }
  const result = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
    c.charCodeAt(0),
  );
  if (result.length !== length || base64url(result) !== value) {
    throw new Error('Invalid encoded length or canonical form');
  }
  return result;
}

export function challengeBytes(c) {
  return bytes(['rainfrog-challenge-v1', c.appId, c.loginId, c.nonce, c.expiresAt]);
}

export function requestBytes(c, request) {
  return bytes([
    'rainfrog-request-v1',
    c.appId,
    c.loginId,
    c.nonce,
    c.expiresAt,
    c.mac,
    request.origin,
    request.method,
    request.target,
    request.contentType,
    request.bodyHash,
  ]);
}

// Local fixture enrollment has a separate domain from ordinary authenticated requests.
export function enrollmentBytes(ticket) {
  return bytes([
    'rainfrog-local-enrollment-v1',
    ticket.origin,
    ticket.appId,
    ticket.userId,
    ticket.id,
    ticket.publicKey,
    ticket.expiresAt,
  ]);
}
