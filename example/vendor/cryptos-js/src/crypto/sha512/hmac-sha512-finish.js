import { sha512Final } from './sha512-final.js';
import { sha512Update } from './sha512-update.js';
export function hmacSha512Finish(state, out) {
    const ihash = new Uint8Array(64);
    sha512Final(state.ictx, ihash);
    sha512Update(state.octx, ihash);
    sha512Final(state.octx, out);
    ihash.fill(0);
}