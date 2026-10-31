import { toUint128LE } from './to-uint128-le.js';
import { clampR } from './cramp-r.js';
export function poly1305Init(state, key) {
    state.r = toUint128LE(key, 0);
    clampR(state);
    state.pad = toUint128LE(key, 16);
}