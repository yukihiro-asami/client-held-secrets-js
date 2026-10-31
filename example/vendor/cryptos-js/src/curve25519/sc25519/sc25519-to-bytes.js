export function sc25519ToBytes(outBytes, h) {
    let value = h.value;
    for (let i = 0; i < 32; i++) {
        outBytes[i] = Number(value & 0xffn);
        value >>= 8n;
    }
}