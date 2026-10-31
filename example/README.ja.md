# ブラウザに保管し、必要なときだけ使う秘密情報

[English](README.md) · [方式の説明](../README.ja.md) · [通信仕様](PROTOCOL.md)

浅見幸宏による概念説明用の参照実装です。架空のカード番号をブラウザに保存し、用途を確認して提供元へ渡し、番号の形式確認と署名付き利用記録の検証までを実行します。実際のカード情報は入力しないでください。決済・有効期限・CVCは扱いません。

WebCrypto版を実用上の基本とします。独自JS版は概念説明に合わせて作ったもので、暗号アルゴリズムと計算手順を理解し、自力実装できることをコードで示すために添えています。独自版を実務で採用する必要性は小さく、WebCryptoより安全・高速だとは主張しません。

## 起動

Node.js 24.22.1以降とPostgreSQLを用意します。ビルドは不要です。このディレクトリをカレントディレクトリにしてください。DBの接続には通常の `PGHOST`・`PGPORT`・`PGUSER` 等を使います。以下はローカルの現在のユーザーがDBを作成・接続できる環境の例です。

```sh
npm ci --ignore-scripts --no-audit --no-fund
createdb rainfrog_secret_reference
export PGDATABASE=rainfrog_secret_reference
npm run init:db
npm run init:keys
npm start
```

WebCrypto版は `http://127.0.0.1:3130/`。別のターミナルでも同じDB接続環境変数を設定し、このディレクトリで次を実行すると独自JS版が起動します。

```sh
npm run start:custom
```

独自JS版は `http://127.0.0.1:3131/`。両版のアプリIDとオリジンが異なるため、ログインと保存領域は独立します。外部公開用サーバーではなく、127.0.0.1だけに待ち受けるローカル実証です。ローカルHTTPはブラウザが許すsecure contextを使い、製品の通信はHTTPSを前提にします。

`init:keys` は一度だけ実行します。鍵はGit対象外の `.local/keys/` に作成し、既存の鍵を上書きしません。再起動時は同じ鍵を使います。サーバーを止めるにはCtrl+C。鍵を失うと過去の記録の検証に影響します。鍵更新・旧公開鍵保持は `SECRET_RECEIPT_PUBLIC_FILE` に `{"old-id":"base64urlのraw公開鍵"}` のJSONを渡す部品を備えますが、この起動例は鍵ID固定なので、更新実験では `startExample` へ新しいIDと旧公開鍵一覧を明示してください。

DB名は `rainfrog_secret_reference` または試験用 `rainfrog_secret_reference_test` だけを受け付けます。`init:db` は接続先DBを作成せず、`roster.secret_use_records_pii` を作ります。公開例はローカルのDB所有者接続を想定し、製品の最小権限ロールの構築手順は含めません。

## 操作

1. 「試験用の本人確認でログイン」を押す。これは一人分のfixtureで、実用の本人確認ではありません。
2. `4242 4242 4242 4242` を入力して「ブラウザに保存」。番号は入力中に見え、成功後は入力欄が空になります。保存操作では番号を送信しません。
3. 「番号の形式確認に使う」を押し、用途の説明を確認して実行。
4. 形式確認の完了と「提供元の署名を確認済み」を確認。
5. 再読込・ログアウトと再ログイン後も、再入力せず使えます。「保存したカードを削除」で原本を削除できます。

サーバー再起動で試験ログイン状態は失われます。手元の番号・鍵は残るので再ログインします。利用記録はPostgreSQLに残ります。ブラウザの保存領域・保存鍵を失った場合は再入力します。同期・バックアップ機能はありません。

応答が不明な場合は、同一ページ内の「同じ要求を再送」または「前回の結果を確認」を使います。再読込後は暗号化要求を再送せず結果照会だけを行います。記録未発見は未実行の証明ではありません。「確認待ちを終了」は取り消しではありません。

## 両版の違い

| 役割 | WebCrypto基本版 | 独自JS参照版 |
|---|---|---|
| 手元保存 | WebCrypto AES-256-GCM・取り出し不可鍵・IndexedDB | 同じ保存部品 |
| 要求認証 | WebCrypto/NodeのEd25519による既存要求認証 | 同じ部品 |
| 受け渡し | WebCrypto X25519 / HKDF-SHA-512 / AES-256-GCM、Node標準暗号で受信 | cryptos-js X25519 / HKDF-SHA-512 / ChaCha20-Poly1305で送受信 |
| 利用記録 | Node Ed25519署名・WebCrypto検証 | cryptos-js Ed25519署名・検証 |
| X25519秘密鍵 | 取り出し不可CryptoKey | AES-GCMでラップして保存し、独自計算中にバイト列へ復号 |

