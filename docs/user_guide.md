# SoroShield User Guide & Documentation

Welcome to SoroShield! SoroShield is a smart contract security console and registry certifier for Stellar's Soroban smart contract platform. This guide explains how to audit your contracts and manage on-chain credentials.

---

## 🛠️ Step-by-Step Walkthrough

### 1. Authenticate with the Console
1. When you first launch SoroShield, you will be prompted to set up local administrator credentials (stored securely in your browser's local storage).
2. Set up your administrator **Username** and **Password**.
3. Log in to gain access to the secure developer console dashboard.

### 2. Connect Your Wallet
1. Ensure you have the **Freighter Wallet Extension** installed in your browser.
2. Click the **Connect Wallet** button in the top header.
3. Switch the Freighter network dropdown to **Testnet** (or **Mainnet** for production registry checks).
4. Ensure your account is funded with XLM to cover signature inputs.

### 3. Conduct a Vulnerability Scan
1. Select the **Audit Workspace** from the left navigation.
2. You can use the pre-loaded template showing common vulnerabilities, upload a `.rs` contract file, or paste your own Rust contract code directly into the Monaco editor.
3. Click the blue **Scan Contract** button.
4. The AST static analysis engine will review the code and render findings grouped by severity (Critical, Warning, Info).

### 4. Mint Your On-Chain Certificate
1. Once your code checks out, click **Mint Certificate** inside the findings summary panel.
2. SoroShield's fee-bump sponsor backend will automatically check if you are eligible for a **gasless sponsored transaction**.
3. Confirm the mint and approve the transaction signature prompt in Freighter.
4. The backend wraps the transaction envelope inside a fee-bump and submits it directly to the Horizon server.

### 5. Verify in the Public Directory
1. Copy the contract code SHA-256 hash.
2. Navigate to the **On-Chain Registry** lookup page.
3. Paste the hash in the lookup box to pull details (submitter wallet, ledger number, audit timestamp, and security diagnostics) directly from the blockchain!
