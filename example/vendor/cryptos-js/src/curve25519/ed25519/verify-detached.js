import { sc25519IsCanonical } from '../sc25519/sc25519-is-canonical.js';
import { ge25519FromBytesNegateVartime } from '../ge25519/ge25519-from-bytes-negate-vartime.js';
import { ge25519HasSmallOrder } from '../ge25519/ge25519-has-small-order.js';
import { sha512Init } from '../../crypto/sha512/sha512-init.js';
import { sha512Update } from '../../crypto/sha512/sha512-update.js';
import { sha512Final } from '../../crypto/sha512/sha512-final.js';
import { sha512State } from '../../crypto/sha512/sha512-state.js';
import { sc25519FromBytes } from '../sc25519/sc25519-from-bytes.js';
import { doubleScalarmultVartime } from './double-scalarmult-vartime.js';
import { ge25519IsCanonical } from '../ge25519/ge25519-is-canonical.js';
import { ge25519FromBytes } from '../ge25519/ge25519-from-bytes.js';
import { ge25519P2ToP3 } from '../ge25519/ge25519-p2-to-p3.js';
import { ge25519P3Sub } from '../ge25519/ge25519-p3-sub.js';

import { ge25519P3 } from '../ge25519/ge25519-p3.js';
import { ge25519P2 } from '../ge25519/ge25519-p2.js';
import { sc25519 } from '../sc25519/sc25519.js';
import { sc25519ToBytes } from '../sc25519/sc25519-to-bytes.js';
import { ge25519P3Reduce } from "../ge25519/ge25519-p3-reduce.js";

export function verifyDetached(sig, m, pk) {
    if (sig.length !== 64 || pk.length !== 32) return -1;

    // RFC 8032 §5.1.7: decode all 256 bits of S before checking S < L.
    const S = sc25519();
    for (let i = 0; i < 32; i++) {
        S.value |= BigInt(sig[32 + i]) << BigInt(8 * i);
    }
    if (!sc25519IsCanonical(S)) return -1;

    // 公開鍵pkの正当性検査
    if (ge25519IsCanonical(pk) === 0) {
        return -1;
    }

    const A = ge25519P3();
    if (ge25519FromBytesNegateVartime(A, pk) !== 0 || ge25519HasSmallOrder(A) !== 0) {
        return -1;
    }

    const expectedR = ge25519P3();
    if (ge25519FromBytes(expectedR, sig) !== 0 || ge25519HasSmallOrder(expectedR) !== 0) {
        return -1;
    }

    // h = SHA512(R || A || m)
    const hBytes = new Uint8Array(64);
    const hashState = sha512State();
    const hScBytes = new Uint8Array(32);
    sha512Init(hashState);
    sha512Update(hashState, sig.subarray(0, 32));
    sha512Update(hashState, pk);
    sha512Update(hashState, m);
    sha512Final(hashState, hBytes);

    const h = sc25519();
    sc25519FromBytes(h, hBytes);
    sc25519ToBytes(hScBytes, h);

    // Aは−Aとして復元済み。Q = [S]B − [h]Aを計算し、R − Qの小位数を調べる。
    const sb_ah_p2 = ge25519P2();
    const sb_ah = ge25519P3();
    const check = ge25519P3();

    doubleScalarmultVartime(sb_ah_p2, hScBytes, A, sig.subarray(32));
    ge25519P2ToP3(sb_ah, sb_ah_p2);
    ge25519P3Sub(check, expectedR, sb_ah);
    ge25519P3Reduce(check);
    return ge25519HasSmallOrder(check) - 1;
}