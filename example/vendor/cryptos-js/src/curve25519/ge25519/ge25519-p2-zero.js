import { fe25519Zero } from '../fe25519/fe25519-zero.js';
import { fe25519One } from '../fe25519/fe25519-one.js';

export function ge25519P2Zero(h) {
    fe25519Zero(h.X);
    fe25519One(h.Y);
    fe25519One(h.Z);
}
