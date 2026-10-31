import { sha512 } from '../../crypto/sha512/sha512.js';
import { sha512Init } from '../../crypto/sha512/sha512-init.js';
import { sha512Update } from '../../crypto/sha512/sha512-update.js';
import { sha512Final } from '../../crypto/sha512/sha512-final.js';
import { sha512State } from '../../crypto/sha512/sha512-state.js';
import { sc25519 } from '../sc25519/sc25519.js';
import { sc25519ToBytes } from '../sc25519/sc25519-to-bytes.js';
import { sc25519MulAdd } from '../sc25519/sc25519-mul-add.js';
import { sc25519FromBytes } from '../sc25519/sc25519-from-bytes.js';
import { fe25519FromBytes } from '../fe25519/fe25519-from-bytes.js';
import { clamp } from './clamp.js';
import { ge25519P3 } from '../ge25519/ge25519-p3.js';
import { ge25519ScalarmultBase } from '../ge25519/ge25519-scalarmult-base.js';
import { ge25519P3ToBytes } from '../ge25519/ge25519-p3-to-bytes.js';
export function signDetached(sig, m, sk) {
    const hs = sha512State();
    const az = new Uint8Array(64);
    const nonce = new Uint8Array(64);
    const nonce_sc = sc25519();
    const hram = new Uint8Array(64);

    // 1. Hash 32-byte private key to get az
    sha512(sk.subarray(0, 32), az);

    // 2. Compute nonce: SHA512(az[32:64] || m)
    sha512Init(hs);
    sha512Update(hs, az.subarray(32, 64));
    sha512Update(hs, m);
    sha512Final(hs, nonce);

    // 3. Reduce nonce and calculate R = [nonce]B
    sc25519FromBytes(nonce_sc, nonce);
    const R = ge25519P3();
    ge25519ScalarmultBase(R, nonce_sc);
    ge25519P3ToBytes(sig, R);

    // 4. Compute hram(k) = SHA512(R || A || m)
    sha512Init(hs);
    sha512Update(hs, sig.subarray(0, 32));   // R
    sha512Update(hs, sk.subarray(32, 64));   // A
    sha512Update(hs, m);                     // message
    sha512Final(hs, hram);

    // 5. Reduce hram(k), clamp az(s), compute S = (r + k * s) mod L
    const hram_sc = sc25519();
    sc25519FromBytes(hram_sc, hram);
    clamp(az);
    const az_sc = sc25519();
    fe25519FromBytes(az_sc, az);
    const s = sc25519();
    sc25519MulAdd(s, hram_sc, az_sc, nonce_sc);
    sc25519ToBytes(sig.subarray(32, 64), s);

    return 0;
}