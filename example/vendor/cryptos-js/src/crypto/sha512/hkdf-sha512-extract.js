import { hmacSha512State } from './hmac-sha512-state.js';
import { hmacSha512Init } from './hmac-sha512-init.js';
import { hmacSha512Update } from './hmac-sha512-update.js';
import { hmacSha512Finish } from './hmac-sha512-finish.js';

export function hkdfSha512Extract(prk, salt, ikm) {
    const state = hmacSha512State();

    hmacSha512Init(state, salt);
    hmacSha512Update(state, ikm);
    hmacSha512Finish(state, prk);
}
