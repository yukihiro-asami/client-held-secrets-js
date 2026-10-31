// calc-sl0.js
import { word64Rotate } from './word64-rotate.js';
import { word64Shift } from './word64-shift.js';
import { word64XOR } from './word64-xor.js';

export function calcSl0(x) {
    const r1 = word64Rotate(x, 1);
    const r8 = word64Rotate(x, 8);
    const s7 = word64Shift(x, 7);
    return word64XOR(word64XOR(r1, r8), s7);
}
