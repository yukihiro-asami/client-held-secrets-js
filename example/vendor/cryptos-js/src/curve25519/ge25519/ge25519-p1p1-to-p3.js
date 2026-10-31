import { fe25519Mul } from '../fe25519/fe25519-mul.js';

export function ge25519P1p1ToP3(r, p) {
    fe25519Mul(r.X, p.X, p.T);
    fe25519Mul(r.Y, p.Y, p.Z);
    fe25519Mul(r.Z, p.Z, p.T);
    fe25519Mul(r.T, p.X, p.Y);
}
