import { fe25519 } from '../fe25519/fe25519.js';

export function ge25519P1p1() {
    return {
        X: fe25519(),
        Y: fe25519(),
        Z: fe25519(),
        T: fe25519(),
    };
}