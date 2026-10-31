import { toUint32LE } from './to-uint32-le.js';

export function chachaKeySetUp(ctx, k) {
    ctx.input[0] = 0x61707865 >>> 0;
    ctx.input[1] = 0x3320646e >>> 0;
    ctx.input[2] = 0x79622d32 >>> 0;
    ctx.input[3] = 0x6b206574 >>> 0;
    ctx.input[4] = toUint32LE(k, 0);
    ctx.input[5] = toUint32LE(k, 4);
    ctx.input[6] = toUint32LE(k, 8);
    ctx.input[7] = toUint32LE(k, 12);
    ctx.input[8] = toUint32LE(k, 16);
    ctx.input[9] = toUint32LE(k, 20);
    ctx.input[10] = toUint32LE(k, 24);
    ctx.input[11] = toUint32LE(k, 28);
}
