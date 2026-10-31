import { chachaCtx } from './chacha-ctx.js';
import { chachaKeySetUp } from './chacha-key-set-up.js';
import { chachaIvSetUp } from './chacha-iv-set-up.js';
import { chacha20EncryptBytes } from './chacha20-encrypt-bytes.js';
import { toUint8Array32LE } from './to-uint8-array32-le.js';

export function chacha20XorIc(out, input, ic, n, k) {
    const ctx = chachaCtx();
    const icBytes = new Uint8Array(4);
    toUint8Array32LE(icBytes, 0, ic >>> 0);
    chachaKeySetUp(ctx, k);
    chachaIvSetUp(ctx, n, icBytes);
    chacha20EncryptBytes(ctx, input, out);
}