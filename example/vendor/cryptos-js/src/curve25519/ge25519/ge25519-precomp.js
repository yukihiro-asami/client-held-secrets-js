import { fe25519 } from '../fe25519/fe25519.js';
export function ge25519Precomp() {
    return {
        yplusx: fe25519(),
        yminusx: fe25519(),
        xy2d: fe25519(),
    };
}
