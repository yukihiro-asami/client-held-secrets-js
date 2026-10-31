import { chacha20poly1305EncryptDetached } from './chacha20poly1305-encrypt-detached.js';
import { POLY1305_MAC_SIZE } from '../const.js';
export function chacha20poly1305Encrypt(c, m, ad, npub, k) {
    const mac = new Uint8Array(POLY1305_MAC_SIZE);
    const ret = chacha20poly1305EncryptDetached(c.subarray(0, m.length), mac, m, ad, npub, k);
    c.set(mac, m.length);
    return ret;
}