import { ge25519P1p1 } from './ge25519-p1p1.js';
import { ge25519P2 } from './ge25519-p2.js';
import { ge25519P3Dbl } from './ge25519-p3-dbl.js';
import { ge25519P2Dbl } from './ge25519-p2-dbl.js';
import { ge25519P1p1ToP2 } from './ge25519-p1p1-to-p2.js';
import { ge25519P1p1ToP3 } from './ge25519-p1p1-to-p3.js';

/**
 * 破壊的に h を 16 倍する（h = 16 * h）
 * @param {Object} h - ge25519P3形式の点（上書きされる）
 */
export function ge25519P3Mul16(h) {
    const r = ge25519P1p1();
    const s = ge25519P2();

    // h * 2
    ge25519P3Dbl(r, h);
    ge25519P1p1ToP2(s, r);

    // *2 (→ 4)
    ge25519P2Dbl(r, s);
    ge25519P1p1ToP2(s, r);

    // *2 (→ 8)
    ge25519P2Dbl(r, s);
    ge25519P1p1ToP2(s, r);

    // *2 (→ 16)
    ge25519P2Dbl(r, s);

    // 結果をP3形式に戻す（h を上書き）
    ge25519P1p1ToP3(h, r);
}
