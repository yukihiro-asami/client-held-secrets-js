export function equal(b, c) {
    let x = (b ^ c) & 0xff; // ensure byte-wise
    x = (x - 1) >>> 31;     // MSBだけ見る
    return x & 1;
}