import { createPublicKey } from 'node:crypto';
import { decode } from '../shared/wire.js';

const P = (1n << 255n) - 19n;
const L = (1n << 252n) + 27742317777372353535851937790883648493n;
const mod = (x) => ((x % P) + P) % P;
function pow(x, n) {
  let result = 1n;
  for (; n; n >>= 1n, x = mod(x * x)) {
    if (n & 1n) {
      result = mod(result * x);
    }
  }
  return result;
}
const D = mod(-121665n * pow(121666n, P - 2n));
const I = pow(2n, (P - 1n) / 4n);

// Extended Edwards coordinates, used only to validate public enrollment keys.
// Signing and signature verification remain in WebCrypto / Node crypto.
function add(a, b) {
  const aa = mod((a.y - a.x) * (b.y - b.x));
  const bb = mod((a.y + a.x) * (b.y + b.x));
  const cc = mod(2n * D * a.t * b.t);
  const dd = mod(2n * a.z * b.z);
  const e = mod(bb - aa),
    f = mod(dd - cc),
    g = mod(dd + cc),
    h = mod(bb + aa);
  return { x: mod(e * f), y: mod(g * h), z: mod(f * g), t: mod(e * h) };
}

export function importPublicKey(encoded) {
  const raw = decode(encoded, 32);
  let y = 0n;
  for (let index = 31; index >= 0; index--) {
    y = (y << 8n) | BigInt(raw[index]);
  }
  const sign = y >> 255n;
  y &= (1n << 255n) - 1n;
  if (y >= P) {
    throw new Error('Noncanonical public key');
  }
  const yy = mod(y * y);
  const denominator = mod(D * yy + 1n);
  if (denominator === 0n) {
    throw new Error('Invalid point');
  }
  const xx = mod((yy - 1n) * pow(denominator, P - 2n));
  let x = pow(xx, (P + 3n) / 8n);
  if (mod(x * x) !== xx) {
    x = mod(x * I);
  }
  if (mod(x * x) !== xx || (x === 0n && sign === 1n)) {
    throw new Error('Invalid point');
  }
  if ((x & 1n) !== sign) {
    x = mod(-x);
  }
  if (x === 0n && y === 1n) {
    throw new Error('Identity public key');
  }
  let point = { x, y, z: 1n, t: mod(x * y) };
  let result = { x: 0n, y: 1n, z: 1n, t: 0n };
  for (let n = L; n; n >>= 1n, point = add(point, point)) {
    if (n & 1n) {
      result = add(result, point);
    }
  }
  if (result.z === 0n || result.x !== 0n || mod(result.y - result.z) !== 0n) {
    throw new Error('Public key outside prime-order subgroup');
  }
  return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: encoded }, format: 'jwk' });
}
