import { L } from '../const.js';
export function sc25519FromBytes(scalar, bytes) {
    let r = 0n;
    for (let i = 0; i < 64; i++) {
        r |= BigInt(bytes[i]) << BigInt(8 * i);
    }
    scalar.value = r % L;
}