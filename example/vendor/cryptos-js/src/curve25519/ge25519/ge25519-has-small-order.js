import { fe25519 } from '../fe25519/fe25519.js';
import { fe25519Invert } from '../fe25519/fe25519-invert.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519IsZero } from '../fe25519/fe25519-is-zero.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519Neg } from '../fe25519/fe25519-neg.js';
import { SQRT_MINUS_1 } from '../const.js';

export function ge25519HasSmallOrder(p) {
    const recip = fe25519();
    const x = fe25519();
    const x_neg = fe25519();
    const y = fe25519();
    const y_sqrtm1 = fe25519();
    const c = fe25519();
    let ret = 0;

    fe25519Invert(recip, p.Z);
    fe25519Mul(x, p.X, recip);
    ret |= fe25519IsZero(x);
    fe25519Mul(y, p.Y, recip);
    ret |= fe25519IsZero(y);
    fe25519Neg(x_neg, x);
    fe25519Mul(y_sqrtm1, y, { value: SQRT_MINUS_1 });
    fe25519Sub(c, y_sqrtm1, x);
    ret |= fe25519IsZero(c);
    fe25519Sub(c, y_sqrtm1, x_neg);
    ret |= fe25519IsZero(c);

    return ret;
}