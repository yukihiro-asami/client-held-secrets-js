import { P } from '../const.js';
export function fe25519Reduce(h) {
    h.value = ((h.value % P) + P) % P;
}