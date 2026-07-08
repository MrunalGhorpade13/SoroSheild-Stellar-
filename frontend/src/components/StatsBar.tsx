import React from 'react';
import { ShieldCheck, AlertTriangle, FileCheck } from 'lucide-react';

interface StatsBarProps {
  totalCertificates: number;
  totalIssues: number;
  loading: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({ totalCertificates, totalIssues, loading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {/* Total Scanned / Certificates */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
        <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Contracts Monitored</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {loading ? <span className="animate-pulse text-slate-300">...</span> : totalCertificates}
          </h3>
        </div>
      </div>

      {/* Total Issues Found */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
        <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Vulnerabilities Checked</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {loading ? <span className="animate-pulse text-slate-300">...</span> : totalIssues}
          </h3>
        </div>
      </div>

      {/* Certificates Issued */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
          <FileCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Certificates Issued</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {loading ? <span className="animate-pulse text-slate-300">...</span> : totalCertificates}
          </h3>
        </div>
      </div>
    </div>
  );
};
