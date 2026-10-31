import { calcSu0 } from './calc-su0.js';
import { calcSu1 } from './calc-su1.js';
import { calcCh } from './calc-ch.js';
import { calcMaj } from './calc-maj.js';
import { word64Add } from './word64-add.js';

export function calcRND(a, b, c, d, e, f, g, h, k) {
    const t1 = word64Add(
        word64Add(
            word64Add(h.value, calcSu1(e.value)),
            calcCh(e.value, f.value, g.value)
        ),
        k.value
    );

    const t2 = word64Add(
        calcSu0(a.value),
        calcMaj(a.value, b.value, c.value)
    );

    d.value = word64Add(d.value, t1);
    h.value = word64Add(t1, t2);
}