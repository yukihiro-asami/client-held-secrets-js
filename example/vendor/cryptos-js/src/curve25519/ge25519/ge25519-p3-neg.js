import { fe25519Neg } from '../fe25519/fe25519-neg.js';
import { fe25519Copy } from '../fe25519/fe25519-copy.js';

export function ge25519P3Neg(r, p) {
    fe25519Neg(r.X, p.X);
    fe25519Copy(r.Y, p.Y);
    fe25519Copy(r.Z, p.Z);
    fe25519Neg(r.T, p.T);
}
