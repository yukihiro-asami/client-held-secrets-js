import { fe25519 } from '../fe25519/fe25519.js';
import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519Invert } from '../fe25519/fe25519-invert.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';

export function edwardsToMontgomery(montgomeryX, edwardsY, edwardsZ) {
    const numerator = fe25519();    // Z + Y
    const denominator = fe25519();  // Z - Y

    fe25519Add(numerator, edwardsZ, edwardsY);
    fe25519Sub(denominator, edwardsZ, edwardsY);
    fe25519Invert(denominator, denominator);
    fe25519Mul(montgomeryX, numerator, denominator);
}
