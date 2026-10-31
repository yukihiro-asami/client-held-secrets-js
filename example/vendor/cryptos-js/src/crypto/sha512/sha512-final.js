import { sha512Pad } from './sha512-pad.js';
import { toUint8Array512BE } from './to-uint8-array-512-be.js';

export function sha512Final(state, out) {
    const W = Array.from({ length: 80 }, () => ({ value: 0n }));
    const S = Array.from({ length: 8 }, () => ({ value: 0n }));

    sha512Pad(state, W, S);
    toUint8Array512BE(out, state.state);

    for (let i = 0; i < 80; i++) {
        W[i].value = 0n;
    }

    for (let i = 0; i < 8; i++) {
        S[i].value = 0n;
    }

    for (let i = 0; i < 8; i++) {
        state.state[i].value = 0n;
    }
    state.count = 0n;
    state.buf.fill(0);
}
