export function toUint8Array32LE(dst, index, value) {
    dst[index]     =  value        & 0xff;
    dst[index + 1] = (value >>> 8) & 0xff;
    dst[index + 2] = (value >>> 16) & 0xff;
    dst[index + 3] = (value >>> 24) & 0xff;
}