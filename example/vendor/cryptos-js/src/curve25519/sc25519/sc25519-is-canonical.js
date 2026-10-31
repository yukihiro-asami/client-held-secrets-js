import { L } from '../const.js';

export function sc25519IsCanonical(sc) {
    return sc.value < L;
}
