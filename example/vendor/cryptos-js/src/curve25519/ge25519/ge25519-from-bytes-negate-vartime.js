import { P, SQRT_MINUS_1 } from '../const.js';
import { ED25519_D } from '../const.js';
import { fe25519 } from '../fe25519/fe25519.js';
import { fe25519IsNegative } from '../fe25519/fe25519-is-negative.js';
import { fe25519Neg } from '../fe25519/fe25519-neg.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519Sq } from '../fe25519/fe25519-sq.js';
import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519IsZero } from '../fe25519/fe25519-is-zero.js';
import { fe25519Pow22523 } from '../fe25519/fe25519-pow22523.js';
import { fe25519FromBytes } from '../fe25519/fe25519-from-bytes.js';
import { fe25519One } from '../fe25519/fe25519-one.js';

export function ge25519FromBytesNegateVartime(h, s) {
    const u = fe25519();
    const v = fe25519();
    const v3 = fe25519();
    const vxx = fe25519();
    const mRootCheck = fe25519();
    const pRootCheck = fe25519();
    const fe25519SqrtM1 = fe25519();
    const fe25519_d = fe25519();

    fe25519SqrtM1.value = SQRT_MINUS_1;
    fe25519_d.value = ED25519_D;

    fe25519FromBytes(h.Y, s);
    // RFC 8032 §5.1.3: the encoded y-coordinate must be below p.
    if (h.Y.value >= P) return -1;
    fe25519One(h.Z);

    fe25519Sq(u, h.Y);                       // u = y²
    fe25519Mul(v, u, fe25519_d);            // v = dy²
    fe25519Sub(u, u, h.Z);                  // u = y² - 1
    fe25519Add(v, v, h.Z);                  // v = dy² + 1

    fe25519Sq(v3, v);                       // v³ = v²
    fe25519Mul(v3, v3, v);                  // v³
    fe25519Sq(h.X, v3);                     // x = v⁶
    fe25519Mul(h.X, h.X, v);                // x = v⁷
    fe25519Mul(h.X, h.X, u);                // x = uv⁷

    fe25519Pow22523(h.X, h.X);              // x = (uv⁷)^((q-5)/8)
    fe25519Mul(h.X, h.X, v3);               // x = x * v³
    fe25519Mul(h.X, h.X, u);                // x = x * u

    fe25519Sq(vxx, h.X);
    fe25519Mul(vxx, vxx, v);
    fe25519Sub(mRootCheck, vxx, u);
    if (fe25519IsZero(mRootCheck) === 0) {
        fe25519Add(pRootCheck, vxx, u);
        if (fe25519IsZero(pRootCheck) === 0) {
            return -1;
        }
        fe25519Mul(h.X, h.X, fe25519SqrtM1);
    }

    // Zero has no alternate sign encoding, including when returning -P.
    if (fe25519IsZero(h.X) !== 0 && (s[31] >> 7) !== 0) return -1;

    if (fe25519IsNegative(h.X) === (s[31] >> 7)) {
        fe25519Neg(h.X, h.X);
    }

    fe25519Mul(h.T, h.X, h.Y);
    return 0;
}