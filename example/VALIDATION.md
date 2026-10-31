# Validation / 検証記録

2026-10-31. Local publication candidate; not committed or published. Results below belong to the standalone `example/` code, not just the earlier prototype.

Environment: macOS, Node.js **24.22.1**, PostgreSQL **17.10 (Homebrew)**, Google Chrome **156.0.8078.74**, Playwright **1.62.0**. Dedicated temporary PostgreSQL cluster with Unix-socket-only access; database `rainfrog_secret_reference_test`. No VPS or shared application database was used. Formatting was checked with Prettier 3.6.2 during preparation.

| Check | Result |
|---|---|
| `npm test` | 3 tests passed: custom X25519 public/shared bytes, HKDF-SHA-512, ChaCha20-Poly1305 ciphertext+tag and Ed25519 signatures agree with Node's independent implementation; altered tag/signature rejected; storage key export rejected; wrapped key bound to context; suite mismatch and zero shared secret rejected; both receipt verifiers reject wrong user/operation |
| `npm run test:db` | 2 tests passed, one per suite. Each sends 8 identical concurrent requests, receives one persistent signed completion record, then reopens the service and queries it. Conflicting raw-body retry, altered purpose/origin/key/revision/ciphertext/tag and foreign identity rejected; old receipt verifies with retained signing public key after provider rotation; raw route body is wiped |
| `npm run test:browser` | Both versions passed in real headless Chrome: offline local save, visible entry and empty saved input, no number in captured request bodies or serialized IndexedDB record, non-extractable AES key/export rejection, signed delivery, reload, logout/login, lost-response exact retry with one new DB row, reload then result-only recovery, browser process restart, server restart and re-login, deletion, 390px-width layout; custom AES-key loss followed by re-entry and new wrapped exchange-key creation |
| Key setup | `npm run init:keys` creates local provider files once; generated values are not printed and `.local/` is ignored by Git |
| Source snapshots | Vendored cryptos-js modules and authentication core retain source bytes. `ORIGIN.json` files identify commits and original hashes. Application adapters are separate |
| Formatting | Prettier applied only to adapted code; unchanged vendor modules were not formatted |

The initial browser run exposed an incorrect URL when extracting the page module; the URL was corrected and the full browser sequence passed for both versions. This was an example-packaging issue, not a change to the cryptographic contract.

## Earlier evidence, kept distinct

Product prototype commit `949c7ebcef9f93d909a62e363714458368bbde23`: 18 ordinary tests and 8 dedicated-DB tests, Chrome UI/error flows, and user-operated Ubuntu development-VPS deployment/restart/redeployment with saved-card reuse and original customer records preserved. That evidence motivates the extraction but does not replace the standalone results above.

The source records describe all tests; this example's tests do not reproduce every original scenario. In particular, the local example uses a DB-owner connection, so no least-privilege runtime-role claim is made for it. The original deployment's nginx buffering and systemd core-dump settings are not part of this standalone loopback server.

## Limits

- Identity verification is a one-user fixture; server login state is in memory. Both suites use the inherited request-authentication core.
- The operation checks number format only. No real card data, payment processor, actual payment, CVC or expiry handling was tested.
- This complete flow was not validated on Safari, Firefox or physical iOS devices.
- Byte-buffer cleanup is implemented; physical erasure inside JavaScript, cryptographic engines, the OS or temporary files is not demonstrated.
- Static X25519 keys do not provide forward secrecy against later key compromise plus captured encrypted requests.
- Record signatures do not prove disposal, all attempted operations, or the absence of missing records.
- External exactly-once business effects and production scalability are outside these checks.
- Claude review was received; the adopted corrections below are reflected. Publication is pending.

## 日本語

単独で切り出した参照実装を、上記の環境と専用試験DBで確認しました。通常試験3件、DB試験2件、Chromeで両版の一連の操作が成功しています。前工程の試作実証とは区別し、この例で再検証した内容だけを表に記載しました。実用の本人確認・実決済・他ブラウザ・物理メモリの非残存の検証ではありません。Claudeのレビューを受領し、採用した修正を反映しました。公開前の確認待ちです。

## Adopted review corrections / レビュー後の確認

2026-10-31: Adopted explanation corrections without changing the cryptographic contract. The bilingual proposal keeps the absence of a provider-side secret archive as its focus; transport/code trust, key-agreement versus sender authentication, forward secrecy and receipt verification are clarified briefly. `/auth/status` is documented as a signed request, not a signed response.

- Re-ran `npm test`: **3 passed**.
- Re-ran `npm run test:db`: **2 passed**, including new operation-ID and user-identity ciphertext substitutions in each suite. The substituted manifest matches the authenticated identity and passes structural checks; rejection is specifically `invalid_secret_envelope` at decryption. No result is stored for the substituted user. The receipt payload is also decoded from PostgreSQL bytea before checking for number content.
- Replaced URL `.pathname` with `fileURLToPath`. Copied the example to a temporary path containing spaces and Japanese characters, created keys there, started both CLI modes and checked each `/config` response. Both passed; the temporary copy and generated keys were removed.
- Added links to X25519, ChaCha20-Poly1305 and Ed25519 known-answer tests in cryptos-js at the vendored commit. The referenced source files were checked locally; these upstream tests were not newly executed in this review pass.
- UI and cryptographic algorithms are unchanged. The earlier full browser results remain applicable; a new full browser run was not performed for these documentation, path-conversion and test additions.

追加のDB試験では、単なる形式不一致による拒否と、暗号文の文脈を変えたことによる復号拒否を区別して確認しました。鍵管理・更新・記録保存・復旧機能の追加案は今回の仕様へ取り込んでいません。

## Independent local package / 独立したローカル配置

2026-10-31: Copied the publication candidate to `client-held-secrets-js`, with the bilingual proposal at the root, the runnable reference under `example/`, and selected unchanged primary sources under `sources/`. No JavaScript implementation was changed by this packaging step.

From this independent directory, `npm ci --ignore-scripts --no-audit --no-fund`, all 3 ordinary tests, both database tests and the complete Chrome flow for both suites passed. Fresh local provider-key initialization, schema initialization in the dedicated test database, and both CLI modes' `/config` responses also passed. Smoke-test servers were stopped after verification. The generated keys and installed dependencies are ignored by Git.

Relative documentation links, source-copy hashes and the unchanged 123-module cryptos-js snapshot were checked. This candidate is still local and uncommitted; GitHub publication awaits confirmation.

独立配置先から依存再現・通常試験3件・DB試験2件・Chromeでの両版の操作・鍵生成と起動手順を確認しました。ソースコードは元の検証済み版と同一です。ローカル成果物の確認地点で停止しており、GitHubへの作成・公開は行っていません。

## Publication approval / 公開承認

2026-10-31: The author confirmed the independent local package and authorized publication to `yukihiro-asami/client-held-secrets-js` under MIT for the original code and explanations. Earlier pending/local-only statements above record the preparation stages. The published commit identifies the released files; archived sources and vendored libraries retain their own terms.
