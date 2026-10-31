import {MASK_255} from "../const.js";

export function fe25519FromBytes(fe25519, bytes) {
    let result = 0n;
    for (let i = 0; i < 32; i++) {
        result |= BigInt(bytes[i] & 0xff) << (8n * BigInt(i));
    }
    result &= MASK_255;
    fe25519.value = result;
}