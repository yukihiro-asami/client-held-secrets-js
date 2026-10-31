export function word32Rotate(a, i, n) {
    a[i] = (a[i] << n) | (a[i] >>> (32 - n));
}