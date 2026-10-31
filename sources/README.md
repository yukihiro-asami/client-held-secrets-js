# Primary sources / 一次資料

Complete original documents consulted for [Client-Held Secrets](../README.md), copied without modification from the Rainfrog research archive. Notes in this index are the author's summaries, not publisher statements. HTML external assets are not bundled. Algorithm definitions and related design discussions do not establish conformance of this composition to HPKE or other protocols.

取得日：RFC 6973・RFC 9396・Payment Requestは2026-10-31、その他は2026-10-25。参照した一次資料を全文のまま保存し、元の著作権・状態・利用条件の表示を保持しています。

## Versions and original sources

| Saved document | Publisher and version/date | Original source | Relevance |
|---|---|---|---|
| [Edwards-Curve Digital Signature Algorithm (EdDSA), RFC 8032](rfc8032.txt) | RFC Editor / IRTF; Informational; January 2017 | [RFC text](https://www.rfc-editor.org/rfc/rfc8032.txt) | Ed25519 signatures |
| [Elliptic Curves for Security, RFC 7748](rfc7748.txt) | RFC Editor / IRTF; Informational; January 2016 | [RFC text](https://www.rfc-editor.org/rfc/rfc7748.txt) | X25519 key agreement |
| [HMAC-based Extract-and-Expand Key Derivation Function (HKDF), RFC 5869](rfc5869.txt) | RFC Editor / IETF; Informational; May 2010 | [RFC text](https://www.rfc-editor.org/rfc/rfc5869.txt) | Key derivation |
| [Hybrid Public Key Encryption, RFC 9180](rfc9180.txt) | RFC Editor / IRTF; Informational; February 2022 | [RFC text](https://www.rfc-editor.org/rfc/rfc9180.txt) | Composition of public-key mechanisms, key derivation, and authenticated encryption |
| [ChaCha20 and Poly1305 for IETF Protocols, RFC 8439](rfc8439.txt) | RFC Editor / IRTF; Informational; June 2018 | [RFC text](https://www.rfc-editor.org/rfc/rfc8439.txt) | Authenticated symmetric encryption |
| [Signed Syslog Messages, RFC 5848](rfc5848.txt) | RFC Editor / IETF; Standards Track; May 2010 | [RFC text](https://www.rfc-editor.org/rfc/rfc5848.txt) | Signed log records as prior work |
| [Web Cryptography Level 2](webcrypto-2-20250422.html) | W3C; First Public Working Draft; 2025-04-22 | [Dated publication](https://www.w3.org/TR/2025/WD-webcrypto-2-20250422/) | Browser use cases, key storage, Ed25519, X25519, HKDF, AES-GCM; example in §35.1 |
| [NIST SP 800-38D](nist-sp800-38d.pdf) | NIST; Morris Dworkin; November 2007 | [Original PDF](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf) · [DOI](https://doi.org/10.6028/NIST.SP.800-38D) | Galois/Counter Mode (GCM) and GMAC |
| [Privacy Considerations for Internet Protocols, RFC 6973](rfc6973.txt) | RFC Editor / IAB; Informational; July 2013 | [RFC text](https://www.rfc-editor.org/rfc/rfc6973.txt) | §5.1.2, §6.1–6.2, §7.1: stored data compromise, minimization of collection/use/retention, and user participation. The RFC notes limits on protocols controlling subsequent use or retention |
| [OAuth 2.0 Rich Authorization Requests, RFC 9396](rfc9396.txt) | RFC Editor / IETF; Standards Track; May 2023 | [RFC text](https://www.rfc-editor.org/rfc/rfc9396.txt) | §1–2, §4, §12: structured, specific authorization details and their enforcement. A comparison for purpose-bearing requests; the proposal does not implement OAuth RAR, and this RFC does not specify client secret storage |
| [Payment Request API](payment-request-20220908.html) | W3C Recommendation; 2022-09-08 | [Dated publication](https://www.w3.org/TR/2022/REC-payment-request-20220908/) | §3.3, §10, §13.4, §14.1/14.4/14.6–14.7: user approval and a payment response to the merchant. Related interaction pattern, not the proposal's cryptographic/storage protocol or a claim that it uses browser-managed payment UI |

## Redistribution and notices


### RFC documents

Each RFC retains its full copyright, status, and legal notices. Full unmodified redistribution is permitted under the applicable IETF Trust Legal Provisions; see [§3(c)(i)](https://trustee.ietf.org/documents/trust-legal-provisions/tlp-5/) and the terms identified in each RFC. The RFC files here, are unmodified complete copies, not modified RFCs. Publication dates determine the applicable version of the terms.

### Web Cryptography Level 2

The archived publication contains its W3C copyright notice and links to the **W3C Software and Document License (2023)**. The full license is also retained as [local HTML](w3c-software-document-license-2023.html), obtained from the [official license page](https://www.w3.org/copyright/software-license-2023/). The original document and its notices are unchanged. Its Working Draft status is retained.

### NIST SP 800-38D

Dworkin, Morris (2007), *Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC*, NIST Special Publication 800-38D, [doi:10.6028/NIST.SP.800-38D](https://doi.org/10.6028/NIST.SP.800-38D).

**Republished courtesy of the National Institute of Standards and Technology.**

The [NIST policy for Technical Series publications](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications) permits reprinting, including electronic distribution, of qualifying NIST-authored publications and requests the acknowledgment above. The original PDF is retained unchanged.


RFC 6973 and RFC 9396 retain their original copyright and status notices and are redistributed in full without modification under the applicable IETF Trust provisions identified in each RFC. RFC 6973 is covered by the [December 2009 provisions, §3(c)(i)](https://trustee.ietf.org/wp-content/uploads/IETF-TLP-4.pdf), whose effective period is recorded in the [official TLP archive](https://trustee.ietf.org/documents/trust-legal-provisions/). RFC 9396 is covered by the [March 2015 provisions, §3(c)(i)](https://trustee.ietf.org/documents/trust-legal-provisions/tlp-5/).

Payment Request's own copyright notice links to the **W3C Software and Document License (2015)**, despite the link text saying “permissive document license.” Its notices, status and original-source link are retained in the unchanged HTML. The license is already archived as [w3c-software-document-license-2015.html](w3c-software-document-license-2015.html), from the [official license page](https://www.w3.org/copyright/software-license-2015/). External stylesheets and other linked resources are not bundled.


## Saved-copy integrity (SHA-256)

| File | SHA-256 |
|---|---|
| `rfc6973.txt` | `94bb6027b22603c58728431ec4606a0f2a7aad569234322c55d6a91e22ffa06e` |
| `rfc9396.txt` | `d6a8f032d8a585daae1c33a8c7b6e539d199f886ec8cc1c7898436f7f2eed29c` |
| `payment-request-20220908.html` | `0ace0f4ea7c287e5f6c05bf16db4580ef8e94028bd1a66ba795582a7f201aece` |
| `rfc7748.txt` | `279ca0ecc5e92e2962e27b846986aeb74729d9dd34bd4a04a362f80dcb596ad3` |
| `rfc5869.txt` | `7a40eb3835b35fc947eb12a2ed614db079d43b26e50dbc537c31fba16397089c` |
| `rfc9180.txt` | `f45a8b7c30231b26d668b1e8168074e5ab514b174d656b67e859895117f1f8f6` |
| `rfc8439.txt` | `25bef70fbf7a07ff45c2fe4cb7c6ce954eac687413d8610603268b4e4415324c` |
| `rfc5848.txt` | `23169e504cf0303b8b2917ef39447113ceb12b6ef0df1ab70365a7f93ae3a4cc` |
| `rfc8032.txt` | `ed63657ff389301282b169b0abde9b5dd2c7e4d524fdfa5da6ff3094fc93c4c3` |
| `nist-sp800-38d.pdf` | `d99f3921ccebca049e7522426553aba071dae14ec3d5b6041e8c111a6cb57bba` |
| `webcrypto-2-20250422.html` | `e211cbfe5185afba44f2e0eed7fde1d2d649cbd0a82d136cd9ff360e58a48fa5` |
| `w3c-software-document-license-2015.html` | `e3ea81a3892d14b02f3effc82e97674733a9d0e2d410457cc17f0a5a83833461` |
| `w3c-software-document-license-2023.html` | `9234807e23edbf8f1058fd85e4d9bd19f2beebebcd8f74433cc59e8a54059771` |
