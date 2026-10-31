import { ge25519PrecompZero } from './ge25519-precomp-zero.js';
import { ge25519Cmov } from './ge25519-cmov.js';
import { fe25519Copy} from '../fe25519/fe25519-copy.js';
import { fe25519Neg } from '../fe25519/fe25519-neg.js';
import { equal } from './equal.js';
import { ge25519Precomp } from "./ge25519-precomp.js";

export function ge25519Cmov8(t, precomp, b) {
    const bnegative = ((b >> 7) & 1);
    const babs = bnegative ? -b : b;
    let minust = ge25519Precomp();
    ge25519PrecompZero(t);
    ge25519Cmov(t, precomp[0], equal(babs, 1));
    ge25519Cmov(t, precomp[1], equal(babs, 2));
    ge25519Cmov(t, precomp[2], equal(babs, 3));
    ge25519Cmov(t, precomp[3], equal(babs, 4));
    ge25519Cmov(t, precomp[4], equal(babs, 5));
    ge25519Cmov(t, precomp[5], equal(babs, 6));
    ge25519Cmov(t, precomp[6], equal(babs, 7));
    ge25519Cmov(t, precomp[7], equal(babs, 8));
    fe25519Copy(minust.yplusx, t.yminusx);
    fe25519Copy(minust.yminusx, t.yplusx);
    fe25519Neg(minust.xy2d, t.xy2d);
    ge25519Cmov(t, minust, bnegative);
}
