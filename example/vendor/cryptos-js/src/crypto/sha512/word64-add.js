import { UINT64_MODULUS } from '../const.js';
export function word64Add(a, b) {
    return (a + b) % UINT64_MODULUS;
}
