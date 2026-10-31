export function toUint128LE(key, offset) {
    let result = 0n;
    for (let i = 0; i < 16; i++) {
        result |= BigInt(key[offset + i]) << (8n * BigInt(i));
    }
    return result;
}