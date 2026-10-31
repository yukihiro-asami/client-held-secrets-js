import { sha512State } from './sha512-state.js';

export function hmacSha512State() {
    return {
        ictx: sha512State(),
        octx: sha512State(),
    };
}