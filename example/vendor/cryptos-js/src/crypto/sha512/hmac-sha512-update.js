import { sha512Update } from './sha512-update.js';

export function hmacSha512Update(state, input) {
    sha512Update(state.ictx, input);
}