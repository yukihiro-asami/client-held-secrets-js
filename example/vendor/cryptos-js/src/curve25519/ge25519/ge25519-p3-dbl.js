import { ge25519P3ToP2 } from './ge25519-p3-to-p2.js';
import { ge25519P2Dbl } from './ge25519-p2-dbl.js';
import { ge25519P2 } from './ge25519-p2.js';

export function ge25519P3Dbl(r, p) {
    const q = ge25519P2();       // 中間点：P2形式
    ge25519P3ToP2(q, p);         // P3 → P2
    ge25519P2Dbl(r, q);          // 2倍して P1P1へ
}
