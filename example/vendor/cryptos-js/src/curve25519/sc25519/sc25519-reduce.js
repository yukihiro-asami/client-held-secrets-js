import { L } from '../const.js';

export function sc25519Reduce(s) {
    s.value = s.value % L;
}
