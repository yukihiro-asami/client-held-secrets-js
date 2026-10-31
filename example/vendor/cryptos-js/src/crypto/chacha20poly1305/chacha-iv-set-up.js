import { toUint32LE } from './to-uint32-le.js';
export function chachaIvSetUp(ctx, iv, counter) {
    ctx.input[12] = counter === null ? 0 : toUint32LE(counter, 0);
    ctx.input[13] = toUint32LE(iv, 0);
    ctx.input[14] = toUint32LE(iv, 4);
    ctx.input[15] = toUint32LE(iv, 8);
}