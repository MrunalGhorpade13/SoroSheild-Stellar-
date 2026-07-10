# Building SoroShield: An Automated Soroban Security Scanner & On-Chain Certifier

Smart contract security is paramount in decentralized ecosystems. As the Stellar network embraces general-purpose smart contracts with Soroban, tools to verify code integrity and ensure safety are more important than ever.

Enter **SoroShield**—an open-source security suite designed to automatically scan Rust-based Soroban smart contracts for vulnerabilities and issue verifiable, on-chain audit certificates. 

In this post, we’ll dive deep into the technical architecture of SoroShield, exploring how it uses AST parsing in Rust, writes immutable stamps onto the Stellar ledger, and implements gasless transaction sponsorship using Stellar's fee-bump transactions.

---

## 🏛️ Architecture Overview

SoroShield consists of four main architectural layers:
1. **Rust Static Analyzer CLI (`/scanner`)**: Parses the Abstract Syntax Tree (AST) of the developer's Rust code to detect common vulnerabilities.
2. **Soroban Smart Contract (`/contracts/soroshield`)**: Implements an on-chain certificate registry that charges fees, updates global audit statistics, and records verified hashes.
3. **Express Sponsor API (`/api`)**: Runs the CLI scanner, tracks usage limits, and wraps transaction envelopes using **Stellar Fee-Bumps** to sponsor transactions.
4. **React Console (`/frontend`)**: A developer dashboard with wallet integration, interactive code editor (Monaco), and an audit certificate lookup directory.

---

## 🔍 Layer 1: AST Parsing in Rust with `syn`

Instead of relying on regex or simple string matching (which is prone to false negatives), SoroShield uses Rust’s `syn` crate to parse code into a syntax tree.

Using visitor patterns, we traverse the AST to inspect expressions, function calls, and struct definitions. The analyzer checks for 10 critical security rules, including:
* **Missing Auth Checks**: Ensures functions that modify state enforce `.require_auth()` on signature addresses.
* **Arithmetic Overflow**: Flags usage of raw `+` or `-` operators, recommending checked arithmetic (`checked_add`, `checked_sub`).
* **Unbounded Vectors**: Identifies dynamically growing storage lists that could cause resource exhaustion out-of-gas errors.

---

## ⛓️ Layer 2: On-Chain Registry Contract

Once a scan successfully verifies code, developers can mint a **Security Certificate**. The on-chain registry contract:
1. Validates the code hash.
2. Charges a scan fee (in XLM).
3. Updates global statistics (total audits, total issues).
4. Publishes a ledger event `CertificateMinted` for listeners to record index changes.

---

## ⚡ Layer 3: Gasless Transactions via Fee-Bumps

To onboard developers seamlessly, SoroShield utilizes **Stellar Fee-Bump Transactions** (SEP-supported fee sponsorship). 

When a developer clicks "Mint", SoroShield simulates the footprint in the browser and constructs the inner transaction envelope. Instead of submitting it directly, the frontend POSTs the transaction envelope (in XDR format) to our backend. 

The backend verifies the request and executes:

```typescript
const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
  sponsorKeypair.publicKey(),
  '1000000', // Max fee in stroops (1 XLM)
  innerTx,
  networkPassphrase
);
feeBumpTx.sign(sponsorKeypair);
```

This wraps the transaction so the sponsor covers the network fees, allowing gasless onboarding for developers!

---

## 🚀 Conclusion

SoroShield bridges the gap between static analysis and on-chain credibility, giving developers confidence before deploying to Stellar mainnet. 
