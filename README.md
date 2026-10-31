# Client-Held Secrets for On-Demand Server Processing

[日本語](README.ja.md)

Updated 2026-10-31. A composition of established techniques with runnable reference implementations. A fictional-number prototype has been tested locally and on a development VPS. A [standalone example](example/README.md) has been reviewed and prepared for publication. This does not establish completion of the entire product.

## Start with the user experience

Enter a secret once, keep it in your browser, and provide it to the service only when it is needed. The provider reads it during the requested operation, then keeps a record of its use rather than the secret. This reduces repeated entry while avoiding the long-term accumulation of large quantities of secrets at the provider.

The fictional card-number example is: enter and save locally, confirm the target and purpose, request a format check, then verify the provider's signed completion record. Digits are visible during input; successful saving clears the input and displays only the last four. Saving does not transmit the number. This example performs no payment.

## Purpose and scope

Secrets are stored in the user's browser and delivered, encrypted, to the provider only when needed for a user-requested operation. The provider decrypts them, uses them for the specified operation, and discards temporary data. The aim is to reduce repeated data entry while minimizing the secrets retained by the provider.

The scope is secret data that attracts theft and that users can re-enter if lost. The provider does not retain a long-term ciphertext archive of users' secrets. Avoiding the accumulation of large quantities of secrets in the provider's database is central to this design.

The provider handles plaintext during the requested operation. This is not a scheme that hides the contents from the provider. It combines established key agreement, key derivation, authenticated encryption, and signatures.

## Overview

Storage and delivery use separate keys. The local original is encrypted with a browser storage key and decrypted only for use. For delivery, the user's and provider's X25519 keys produce a shared secret; HKDF derives a symmetric key from it. Authenticated symmetric encryption then protects the information needed for this operation.

In addition to HTTPS, this encryption layer keeps the contents encrypted through TLS termination and intermediate proxies until the designated provider processing decrypts them.

The application builds a manifest identifying the target and purpose, and sends it with the ciphertext. The whole body is covered by the Ed25519 request authentication included in the [reference](example/PROTOCOL.md). The provider checks authentication, authorization, and agreement with the requested operation before decryption, and retains a signed usage record without secret data after processing.

## Comparison with centralized provider storage

The comparison baseline stores secrets encrypted in the provider's database and decrypts them when needed using a key or decryption service separated from that database. The baseline is not plaintext storage. Both approaches use HTTPS and allow the provider to handle plaintext during processing.

### Storage location and availability for use

| Aspect | Encrypted centralized provider storage | This proposal |
|---|---|---|
| Continuing storage of the original | Ciphertext accumulates in the provider's database | Encrypted information stays in the user's browser |
| When information is delivered | At registration or update; subsequent operations read the provider's copy | When requesting an operation, delivering the information needed for that operation |
| What the provider can decrypt | Stored information within its decryption permissions | Information received for the current operation. The provider has no ciphertext archive of past secrets to decrypt |
| Theft of the database alone | Ciphertext alone does not necessarily reveal plaintext if appropriately separated keys remain unavailable | The provider database contains no ciphertext of the target secrets. Business data and usage records still require protection |
| Compromise of both the database and decryption capability | Stored information within the compromised permissions may be decrypted in bulk | There is no centralized archive from which to retrieve past secrets in the same way |
| Information retained after processing | Ciphertext for continued use and necessary business records | Business records and signed usage records without secrets. Temporary ciphertext, plaintext, and derived keys are discarded |

The main difference is the quantity and retention period of secrets at the provider, rather than a stronger choice of cipher. Centralized storage controls access to accumulated information. This proposal moves that accumulation to users and limits what the provider handles to requested operations.

X25519, HKDF, and authenticated encryption implement delivery at the time of use. The provider can decrypt received information, so discarding a derived key alone does not make retained ciphertext permanently undecryptable. The arrangement also depends on the provider not retaining a long-term ciphertext archive and discarding temporary data after processing.

### User experience and operation

| Aspect | Encrypted centralized provider storage | This proposal |
|---|---|---|
| Repeated use in the same browser | No re-entry needed because the provider holds a copy | No re-entry needed because the browser holds a copy |
| Another browser or new device | Stored information is readily available through the same account | The initial configuration requires re-entry in that browser |
| Loss of browser storage | The provider's original remains | Information whose original or storage key is lost must be re-entered |
| Processing while the user's browser is closed | Stored information can support scheduled and background operations | Delivery of new secret data starts with a browser request. Information from a completed operation is not retained for reuse on a later date |
| Backup and recovery | The provider manages recovery of secret ciphertext and decryption capability | There is no provider recovery mechanism for users' secrets; users resume by re-entering them |
| Usage records | Designed separately from storage; signed records can also be added | The design includes requests identifying a target and purpose, and signed usage records without secret data |

This makes the proposal suitable for secrets that are used repeatedly, can be re-entered if lost, and can be supplied by the browser when needed. Centralized storage offers convenience when immediate access across devices or continued use of stored information without the user present is important. Signed usage records are an operational element combined with this proposal, not a property automatically conferred by local storage.

## Keys and retained information

