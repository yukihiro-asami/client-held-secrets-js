import { ge25519P3 } from '../ge25519/ge25519-p3.js';
import { ge25519ScalarmultBase } from '../ge25519/ge25519-scalarmult-base.js';
import { edwardsToMontgomery } from './edwards-to-montgomery.js';
import { sc25519 } from '../sc25519/sc25519.js';
import { sc25519Reduce } from '../sc25519/sc25519-reduce.js';
import { fe25519 } from '../fe25519/fe25519.js';
import { fe25519Reduce } from '../fe25519/fe25519-reduce.js';

export function scalarmultCurve25519Base(n) {
    n &= (1n << 255n) - 1n;
    n &= ~7n;
    n |= 1n << 254n;
    const scalar = sc25519();
    scalar.value = n;
    sc25519Reduce(scalar);
    const A = ge25519P3();
    ge25519ScalarmultBase(A, scalar);
    const pk = fe25519();
    edwardsToMontgomery(pk, A.Y, A.Z);
    fe25519Reduce(pk);
    return pk.value;
}
