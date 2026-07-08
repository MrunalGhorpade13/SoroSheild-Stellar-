import {
  rpc,
  Contract,
  Address,
  Account,
  TransactionBuilder,
  Networks,
  nativeToScVal,
  scValToNative,
  xdr,
  Horizon,
} from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import { CONTRACT_ID, STELLAR_NETWORK, HORIZON_URL, SOROBAN_RPC } from './stellar';

export interface CertificateData {
  codeHash: string;
  submitter: string;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  scannerVersion: string;
  ledger: number;
  timestamp: number;
}

const rpcServer = new rpc.Server(SOROBAN_RPC);
const horizonServer = new Horizon.Server(HORIZON_URL);
const contract = new Contract(CONTRACT_ID);

function getNetworkPassphrase(): string {
  return STELLAR_NETWORK.toUpperCase() === 'MAINNET' || STELLAR_NETWORK.toUpperCase() === 'PUBLIC'
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

// Helper to invoke a read-only contract method using simulation
async function simulateReadOnly(methodName: string, args: xdr.ScVal[] = []): Promise<any> {
  const dummyAddress = "GAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77JY";
  const dummyAccount = new Account(dummyAddress, "1");

  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(0)
    .build();

  const simResult = await rpcServer.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationSuccess(simResult) && simResult.result?.retval) {
    return scValToNative(simResult.result.retval);
  }
  
  throw new Error(`Simulation failed for ${methodName}`);
}

// 1. Get stats: (total_certs, total_issues)
export async function getOnChainStats(): Promise<{ totalCertificates: number; totalIssues: number }> {
  try {
    const result = await simulateReadOnly('get_stats');
    return {
      totalCertificates: Number(result[0]),
      totalIssues: Number(result[1]),
    };
  } catch (err) {
    console.error('Failed to get stats:', err);
    return { totalCertificates: 0, totalIssues: 0 };
  }
}

// 2. Lookup certificate by code hash
export async function getCertificate(codeHashHex: string): Promise<CertificateData | null> {
  try {
    const hashBytes = Buffer.from(codeHashHex, 'hex');
    const scValHash = nativeToScVal(hashBytes, { type: 'bytes' });
    const result = await simulateReadOnly('get_certificate', [scValHash]);

    if (!result) return null;

    return {
      codeHash: codeHashHex,
      submitter: result.submitter,
      criticalCount: Number(result.critical_count),
      warningCount: Number(result.warning_count),
      infoCount: Number(result.info_count),
      scannerVersion: result.scanner_version,
      ledger: Number(result.ledger),
      timestamp: Number(result.timestamp),
    };
  } catch (err) {
    console.error(`Failed to lookup certificate for hash ${codeHashHex}:`, err);
    return null;
  }
}

// 3. List recent certificates
export async function listRecentCertificates(limit: number = 20): Promise<CertificateData[]> {
  try {
    const limitScVal = nativeToScVal(limit, { type: 'u32' });
    const result = await simulateReadOnly('list_recent_certificates', [limitScVal]);

    if (!result || !Array.isArray(result)) return [];

    return result.map((item: any) => {
      const hashHex = Buffer.from(item.code_hash).toString('hex');
      return {
        codeHash: hashHex,
        submitter: item.submitter,
        criticalCount: Number(item.critical_count),
        warningCount: Number(item.warning_count),
        infoCount: Number(item.info_count),
        scannerVersion: item.scanner_version,
        ledger: Number(item.ledger),
        timestamp: Number(item.timestamp),
      };
    });
  } catch (err) {
    console.error('Failed to list recent certificates:', err);
    return [];
  }
}

// 4. Build and simulate the mint_certificate transaction
export async function buildMintTransaction(
  submitterAddress: string,
  codeHashHex: string,
  criticalCount: number,
  warningCount: number,
  infoCount: number,
  scannerVersion: string
): Promise<string> {
  const accountResponse = await horizonServer.loadAccount(submitterAddress);
  const account = new Account(submitterAddress, accountResponse.sequenceNumber());

  const hashBytes = Buffer.from(codeHashHex, 'hex');
  
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      contract.call(
        'mint_certificate',
        nativeToScVal(Address.fromString(submitterAddress)),
        nativeToScVal(hashBytes, { type: 'bytes' }),
        nativeToScVal(criticalCount, { type: 'u32' }),
        nativeToScVal(warningCount, { type: 'u32' }),
        nativeToScVal(infoCount, { type: 'u32' }),
        nativeToScVal(scannerVersion, { type: 'symbol' })
      )
    )
    .setTimeout(0)
    .build();

  const simResult = await rpcServer.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationSuccess(simResult)) {
    const assembledTxBuilder = rpc.assembleTransaction(tx, simResult);
    const builtTx = assembledTxBuilder.build();
    return builtTx.toXDR();
  } else {
    throw new Error(`Simulation failed: ${JSON.stringify(simResult.error || simResult)}`);
  }
}
