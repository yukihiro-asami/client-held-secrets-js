export function scalarToRadix16(scalar) {
    const e = new Int8Array(64);
    const a = new Uint8Array(32);
    let x = scalar.value;

    // BigInt → Uint8Array(32) にリトルエンディアンで展開
    for (let i = 0; i < 32; i++) {
        a[i] = Number(x & 0xffn);
        x >>= 8n;
    }

    // 4bit 分解（LE順に 0〜63）
    for (let i = 0; i < 32; i++) {
        e[2 * i]     = a[i] & 0x0f;
        e[2 * i + 1] = (a[i] >> 4) & 0x0f;
    }

    // キャリー処理：e[i] ∈ [-8, 8] に変換
    let carry = 0;
    for (let i = 0; i < 63; i++) {
        let ei = e[i] + carry;
        carry = (ei + 8) >> 4;
        e[i] = ei - (carry << 4);
    }
    e[63] += carry;
    carry = (e[63] + 8) >> 4;
    e[63] -= carry << 4;

    return e;
}
