export function clamp(k) {
    k[0] &= 248;
    k[31] &= 127;
    k[31] |= 64;
}