| Role | Information held or used |
|---|---|
| Local storage | A browser AES-GCM storage key, ciphertext, and necessary accompanying information, separated by application and user in IndexedDB |
| Delivery | X25519 key pairs held separately by the user and provider. Public keys are used to obtain a shared secret, and HKDF derives a delivery key |
| Request authentication | The user's Ed25519 authentication key signs the request, including its body |
| Usage-record signing | The provider's Ed25519 record-signing key, with a role separate from authentication and key agreement |

The product stores its AES-GCM storage key as a non-extractable WebCrypto key in IndexedDB. The storage key and user's X25519 key are reused within each application, user, and browser context. Changing the provider's delivery key does not require re-encrypting the local original.

The provider does not hold users' private keys or retain their encryption public keys for recovery. Users are not asked to manage or restore keys manually. If local stored information is lost, they resume by re-entering it.

The provider's private keys are kept separate from business data and source code, in access-restricted server configuration. A simple arrangement such as reading from `.env` is the baseline; placement and permissions are specified during implementation.

## Separate the roles

| Role | Current baseline | Meaning |
|---|---|---|
| Local storage | WebCrypto AES-256-GCM, non-extractable key, IndexedDB | Encrypt the stored record and detect content/context changes |
| Delivery | X25519, HKDF-SHA-512, AES-256-GCM | Derive the delivery key at both ends and bind ciphertext to its purpose/context |
| Request authentication | User Ed25519 authentication key | Bind a registered key to the destination and body; server authorization remains separate |
| Record | Provider's separate Ed25519 signing key | Verify the record against a trusted public key and detect alteration |
| Transport | HTTPS | Authenticate the connection and protect transport, including delivery of provider public keys |

The client X25519 public key is used for key agreement, not as a registered login key. Ed25519 request signatures authenticate the sender. An AEAD authentication tag and login authentication have different roles. Cryptography binds the declared purpose but cannot by itself enforce what the provider does after decryption; the processing implementation must honor that purpose.

## Cipher choices and implementation decisions

Delivery uses a current authenticated symmetric cipher that also detects changes to ciphertext. ChaCha20-Poly1305 and AES-GCM are examples. Each implementation specification defines its concrete combination of algorithm, key length, nonce, tag, and key derivation; sender and receiver use the same combination.

AES-GCM is selected when using a NIST-standard cipher is a requirement. That choice does not establish certification or conformance of the whole product. The current product design uses WebCrypto and AES-GCM for delivery, and also selects AES-GCM for local storage. The proposal's cipher options are distinct from this product implementation choice.

X25519 key pairs are reused; the shared secret and derived key obtained during processing are temporary. Discarding these temporary values does not mean that a new key pair is exchanged for every operation.

## Request and processing flow

1. In addition to HTTPS, this encryption layer keeps the contents encrypted through TLS termination and intermediate proxies until the designated provider processing decrypts them.

The application builds a manifest identifying the target and purpose. Users do not write it by hand.
2. The browser decrypts the required information using its local storage key.
3. The user's X25519 private key and the provider's public key produce a shared secret. A key derived with HKDF encrypts the data for delivery.
4. The manifest, ciphertext, user's public key, and necessary accompanying information form the request body. Ed25519 authentication signs the request including that body, and it is sent over HTTPS.
5. The provider checks request authentication, authorization, and agreement with the requested operation. Mismatches and insufficient permissions are rejected.
6. The provider's X25519 private key and the received public key produce the same shared secret and symmetric key. The provider decrypts the data and uses it for the specified operation.
7. Temporary data is cleaned up on success or failure. The prototype/reference implementations create a signed completion record for a successfully completed format check; they do not sign failure records for every rejected request.

There is no additional signature solely for the manifest. Existing request authentication binds the destination, login, and body. Its rules for replay and communication retries also apply; business operations handle duplicate-execution prevention where needed.

## Disposal and usage records

Received ciphertext, decrypted secrets, the shared secret, and the derived symmetric key remain in provider memory only during processing. They are not saved to databases, files, or logs. They are discarded at the end of processing, while the user's local original and reusable keys are retained. The reference overwrites mutable temporary buffers and releases unnecessary references and UI input. This does not prove erasure of JavaScript strings or physical memory managed by cryptographic engines and the OS.

A usage record describes who requested an operation, when, on what target, for what operation, and with what outcome. It contains neither the secret itself nor the full request body or manifest. The provider signs each record, enabling verification with the record, signature, and corresponding provider public key. Public keys needed to verify older records are retained after key changes.

The database also retains the SHA-512 hash of the exact encrypted request to recognize identical retries. Neither the request body nor its ciphertext is retained. This is not a no-records system.

The example obtains the provider verification key over the same HTTPS connection and displays the verified record. Independent later verification requires retaining the record and a trusted corresponding public key.

This signature establishes that the record was signed with the corresponding provider private key and has not subsequently been altered. It does not prove disposal of secret data or the absence of missing records.

## Protection boundaries

The design removes the route of taking accumulated secrets in bulk from the provider database. It assumes trusted HTTPS endpoint authentication and delivered code; compromised delivery code can also read saved information from visiting users.

