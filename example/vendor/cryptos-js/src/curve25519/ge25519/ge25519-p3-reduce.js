import { fe25519Reduce } from '../fe25519/fe25519-reduce.js';

export function ge25519P3Reduce(p) {
    fe25519Reduce(p.X);
    fe25519Reduce(p.Y);
    fe25519Reduce(p.Z);
    fe25519Reduce(p.T);
}