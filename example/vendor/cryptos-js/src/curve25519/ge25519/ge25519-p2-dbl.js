import { fe25519Sq } from '../fe25519/fe25519-sq.js';
import { fe25519Sq2 } from '../fe25519/fe25519-sq2.js';
import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519 } from '../fe25519/fe25519.js';

export function ge25519P2Dbl(r, p) {
    const t0 = fe25519();

    fe25519Sq(r.X, p.X);
    fe25519Sq(r.Z, p.Y);
    fe25519Sq2(r.T, p.Z);

    fe25519Add(r.Y, p.X, p.Y);
    fe25519Sq(t0, r.Y);

    fe25519Add(r.Y, r.Z, r.X);
    fe25519Sub(r.Z, r.Z, r.X);
    fe25519Sub(r.X, t0, r.Y);
    fe25519Sub(r.T, r.T, r.Z);
}