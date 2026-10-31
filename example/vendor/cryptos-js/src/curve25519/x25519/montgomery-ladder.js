// 定数
const MONTGOMERY_A24 = 121666n;

import { fe25519 } from '../fe25519/fe25519.js';
import { fe25519One } from '../fe25519/fe25519-one.js';
import { fe25519Zero } from '../fe25519/fe25519-zero.js';
import { fe25519Copy } from '../fe25519/fe25519-copy.js';
import { fe25519CSwap } from '../fe25519/fe25519-cswap.js';
import { fe25519Add } from '../fe25519/fe25519-add.js';
import { fe25519Sub } from '../fe25519/fe25519-sub.js';
import { fe25519Sq } from '../fe25519/fe25519-sq.js';
import { fe25519Mul } from '../fe25519/fe25519-mul.js';
import { fe25519Invert } from '../fe25519/fe25519-invert.js';
import { fe25519Reduce } from '../fe25519/fe25519-reduce.js';

export function montgomeryLadder(k, u) {
    // レジスタ: [k]P, [k+1]P の projective 座標
    const rX0_proj = fe25519(); // X0
    const rZ0_proj = fe25519(); // Z0
    const rX1_proj = fe25519(); // X1
    const rZ1_proj = fe25519(); // Z1

    // 初期化
    fe25519One(rX0_proj);
    fe25519Zero(rZ0_proj);
    fe25519Copy(rX1_proj, u);
    fe25519One(rZ1_proj);

    // 一時変数
    const x0PlusZ0 = fe25519();
    const x0MinusZ0 = fe25519();
    const x0PlusZ0_sq = fe25519();
    const x0MinusZ0_sq = fe25519();
    const diff_sq = fe25519();
    const r1_diff = fe25519();
    const r1_sum = fe25519();
    const da = fe25519();
    const cb = fe25519();
    const tmp = fe25519();

    // スカラー演算
    let valueIndex = 0;

    for (let pos = 254; pos >= 0; --pos) {
        const bit = Number((k >> BigInt(pos)) & 1n);
        const isSwap = valueIndex ^ bit;

        fe25519CSwap(rX0_proj, rX1_proj, isSwap);
        fe25519CSwap(rZ0_proj, rZ1_proj, isSwap);
        valueIndex = bit;

        // A = X0 + Z0
        fe25519Add(x0PlusZ0, rX0_proj, rZ0_proj);
        // B = X0 - Z0
        fe25519Sub(x0MinusZ0, rX0_proj, rZ0_proj);

        // AA = A^2
        fe25519Sq(x0PlusZ0_sq, x0PlusZ0);
        // BB = B^2
        fe25519Sq(x0MinusZ0_sq, x0MinusZ0);

        // X2 = AA * BB
        fe25519Mul(rX0_proj, x0PlusZ0_sq, x0MinusZ0_sq);

        // E = AA - BB
        fe25519Sub(diff_sq, x0PlusZ0_sq, x0MinusZ0_sq);

        // DA = (X1 - Z1) * (X0 + Z0)
        fe25519Sub(r1_diff, rX1_proj, rZ1_proj);
        fe25519Mul(da, r1_diff, x0PlusZ0);

        // CB = (X1 + Z1) * (X0 - Z0)
        fe25519Add(r1_sum, rX1_proj, rZ1_proj);
        fe25519Mul(cb, r1_sum, x0MinusZ0);

        // X3 = (DA + CB)^2
        fe25519Add(tmp, da, cb);
        fe25519Sq(rX1_proj, tmp);

        // Z3 = (DA - CB)^2 * u
        fe25519Sub(tmp, da, cb);
        fe25519Sq(tmp, tmp);
        fe25519Mul(rZ1_proj, tmp, u);

        // Z2 = ((E * A24) + BB) * E
        const a24 = fe25519();
        a24.value = MONTGOMERY_A24;
        fe25519Mul(tmp, diff_sq, a24);
        fe25519Add(tmp, tmp, x0MinusZ0_sq);
        fe25519Mul(rZ0_proj, tmp, diff_sq);

        // 正規化（BigIntオーバーフロー対策）
        fe25519Reduce(rX0_proj);
        fe25519Reduce(rZ0_proj);
        fe25519Reduce(rX1_proj);
        fe25519Reduce(rZ1_proj);
    }

    // 最終スワップ
    fe25519CSwap(rX0_proj, rX1_proj, valueIndex);
    fe25519CSwap(rZ0_proj, rZ1_proj, valueIndex);

    // アフィンX = X / Z
    fe25519Reduce(rZ0_proj);
    fe25519Invert(rZ0_proj, rZ0_proj);
    fe25519Mul(rX0_proj, rX0_proj, rZ0_proj);
    fe25519Reduce(rX0_proj);

    return rX0_proj.value;
}
