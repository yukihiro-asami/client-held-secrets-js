import { MASK_255 } from "../const.js";

export function fe25519Sq(h, f) {
    const f_lo = f.value & MASK_255;
    const f_hi = f.value >> 255n;
    const f_folded = f_lo + 19n * f_hi;

    const x = f_folded * f_folded;
    const lo = x & MASK_255;
    const hi = x >> 255n;
    h.value = lo + 19n * hi;
}