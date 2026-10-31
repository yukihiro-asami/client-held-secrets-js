export function toUint64Array1024BE(W, block) {
    for (let i = 0; i < 16; i++) {
        const offset = i * 8;
        const b0 = BigInt(block[offset]);
        const b1 = BigInt(block[offset + 1]);
        const b2 = BigInt(block[offset + 2]);
        const b3 = BigInt(block[offset + 3]);
        const b4 = BigInt(block[offset + 4]);
        const b5 = BigInt(block[offset + 5]);
        const b6 = BigInt(block[offset + 6]);
        const b7 = BigInt(block[offset + 7]);

        W[i].value =
            (b0 << 56n) |
            (b1 << 48n) |
            (b2 << 40n) |
            (b3 << 32n) |
            (b4 << 24n) |
            (b5 << 16n) |
            (b6 << 8n) |
            b7;
    }
}
