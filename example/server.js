import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { startApplication } from './vendor/rainfrog/core/http/server/application.js';
import { AuthError } from './vendor/rainfrog/core/auth/server/authority.js';
import { SecretService, SecretError } from './secret-service.js';
import { loadSecretKeys } from './secret-keys.js';
import { createPool } from './pool.js';

export function secretRoute(service, action) {
  return {
    activity: true,
    async handle({ identity, body }) {
      try {
        if (identity.userId !== 'demo-user') {
          throw new AuthError('forbidden', 403);
        }
        if (body.length > 8192) {
          throw new AuthError('request_too_large', 413);
        }
        let input = {};
        if (body.length) {
          try {
            input = JSON.parse(body);
          } catch {
            throw new AuthError('invalid_json', 400);
          }
        }
        if (action === 'keys') {
          return service.publicKeys();
        }
        return action === 'use'
          ? await service.use(input, body, identity)
          : await service.result(input, identity);
      } catch (error) {
        if (error instanceof SecretError) {
          throw new AuthError(error.message, error.status);
        }
        throw error;
      } finally {
        body.fill(0);
      }
    },
  };
}
async function staticFiles(mode) {
  const files = new Map();
  function add(path, relative, type = 'text/javascript') {
    files.set(path, { url: new URL(relative, import.meta.url), type });
  }
  add('/', 'browser/index.html', 'text/html; charset=utf-8');
  add('/page.js', 'browser/page.js');
  add('/browser/common.js', 'browser/common.js');
  add('/tokens.css', 'browser/tokens.css', 'text/css');
  add('/style.css', 'browser/style.css', 'text/css');
  for (const name of ['secret-view', 'secret-storage', 'secret-crypto', 'custom-crypto']) {
    add(`/browser/${name}.js`, `browser/${name}.js`);
  }
  add(
    '/browser/selected-crypto.js',
    mode === 'custom' ? 'browser/custom-crypto.js' : 'browser/secret-crypto.js',
  );
  add('/secret-wire.js', 'secret-wire.js');
  add('/custom-primitives.js', 'custom-primitives.js');
  for (const name of ['client', 'storage', 'login-view']) {
    add(`/core/auth/browser/${name}.js`, `vendor/rainfrog/core/auth/browser/${name}.js`);
  }
  add('/core/auth/shared/wire.js', 'vendor/rainfrog/core/auth/shared/wire.js');
  async function vendor(directory) {
    for (const entry of await readdir(new URL(directory, import.meta.url), {
      withFileTypes: true,
    })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        await vendor(relative);
      } else if (entry.name.endsWith('.js')) {
        add(`/${relative}`, relative);
      }
    }
  }
  await vendor('vendor/cryptos-js/src');
  return files;
}
export async function startExample({ mode = 'webcrypto', port = 3130, pool, keys }) {
  if (!['webcrypto', 'custom'].includes(mode)) {
    throw new Error('Mode must be webcrypto or custom');
  }
  const service = new SecretService(pool, keys, '', mode);
  await service.ready();
  const app = {
    appId: `secret-reference-${mode}`,
    files: await staticFiles(mode),
    routes: new Map([
      ['GET /api/secrets/keys', secretRoute(service, 'keys')],
      ['POST /api/secrets/use', secretRoute(service, 'use')],
      ['POST /api/secrets/result', secretRoute(service, 'result')],
    ]),
  };
  const application = await startApplication({ app, port, fixtures: true });
  service.origin = application.origin;
  return { ...application, service };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const mode = process.argv[2] ?? 'webcrypto';
  const pool = createPool();
  try {
    const keys = await loadSecretKeys({
      ...process.env,
      SECRET_TRANSFER_KEY_ID: 'reference-transfer-1',
      SECRET_RECEIPT_KEY_ID: 'reference-receipt-1',
      SECRET_TRANSFER_KEY_FILE:
        process.env.SECRET_TRANSFER_KEY_FILE ??
        fileURLToPath(new URL('./.local/keys/x25519.pem', import.meta.url)),
      SECRET_RECEIPT_KEY_FILE:
        process.env.SECRET_RECEIPT_KEY_FILE ??
        fileURLToPath(new URL('./.local/keys/ed25519.pem', import.meta.url)),
    });
    const application = await startExample({
      mode,
      port: Number(process.env.PORT ?? (mode === 'custom' ? 3131 : 3130)),
      pool,
      keys,
    });
    console.log(`${mode} reference: ${application.origin} (fictional data; local test login)`);
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, async () => {
        await application.close();
        await pool.end();
      });
    }
  } catch (error) {
    await pool.end();
    console.error(error.message);
    process.exitCode = 1;
  }
}
