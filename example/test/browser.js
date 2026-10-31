import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { generateKeyPairSync } from 'node:crypto';
import { chromium } from 'playwright';
import { createPool } from '../pool.js';
import { startExample } from '../server.js';
import { publicRaw } from '../secret-keys.js';

assert.equal(process.env.PGDATABASE, 'rainfrog_secret_reference_test');
const pool = createPool();
const transfer = generateKeyPairSync('x25519').privateKey;
const signing = generateKeyPairSync('ed25519').privateKey;
const keys = {
  transfer,
  signing,
  transferId: 'browser-x',
  signingId: `browser-${crypto.randomUUID()}`,
  receiptKeys: {},
};
keys.receiptKeys[keys.signingId] = publicRaw(signing);
const profile = await mkdtemp(`${tmpdir()}/secret-reference-browser-`);
let browser, application;
async function launch() {
  return chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true });
}
const success = async (page) =>
  page.locator('#card-receipt').filter({ hasText: '提供元の署名を確認済み' }).waitFor();
const use = async (page) => {
  await page.locator('#card-use').click();
  await page.locator('#card-accept').click();
  await success(page);
};
try {
  for (const mode of ['webcrypto', 'custom']) {
    application = await startExample({ mode, port: 0, pool, keys });
    const origin = application.origin;
    const port = application.port;
    browser = await launch();
    let page = browser.pages()[0];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin);
    await page.locator('#login button#login').click();
    await page.locator('#own-card').waitFor({ state: 'visible' });
    const requests = [];
    page.on('request', (request) => {
      if (request.url().startsWith(origin))
        requests.push({
          url: request.url(),
          body: request.postData() ?? '',
          headers: request.headers(),
        });
    });
    await page.context().setOffline(true);
    await page.locator('#card-number').fill('4242 4242 4242 4242');
    assert.equal(await page.locator('#card-number').getAttribute('type'), 'text');
    await page.locator('#card-save').click();
    await page.locator('#card-state').filter({ hasText: '末尾 4242' }).waitFor();
    assert.equal(await page.locator('#card-number').inputValue(), '');
    await page.context().setOffline(false);
    await use(page);
    assert.ok(
      requests.some((r) => r.url.endsWith('/api/secrets/use') && r.headers['rainfrog-auth']),
    );
    assert.ok(requests.every((r) => !r.body.includes('4242424242424242')));
    const stored = await page.evaluate(async () => {
      const db = await new Promise((resolve) => {
        const request = indexedDB.open('rainfrog-secrets-v1');
        request.onsuccess = () => resolve(request.result);
      });
      const state = await new Promise((resolve) => {
        const request = db.transaction('identities').objectStore('identities').getAll();
        request.onsuccess = () => resolve(request.result);
      });
      const value = state[0];
      let exportFailed = false;
      try {
        await crypto.subtle.exportKey('raw', value.aes);
      } catch {
        exportFailed = true;
      }
      return {
        serialized: JSON.stringify(value),
        aesExtractable: value.aes.extractable,
        exportFailed,
        wrapped: Boolean(value.exchange.wrapped),
      };
    });
    assert.equal(stored.aesExtractable, false);
    assert.equal(stored.exportFailed, true);
    assert.ok(!stored.serialized.includes('4242424242424242'));
    assert.equal(stored.wrapped, mode === 'custom');
    await page.reload();
    await page.locator('#card-state').filter({ hasText: '末尾 4242' }).waitFor();
    await use(page);
    await page.locator('#logout').click();
    await page.locator('#own-card').waitFor({ state: 'hidden' });
    await page.locator('#login button#login').click();
    await page.locator('#card-state').filter({ hasText: '末尾 4242' }).waitFor();
    // A lost response: the operation is committed, then the browser's connection is cut.
    let dropped = false;
    await page.route('**/api/secrets/use', async (route) => {
      if (!dropped) {
        dropped = true;
        await route.fetch();
        await route.abort();
      } else {
        await route.continue();
      }
    });
    const before = Number(
      (
        await pool.query(
          'SELECT count(*) FROM roster.secret_use_records_pii WHERE signing_key_id=$1',
          [keys.signingId],
        )
      ).rows[0].count,
    );
    await page.locator('#card-use').click();
    await page.locator('#card-accept').click();
    await page.locator('#card-retry').waitFor({ state: 'visible' });
    await page.locator('#card-retry').click();
    await page.locator('#card-accept').click();
    await success(page);
    const after = Number(
      (
        await pool.query(
          'SELECT count(*) FROM roster.secret_use_records_pii WHERE signing_key_id=$1',
          [keys.signingId],
        )
      ).rows[0].count,
    );
    assert.equal(after, before + 1);
    dropped = false;
    await page.locator('#card-use').click();
    await page.locator('#card-accept').click();
    await page.locator('#card-retry').waitFor({ state: 'visible' });
    await page.reload();
    await page.locator('#card-result').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#card-retry').isVisible(), false);
    await page.locator('#card-result').click();
    await success(page);
    await page.unroute('**/api/secrets/use');
    // Browser process restart must preserve non-extractable storage and exchange keys.
    await browser.close();
    browser = await launch();
    page = browser.pages()[0];
    await page.goto(origin);
    await page.locator('#card-state').filter({ hasText: '末尾 4242' }).waitFor();
    await use(page);
    await application.close();
    application = await startExample({ mode, port, pool, keys });
    await page.reload();
    await page.locator('#login-status').filter({ hasText: '未ログイン' }).waitFor();
    await page.locator('#login button#login').click();
    await page.locator('#card-state').filter({ hasText: '末尾 4242' }).waitFor();
    await use(page);
    if (mode === 'custom') {
      // Losing the local AES key must not leave an exchange secret wrapped by that old key.
      await page.evaluate(async () => {
        const db = await new Promise((resolve) => {
          const request = indexedDB.open('rainfrog-secrets-v1');
          request.onsuccess = () => resolve(request.result);
        });
        await new Promise((resolve, reject) => {
          const tx = db.transaction('identities', 'readwrite');
          const store = tx.objectStore('identities');
          const request = store.get(['secret-reference-custom', 'demo-user']);
          request.onsuccess = () => {
            const state = request.result;
            delete state.aes;
            store.put(state, ['secret-reference-custom', 'demo-user']);
          };
          tx.oncomplete = resolve;
          tx.onabort = () => reject(tx.error);
        });
      });
      await page.reload();
      await page.locator('#card-state').filter({ hasText: '読み出せません' }).waitFor();
      await page.locator('#card-number').fill('4242 4242 4242 4242');
      await page.locator('#card-save').click();
      await page.locator('#card-accept').click();
      await page.locator('#card-state').filter({ hasText: '末尾 4242' }).waitFor();
      await use(page);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#card-delete').click();
    await page.locator('#card-accept').click();
    await page.locator('#card-state').filter({ hasText: 'まだ保存していません' }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      `${mode}: offline save, non-extractable storage, signed use, reload, login, lost-response retry, result-only recovery, browser/server restart and delete passed`,
    );
    await browser.close();
    browser = undefined;
    await application.close();
    application = undefined;
  }
} finally {
  await browser?.close();
  await application?.close();
  await pool.query('DELETE FROM roster.secret_use_records_pii WHERE signing_key_id=$1', [
    keys.signingId,
  ]);
  await pool.end();
  await rm(profile, { recursive: true, force: true });
}
