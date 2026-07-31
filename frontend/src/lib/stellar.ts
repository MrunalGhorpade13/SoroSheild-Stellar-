import { isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import { Horizon, Networks } from '@stellar/stellar-sdk';

// Environment variables with fallbacks
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "CCW2POI2YQXF4R4I7W7TQRO73UQX5H4YOWI5755TQB3VGME4QLJOGQ5B";
export const STELLAR_NETWORK = import.meta.env.VITE_STELLAR_NETWORK || "testnet";
export const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC = import.meta.env.VITE_SOROBAN_RPC || "https://soroban-testnet.stellar.org";
export const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET || "GAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77JY";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Helper to check if Freighter wallet is installed and connected
export async function checkFreighter(): Promise<{ installed: boolean; connected: boolean; address: string | null }> {
  try {
    const status = await isConnected();
    if (!status || !status.isConnected) {
      return { installed: false, connected: false, address: null };
    }
    const access = await requestAccess();
    return { 
      installed: true, 
      connected: !!access.address, 
      address: access.address || null 
    };
  } catch (err) {
    console.error('Failed checking Freighter status:', err);
    return { installed: false, connected: false, address: null };
  }
}

// Helper to fetch XLM balance of an address using Horizon
export async function getXLMBalance(address: string): Promise<string> {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(address);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    return nativeBalance ? nativeBalance.balance : '0.0000000';
  } catch (err) {
    console.error('Failed fetching XLM balance:', err);
    return '0.0000';
  }
}

// Helper to sign transaction using Freighter
export async function signTxWithFreighter(xdr: string): Promise<string> {
  const networkPassphrase = STELLAR_NETWORK.toUpperCase() === 'MAINNET' || STELLAR_NETWORK.toUpperCase() === 'PUBLIC' 
    ? Networks.PUBLIC 
    : Networks.TESTNET;
  
  const result = await signTransaction(xdr, { networkPassphrase });
  
  if (result.error) {
    throw new Error(result.error);
  }
  if (!result.signedTxXdr) {
    throw new Error("User cancelled or transaction signing failed.");
  }
  return result.signedTxXdr;
}

// Helper to compute SHA-256 hash of a string
export async function computeCodeHash(code: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(code.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
