import { sha512 } from '../../crypto/sha512/sha512.js';
import { ge25519ScalarmultBase } from '../ge25519/ge25519-scalarmult-base.js';
import { ge25519P3 } from '../ge25519/ge25519-p3.js';
import { ge25519P3ToBytes } from '../ge25519/ge25519-p3-to-bytes.js';
import { sc25519 } from '../sc25519/sc25519.js';
import { sc25519Reduce } from '../sc25519/sc25519-reduce.js';
import { fe25519FromBytes } from '../fe25519/fe25519-from-bytes.js';

export function keyPair(pk, sk, seed) {
    const digest = new Uint8Array(64);
    sha512(seed, digest);

    digest[0] &= 248;
    digest[31] &= 127;
    digest[31] |= 64;

    const sc = sc25519();
    fe25519FromBytes(sc, digest);
    sc25519Reduce(sc);
    const A = ge25519P3();
    ge25519ScalarmultBase(A, sc);

    ge25519P3ToBytes(pk, A);

    for (let i = 0; i < 32; i++) {
        sk[i] = seed[i];
        sk[i + 32] = pk[i];
    }
}
