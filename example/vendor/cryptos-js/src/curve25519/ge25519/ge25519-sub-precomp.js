import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519 } from '../fe25519/fe25519.js';

/**
 * r = p - q
 * @param {Object} r - 出力先 (p1p1 形式の点)
 * @param {Object} p - 入力点 (p3 形式)
 * @param {Object} q - 入力点 (precomp 形式)
 */
export function ge25519SubPrecomp(r, p, q) {
    const t0 = fe25519();

    fe25519Add(r.X, p.Y, p.X);             // r.X = p.Y + p.X
    fe25519Sub(r.Y, p.Y, p.X);             // r.Y = p.Y - p.X
    fe25519Mul(r.Z, r.X, q.yminusx);       // r.Z = r.X * q.yminusx
    fe25519Mul(r.Y, r.Y, q.yplusx);        // r.Y = r.Y * q.yplusx
    fe25519Mul(r.T, q.xy2d, p.T);          // r.T = q.xy2d * p.T
    fe25519Add(t0, p.Z, p.Z);              // t0 = p.Z * 2
    fe25519Sub(r.X, r.Z, r.Y);             // r.X = r.Z - r.Y
    fe25519Add(r.Y, r.Z, r.Y);             // r.Y = r.Z + r.Y
    fe25519Sub(r.Z, t0, r.T);              // r.Z = t0 - r.T
    fe25519Add(r.T, t0, r.T);              // r.T = t0 + r.T
}