import { poly1305Blocks } from './poly1305-blocks.js';
import { BIT_128 } from '../const.js';
import { toUint8Array128LE } from "./to-uint8-array128-le.js";

export function poly1305Finish(state, mac) {
    if (state.leftover) {
        state.buffer[state.leftover] = 1;
        for (let i = state.leftover + 1; i < 16; i++) {
            state.buffer[i] = 0;
        }
        state.final = 1;
        poly1305Blocks(state, state.buffer);
    }
    state.h = (state.h + state.pad) % BIT_128;
    toUint8Array128LE(mac, state.h)
}
