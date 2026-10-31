# Reference wire contract / 参照実装の通信仕様

Both versions share local storage, request authentication and record semantics. The custom delivery suite has its own version/context and is accepted only by the custom server. This is a concrete composition of primitives, not HPKE wire compatibility. Product-prototype source: `949c7ebcef9f93d909a62e363714458368bbde23`.

## Context and encoding

`J(value)` means UTF-8 bytes of `JSON.stringify(value)` without whitespace. Context strings are used exactly, without Unicode normalization. Binary fields use canonical unpadded base64url. Unknown object fields, noncanonical encoding and invalid lengths are rejected. Body limit at the secret route: 8192 bytes (the shared HTTP reader has a separate 65536-byte limit).

The authenticated identity supplies `appId` and `userId`; the running loopback server supplies `origin`. Clients obtain their identity from `/auth/status` using a signed request; the response is ordinary JSON over the authenticated transport. Neither a user-provided manifest nor a login ID alone grants authority.

## Local store (both versions)

IndexedDB `rainfrog-secrets-v1`, object store `identities`, key `[appId,userId]` in the current origin. Each state contains a non-extractable AES-256-GCM key, generation/revision counters, encrypted card, exchange state and optional pending-operation metadata. Card plaintext: 13–19 ASCII digits after removing input whitespace/hyphens. No expiry or CVC.

12-byte random IV, 128-bit tag, ciphertext followed by tag. AAD:

```text
J(["rainfrog-card-storage-v1", origin, appId, userId, "own-card", storageKeyGeneration, itemRevision])
```

Generation/revision are positive safe integers. No plaintext number or plaintext last-four field is persisted. Last four digits are computed after local decryption. Saves are offline. Web Locks serialize writes; IndexedDB commits atomically; BroadcastChannel refreshes other tabs.

The baseline exchange state holds a non-extractable X25519 CryptoKey and raw 32-byte public key. The custom state holds version 2, raw public key, 12-byte IV and a wrapped 32-byte secret plus 16-byte tag. Wrapping uses the existing AES key and:

```text
J(["reference-custom-x-key-v1", origin, appId, userId, publicKey])
```

Custom computation decrypts this secret to bytes temporarily. This is not a stronger boundary against same-origin code. Regenerating a lost AES key also clears its old wrapped exchange state.

## Authenticated endpoints

- `GET /api/secrets/keys`: current `providerKeyId`, raw X25519 `publicKey`, `receiptKeys` map of key IDs to raw Ed25519 public keys.
- `POST /api/secrets/use`: the envelope below, carried inside the existing signed HTTP request.
- `POST /api/secrets/result`: exactly `{operationId}`; returns the signed record or `{status:"not_found"}` scoped to the authenticated app/user.

The shared fixture authentication uses non-extractable browser Ed25519 keys, signed enrollment confirmation and request signatures covering destination, method, target, content type, challenge and body hash. Challenge lifetime: 300 seconds; login: 3600 seconds, idle: 900 seconds. The challenge can be reused until expiry. Authentication state is in memory and disappears on server restart. These are inherited authentication components; full explanation belongs to the sibling proposal.

## Delivery envelope

Exactly these top-level fields:

```text
{
  version,
  manifest: {appId,userId,origin,operationId,target,purpose,itemRevision},
  providerKeyId, clientPublicKey, salt, iv, ciphertext
}
```

Target is `own-card`, purpose is `card-number-check`. `operationId` is a lowercase canonical UUID string used for operation identity, not a record's relational primary key. Provider key ID: 1–64 ASCII letters/digits/underscore/hyphen. Public key: 32 bytes; salt: 32 random bytes; nonce/IV: 12 random bytes; ciphertext+tag: 29–35 bytes. The provider rejects an all-zero X25519 shared secret.

X25519 uses the retained client private key and current provider public key. The client exchange public key is used for key agreement, not as a registered login identity; Ed25519 request authentication supplies that identity. HKDF-SHA-512 derives 32 bytes from the 32-byte shared secret and the fresh salt. Info:

