# SoroShield: Soroban Smart Contract Security Scanner & On-Chain Audit Certifier

SoroShield is a smart contract security suite for the Stellar Soroban network. It combines a static analysis parser, an Express fee-sponsorship backend, and a React console interface to help developers identify vulnerabilities in Rust contracts and publish verifiable audit certificates stamped directly on the Stellar blockchain.

---

## 💻 Technical Architecture & Workflow

Here is how the components of SoroShield work together:

```
Developer (Browser)           React Frontend           Express API           Rust Scanner CLI          Stellar Testnet
         │                           │                      │                       │                          │
         │─── 1. Pastes Rust code ──>│                      │                       │                          │
         │    & clicks "Scan"        │                      │                       │                          │
         │                           │── 2. Computes Hash ─>│                       │                          │
         │                           │                      │                       │                          │
         │                           │── 3. POST /scan ────>│                       │                          │
         │                           │                      │── 4. Writes file ────>│                          │
         │                           │                      │── 5. Runs scanner ───>│                          │
         │                           │                      │                       │── 6. Parses AST ────────>│
         │                           │                      │                       │   (syn visitor patterns) │
         │                           │                      │<── 7. JSON findings ──│                          │
         │                           │<── 8. JSON findings ─│                       │                          │
         │                           │                      │                       │                          │
         │<── 9. Renders findings ───│                      │                       │                          │
         │                           │                      │                       │                          │
         │── 10. Click Mint & ──────>│                      │                       │                          │
         │    connect Freighter      │── 11. Simulate ────────────────────────────────────────────────────────>│
         │                           │<── 12. Gas Footprint ───────────────────────────────────────────────────│
         │                           │                      │                       │                          │
         │                           │── 13. Build Envelope ─>                      │                          │
         │                           │   with resources     │                       │                          │
         │<── 14. Requests Sign ─────│                      │                       │                          │
         │─── 15. Approves ─────────>│                       │                       │                          │
         │                           │── 16. POST /feebump ─>                       │                          │
         │                           │   (if eligible)      │── 17. Wraps fee-bump ───────────────────────────>│
         │                           │                      │   with sponsor key    │                          │
         │                           │                      │                       │                          │
         │                           │<── 18. Mint Event ───│──────────────────────────────────────────────────│
         │                           │   & registers hash   │                       │                          │
```

1. **Static Analysis Crate (`/scanner`)**: Uses Rust's Abstract Syntax Tree (AST) parsing (`syn` and `proc-macro2` crates) to run visitor patterns over Rust contract source files. It checks for 10 common security rules (including unauthorized operations, unchecked math, unbounded growth, and checks-effects-interactions).
2. **Express API Server (`/api`)**: Writes source code files to disk, executes the compiled scanner CLI, and acts as a **fee-bump sponsor** using the `@stellar/stellar-sdk` library to cover transaction fees for first-time developers.
3. **Soroban Smart Contract (`/contracts/soroshield`)**: Deployed on Stellar Testnet, this contract manages certificate state. It charges a `0.5 XLM` scan fee, registers audited code hashes, maps them to submitters/issue logs, and publishes ledger tracking events.
4. **React Console (`/frontend`)**: A sidebar-navigated, premium developer console utilizing Freighter Wallet for Web3 connectivity and a Monaco Workspace.

---

## 🛠️ Project Structure

```
SoroShield-Stellar/
├── scanner/               # Rust Static Analyzer Crate
│   ├── src/               # AST parsing visitor patterns (main.rs, parser.rs)
│   └── Cargo.toml         # Rust CLI parser configurations
├── contracts/             # Soroban Smart Contract Crate
│   └── soroshield/        # On-chain registry code (lib.rs)
├── api/                   # Express Sponsorship Backend API
│   ├── src/               # Express routes & SDK fee-bump signers (server.ts)
│   └── package.json       # Express dependencies
├── frontend/              # React Console Frontend
│   ├── src/               # Wallet connectors, Monaco terminal, directories
│   ├── package.json       # React, Vite, Tailwind CSS, Monaco editor
│   └── postcss.config.js  # Tailwind CSS v4 processor configurations
├── package.json           # Root monorepo workspace scripts
└── README.md              # Project documentation
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
* **Node.js** (v18+)
* **Cargo & Rust** (for compiling scanner or building contracts)
* **Freighter Wallet Extension** installed in your browser.

### 1. Install Dependencies
From the root project directory, run:
```bash
npm install
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in both the `/api` and `/frontend` folders:
* **Backend API (`api/.env`)**: Set `FEE_BUMP_SECRET` to your funded sponsor secret key.
* **React Frontend (`frontend/.env`)**: Set `VITE_CONTRACT_ID` to your deployed registry smart contract ID.

---

## 🏃 Running the Application

To start the API backend and Vite React server concurrently:
```bash
npm run dev
```
* **Express Backend**: Listening on `http://localhost:3001`
* **Vite React Console**: Open `http://localhost:5173`

---

## 🧪 Step-by-Step Testing Guide

### 1. Auth Login View
* Open `http://localhost:5173/`.
* Enter the credentials:
  * **Username**: `admin`
  * **Password**: `password`
* Alternatively, click **Connect Wallet** in the login box or top header to connect your Freighter account (starts with `G...`).

### 2. Run a Vulnerability Scan
* In the left sidebar navigation, select **Audit Workspace**.
* Paste your Rust contract code (or use the preloaded template showing vulnerabilities like missing auth checks and raw `+` arithmetic).
* Click the blue **Scan Contract** button.
* Renders 4 analysis findings: 1 Critical issue and 3 Warnings.

### 3. Mint On-Chain Certificate
* Connect your Freighter wallet and ensure the network dropdown in Freighter is set to **Testnet**.
* Ensure your wallet is funded with Testnet XLM (use the [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=testnet) to fund your Freighter address).
* Click **Mint Certificate**.
* Click **Approve & Mint** in the modal.
* Freighter will pop up a window. Approve the signature authorization.
* **On Success**: Shows a checkmark, transaction hash link, and copies a direct registry verification URL (e.g. `/cert/<codeHash>`).

### 4. Verify in Public Directory
* Paste the contract code hash in the **On-Chain Registry** lookup page or check the **Public Scan Feed** table at the bottom of the page to inspect recently issued certificates.
* The directory pulls details directly from the Stellar Testnet ledger!

---

## 👥 User Onboarding & Feedback
To continuously improve SoroShield, we are collecting feedback from early adopters:
* **Google Feedback Form**: [Submit Feedback here](PLACEHOLDER_GOOGLE_FORM_URL)
* **Exported User Responses**: [user_responses.xlsx](PLACEHOLDER_EXCEL_SHEET_URL)

### 📈 Future Improvements & Next Phase Evolution
Based on early feedback, here is our roadmap for the next development phase:
1. **Dynamic AST Visualizer**: Render a syntax tree path in the console to help developers trace down exactly where warnings are generated. Commit link: [git commit link](PLACEHOLDER_GIT_COMMIT_LINK_1)
2. **Stellar Asset Contract Integration**: Automate vulnerability checks for interactions with native SAC tokens. Commit link: [git commit link](PLACEHOLDER_GIT_COMMIT_LINK_2)
3. **Audit History Tracking**: Add search history caching to compare scan hashes over time. Commit link: [git commit link](PLACEHOLDER_GIT_COMMIT_LINK_3)

