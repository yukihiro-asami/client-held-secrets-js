import { fe25519 } from './fe25519.js';
import { fe25519Sq } from './fe25519-sq.js';
import { fe25519Mul } from './fe25519-mul.js';
import { fe25519Copy } from './fe25519-copy.js';
import { fe25519Reduce } from './fe25519-reduce.js';

export function fe25519Invert(out, z) {
    const t0 = fe25519();
    const t1 = fe25519();
    const t2 = fe25519();
    const t3 = fe25519();

    fe25519Sq(t0, z);            // z^2
    fe25519Sq(t1, t0);           // z^4
    fe25519Sq(t1, t1);           // z^8
    fe25519Mul(t1, z, t1);       // z^9
    fe25519Mul(t0, t0, t1);      // z^11
    fe25519Sq(t2, t0);           // z^22
    fe25519Mul(t1, t1, t2);      // z^31

    fe25519Sq(t2, t1);
    for (let i = 1; i < 5; ++i) fe25519Sq(t2, t2); // z^(2^5 * 31)
    fe25519Mul(t1, t2, t1);       // z^((2^5 * 31) + 31)

    fe25519Sq(t2, t1);
    for (let i = 1; i < 10; ++i) fe25519Sq(t2, t2);
    fe25519Mul(t2, t2, t1);

    fe25519Sq(t3, t2);
    for (let i = 1; i < 20; ++i) fe25519Sq(t3, t3);
    fe25519Mul(t2, t3, t2);

    for (let i = 1; i < 11; ++i) fe25519Sq(t2, t2);
    fe25519Mul(t1, t2, t1);

    fe25519Sq(t2, t1);
    for (let i = 1; i < 50; ++i) fe25519Sq(t2, t2);
    fe25519Mul(t2, t2, t1);

    fe25519Sq(t3, t2);
    for (let i = 1; i < 100; ++i) fe25519Sq(t3, t3);
    fe25519Mul(t2, t3, t2);

    for (let i = 1; i < 51; ++i) fe25519Sq(t2, t2);
    fe25519Mul(t1, t2, t1);

    for (let i = 1; i < 6; ++i) fe25519Sq(t1, t1);
    fe25519Mul(out, t1, t0);

    fe25519Reduce(out); // 最終正規化
}
