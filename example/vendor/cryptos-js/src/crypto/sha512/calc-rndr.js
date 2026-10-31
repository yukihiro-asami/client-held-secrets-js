import { calcRND } from './calc-rnd.js';
import { Krand } from '../const.js';
import { word64Add } from './word64-add.js';

export function calcRNDr(S, W, i, ii) {
    calcRND(
        S[(80 - i) % 8],
        S[(81 - i) % 8],
        S[(82 - i) % 8],
        S[(83 - i) % 8],
        S[(84 - i) % 8],
        S[(85 - i) % 8],
        S[(86 - i) % 8],
        S[(87 - i) % 8],
        { value: word64Add(W[i + ii].value, Krand[i + ii]) }
    );
}

