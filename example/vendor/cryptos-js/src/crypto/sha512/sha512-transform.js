import { toUint64Array1024BE } from './to-uint64-array-1024-be.js';
import { calcRNDr } from './calc-rndr.js';
import { calcMSCH } from './calc-msch.js';
import { word64Add } from './word64-add.js';

export function sha512Transform(state, uint8Array, W, S) {
    // W[0..15] 初期化（BigEndian解釈）
    toUint64Array1024BE(W, uint8Array);

    // S に state をディープコピー
    for (let i = 0; i < 8; i++) {
        S[i].value = state[i].value;
    }

    for (let i = 0; i < 80; i += 16) {
        calcRNDr(S, W, 0, i);
        calcRNDr(S, W, 1, i);
        calcRNDr(S, W, 2, i);
        calcRNDr(S, W, 3, i);
        calcRNDr(S, W, 4, i);
        calcRNDr(S, W, 5, i);
        calcRNDr(S, W, 6, i);
        calcRNDr(S, W, 7, i);
        calcRNDr(S, W, 8, i);
        calcRNDr(S, W, 9, i);
        calcRNDr(S, W, 10, i);
        calcRNDr(S, W, 11, i);
        calcRNDr(S, W, 12, i);
        calcRNDr(S, W, 13, i);
        calcRNDr(S, W, 14, i);
        calcRNDr(S, W, 15, i);

        if (i === 64) {
            break;
        }

        calcMSCH(W, 0, i);
        calcMSCH(W, 1, i);
        calcMSCH(W, 2, i);
        calcMSCH(W, 3, i);
        calcMSCH(W, 4, i);
        calcMSCH(W, 5, i);
        calcMSCH(W, 6, i);
        calcMSCH(W, 7, i);
        calcMSCH(W, 8, i);
        calcMSCH(W, 9, i);
        calcMSCH(W, 10, i);
        calcMSCH(W, 11, i);
        calcMSCH(W, 12, i);
        calcMSCH(W, 13, i);
        calcMSCH(W, 14, i);
        calcMSCH(W, 15, i);
    }

    // state += S
    for (let i = 0; i < 8; i++) {
        state[i].value = word64Add(state[i].value, S[i].value);
    }
}
