export function sha512State() {
    const state = [];
    for (let i = 0; i < 8; i++) {
        state.push({ value: 0n });
    }
    const buf = new Uint8Array(128);
    for (let i = 0; i < 128; i++) {
        buf[i] = 0;
    }
    return {
        state: state,
        count: 0n,
        buf: buf,
    };
}
