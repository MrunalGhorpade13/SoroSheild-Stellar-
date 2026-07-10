import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Keypair, TransactionBuilder, Horizon, Networks, Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Setup middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit input payload size

const TEMP_DIR = path.join(__dirname, '../temp');
const SPONSORED_FILE = path.join(__dirname, '../sponsored.json');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(SPONSORED_FILE)) {
  fs.writeFileSync(SPONSORED_FILE, JSON.stringify([]));
}

// 1. Scan route: writes code to file, executes scanner, returns findings
app.post('/api/scan', (req: Request, res: Response): void => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ success: false, error: 'Code is required as a string.' });
    return;
  }

  const filename = `${uuidv4()}.rs`;
  const filepath = path.join(TEMP_DIR, filename);

  fs.writeFile(filepath, code, (err) => {
    if (err) {
      console.error('Failed to write temp file:', err);
      res.status(500).json({ success: false, error: 'Internal server error writing file.' });
      return;
    }

    // Path to the compiled Rust scanner binary
    // In dev, target/release/scanner.exe is located relative to api/
    const scannerPath = path.resolve(__dirname, '../../scanner/target/release/scanner.exe');

    // Run scanner CLI
    exec(`"${scannerPath}" "${filepath}"`, (execErr, stdout, stderr) => {
      // Clean up temp file
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete temp file:', unlinkErr);
      });

      if (execErr) {
        console.error('Execution error:', execErr, stderr);
        // If the scanner output some JSON before failing, we can try to parse it,
        // otherwise return a generic error.
        try {
          const parsed = JSON.parse(stdout);
          res.json(parsed);
        } catch {
          res.status(500).json({
            success: false,
            error: 'Failed to run code analysis. Make sure the scanner CLI is built.',
            details: stderr || execErr.message,
          });
        }
        return;
      }

      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (parseErr) {
        console.error('Failed to parse stdout JSON:', parseErr);
        res.status(500).json({
          success: false,
          error: 'Invalid JSON response from analysis engine.',
          raw: stdout,
        });
      }
    });
  });
});

// Helper to get network passphrase
function getNetworkPassphrase(): string {
  const network = process.env.VITE_STELLAR_NETWORK || 'testnet';
  return network === 'public' || network === 'mainnet'
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

// 2. Fee bump route: wraps transaction, signs as sponsor, submits
app.post('/api/feebump', async (req: Request, res: Response): Promise<void> => {
  const { txXdr, walletAddress } = req.body;

  if (!txXdr || !walletAddress) {
    res.status(400).json({ success: false, error: 'txXdr and walletAddress are required.' });
    return;
  }

  // Load configuration
  const sponsorSecret = process.env.FEE_BUMP_SECRET;
  const horizonUrl = process.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';

  if (!sponsorSecret) {
    console.error('FEE_BUMP_SECRET is missing from environment.');
    res.status(500).json({ success: false, error: 'Sponsorship feature is currently misconfigured.' });
    return;
  }

  try {
    // Check if wallet is already sponsored
    const sponsoredList: string[] = JSON.parse(fs.readFileSync(SPONSORED_FILE, 'utf-8'));
    const isAlreadySponsored = sponsoredList.includes(walletAddress.toLowerCase());

    if (isAlreadySponsored) {
      res.status(400).json({
        success: false,
        error: 'already_sponsored',
        message: '🎉 You have already claimed your fee-sponsored mint! Subsequent mints must cover their own network fees.',
      });
      return;
    }

    const networkPassphrase = getNetworkPassphrase();
    const sponsorKeypair = Keypair.fromSecret(sponsorSecret);

    // Build the inner transaction
    const innerTx = TransactionBuilder.fromXDR(txXdr, networkPassphrase);

    if (innerTx instanceof FeeBumpTransaction) {
      res.status(400).json({ success: false, error: 'invalid_transaction', message: 'Cannot fee bump a fee bump transaction.' });
      return;
    }

    // Build the outer Fee Bump transaction envelope.
    // The inner transaction is signed by the developer (user), while the outer fee-bump
    // is signed by the sponsor wallet. The network passphrase determines if this is Testnet or Mainnet.
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      sponsorKeypair.publicKey(),
      '1000000', // Max fee in stroops (1.0 XLM cap to prevent excessive consumption)
      innerTx,
      networkPassphrase
    );

    // Sign the outer wrapper transaction with the sponsor key pair secret.
    // After signing, the transaction contains the signature from both the user and the sponsor.
    feeBumpTx.sign(sponsorKeypair);

    // Submit transaction via Horizon
    const server = new Horizon.Server(horizonUrl);
    const submissionResult = await server.submitTransaction(feeBumpTx);

    // Update sponsored list on success
    sponsoredList.push(walletAddress.toLowerCase());
    fs.writeFileSync(SPONSORED_FILE, JSON.stringify(sponsoredList, null, 2));

    res.json({
      success: true,
      txHash: submissionResult.hash,
      ledger: submissionResult.ledger,
      message: '🎉 Your first certificate mint was successfully fee-sponsored and submitted!',
    });
  } catch (error: any) {
    console.error('Fee bump submission failed:', error);
    
    // Attempt to extract Horizon error messages
    let errMsg = 'Failed to submit transaction to the Stellar network.';
    if (error.response?.data?.extras?.result_codes) {
      const resultCodes = error.response.data.extras.result_codes;
      errMsg += ` Result codes: ${JSON.stringify(resultCodes)}`;
    } else if (error.message) {
      errMsg += ` Error: ${error.message}`;
    }

    res.status(500).json({
      success: false,
      error: 'submission_failed',
      message: errMsg,
      details: error.response?.data || error.toString(),
    });
  }
});

// Simple stats or info route
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    network: process.env.VITE_STELLAR_NETWORK || 'testnet',
    horizon: process.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    sponsoredCount: JSON.parse(fs.readFileSync(SPONSORED_FILE, 'utf-8')).length,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`SoroShield API Server is running on http://localhost:${PORT}`);
  });
}

export default app;