独自版も保存と要求認証にWebCryptoを使います。完全なWebCrypto不使用版ではありません。鍵ラップは同じブラウザの保存鍵によるもので、同一オリジンの悪意あるコードからの利用を防ぐ独立の金庫ではありません。BigIntの定時間性や、JavaScript・OS内部の物理メモリ消去は保証しません。

各版は固定の受信方式を持ち、異なる通信世代を拒否します。AESとChaChaの暗号文は相互復号できません。記録の意味とEd25519形式は共通です。

## ファイルの読み方

| ファイル | 内容 |
|---|---|
| `browser/secret-storage.js` | IndexedDB、保存・変更・削除、保留中操作、タブ間連携 |
| `browser/secret-crypto.js` | WebCrypto版、共通保存暗号、記録検証 |
| `browser/custom-crypto.js` | 独自JS接続、鍵ラップ、受け渡し・記録検証 |
| `custom-primitives.js` | 無改変のcryptos-js部品を使う小さな接続層 |
| `secret-wire.js` | 要求形式、付加認証データ、鍵導出の文脈 |
| `secret-service.js` | 復号・形式確認、一時バッファの後処理、DB直列化と記録署名 |
| `server.js` | ローカル起動、固定方式、認証付きルートと静的ファイル |
| `vendor/rainfrog/core/` | 既存要求認証・HTTP入口の固定スナップショット |
| `vendor/cryptos-js/` | 固定版の必要モジュールと依存先を無改変同梱 |

## 検証

```sh
npm test
createdb rainfrog_secret_reference_test
export PGDATABASE=rainfrog_secret_reference_test
npm run init:db
npm run test:db
npm run test:browser
```

ブラウザ試験にはインストール済みGoogle Chromeが必要です。試験は一時プロファイル、専用DB、試験生成鍵を使い、自分の署名鍵IDの行だけを後片付けします。DB試験も一意の試験利用者の行だけを削除します。通常の起動用DBへは試験を実行できません。

結果は [VALIDATION.md](VALIDATION.md) を参照。過去の製品試作の結果と、切り出した本例の結果を分けています。

## 取り込み元とライセンス

本例のコードは [MIT](LICENSE)。cryptos-jsは固定commit `6f9909bda2536d8c14bf08a1ff3cdfe6291e240a`、同梱MIT表示を保持します。ファイル一覧とSHA-256は `vendor/cryptos-js/ORIGIN.json`。元コードの読み方は[cryptos-js](https://github.com/yukihiro-asami/cryptos-js)へ。

Rainfrog試作からの取り込み元commitは `949c7ebcef9f93d909a62e363714458368bbde23`。`ORIGIN.json` は取り込み時のハッシュです。暗号・保存・画面・サービスは本例へ適応し、認証coreのスナップショットは無改変です。Node依存のpg・Playwrightは各パッケージのライセンスに従います。一次資料はコードのMITとは別の条件です。

暗号部品の既知解試験は、同梱版と同じcommitのcryptos-jsにあります：[X25519 / RFC 7748 §5.2](https://github.com/yukihiro-asami/cryptos-js/blob/6f9909bda2536d8c14bf08a1ff3cdfe6291e240a/tests/curve25519/x25519/ScalarmultCurve25519Test/test-01.js), [ChaCha20-Poly1305 / RFC 8439 §2.8.2](https://github.com/yukihiro-asami/cryptos-js/blob/6f9909bda2536d8c14bf08a1ff3cdfe6291e240a/tests/crypto/chacha20poly1305/Chacha20Poly1305EncryptTest/test-02.js), [Ed25519 / RFC 8032 §7.1](https://github.com/yukihiro-asami/cryptos-js/blob/6f9909bda2536d8c14bf08a1ff3cdfe6291e240a/tests/curve25519/ed25519/SignDetachedTest/test-02.js).

起動先は記載どおり `127.0.0.1` を使います。`localhost` は別ホストとしてアクセス元検査で拒否されます。
