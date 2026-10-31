import { fe25519CMov } from '../fe25519/fe25519-cmov.js';

/**
 * ge25519_precomp における定数時間条件付き代入。
 * b が 1 のとき、t = u。b が 0 のとき t は変化しない。
 *
 * @param {{ yplusx: { value: bigint }, yminusx: { value: bigint }, xy2d: { value: bigint } }} t
 * @param {{ yplusx: { value: bigint }, yminusx: { value: bigint }, xy2d: { value: bigint } }} u
 * @param {number} b 0 or 1
 */
export function ge25519Cmov(t, u, b) {
    fe25519CMov(t.yplusx, u.yplusx, b);
    fe25519CMov(t.yminusx, u.yminusx, b);
    fe25519CMov(t.xy2d, u.xy2d, b);
}
