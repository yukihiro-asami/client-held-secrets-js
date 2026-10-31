import { fe25519Reduce } from './fe25519-reduce.js';

export function fe25519ToBytes(outBytes, fe25519) {
    fe25519Reduce(fe25519);

    let value = fe25519.value;

    for (let i = 0; i < 32; i++) {
        outBytes[i] = Number(value & 0xffn);
        value >>= 8n;
    }
}
