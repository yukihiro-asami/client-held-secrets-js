export function poly1305State() {
    return {
        r: 0n,
        h: 0n,
        pad: 0n,
        leftover: 0,
        buffer: new Uint8Array(16),
        final: 0
    };
}
