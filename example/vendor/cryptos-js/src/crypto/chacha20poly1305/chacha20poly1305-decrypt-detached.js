import { chacha20XorIc } from './chacha20-xor-ic.js';
import { poly1305State } from './poly1305-state.js';
import { poly1305Init } from './poly1305-init.js';
import { poly1305Update } from './poly1305-update.js';
import { poly1305Finish } from './poly1305-finish.js';
import { toUint8Array64LE } from './to-uint8-array64-le.js';

export function chacha20poly1305DecryptDetached(m, c, mac, ad, npub, k) {
    const mlen = c.length;
    const adlen = ad.length;

    // Step 1: Generate Poly1305 one-time key using ChaCha20(key, nonce, 0)
    const block0 = new Uint8Array(64);
    const zeros = new Uint8Array(64);
    chacha20XorIc(block0, zeros, 0, npub, k);

    // Step 2: Compute MAC
    const state = poly1305State();
    poly1305Init(state, block0);

    poly1305Update(state, ad);
    poly1305Update(state, new Uint8Array((-adlen) & 0xf));

    poly1305Update(state, c);
    poly1305Update(state, new Uint8Array((-mlen) & 0xf));

    const lenBuf = new Uint8Array(8);
    toUint8Array64LE(lenBuf, BigInt(adlen));
    poly1305Update(state, lenBuf);
    toUint8Array64LE(lenBuf, BigInt(mlen));
    poly1305Update(state, lenBuf);

    const computedMac = new Uint8Array(16);
    poly1305Finish(state, computedMac);

    for (let i = 0; i < 16; i++) {
        if (computedMac[i] !== mac[i]) {
            return -1;
        }
    }

    // Step 3: Decrypt
    chacha20XorIc(m, c, 1, npub, k);

    return 0;
}
