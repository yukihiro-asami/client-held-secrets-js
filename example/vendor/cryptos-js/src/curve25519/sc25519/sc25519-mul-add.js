import {B_REDUCTION_L2K, B_REDUCTION_L_INVERSE, L} from '../const.js';
export function sc25519MulAdd(s, a, b, c) {
    const x = a.value * b.value + c.value;
    const q = (x * B_REDUCTION_L_INVERSE) >> (B_REDUCTION_L2K);
    s.value = x - q * L;
    // For non-negative 256-bit inputs, q is at most one below floor(x / L).
    // Finish the reduction so the signature scalar is always in [0, L).
    if (s.value >= L) s.value -= L;
}
