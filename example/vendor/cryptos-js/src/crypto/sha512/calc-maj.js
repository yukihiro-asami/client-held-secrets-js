export function calcMaj(x, y, z) {
    return (x & (y | z)) | (y & z);
}
