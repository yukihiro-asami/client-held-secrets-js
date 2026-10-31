import { word64Rotate } from './word64-rotate.js';
import { word64XOR } from './word64-xor.js';

export function calcSu1(x) {
    const r14 = word64Rotate(x, 14);
    const r18 = word64Rotate(x, 18);
    const r41 = word64Rotate(x, 41);
    return word64XOR(word64XOR(r14, r18), r41);
}
