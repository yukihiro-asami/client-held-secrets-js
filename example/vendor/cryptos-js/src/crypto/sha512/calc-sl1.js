import { word64Rotate } from './word64-rotate.js';
import { word64Shift } from './word64-shift.js';
import { word64XOR } from './word64-xor.js';

export function calcSl1(x) {
    const r19 = word64Rotate(x, 19);
    const r61 = word64Rotate(x, 61);
    const s6 = word64Shift(x, 6);
    return word64XOR(word64XOR(r19, r61), s6);
}
