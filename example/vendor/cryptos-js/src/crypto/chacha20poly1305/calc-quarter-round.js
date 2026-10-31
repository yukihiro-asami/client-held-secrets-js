import { word32Rotate } from './word32-rotate.js';

export function calcQuarterRound(x, a, b, c, d) {
    x[a] += x[b];
    x[d] ^= x[a];
    word32Rotate(x, d, 16);

    x[c] += x[d];
    x[b] ^= x[c];
    word32Rotate(x, b, 12);

    x[a] += x[b];
    x[d] ^= x[a];
    word32Rotate(x, d, 8);

    x[c] += x[d];
    x[b] ^= x[c];
    word32Rotate(x, b, 7);
}
