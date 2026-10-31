import { client } from '/browser/common.js';
import { mountSecretView } from '/browser/secret-view.js';
const config = await (await fetch('/config')).json();
document.querySelector('#suite').textContent = config.appId.endsWith('custom')
  ? '独自JS参照版 · X25519 / HKDF-SHA-512 / ChaCha20-Poly1305 · 記録署名 Ed25519'
  : 'WebCrypto基本版 · X25519 / HKDF-SHA-512 / AES-256-GCM · 記録署名 Ed25519';
mountSecretView(document.querySelector('#own-card'), client);
