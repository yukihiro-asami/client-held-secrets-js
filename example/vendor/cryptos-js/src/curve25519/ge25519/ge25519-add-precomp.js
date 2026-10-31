import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519 } from '../fe25519/fe25519.js';

export function ge25519AddPrecomp(r, p, q) {
    const t0 = fe25519();
    fe25519Add(r.X, p.Y, p.X);
    fe25519Sub(r.Y, p.Y, p.X);
    fe25519Mul(r.Z, r.X, q.yplusx);
    fe25519Mul(r.Y, r.Y, q.yminusx)
    fe25519Mul(r.T, q.xy2d, p.T);
    fe25519Add(t0, p.Z, p.Z);
    fe25519Sub(r.X, r.Z, r.Y);
    fe25519Add(r.Y, r.Z, r.Y);
    fe25519Add(r.Z, t0, r.T);
    fe25519Sub(r.T, t0, r.T);
}
