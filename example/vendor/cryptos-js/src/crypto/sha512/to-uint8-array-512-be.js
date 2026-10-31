export function toUint8Array512BE(dist, src) {
    for (let i = 0; i < 8; i++) {
        const v = src[i].value;
        dist[i * 8] = Number((v >> 56n) & 0xFFn);
        dist[i * 8 + 1] = Number((v >> 48n) & 0xFFn);
        dist[i * 8 + 2] = Number((v >> 40n) & 0xFFn);
        dist[i * 8 + 3] = Number((v >> 32n) & 0xFFn);
        dist[i * 8 + 4] = Number((v >> 24n) & 0xFFn);
        dist[i * 8 + 5] = Number((v >> 16n) & 0xFFn);
        dist[i * 8 + 6] = Number((v >> 8n) & 0xFFn);
        dist[i * 8 + 7] = Number(v & 0xFFn);
    }
}
