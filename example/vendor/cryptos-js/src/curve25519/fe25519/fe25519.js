export function fe25519() {
    return new (class {
        constructor() {
            this.value = BigInt(0n);
        }
    })();
}