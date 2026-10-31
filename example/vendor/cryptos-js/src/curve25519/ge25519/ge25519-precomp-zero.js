import { fe25519Zero } from '../fe25519/fe25519-zero.js';
import { fe25519One } from '../fe25519/fe25519-one.js';
export function ge25519PrecompZero(h) {
    fe25519One(h.yplusx);
    fe25519One(h.yminusx);
    fe25519Zero(h.xy2d);
}