Arbitrary same-origin browser code can use the storage key to decrypt saved secrets. Non-extractability restricts exporting a key, not using it. Protection against device compromise or theft of an entire browser profile depends on that environment's key storage.

The retained provider X25519 private key does not provide forward secrecy if that key and past traffic are later obtained. Making only the client key ephemeral would not change this property.

Signed records do not prove physical erasure, absence of purpose violations, or a complete audit trail. Since they omit the number, they do not prove which particular number was used.

## Continued use and data loss

| Situation | Behavior |
|---|---|
| Reload or browser restart | Reuse stored information and keys |
| Logout and subsequent login | Retain local information and keys; requests to the provider require an active login |
| Another browser | Generate keys in that browser and re-enter secrets. The initial configuration provides no synchronization or transfer |
| Loss of stored information or the storage key | Re-enter information that can no longer be read |
| Loss of only the X25519 key | Generate a new key pair; local information need not be re-entered |

Resuming authentication after losing an authentication key is separate from re-entering lost secret data.

## Relationship to prior work

Consulted versions and redistribution terms are listed in the [primary-source index](sources/README.md). The proposal combines the elements below; it does not implement the HPKE or signed-syslog protocols themselves.

| Primary source | Role in this proposal |
|---|---|
| [Privacy Considerations — RFC 6973](sources/rfc6973.txt), §§5.1.2, 6.1–6.2, 7.1 | Storage compromise, minimizing information/retention, and user participation; this proposal makes a concrete placement choice |
| [Payment Request API, 2022-09-08](sources/payment-request-20220908.html), §§3.3, 13.4, 14 | Prior user-mediated delivery of information to a site; this proposal does not implement browser-managed payment UI. That API does not specify our storage/delivery encryption, provider nonretention, or record signatures |
| [OAuth Rich Authorization Requests — RFC 9396](sources/rfc9396.txt), §§1–2, 4, 12 | A supporting comparison for structured operations/targets, not adoption of OAuth or authorization_details |
| [X25519 — RFC 7748](sources/rfc7748.txt) | Basis for key agreement using public keys to obtain a shared secret |
| [HKDF — RFC 5869](sources/rfc5869.txt) | Basis for deriving keys for their intended use from a shared secret |
| [HPKE — RFC 9180](sources/rfc9180.txt) | Prior specification combining public-key mechanisms, key derivation, and authenticated symmetric encryption. This proposal separately designs its reused keys and wire format |
| [ChaCha20-Poly1305 — RFC 8439](sources/rfc8439.txt), [GCM — NIST SP 800-38D](sources/nist-sp800-38d.pdf) | Specifications for authenticated symmetric ciphers suitable for delivery |
| [Web Cryptography Level 2](sources/webcrypto-2-20250422.html) | Foundation for key storage and cryptographic APIs, including an example combining X25519, HKDF, and AES-GCM. The archived version is a Working Draft |
| [Signed Syslog Messages — RFC 5848](sources/rfc5848.txt), [EdDSA — RFC 8032](sources/rfc8032.txt) | A prior specification for signing logs, and the definition of Ed25519 used here for record signatures |

## Implementation and references

See the [runnable example](example/README.md), [wire contract](example/PROTOCOL.md), and [validation record](example/VALIDATION.md). Parameters, retries/result queries, byte encodings and record formats are concrete. This composition does not inherit HPKE's wire compatibility or its security arguments wholesale.

WebCrypto is the practical baseline. The handwritten JavaScript version was built alongside the conceptual explanation to demonstrate the author's understanding of the algorithms and ability to implement them from scratch. Its code, implementation choices and measured checks provide that evidence. There is little practical need to choose it, and no claim that it outperforms WebCrypto.

| Component | WebCrypto baseline | Handwritten JS reference |
|---|---|---|
| Storage and request authentication | WebCrypto and existing Ed25519 request authentication | Same shared components |
| Delivery | WebCrypto X25519/HKDF-SHA-512/AES-256-GCM, received using Node crypto | cryptos-js X25519/HKDF-SHA-512/ChaCha20-Poly1305 at both ends |
| Record signature/verification | Node Ed25519 / WebCrypto | cryptos-js Ed25519 |
| Browser exchange private key | Non-extractable CryptoKey | Wrapped with the shared storage key, decrypted to bytes during custom computation |

The handwritten version still uses WebCrypto for storage/authentication. Different AEAD ciphertexts are not interchangeable; each fixed suite rejects the other version. BigInt constant-time behavior and physical-memory erasure are not guaranteed. A pinned [cryptos-js](https://github.com/yukihiro-asami/cryptos-js) snapshot and its MIT notice are included without modifications to its modules.

The earlier prototype was checked in Chrome and a dedicated database, then on a development VPS across OS restart and redeployment. The extracted examples have their own [validation results](example/VALIDATION.md). Identity verification is a fixture. Actual payments, this complete flow on Safari/Firefox/iOS, and physical-memory nonresidency have not been validated.

## Author and license

Yukihiro Asami. Original code and explanations: [MIT](LICENSE). Vendored libraries and archived primary sources retain their own notices and terms; see [sources](sources/README.md) and the reference provenance.
