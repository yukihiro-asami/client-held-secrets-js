import { word64Add } from './word64-add.js';
import { calcSl0 } from './calc-sl0.js';
import { calcSl1 } from './calc-sl1.js';

export function calcMSCH(W, ii, i) {
    W[i + ii + 16].value = word64Add(
        word64Add(
            word64Add(
                calcSl1(W[i + ii + 14].value),
                W[i + ii + 9].value
            ),
            calcSl0(W[i + ii + 1].value)
        ),
        W[i + ii].value
    );
}