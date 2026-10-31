import { ge25519Cmov8 } from './ge25519-cmov8.js';
import { BASE_POINT_PRE_COMPUTED_TABLE_RADIX16 } from '../const.js';

export function ge25519Cmov8Base(t, pos, b) {
    ge25519Cmov8(t, BASE_POINT_PRE_COMPUTED_TABLE_RADIX16[pos], b);
}