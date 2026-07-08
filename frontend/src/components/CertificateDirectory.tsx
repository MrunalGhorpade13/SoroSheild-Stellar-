import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, AlertCircle, AlertTriangle, Info, Calendar, Database, ArrowRight } from 'lucide-react';
import { getCertificate, listRecentCertificates } from '../lib/contract';
import type { CertificateData } from '../lib/contract';

interface CertificateDirectoryProps {
  initialSearchQuery?: string | null;
}

export const CertificateDirectory: React.FC<CertificateDirectoryProps> = ({ initialSearchQuery }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CertificateData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [recentCerts, setRecentCerts] = useState<CertificateData[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Load recent certs on mount
  useEffect(() => {
    loadRecentCertificates();
  }, []);

  // Trigger search if url has an initial query
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery.length === 64) {
      setSearchQuery(initialSearchQuery);
      executeSearch(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const loadRecentCertificates = async () => {
    setLoadingRecent(true);
    try {
      const list = await listRecentCertificates(10);
      setRecentCerts(list);
    } catch (err) {
      console.error('Failed to load recent certificates:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const executeSearch = async (hash: string) => {
    setSearching(true);
    setHasSearched(true);
    setSearchResult(null);

    try {
      const cert = await getCertificate(hash);
      setSearchResult(cert);
    } catch (err) {
      console.error('Search query failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery.trim());
  };

  const handleRecentClick = (hash: string) => {
    setSearchQuery(hash);
    executeSearch(hash);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };

  return (
    <div className="space-y-8">
      {/* 1. Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-2">Verify Audit Certificate</h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Paste the SHA-256 code hash of any Soroban smart contract to check if it was audited with SoroShield and inspect findings.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Enter 64-character contract code SHA-256 hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-stellar-blue focus:bg-white transition-all text-slate-700 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="bg-stellar-blue text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-stellar-darkBlue active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            {searching ? 'Checking...' : 'Verify'}
          </button>
        </form>
      </div>

      {/* 2. Search Result Panel */}
      {hasSearched && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Search Result</h3>

          {searching ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <span className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-stellar-blue border-t-transparent"></span>
              <span>Querying Stellar Ledger...</span>
            </div>
          ) : searchResult ? (
            /* Certificate details */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">On-Chain Certificate Found</h4>
                    <p className="text-xxs font-mono text-slate-400 truncate w-60 sm:w-80 mt-0.5" title={searchResult.codeHash}>
                      Hash: {searchResult.codeHash}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4.5 text-xs text-slate-600 leading-relaxed font-medium">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Submitter Wallet</span>
                    <span className="font-mono text-slate-800 break-all">{searchResult.submitter}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Ledger Number</span>
                    <span className="font-semibold text-slate-800">{searchResult.ledger}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/50 pt-2.5 mt-1.5 flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Audited on {formatDate(searchResult.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Breakdown */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4.5 flex flex-col justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">Static Analysis Results</h5>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg font-semibold">
                      <span className="flex items-center gap-1.5"><AlertCircle className="w-4.5 h-4.5" /> Critical issues</span>
                      <span>{searchResult.criticalCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg font-semibold">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-4.5 h-4.5" /> Warnings</span>
                      <span>{searchResult.warningCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg font-semibold">
                      <span className="flex items-center gap-1.5"><Info className="w-4.5 h-4.5" /> Info logs</span>
                      <span>{searchResult.infoCount}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xxs text-slate-400 leading-relaxed mt-4">
                  Scanner version: <span className="font-mono">{searchResult.scannerVersion}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">No Certificate Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  This code hash is not registered on the Stellar blockchain. Ensure the contract code was scanned and minted successfully.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Recent Feed */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-bold text-slate-800">Public Scan Feed</h3>
          </div>
          <button
            onClick={loadRecentCertificates}
            className="text-xs font-semibold text-stellar-blue hover:text-stellar-darkBlue"
          >
            Refresh Feed
          </button>
        </div>

        {loadingRecent ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <span className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-slate-300 border-t-transparent"></span>
            <span>Fetching rolling registry...</span>
          </div>
        ) : recentCerts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No certificates have been issued on the blockchain yet. Be the first to mint!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-xxs font-bold">
                  <th className="py-3 px-2">Code Hash</th>
                  <th className="py-3 px-2">Submitter</th>
                  <th className="py-3 px-2 text-center">Issues</th>
                  <th className="py-3 px-2">Date Issued</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {recentCerts.map((cert) => (
                  <tr key={cert.codeHash} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 font-mono text-stellar-blue select-all max-w-[150px] truncate" title={cert.codeHash}>
                      {cert.codeHash}
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-500" title={cert.submitter}>
                      {truncateAddress(cert.submitter)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="inline-flex gap-1.5 font-bold">
                        {cert.criticalCount > 0 && <span className="text-red-500">{cert.criticalCount}C</span>}
                        {cert.warningCount > 0 && <span className="text-amber-500">{cert.warningCount}W</span>}
                        {cert.criticalCount === 0 && cert.warningCount === 0 && <span className="text-emerald-500">Clean</span>}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-400">{formatDate(cert.timestamp)}</td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleRecentClick(cert.codeHash)}
                        className="inline-flex items-center gap-1 text-stellar-blue font-bold hover:underline"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
