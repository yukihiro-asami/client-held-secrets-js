import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519Sq } from '../fe25519/fe25519-sq.js';

export function ge25519P2ToP3(r, p) {
    // (XZ, YZ, Z², XY) preserves x=X/Z, y=Y/Z and satisfies X'Y'=Z'T'.
    // Compute T first and Z last to also allow r and p to be the same object.
    fe25519Mul(r.T, p.X, p.Y);
    fe25519Mul(r.X, p.X, p.Z);
    fe25519Mul(r.Y, p.Y, p.Z);
    fe25519Sq(r.Z, p.Z);
}
