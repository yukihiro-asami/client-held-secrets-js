export function toUint8Array64LE(dst, value) {
    dst[0] = Number(value & 0xffn);
    dst[1] = Number((value >> 8n) & 0xffn);
    dst[2] = Number((value >> 16n) & 0xffn);
    dst[3] = Number((value >> 24n) & 0xffn);
    dst[4] = Number((value >> 32n) & 0xffn);
    dst[5] = Number((value >> 40n) & 0xffn);
    dst[6] = Number((value >> 48n) & 0xffn);
    dst[7] = Number((value >> 56n) & 0xffn);
}