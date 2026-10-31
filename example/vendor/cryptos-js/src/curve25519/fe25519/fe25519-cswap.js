export function fe25519CSwap(f, g, b) {
    const mask = BigInt(-b);
    const x = (f.value ^ g.value) & mask;
    f.value = f.value ^ x;
    g.value = g.value ^ x;
}