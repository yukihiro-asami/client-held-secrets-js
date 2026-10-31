import { scalarToRadix16 } from './scalar-to-radix16.js';
import { ge25519Cmov8Base } from './ge25519-cmov8-base.js';
import { ge25519P3Zero } from './ge25519-p3-zero.js';
import { ge25519P1p1 } from './ge25519-p1p1.js';
import { ge25519AddPrecomp } from './ge25519-add-precomp.js';
import { ge25519P1p1ToP3 } from './ge25519-p1p1-to-p3.js';
import { ge25519P3Mul16 } from './ge25519-p3-mul16.js';
import { ge25519P3Reduce } from './ge25519-p3-reduce.js';
import { ge25519Precomp } from './ge25519-precomp.js';

export function ge25519ScalarmultBase(h, scalar) {
    const e = scalarToRadix16(scalar); // Int8Array(64)

    const r = ge25519P1p1();
    const t = ge25519Precomp();

    ge25519P3Zero(h);

    for (let i = 1; i < 64; i += 2) {
        ge25519Cmov8Base(t, i >> 1, e[i]);
        ge25519AddPrecomp(r, h, t);
        ge25519P1p1ToP3(h, r);
        ge25519P3Reduce(h);
    }

    ge25519P3Mul16(h);
    ge25519P3Reduce(h);

    for (let i = 0; i < 64; i += 2) {
        ge25519Cmov8Base(t, i >> 1, e[i]);
        ge25519AddPrecomp(r, h, t);
        ge25519P1p1ToP3(h, r);
        ge25519P3Reduce(h);
    }

    ge25519P3Reduce(h);
}
