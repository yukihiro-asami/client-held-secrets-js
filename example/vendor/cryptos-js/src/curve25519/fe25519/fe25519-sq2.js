import { MASK_255 } from "../const.js";

export function fe25519Sq2(h, f) {
    const x = 2n * f.value * f.value;
    const lo = x & MASK_255;
    const hi = x >> 255n;
    h.value = lo + 19n * hi;
}