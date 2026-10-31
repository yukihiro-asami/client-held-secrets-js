import { UINT64_MASK } from '../const.js';
export function word64Rotate(x, n) {
    const mask = BigInt(UINT64_MASK);
    n = BigInt(n & 63); // restrict to [0, 63]
    return ((x >> n) | (x << (64n - n))) & mask;
}
