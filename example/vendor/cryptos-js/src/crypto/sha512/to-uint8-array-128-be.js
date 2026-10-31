import { UINT128_MODULUS } from '../const.js';

export function toUint8Array128BE(buf, value) {
    const modValue = value % UINT128_MODULUS;

    for (let i = 0; i < 16; i++) {
        const shift = BigInt(8 * (15 - i)); // 上位バイトから
        buf[112 + i] = Number((modValue >> shift) & 0xFFn);
    }
}