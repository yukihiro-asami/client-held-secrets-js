import { fe25519 } from '../fe25519/fe25519.js';
import { fe25519IsNegative } from '../fe25519/fe25519-is-negative.js';
import { fe25519Invert } from '../fe25519/fe25519-invert.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519ToBytes } from '../fe25519/fe25519-to-bytes.js';

export function ge25519P3ToBytes(s, h) {
    const recip = fe25519();
    const x = fe25519();
    const y = fe25519();

    fe25519Invert(recip, h.Z);
    fe25519Mul(x, h.X, recip);
    fe25519Mul(y, h.Y, recip);

    fe25519ToBytes(s, y);
    s[31] ^= fe25519IsNegative(x) << 7;
}

