// ./hkdf-sha512-expand.js
import { hmacSha512State } from './hmac-sha512-state.js';
import { hmacSha512Init } from './hmac-sha512-init.js';
import { hmacSha512Update } from './hmac-sha512-update.js';
import { hmacSha512Finish } from './hmac-sha512-finish.js';

export function hkdfSha512Expand(out, ctx, prk) {
    const hashLen = 64;
    const outLen = out.length;

    let t = new Uint8Array(hashLen);      // T(i)
    let prev = new Uint8Array(hashLen);   // T(i-1), 最初は空扱い
    let offset = 0;
    let counter = 1;

    while (offset < outLen) {
        const state = hmacSha512State();
        hmacSha512Init(state, prk);

        if (counter > 1) {
            hmacSha512Update(state, prev);
        }
        hmacSha512Update(state, ctx);
        hmacSha512Update(state, new Uint8Array([counter]));

        hmacSha512Finish(state, t);

        const len = Math.min(hashLen, outLen - offset);
        out.set(t.subarray(0, len), offset);

        prev.set(t); // 全64バイトコピー
        offset += len;
        counter++;
    }

    t.fill(0);
    prev.fill(0);
}