```text
J([transferLabel, origin, appId, userId, providerKeyId, clientPublicKey])
```

AEAD additional authenticated data:

```text
J([useLabel, origin, appId, userId, operationId, "own-card", "card-number-check", itemRevision, providerKeyId, clientPublicKey, salt, iv])
```

| Suite | version | transferLabel | useLabel | AEAD |
|---|---|---|---|---|
| WebCrypto baseline | 1 | `rainfrog-card-transfer-v1` | `rainfrog-card-use-v1` | AES-256-GCM |
| Handwritten reference | 2 | `rainfrog-card-transfer-chacha-v2` | `rainfrog-card-use-chacha-v2` | ChaCha20-Poly1305, 256-bit key |

Both use 128-bit tags appended to ciphertext. There is no runtime negotiation or fallback. Each server rejects the other version before decryption. Common X25519/HKDF bytes can be compared; different AEAD ciphertexts cannot be interchanged.

## Processing, retries and records

After request authentication, the provider checks identity, shape, context and current key ID. It hashes the exact raw encrypted request body with SHA-512. A PostgreSQL transaction-scoped advisory lock serializes `[appId,userId,operationId]`, including first insertion. A matching existing row returns the original receipt; different raw bytes with the same operation identity return `operation_conflict` (409). Key validation precedes deduplication; after rotation, use the result endpoint to retrieve an old receipt.

The only operation is checking ASCII digit length. It has no external payment side effect. Its database transaction guarantees one recorded completion for identical retries. This is not a general exactly-once guarantee for external services.

Record payload:

```text
J(["rainfrog-secret-receipt-v1", recordIdDecimalString,
   appId, userId, operationId, "own-card", "card-number-check",
   itemRevision, completedAtISO8601UTC, "format-checked", signingKeyId])
```

Ed25519 signs the exact payload bytes. Response: `{payload,signature}` as base64url, 64-byte signature. Verification checks format, app/user/operation/revision, timestamp and retained signing-key ID, then signature. The baseline uses Node signing and WebCrypto verification; the custom version uses cryptos-js for both. The example obtains verification keys from the provider over the same authenticated transport and displays the receipt without persisting it. Independent later verification would require retaining the receipt and a trusted corresponding public key.

`roster.secret_use_records_pii` stores a bigint identity primary key, authenticated app/user, operation UUID, 64-byte request hash, payload, signature and signing-key ID. Unique `(app_id,user_id_pii,operation_id)`. It stores neither number/last-four nor encrypted request/manifest/public key. Completed successful checks receive records; rejected envelopes do not receive signed failure records. The signature proves the record's association with the key, not physical erasure, absence of missing records, or which particular card number was used.

The browser persists only `{operationId,purpose,itemRevision}` while a result is uncertain. Within the same page it retains the exact encrypted envelope for an identical retry. After reload it queries the result only. Not found does not prove nonexecution; ending the pending state is not cancellation. New use has a new operation ID.

## Cleanup and key lifecycle

Mutable temporary plaintext/shared-secret/derived-key buffers are overwritten in `finally`; unnecessary UI and request references are released. The server never deliberately writes secret data or the incoming envelope to files/logs/database. JavaScript strings, primitive implementation internals, crypto-engine copies, OS memory and crash behavior are not proven erased by these steps. The example is not deployed behind nginx and does not configure system core-dump limits.

Provider private keys are explicit files created once with restrictive permissions; no auto-creation on launch. Storage and delivery keys remain separate. Retaining the provider X25519 private key allows captured requests to be decrypted if that key is later compromised; using an ephemeral client key alone would not change this. Discarding a derived key does not provide forward secrecy.

## 日本語の要点

保存・要求認証・記録形式を共通にし、受け渡しだけを明示的な方式と世代で区別します。利用記録は成功した形式確認の完了記録であり、秘密情報の破棄証明ではありません。具体的なバイト列は上記のJSON配列で固定し、用途・利用者・オリジン・改訂を取り違えた要求を拒否します。詳細な操作・制約は[日本語README](README.ja.md)を参照してください。
