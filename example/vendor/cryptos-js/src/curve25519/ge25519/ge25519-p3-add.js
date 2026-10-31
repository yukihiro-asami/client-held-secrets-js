import { ge25519P3ToCached } from './ge25519-p3-to-cached.js';
import { ge25519AddCached } from './ge25519-add-cached.js';
import { ge25519P1p1ToP3 } from './ge25519-p1p1-to-p3.js';
import { ge25519Cached } from './ge25519-cached.js';
import { ge25519P1p1 } from './ge25519-p1p1.js';

export function ge25519P3Add(r, p, q) {
    const q_cached = ge25519Cached();
    const p1p1 = ge25519P1p1();

    ge25519P3ToCached(q_cached, q);
    ge25519AddCached(p1p1, p, q_cached);
    ge25519P1p1ToP3(r, p1p1);
}