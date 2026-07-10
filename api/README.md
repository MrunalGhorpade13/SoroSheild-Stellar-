# SoroShield API - Fee-Sponsorship & Scanner Backend

This is the Express API server backend for SoroShield. It manages source code scan files, compiles findings using the scanner CLI, and wraps user transaction envelopes using **Stellar Fee-Bumps** to cover transaction costs for developers.

## 🛠️ Configuration & Setup

### Environment Variables
Create a `.env` file in this directory with the following variables:
* `PORT`: Port to listen on (default is 3001).
* `FEE_BUMP_SECRET`: Funded Stellar wallet secret key used to sponsor fee-bump transaction envelopes.
* `VITE_STELLAR_NETWORK`: Stellar network network passphrase (`testnet` or `public`).
* `VITE_HORIZON_URL`: Horizon endpoint URL (e.g. `https://horizon-testnet.stellar.org`).

### Run Local server
To start in development mode:
```bash
npm run dev
```

To run Jest route integration tests:
```bash
npm test
```
