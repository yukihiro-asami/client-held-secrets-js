# Client-Held Secrets: Runnable Reference

[日本語](README.ja.md) · [Proposal](../README.md) · [Wire specification](PROTOCOL.md)

A reference implementation by Yukihiro Asami. Store a fictional card number in the browser, approve its use for one purpose, deliver it for a server-side format check, and verify the provider's signed record. Do not enter real card data. There is no payment, expiration-date or CVC processing.

The WebCrypto version is the practical baseline. The handwritten JavaScript version was built alongside the conceptual explanation to demonstrate understanding of the algorithms and the ability to implement them from scratch. There is little practical need to choose it over WebCrypto; no claim of better security or speed is made.

## Run locally

Use Node.js 24.22.1 or later and PostgreSQL. No build step. Run from this directory. Standard `PGHOST`, `PGPORT`, `PGUSER` and other PostgreSQL connection variables apply. The commands assume the local user can create and connect to a local database.

```sh
npm ci --ignore-scripts --no-audit --no-fund
createdb rainfrog_secret_reference
export PGDATABASE=rainfrog_secret_reference
npm run init:db
npm run init:keys
npm start
```

Open `http://127.0.0.1:3130/`. In another terminal with the same database settings, run from this directory:

```sh
npm run start:custom
```

The handwritten reference is at `http://127.0.0.1:3131/`. Use the literal `127.0.0.1` URLs; `localhost` is a different host and is rejected by the origin check. Different origins and app IDs keep the two logins and stores separate. These servers bind only to loopback. Local HTTP uses the browser's loopback secure-context exception; deployed applications require HTTPS.

Run `init:keys` only once: it creates `.local/keys/` outside Git and refuses to overwrite keys. Retain them across restarts. Stop with Ctrl+C. Loss of the signing key/public-key history affects old-record verification. The loader accepts `SECRET_RECEIPT_PUBLIC_FILE`, a JSON map such as `{"old-id":"base64url-raw-public-key"}`. The example launcher has fixed key IDs; rotation experiments must pass new IDs and retained public keys explicitly to `startExample`.

Only `rainfrog_secret_reference` and `rainfrog_secret_reference_test` are accepted as database names. `init:db` creates the `roster.secret_use_records_pii` table in an existing database. The local example uses a database owner connection; it does not provision the product's restricted runtime role.

## Try the flow

The UI is currently Japanese. Click “試験用の本人確認でログイン” (test login), enter `4242 4242 4242 4242`, and click “ブラウザに保存” (save locally). Digits remain visible while entering; saving clears the input and shows only the last four digits. Saving sends no number to the server.

Click “番号の形式確認に使う” (use for format checking), read the purpose, and confirm. A successful result displays “提供元の署名を確認済み” (provider signature verified). Reload or log out and in to reuse the saved original; delete it with “保存したカードを削除”.

Server restarts erase the fixture login state, so log in again. Browser keys/data and PostgreSQL records survive. Loss of browser data or the storage key requires re-entry; there is no synchronization or recovery service.

After an uncertain response, retry the identical request in the same page or query the previous result. Reload retains only pending-operation metadata and permits result lookup, not automatic ciphertext replay. A missing record does not establish that no operation ran. Ending the pending state does not cancel the operation.

## Two implementations

| Role | WebCrypto baseline | Handwritten JS reference |
|---|---|---|
| Local storage | WebCrypto AES-256-GCM, non-extractable key, IndexedDB | Same storage component |
| Request authentication | Existing WebCrypto/Node Ed25519 request authentication | Same component |
| Delivery | WebCrypto X25519 / HKDF-SHA-512 / AES-256-GCM, received with Node crypto | cryptos-js X25519 / HKDF-SHA-512 / ChaCha20-Poly1305 at both ends |
| Record | Node Ed25519 signing, WebCrypto verification | cryptos-js Ed25519 signing and verification |
| Browser X25519 private key | Non-extractable CryptoKey | Wrapped under the local AES-GCM key and decrypted to bytes for handwritten computation |

The handwritten version still uses WebCrypto for storage and request authentication. Wrapping under a key in the same browser is not an independent vault against malicious same-origin scripts. BigInt constant-time behavior and physical-memory erasure inside JavaScript or the OS are not guaranteed. Each server accepts one fixed suite/version; AES and ChaCha ciphertexts are not interchangeable. Record semantics and Ed25519 encoding are shared.

## Read the code

- `browser/secret-storage.js`: IndexedDB, pending operations, save/delete and tab coordination.
- `browser/secret-crypto.js`: WebCrypto delivery, shared local encryption and receipt validation.
- `browser/custom-crypto.js` and `custom-primitives.js`: key wrapping and adapters around unchanged handwritten primitives.
- `secret-wire.js`: validated wire fields, AAD and derivation context.
- `secret-service.js`: decryption/format check, temporary-buffer cleanup, database serialization and signed records.
- `server.js`: local launcher, fixed suite, authenticated routes and static assets.
- `vendor/rainfrog/core/`: pinned unchanged authentication/HTTP snapshot.
- `vendor/cryptos-js/`: pinned unchanged modules and their transitive imports.

## Verify

```sh
npm test
createdb rainfrog_secret_reference_test
export PGDATABASE=rainfrog_secret_reference_test
npm run init:db
npm run test:db
npm run test:browser
```

Browser checks require an installed Google Chrome. They use a temporary profile, the dedicated test database and generated test keys, then remove rows for their own signing-key ID. Database tests remove only their unique test users' rows. Tests reject the normal example database. See [VALIDATION.md](VALIDATION.md) for measured results and limitations, distinguished from earlier product-prototype results.

## Provenance and license

Example code: [MIT](LICENSE). cryptos-js commit `6f9909bda2536d8c14bf08a1ff3cdfe6291e240a`, unchanged modules with its MIT notice. Its file list and SHA-256 values are in `vendor/cryptos-js/ORIGIN.json`; see [cryptos-js](https://github.com/yukihiro-asami/cryptos-js) for the algorithm explanations.

The Rainfrog source commit is `949c7ebcef9f93d909a62e363714458368bbde23`; `ORIGIN.json` records original snapshot hashes. Secret components were adapted for this standalone example; the authentication core snapshot is unchanged. The pg and Playwright packages retain their own licenses. Primary-source documents have separate redistribution terms.

Primitive known-answer tests are available in cryptos-js at the same commit as the vendored modules: [X25519 / RFC 7748 §5.2](https://github.com/yukihiro-asami/cryptos-js/blob/6f9909bda2536d8c14bf08a1ff3cdfe6291e240a/tests/curve25519/x25519/ScalarmultCurve25519Test/test-01.js), [ChaCha20-Poly1305 / RFC 8439 §2.8.2](https://github.com/yukihiro-asami/cryptos-js/blob/6f9909bda2536d8c14bf08a1ff3cdfe6291e240a/tests/crypto/chacha20poly1305/Chacha20Poly1305EncryptTest/test-02.js), [Ed25519 / RFC 8032 §7.1](https://github.com/yukihiro-asami/cryptos-js/blob/6f9909bda2536d8c14bf08a1ff3cdfe6291e240a/tests/curve25519/ed25519/SignDetachedTest/test-02.js).
