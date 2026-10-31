import { sha512Init } from './sha512-init.js';
import { sha512Update } from './sha512-update.js';
import { sha512Final } from './sha512-final.js';
import { sha512State } from './sha512-state.js';

export function hmacSha512Init(state, key) {
    let actualKey = key;
    let keyLen = key.length;
    let khash = null;

    if (keyLen > 128) {
        const tmp = sha512State();
        sha512Init(tmp);
        sha512Update(tmp, key);
        khash = new Uint8Array(64);
        sha512Final(tmp, khash);
        actualKey = khash;
        keyLen = 64;
    }

    const pad = new Uint8Array(128);
    pad.fill(0x36);
    for (let i = 0; i < keyLen; i++) {
        pad[i] ^= actualKey[i];
    }

    sha512Init(state.ictx);
    sha512Update(state.ictx, pad);

    pad.fill(0x5c);
    for (let i = 0; i < keyLen; i++) {
        pad[i] ^= actualKey[i];
    }

    sha512Init(state.octx);
    sha512Update(state.octx, pad);

    pad.fill(0);
    if (khash !== null) {
        khash.fill(0);
    }
}