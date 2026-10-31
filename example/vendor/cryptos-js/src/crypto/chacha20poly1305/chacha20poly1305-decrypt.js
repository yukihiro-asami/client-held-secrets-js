import { chacha20poly1305DecryptDetached } from './chacha20poly1305-decrypt-detached.js';
import { POLY1305_MAC_SIZE } from '../const.js';
export function chacha20poly1305Decrypt(m, c, ad, npub, k) {
    const clen = c.length;
    const cipher = c.subarray(0, clen - POLY1305_MAC_SIZE);
    const mac = c.subarray(clen - POLY1305_MAC_SIZE);
    return chacha20poly1305DecryptDetached(m, cipher, mac, ad, npub, k);
}
