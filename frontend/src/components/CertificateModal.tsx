import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Award, Sparkles, CheckCircle, Copy, ExternalLink, ArrowRight } from 'lucide-react';
import { buildMintTransaction } from '../lib/contract';
import { signTxWithFreighter, API_URL, STELLAR_NETWORK, HORIZON_URL } from '../lib/stellar';
import { TransactionBuilder, Networks } from '@stellar/stellar-sdk';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  codeHash: string;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  walletAddress: string | null;
  onSuccess: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  codeHash,
  criticalCount,
  warningCount,
  infoCount,
  walletAddress,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ txHash: string; ledger: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSponsored, setIsSponsored] = useState<boolean>(true);

  // Check if wallet was already sponsored in a simple backend query
  useEffect(() => {
    if (isOpen && walletAddress) {
      setErrorMsg(null);
      setSuccessData(null);
      checkSponsorshipStatus();
    }
  }, [isOpen, walletAddress]);

  const checkSponsorshipStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/status`);
      if (res.ok) {
        // Just verify endpoint is online
        setIsSponsored(true);
      }
    } catch {
      setIsSponsored(true);
    }
  };

  const handleMint = async () => {
    if (!walletAddress) {
      alert('Please connect your Freighter wallet to mint.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Build unsigned transaction via Soroban RPC simulation
      const txXdr = await buildMintTransaction(
        walletAddress,
        codeHash,
        criticalCount,
        warningCount,
        infoCount,
        'v1_0' // Scanner version
      );

      // 2. Sign transaction with Freighter
      const signedXdr = await signTxWithFreighter(txXdr);

      // 3. Submit transaction
      if (isSponsored) {
        const response = await fetch(`${API_URL}/api/feebump`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txXdr: signedXdr,
            walletAddress,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setSuccessData({ txHash: result.txHash, ledger: result.ledger });
          onSuccess();
          return;
        }

        // If backend returns already_sponsored, fall back to standard submit
        if (result.error === 'already_sponsored') {
          setIsSponsored(false);
          setErrorMsg('🎉 You have already claimed a fee-sponsored mint! Submitting as standard transaction...');
          
          await submitStandardTransaction(signedXdr);
        } else {
          throw new Error(result.message || 'Fee sponsorship submission failed.');
        }
      } else {
        await submitStandardTransaction(signedXdr);
      }
    } catch (err: any) {
      console.error('Minting failed:', err);
      setErrorMsg(err.message || 'Minting failed. Ensure your wallet has sufficient XLM balance.');
    } finally {
      setLoading(false);
    }
  };

  const submitStandardTransaction = async (signedXdr: string) => {
    const { Horizon } = await import('@stellar/stellar-sdk');
    const server = new Horizon.Server(HORIZON_URL);
    
    // Construct transaction envelope and submit
    const tx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
    const res = await server.submitTransaction(tx);
    
    setSuccessData({ txHash: res.hash, ledger: res.ledger });
    onSuccess();
  };

  function getNetworkPassphrase(): string {
    return STELLAR_NETWORK.toUpperCase() === 'MAINNET' || STELLAR_NETWORK.toUpperCase() === 'PUBLIC'
      ? Networks.PUBLIC
      : Networks.TESTNET;
  }

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/cert/${codeHash}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Shareable certificate URL copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-stellar-blue animate-pulse" />
            <h3 className="font-bold text-slate-800 text-base">Mint On-Chain Certificate</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!successData ? (
            <>
              {/* Vulnerabilities Summary */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Summary</h4>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="bg-white border border-slate-100 p-3 rounded-lg text-center shadow-xs">
                    <p className="text-xxs font-medium text-red-500 uppercase">Critical</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{criticalCount}</p>
                  </div>
                  <div className="bg-white border border-slate-100 p-3 rounded-lg text-center shadow-xs">
                    <p className="text-xxs font-medium text-amber-500 uppercase">Warning</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{warningCount}</p>
                  </div>
                  <div className="bg-white border border-slate-100 p-3 rounded-lg text-center shadow-xs">
                    <p className="text-xxs font-medium text-emerald-500 uppercase">Info</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{infoCount}</p>
                  </div>
                </div>
                <div className="mt-3.5 text-xxs font-mono text-slate-400 select-all truncate">
                  Code Hash: {codeHash}
                </div>
              </div>

              {/* Fee sponsorship banner */}
              {isSponsored && (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-4 flex items-start gap-3 shadow-md">
                  <Sparkles className="w-5 h-5 mt-0.5 shrink-0 animate-bounce" />
                  <div>
                    <h5 className="font-bold text-xs">🎉 Your first certificate is fee-sponsored!</h5>
                    <p className="text-xxs text-blue-100 mt-0.5 leading-relaxed">
                      SoroShield sponsors the network gas fees for first-time wallets. You only pay the 0.5 XLM scan fee.
                    </p>
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Breakdown</h4>
                <div className="bg-white border border-slate-100 rounded-xl p-4.5 space-y-3 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Scan Fee (On-Chain Store)</span>
                    <span className="font-semibold text-slate-800">0.50 XLM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Network Transaction Fee</span>
                    {isSponsored ? (
                      <span className="text-emerald-500 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">Sponsored</span>
                    ) : (
                      <span className="font-semibold text-slate-800">~ 0.0001 XLM</span>
                    )}
                  </div>
                  <hr className="border-slate-100" />
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Due</span>
                    <span>0.50 XLM</span>
                  </div>
                </div>
              </div>

              {/* Security Disclaimer */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-amber-800">Verify and Transparency Disclaimer</h5>
                  <p className="text-xxs text-amber-700 leading-relaxed mt-0.5">
                    This certificate acts as a transparency record showing that a static scan occurred and logging the exact issues found. It is <strong>not</strong> a guarantee of security and does <strong>not</strong> substitute a professional manual smart contract audit.
                  </p>
                </div>
              </div>

              {/* Error messages */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-xs text-red-700 leading-relaxed font-medium">
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center scale-110 shadow-md">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">Certificate Minted!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Your audit certificate has been successfully registered on the Stellar blockchain.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 w-full text-left space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ledger</span>
                  <span className="font-semibold text-slate-700">{successData.ledger}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Code Hash</span>
                  <span className="font-mono text-slate-500 truncate w-36 select-all" title={codeHash}>
                    {codeHash}
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-t border-slate-100 pt-2.5 mt-1">
                  <span className="text-slate-400">Transaction Link</span>
                  <a
                    href={`https://stellar.expert/explorer/${STELLAR_NETWORK}/tx/${successData.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stellar-blue hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>View on Stellar Expert</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* User Guide and Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-3 pt-3">
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Cert Link</span>
                </button>
                <button
                  onClick={onClose}
                  className="bg-stellar-blue text-white font-bold text-xs py-2.5 rounded-xl hover:bg-stellar-darkBlue transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <span>Close Window</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {!successData && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-all font-semibold text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMint}
              disabled={loading}
              className="bg-stellar-blue text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md hover:bg-stellar-darkBlue active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Minting...' : 'Approve & Mint'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
