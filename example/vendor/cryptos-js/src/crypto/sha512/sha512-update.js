import { sha512Transform } from './sha512-transform.js';

export function sha512Update(state, input) {
    if (input.length === 0) return;

    const W = [];
    const S = [];
    for (let i = 0; i < 80; i++) {
        W.push({ value: 0n });
    }
    for (let i = 0; i < 8; i++) {
        S.push({ value: 0n });
    }

    const r = Number((state.count >> 3n) & 0x7fn);
    state.count += BigInt(input.length) << 3n;

    let i = 0;

    if (input.length < 128 - r) {
        for (; i < input.length; i++) {
            state.buf[r + i] = input[i];
        }
        return;
    }

    for (; i < 128 - r; i++) {
        state.buf[r + i] = input[i];
    }

    sha512Transform(state.state, state.buf, W, S);
    i = 128 - r;

    while (input.length - i >= 128) {
        const block = input.subarray(i, i + 128);
        sha512Transform(state.state, block, W, S);
        i += 128;
    }

    const remaining = input.length - i;
    for (let j = 0; j < remaining; j++) {
        state.buf[j] = input[i + j];
    }

    for (let j = 0; j < 80; j++) {
        W[j].value = 0n;
    }
    for (let j = 0; j < 8; j++) {
        S[j].value = 0n;
    }
}
