import { slideVartime } from './slide-vartime.js';
import { ge25519AddCached } from '../ge25519/ge25519-add-cached.js';
import { ge25519SubCached } from '../ge25519/ge25519-sub-cached.js';
import { ge25519AddPrecomp } from '../ge25519/ge25519-add-precomp.js';
import { ge25519SubPrecomp } from '../ge25519/ge25519-sub-precomp.js';
import { ge25519P3ToCached } from '../ge25519/ge25519-p3-to-cached.js';
import { ge25519P2Dbl } from '../ge25519/ge25519-p2-dbl.js';
import { ge25519P3Dbl } from '../ge25519/ge25519-p3-dbl.js';
import { ge25519P1p1ToP3 } from '../ge25519/ge25519-p1p1-to-p3.js';
import { ge25519P2Zero } from '../ge25519/ge25519-p2-zero.js';
import { ge25519Cached } from '../ge25519/ge25519-cached.js';
import { ge25519P3 } from '../ge25519/ge25519-p3.js';
import { ge25519P3Reduce } from '../ge25519/ge25519-p3-reduce.js';
import { ge25519P3ToP2 } from '../ge25519/ge25519-p3-to-p2.js';
import { ge25519P1p1 } from '../ge25519/ge25519-p1p1.js';
import { BASE_POINT_PRE_COMPUTED_TABLE_RADIX2 } from '../const.js';

export function doubleScalarmultVartime(r, a, A, b) {
    const aslide = new Int8Array(256);
    const bslide = new Int8Array(256);

    slideVartime(aslide, a);
    slideVartime(bslide, b);

    const Ai = new Array(8);
    Ai[0] = ge25519Cached();
    ge25519P3ToCached(Ai[0], A);

    let t = ge25519P1p1();
    let u = ge25519P3();
    let v = ge25519P3();
    let A2 = ge25519P3();

    ge25519P3Dbl(t, A);
    ge25519P1p1ToP3(A2, t);

    for (let i = 1; i < 8; i++) {
        Ai[i] = ge25519Cached();
        ge25519AddCached(t, A2, Ai[i - 1]);
        ge25519P1p1ToP3(u, t);
        ge25519P3ToCached(Ai[i], u);
    }

    ge25519P2Zero(r);

    let i = 255;
    while (i >= 0 && aslide[i] === 0 && bslide[i] === 0) {
        i--;
    }

    for (; i >= 0; i--) {
        ge25519P2Dbl(t, r);

        if (aslide[i] !== 0) {
            ge25519P1p1ToP3(u, t);
            const abs = Math.abs(aslide[i]) >> 1;
            if (aslide[i] > 0) {
                ge25519AddCached(t, u, Ai[abs]);
            } else {
                ge25519SubCached(t, u, Ai[abs]);
            }
        }

        if (bslide[i] !== 0) {
            ge25519P1p1ToP3(u, t);
            const abs = Math.abs(bslide[i]) >> 1;
            const Bi = BASE_POINT_PRE_COMPUTED_TABLE_RADIX2[abs];
            if (bslide[i] > 0) {
                ge25519AddPrecomp(t, u, Bi);
            } else {
                ge25519SubPrecomp(t, u, Bi);
            }
        }
        ge25519P1p1ToP3(v, t);
        ge25519P3Reduce(v);
        ge25519P3ToP2(r, v);
    }
}
