import { sha512Transform } from './sha512-transform.js';
import { toUint8Array128BE } from './to-uint8-array-128-be.js';

export function sha512Pad(state, W, S) {
    const r = Number((state.count >> 3n) & 0x7fn);

    state.buf[r] = 0x80;

    if (r < 112) {
        for (let i = r + 1; i < 112; i++) {
            state.buf[i] = 0;
        }
    } else {
        for (let i = r + 1; i < 128; i++) {
            state.buf[i] = 0;
        }
        sha512Transform(state.state, state.buf, W, S);
        state.buf.fill(0, 0, 112);
    }

    toUint8Array128BE(state.buf, state.count);

    sha512Transform(state.state, state.buf, W, S);
}
