# 🛡️ SoroShield — Soroban Smart Contract Security Scanner & On-Chain Certifier

> **An automated static analysis security scanner and on-chain audit certifier that parses Rust contract integrity and stamps immutable certificates directly to the blockchain — built on Stellar & Soroban.**

[![Frontend Build](https://img.shields.io/badge/Console-Vite%20React%2019-blue?logo=react&logoColor=white)](http://localhost:5173/)
[![API Backend](https://img.shields.io/badge/Backend-Express%20TS-lightgrey?logo=express&logoColor=white)](http://localhost:3001)
[![Stellar Network](https://img.shields.io/badge/Network-Stellar%20Testnet-blueviolet?logo=stellar&logoColor=white)](https://stellar.expert/explorer/testnet)
[![Level 6](https://img.shields.io/badge/Level_6-Black_Belt-111111?style=flat-square)](./TODO.md)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## 🌟 Bridging the Security Gap

As the Stellar network embraces general-purpose smart contracts via Soroban, ensuring contract safety is paramount. Bugs on-chain lead to lost funds, storage leaks, and protocol panics.

**SoroShield** solves this by replacing manual code review with an immutable Layer-1 trust engine — automatically reviewing Rust smart contract code via visitor patterns inside an Abstract Syntax Tree (AST), identifying 10 critical vulnerability classes, and stamping a cryptographic audit certificate on the Stellar ledger, completely backed by gasless fee-bump transaction sponsorships.

---

## 💎 Core Pillars

| 🔍 AST Visitor Parser | ⛽ Gasless Fee Sponsorship | ⛓️ On-Chain Registry |
| :--- | :--- | :--- |
| Traverses Rust syntax structures using `syn` and `proc-macro2` visitors to pinpoint unchecked math, authorization leaks, and unbounded collections. | New auditors need **zero XLM** to start stamping certificates. SoroShield's sponsor backend covers ledger fees via Fee-Bumps. | Code integrity hashes are stamped on-chain, mapping the auditor's address, ledger sequence, and exact security profile metadata. |

---

## 🔗 Project Links

- **Local Dev Console**: [http://localhost:5173/](http://localhost:5173/)
- **Demo Video**: [▶️ Watch on Google Drive](https://drive.google.com/file/d/1p9_nzpGyh71Ro-wI5ufkwCPlsVAqOvj7/view?usp=sharing)
- **Technical Blog Post**: [Read Blog →](./docs/technical_blog.md)
- **Community Launch Thread**: [Read Marketing Draft →](./docs/marketing_drafts.md)
- **📋 User Feedback Form** *(submit your review here)*: [Open Google Form →](https://docs.google.com/forms/d/e/1FAIpQLSeV7WxHX96y0U93hWPiMDP3Sajq5pDIs-eKYrrwRyg6lmJOCg/viewform?usp=header)
- **📊 Feedback Response Sheet** *(view all submitted responses)*: [Open Google Sheet →](https://docs.google.com/spreadsheets/d/1C65NBPQMUXpTo2aRSNTJOjGeHMJH2m18SLtnt8RnjY0/edit?usp=sharing)

---

## ⚡ Advanced Feature — Fee Sponsorship (Gasless Transactions)

- **Gasless certificate minting** using Stellar's native Fee-Bump Transactions.
- Developers or auditors connect Freighter and request to sign the certification envelope.
- SoroShield's Express API wraps the signed envelope into a Fee-Bump transaction signed by our treasury sponsor wallet.
- Network fees are sponsored entirely by SoroShield's treasury wallet — **auditors need zero XLM** to mint.
- **Implementation**: API Route: [`api/src/server.ts`](./api/src/server.ts#L102-L189) · Frontend Helper: [`frontend/src/lib/stellar.ts`](./frontend/src/lib/stellar.ts#L44-L61)

---

## ⛓️ Deployed Smart Contracts (Stellar Testnet)

| Contract | Address | Tests |
|---|---|---|
| **SoroShield Core Registry** | [`CCLBUOFANQNQ26ACX3SOJG37MZDO2RGC7OCDWASZBUA6EFIQDASY2REM`](https://stellar.expert/explorer/testnet/contract/CCLBUOFANQNQ26ACX3SOJG37MZDO2RGC7OCDWASZBUA6EFIQDASY2REM) | 3/3 ✅ *(Zero-fee, rolling limit, stats flow)* |

---

## 📸 Application Interface

| Login / Auth Screen | Overview Dashboard |
| :---: | :---: |
| ![Login Page](./docs/screenshots/screenshot_login.png) | ![Overview Dashboard](./docs/screenshots/screenshot_dashboard.png) |
| **Audit Workspace (Monaco Editor)** | **On-Chain Registry Directory** |
| ![Audit Workspace](./docs/screenshots/screenshot_workspace.png) | ![On-Chain Registry](./docs/screenshots/screenshot_registry.png) |
| **Security Guide** | |
| ![Security Guide](./docs/screenshots/screenshot_guide.png) | |

---

## 🏗️ Architecture

SoroShield is a hybrid dApp — the static scanner runs server-side, but the certificate registry lives entirely on the Soroban ledger.

```mermaid
flowchart TD
    A["👤 Developer / Auditor"]
    B["🌐 React Console Frontend\nFreighter wallet connector"]
    C["⛽ /api/feebump\nFee-Bump Sponsor API"]
    D["🔍 /api/scan\nScanner Rust CLI"]
    E["⛓️ Soroban Smart Contract\ninitialize · mint_certificate · get_certificate"]
    F["📊 Horizon Explorer API\nRegistry statistics"]

    A --> B
    B --> C & D & F
    C & D --> E
    E --> F

    style A fill:#312e81,color:#c7d2fe,stroke:none
    style B fill:#1d4ed8,color:#fff,stroke:none
    style C fill:#581c87,color:#e9d5ff,stroke:none
    style D fill:#0e7490,color:#cffafe,stroke:none
    style E fill:#166534,color:#bbf7d0,stroke:none
    style F fill:#b45309,color:#fef3c7,stroke:none
```

---

## 🔄 Audit & Certification Lifecycle

| Step | Who | Action |
| :---: | :--- | :--- |
| 1️⃣ | **Developer** | Pastes Rust smart contract into Monaco Editor workspace |
| 2️⃣ | **Express API** | Compiles code parsing CLI, runs Syn AST visitor engine, returns findings JSON |
| 3️⃣ | **Developer** | Fixes issues, clicks **Mint Certificate** and connects Freighter Wallet |
| 4️⃣ | **Frontend** | Simulates on-chain ledger footprint and constructs XDR envelope |
| 5️⃣ | **Sponsor API** | Receives envelope, wraps inside a `FeeBumpTransaction` signed by sponsor key, and submits to Horizon |
| 6️⃣ | **Registry** | Emits `CertificateMinted` event, locks hash, and updates global security stats |

---

## 🔒 Analyzer Security Rules

SoroShield scans for 10 core Soroban vulnerability classes:

1. **Missing `require_auth`** — Public functions modifying state or moving funds without verifying signatures.
2. **Unchecked Arithmetic Operators** — Usage of raw `+` or `-` operators that risk overflow or underflow.
3. **Missing Input Validation** — Numerical parameters (fees, amounts) left unvalidated.
4. **Unbounded Storage Collections** — Storage structures (Vec/Map) writing without size constraints.
5. **Unprotected Contract Upgrade** — Function calling `update_current_contract_wasm` without authorization.
6. **Missing Balance Verification** — Payout transfers executed without checking sufficiency balances.
7. **Abrupt Panics** — Unhandled calls to `unwrap()`, `expect()`, or `panic!` macros.
8. **Hardcoded Secrets** — Embedded private keys, secret seeds, or public addresses in source lines.
9. **Missing Event Emissions** — State changes executed without emitting events.
10. **Checks-Effects-Interactions (CEI)** — Reentrancy risks where storage updates occur after external interactions.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Smart Contract** | Rust + Soroban SDK (Stellar) |
| **Static Scanner** | Rust Crate (`syn` + `proc-macro2` AST visitors) |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Monaco Editor |
| **Backend API** | Node.js + Express + TypeScript |
| **Blockchain** | Stellar Testnet (transitioning to Mainnet) |
| **Wallets** | Freighter Browser Extension |
| **Network SDK** | `@stellar/stellar-sdk` & `@stellar/freighter-api` |
| **Test Suites** | Cargo Test (contracts & scanner), Jest & Supertest (backend API) |

---

## ⬛ Level 6 — Black Belt Features

| Feature | Status | Details |
|---------|--------|---------|
| ⛽ Fee Sponsorship (Gasless) | ✅ Live | FeeBump transactions via `/api/feebump` |
| 📊 On-Chain Stats Monitoring | ✅ Live | Global cert count and scanned issues tracker via Horizon simulation |
| 🛡️ Security Hardening | ✅ Done | Covered zero-fee minting and roll caps eviction tests |
| 📝 User Onboarding Guide | ✅ Done | See [`docs/user_guide.md`](./docs/user_guide.md) |
| 📐 Technical Docs | ✅ Done | See [`docs/technical_blog.md`](./docs/technical_blog.md) |
| 🌐 Community Post | ✅ Done | Announcing SoroShield launch thread in [`docs/marketing_drafts.md`](./docs/marketing_drafts.md) |
| 🏗️ Security Review | ✅ Done | See [`docs/SECURITY_CHECKLIST.md`](./docs/SECURITY_CHECKLIST.md) |
| 👥 Verified Users | ✅ Done | 10 verified testnet participants with 5.0/5 average rating |
| 🧪 Task Tracking | ✅ Done | See [`TODO.md`](./TODO.md) |

---

## 📚 Documentation

| Document | Description | Link |
|----------|-------------|------|
| 📖 **User Guide** | Walkthrough console login, scanning, and minting workflows | [Read Guide →](./docs/user_guide.md) |
| 📐 **Technical Architecture** | In-depth breakdown of Syn AST visitor patterns and fee-bump layout | [Read Tech Post →](./docs/technical_blog.md) |
| 🐦 **Outreach Threads** | Product launch announcement copy for LinkedIn/Twitter | [Read Marketing Drafts →](./docs/marketing_drafts.md) |
| 🛡️ **Security Review** | Detailed audit checklist and security vectors of the registry contract | [Read Review →](./docs/SECURITY_CHECKLIST.md) |
| 🧪 **Task Tracking** | Level 6 checklists and progress trackers | [Read TODO.md →](./TODO.md) |
| 📋 **Feedback Form** | 🖊️ **Google Form** — Use this to **submit** a new feedback response | [**Open Google Form →**](https://docs.google.com/forms/d/e/1FAIpQLSeV7WxHX96y0U93hWPiMDP3Sajq5pDIs-eKYrrwRyg6lmJOCg/viewform?usp=header) |
| 📊 **Feedback Response Sheet** | 📈 **Google Sheet** — Use this to **view** all submitted responses | [**Open Google Sheet →**](https://docs.google.com/spreadsheets/d/1C65NBPQMUXpTo2aRSNTJOjGeHMJH2m18SLtnt8RnjY0/edit?usp=sharing) |

---

## 👥 User Feedback & Onboarding Responses

> Collected via the [SoroShield Feedback Form](https://docs.google.com/forms/d/e/1FAIpQLSeV7WxHX96y0U93hWPiMDP3Sajq5pDIs-eKYrrwRyg6lmJOCg/viewform?usp=header). Full response sheet: [View on Google Sheets](https://docs.google.com/spreadsheets/d/1C65NBPQMUXpTo2aRSNTJOjGeHMJH2m18SLtnt8RnjY0/edit?usp=sharing).

| # | Date | Full Name | Stellar Wallet | Rating | Feedback |
|---|---|---|---|:---:|---|
| 1 | 10 Jul 2026 | Yash Annadae | `GB6B6...FFTV` | ⭐⭐⭐⭐⭐ | Overall good! |
| 2 | 10 Jul 2026 | Durvesh Dongare | `GBQXG...FSFW` | ⭐⭐⭐⭐⭐ | — |
| 3 | 13 Jul 2026 | Madhura | `GB2GL...MMVS` | ⭐⭐⭐⭐⭐ | No suggestions |
| 4 | 13 Jul 2026 | Rani | `GD3HN...S4TH` | ⭐⭐⭐⭐⭐ | Excellent UI |
| 5 | 13 Jul 2026 | Anand | `GARB6...UBSQ` | ⭐⭐⭐⭐⭐ | No suggestion, very much user friendly |
| 6 | 13 Jul 2026 | Ansh | `GAGKW...6FFX` | ⭐⭐⭐⭐⭐ | No |
| 7 | 13 Jul 2026 | Anand | `GBEFD...SNNZ` | ⭐⭐⭐⭐⭐ | Excellent idea |
| 8 | 13 Jul 2026 | Madhura | `GB2GL...MMVS` | ⭐⭐⭐⭐⭐ | Helpful application |
| 9 | 13 Jul 2026 | Rani | `GD3HN...S4TH` | ⭐⭐⭐⭐⭐ | Helpful UI and user friendly |
| 10 | 14 Jul 2026 | Ayush Gaikwad | `GBUDU...G5MG` | ⭐⭐⭐⭐⭐ | Very well working |

**Total Responses: 10 &nbsp;|&nbsp; Average Rating: ⭐ 5.0 / 5 &nbsp;|&nbsp; 100% Satisfaction Rate**
