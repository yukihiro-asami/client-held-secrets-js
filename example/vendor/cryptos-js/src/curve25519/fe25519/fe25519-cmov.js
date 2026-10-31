export function fe25519CMov(f, g, b) {
    const mask = BigInt(-b); // b = 1 → -1n, b = 0 → 0n
    f.value = (f.value ^ g.value) & mask ^ f.value;
}