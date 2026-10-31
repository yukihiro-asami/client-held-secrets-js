import { calcQuarterRound } from './calc-quarter-round.js';
import { toUint8Array32LE } from './to-uint8-array32-le.js';
import { toUint32LE } from './to-uint32-le.js';
export function chacha20EncryptBytes(Ctx, m, c) {
    const tmp = new Uint8Array(64);
    const input = Ctx.input;
    let bytes = m.length;

    let j = new Uint32Array(16);
    const x = new Uint32Array(16);

    for (let i = 0; i < 16; i++) {
        j[i] = input[i];
    }

    let offset = 0;

    while (bytes > 0) {
        let mblock = m;
        let cblock = c;

        if (bytes < 64) {
            tmp.fill(0);
            for (let i = 0; i < bytes; i++) {
                tmp[i] = m[offset + i];
            }
            mblock = tmp;
            cblock = tmp;
        }

        for (let i = 0; i < 16; i++) {
            x[i] = j[i];
        }

        for (let i = 0; i < 10; i++) {
            calcQuarterRound(x, 0, 4, 8, 12);
            calcQuarterRound(x, 1, 5, 9, 13);
            calcQuarterRound(x, 2, 6, 10, 14);
            calcQuarterRound(x, 3, 7, 11, 15);
            calcQuarterRound(x, 0, 5, 10, 15);
            calcQuarterRound(x, 1, 6, 11, 12);
            calcQuarterRound(x, 2, 7, 8, 13);
            calcQuarterRound(x, 3, 4, 9, 14);
        }

        for (let i = 0; i < 16; i++) {
            x[i] = (x[i] + j[i]) >>> 0;
        }

        for (let i = 0; i < 16; i++) {
            const mi = toUint32LE(m, offset + i * 4); // 平文32bit読み取り
            const xi = x[i] ^ mi;
            toUint8Array32LE(tmp, i * 4, xi); // tmp に書き込み
        }

        // 出力 c に必要なバイト数だけコピー
        const blockSize = Math.min(64, bytes);
        for (let i = 0; i < blockSize; i++) {
            c[offset + i] = tmp[i];
        }

        j[12] = (j[12] + 1) >>> 0;
        if (j[12] === 0) {
            j[13] = (j[13] + 1) >>> 0;
        }

        offset += blockSize;
        bytes -= blockSize;
    }

    for (let i = 0; i < 16; i++) {
        input[i] = j[i];
    }
}
