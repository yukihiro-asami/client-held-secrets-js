import { POLY1305_P } from '../const.js';
import { BIT_128 } from '../const.js';
import { toUint128LE } from './to-uint128-le.js';

export function poly1305Blocks(state, m) {
    const hibit = state.final ? 0n : BIT_128;
    const r = state.r;
    let h = state.h;

    let offset = 0;
    while (offset + 16 <= m.length) {
        let t = toUint128LE(m, offset);

        t += hibit;

        h += t;
        h = (h * r) % POLY1305_P;

        offset += 16;
    }

    state.h = h;
}
