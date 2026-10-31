import { MASK_255 } from "../const.js";

export function fe25519Mul(h, f, g) {
    const x = f.value * g.value;
    const lo = x & MASK_255;
    const hi = x >> 255n;
    h.value = lo + 19n * hi;
}