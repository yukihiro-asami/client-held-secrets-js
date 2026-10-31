export function slideVartime(r, a) {
    // 初期bit展開（LE解釈で256bitの配列へ）
    for (let i = 0; i < 256; i++) {
        r[i] = (a[i >> 3] >> (i & 7)) & 1;
    }

    // 多項式係数変換（-15〜15の奇数に制約）
    for (let i = 0; i < 256; i++) {
        if (r[i] === 0) continue;

        for (let b = 1; b <= 6 && i + b < 256; b++) {
            if (r[i + b] === 0) continue;

            const ribs = (r[i + b] & 1) << b;
            let cmp = r[i] + ribs;

            if (cmp <= 15) {
                r[i] = cmp;
                r[i + b] = 0;
            } else {
                cmp = r[i] - ribs;
                if (cmp < -15) break;

                r[i] = cmp;

                for (let k = i + b; k < 256; k++) {
                    if (r[k] === 0) {
                        r[k] = 1;
                        break;
                    }
                    r[k] = 0;
                }
            }
        }
    }
}
