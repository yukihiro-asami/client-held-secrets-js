import { word64Rotate } from './word64-rotate.js';
import { word64XOR } from './word64-xor.js';
export function calcSu0(x) {
    const r28 = word64Rotate(x, 28);
    const r34 = word64Rotate(x, 34);
    const r39 = word64Rotate(x, 39);
    return word64XOR(word64XOR(r28, r34), r39);
}