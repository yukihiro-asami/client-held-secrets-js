import { fe25519Copy } from '../fe25519/fe25519-copy.js';
export function ge25519P3ToP2(r, p) {
    fe25519Copy(r.X, p.X);
    fe25519Copy(r.Y, p.Y);
    fe25519Copy(r.Z, p.Z);
}