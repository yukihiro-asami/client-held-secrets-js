import {fe25519ToBytes} from "./fe25519-to-bytes.js";
export function fe25519IsNegative(f) {
    const s = new Uint8Array(32);
    fe25519ToBytes(s, f);
    return s[0] & 1;
}