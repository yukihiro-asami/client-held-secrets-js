function isZero(bytes) {
    let acc = 0;
    for (let i = 0; i < bytes.length; i++) {
        acc |= bytes[i];
    }
    return acc === 0 ? 1 : 0;
}
import { fe25519ToBytes } from './fe25519-to-bytes.js';
export function fe25519IsZero(f) {
    const s = new Uint8Array(32);
    fe25519ToBytes(s, f);
    return isZero(s);
}
