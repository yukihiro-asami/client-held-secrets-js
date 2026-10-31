import { fe25519 } from '../fe25519/fe25519.js';

export function ge25519Cached() {
    return {
        YplusX: fe25519(),
        YminusX: fe25519(),
        Z: fe25519(),
        T2d: fe25519(),
    };
}