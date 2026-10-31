import { poly1305Blocks } from './poly1305-blocks.js';
import { POLY1305_BLOCK_SIZE } from '../const.js';
export function poly1305Update(state, m) {
    let bytes = m.length;
    let offset = 0;

    // Handle leftover
    if (state.leftover) {
        let want = POLY1305_BLOCK_SIZE - state.leftover;
        if (want > bytes) {
            want = bytes;
        }

        for (let i = 0; i < want; i++) {
            state.buffer[state.leftover + i] = m[i];
        }

        bytes -= want;
        offset += want;
        state.leftover += want;

        if (state.leftover < POLY1305_BLOCK_SIZE) {
            return;
        }

        poly1305Blocks(state, state.buffer);
        state.leftover = 0;
    }

    // Process full blocks
    if (bytes >= POLY1305_BLOCK_SIZE) {
        let want = bytes & ~(POLY1305_BLOCK_SIZE - 1);
        poly1305Blocks(state, m.subarray(offset, offset + want));
        offset += want;
        bytes -= want;
    }

    // Store leftover
    if (bytes > 0) {
        for (let i = 0; i < bytes; i++) {
            state.buffer[state.leftover + i] = m[offset + i];
        }
        state.leftover += bytes;
    }
}
