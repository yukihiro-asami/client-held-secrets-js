export function ge25519IsCanonical(s) {
    if (!(s instanceof Uint8Array) || s.length !== 32) {
        throw new Error('Input must be a Uint8Array of length 32');
    }

    let c = (s[31] & 0x7f) ^ 0x7f;
    for (let i = 30; i > 0; i--) {
        c |= s[i] ^ 0xff;
    }
    c = (c - 1) >>> 8;

    const d = (0xed - 1 - s[0]) >>> 8;

    return 1 - (c & d & 1);
}