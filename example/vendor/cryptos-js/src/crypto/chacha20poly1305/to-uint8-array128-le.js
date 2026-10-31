export function toUint8Array128LE(dst, value) {
    for (let i = 0; i < 16; i++) {
        dst[i] = Number((value >> BigInt(i * 8)) & 0xffn);
    }
}