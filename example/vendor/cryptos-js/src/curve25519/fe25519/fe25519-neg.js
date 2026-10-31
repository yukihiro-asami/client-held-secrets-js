import { MASK_255 } from '../const.js';

export function fe25519Neg(h, f) {
    // P - f を補数的に構成する（≡ 0 - f mod P）
    const x = -f.value;
    const lo = x & MASK_255;
    const hi = x >> 255n;
    h.value = lo + 19n * hi;
}