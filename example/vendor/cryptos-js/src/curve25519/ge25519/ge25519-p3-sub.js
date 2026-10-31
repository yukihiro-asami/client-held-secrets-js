import { ge25519P3Neg } from './ge25519-p3-neg.js';
import { ge25519P3Add } from './ge25519-p3-add.js';
import { ge25519P3 } from './ge25519-p3.js';
export function ge25519P3Sub(r, p, q) {
    const q_neg = ge25519P3();
    ge25519P3Neg(q_neg, q);
    ge25519P3Add(r, p, q_neg);
}