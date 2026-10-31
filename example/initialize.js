import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generateSecretKeys } from './secret-keys.js';
await mkdir(new URL('./.local/', import.meta.url), { recursive: true, mode: 0o700 });
await generateSecretKeys(fileURLToPath(new URL('./.local/keys/', import.meta.url)));
console.log('Local provider keys created once; private values were not printed.');
