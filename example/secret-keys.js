import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { encode, decode } from './secret-wire.js';

export function publicRaw(key) {
  return createPublicKey(key).export({ format: 'jwk' }).x;
}
export async function loadSecretKeys(env = process.env) {
  async function load(path, type) {
    if (!path) {
      throw new Error('secret_key_configuration_required');
    }
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.mode & 0o077) {
      throw new Error('secret_key_permissions');
    }
    const pem = await readFile(path);
    try {
      const key = createPrivateKey(pem);
      if (key.asymmetricKeyType !== type) {
        throw new Error('secret_key_type');
      }
      return key;
    } finally {
      pem.fill(0);
    }
  }
  for (const id of [env.SECRET_TRANSFER_KEY_ID, env.SECRET_RECEIPT_KEY_ID]) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id ?? '')) {
      throw new Error('secret_key_id_required');
    }
  }
  const transfer = await load(env.SECRET_TRANSFER_KEY_FILE, 'x25519');
  const signing = await load(env.SECRET_RECEIPT_KEY_FILE, 'ed25519');
  const receiptKeys = env.SECRET_RECEIPT_PUBLIC_FILE
    ? JSON.parse(await readFile(env.SECRET_RECEIPT_PUBLIC_FILE, 'utf8'))
    : {};
  if (!receiptKeys || typeof receiptKeys !== 'object' || Array.isArray(receiptKeys)) {
    throw new Error('invalid_receipt_keys');
  }
  for (const [id, value] of Object.entries(receiptKeys)) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      throw new Error('invalid_receipt_keys');
    }
    decode(value, 32);
  }
  const current = publicRaw(signing);
  if (
    receiptKeys[env.SECRET_RECEIPT_KEY_ID] &&
    receiptKeys[env.SECRET_RECEIPT_KEY_ID] !== current
  ) {
    throw new Error('receipt_key_id_reused');
  }
  receiptKeys[env.SECRET_RECEIPT_KEY_ID] = current;
  return {
    transfer,
    signing,
    transferId: env.SECRET_TRANSFER_KEY_ID,
    signingId: env.SECRET_RECEIPT_KEY_ID,
    receiptKeys,
  };
}
export async function generateSecretKeys(directory) {
  await mkdir(directory, { mode: 0o700 }); // Must be a new directory: never replace deployed keys.
  for (const type of ['x25519', 'ed25519']) {
    const { privateKey, publicKey } = generateKeyPairSync(type);
    await writeFile(
      `${directory}/${type}.pem`,
      privateKey.export({ format: 'pem', type: 'pkcs8' }),
      { mode: 0o600, flag: 'wx' },
    );
    await writeFile(
      `${directory}/${type}.public`,
      encode(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)),
      { mode: 0o600, flag: 'wx' },
    );
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) {
    throw new Error('usage: node secret-keys.js NEW_DIRECTORY');
  }
  await generateSecretKeys(resolve(process.argv[2]));
  console.log('Separate X25519 and Ed25519 keys created; private values were not printed.');
}
