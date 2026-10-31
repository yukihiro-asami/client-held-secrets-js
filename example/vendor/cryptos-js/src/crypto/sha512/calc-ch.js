export function calcCh(x, y, z) {
    return (x & (y ^ z)) ^ z;
}