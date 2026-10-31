import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519Copy } from '../fe25519/fe25519-copy.js';

import { ED25519_2D } from '../const.js';

export function ge25519P3ToCached(r, p) {
    fe25519Add(r.YplusX, p.Y, p.X);
    fe25519Sub(r.YminusX, p.Y, p.X);
    fe25519Copy(r.Z, p.Z);
    fe25519Mul(r.T2d, p.T, { value: ED25519_2D });
}
