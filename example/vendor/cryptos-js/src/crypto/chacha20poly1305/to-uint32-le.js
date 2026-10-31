export function toUint32LE(bytes, i) {
    return (
        bytes[i] |
        (bytes[i + 1] << 8) |
        (bytes[i + 2] << 16) |
        (bytes[i + 3] << 24)
    ) >>> 0;
}
