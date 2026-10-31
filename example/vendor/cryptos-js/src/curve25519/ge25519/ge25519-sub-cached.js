import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519 } from '../fe25519/fe25519.js';

export function ge25519SubCached(r, p, q) {
    const t0 = fe25519(); // 一時変数としてfe25519構造を使う

    fe25519Add(r.X, p.Y, p.X);            // r.X = p.Y + p.X
    fe25519Sub(r.Y, p.Y, p.X);            // r.Y = p.Y - p.X
    fe25519Mul(r.Z, r.X, q.YminusX);      // r.Z = (p.Y + p.X) * q.YminusX
    fe25519Mul(r.Y, r.Y, q.YplusX);       // r.Y = (p.Y - p.X) * q.YplusX
    fe25519Mul(r.T, q.T2d, p.T);          // r.T = q.T2d * p.T
    fe25519Mul(r.X, p.Z, q.Z);            // r.X = p.Z * q.Z

    fe25519Add(t0, r.X, r.X);             // t0 = 2 * (p.Z * q.Z)
    fe25519Sub(r.X, r.Z, r.Y);            // r.X = r.Z - r.Y
    fe25519Add(r.Y, r.Z, r.Y);            // r.Y = r.Z + r.Y
    fe25519Sub(r.Z, t0, r.T);             // r.Z = t0 - r.T
    fe25519Add(r.T, t0, r.T);             // r.T = t0 + r.T
}
