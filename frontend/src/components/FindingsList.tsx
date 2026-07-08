import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, FileCode } from 'lucide-react';

export interface Finding {
  ruleId: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  line: number;
  codeSnippet: string;
}

interface FindingsListProps {
  findings: Finding[];
  scanCompleted: boolean;
  onMintClick: () => void;
  syntaxError?: { message: string; line: number; column: number } | null;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  scanCompleted,
  onMintClick,
  syntaxError,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const getSeverityStyles = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return {
          bg: 'bg-red-50 hover:bg-red-100/70',
          border: 'border-red-100',
          badge: 'bg-red-100 text-red-800',
          text: 'text-red-700',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 hover:bg-amber-100/70',
          border: 'border-amber-100',
          badge: 'bg-amber-100 text-amber-800',
          text: 'text-amber-700',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100/70',
          border: 'border-emerald-100',
          badge: 'bg-emerald-100 text-emerald-800',
          text: 'text-emerald-700',
          icon: <Info className="w-5 h-5 text-emerald-500" />,
        };
    }
  };

  // 1. Syntax Error Display
  if (syntaxError) {
    return (
      <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 flex flex-col h-[520px]">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-xl text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-800">Rust Compilation Syntax Error</h3>
            <p className="text-sm text-red-700 mt-1">
              The static analyzer failed to parse the source code due to a syntax issue on line {syntaxError.line}, column {syntaxError.column}.
            </p>
          </div>
        </div>

        {/* Error Details */}
        <div className="flex-1 mt-4 p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-sm overflow-auto">
          <p className="text-red-400 font-bold mb-1">Parser Error:</p>
          <p>{syntaxError.message}</p>
        </div>
        <div className="mt-4 text-xs text-slate-400">
          Tip: Ensure you are pasting valid Rust code compiled for Stellar's Soroban SDK.
        </div>
      </div>
    );
  }

  // 2. Initial state (No scan run yet)
  if (!scanCompleted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center h-[520px]">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 text-slate-400 mb-4 animate-bounce">
          <FileCode className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">Awaiting Contract Code</h3>
        <p className="text-sm text-slate-400 max-w-sm mt-1">
          Paste your Soroban Rust contract code in the editor workspace and hit "Scan Contract" to audit your code.
        </p>
      </div>
    );
  }

  // 3. Clean Scan state
  if (findings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center h-[520px]">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 text-emerald-500 mb-4 scale-105 transition-all">
          <Info className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-emerald-800">Code Looks Clean!</h3>
        <p className="text-sm text-slate-400 max-w-sm mt-1">
          No security vulnerabilities or layout deviations were flagged. You are ready to generate a certificate.
        </p>

        {/* Mint Button */}
        <button
          onClick={onMintClick}
          className="mt-6 bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all hover:bg-emerald-700 shadow-md active:scale-95"
        >
          Mint Audit Certificate
        </button>
      </div>
    );
  }

  // Group stats
  const criticals = findings.filter((f) => f.severity.toLowerCase() === 'critical').length;
  const warnings = findings.filter((f) => f.severity.toLowerCase() === 'warning').length;
  const infos = findings.filter((f) => f.severity.toLowerCase() === 'info').length;

  // 4. Scan Findings list
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[520px]">
      {/* Findings Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Static Audit Summary</h3>
          <p className="text-xs text-slate-400">Found {findings.length} points of interest</p>
        </div>

        {/* Badges and Mint Button */}
        <div className="flex items-center gap-2">
          {criticals > 0 && <span className="bg-red-100 text-red-800 text-xxs font-bold px-2 py-1 rounded">{criticals} Critical</span>}
          {warnings > 0 && <span className="bg-amber-100 text-amber-800 text-xxs font-bold px-2 py-1 rounded">{warnings} Warning</span>}
          {infos > 0 && <span className="bg-emerald-100 text-emerald-800 text-xxs font-bold px-2 py-1 rounded">{infos} Info</span>}

          <button
            onClick={onMintClick}
            className="ml-2 bg-stellar-blue text-white font-bold text-xs px-3.5 py-1.5 rounded-lg hover:bg-stellar-darkBlue transition-all shrink-0 active:scale-95 shadow-sm"
          >
            Mint Certificate
          </button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {findings.map((finding, index) => {
          const styles = getSeverityStyles(finding.severity);
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={index}
              className={`border border-slate-100 rounded-xl overflow-hidden transition-all shadow-sm ${styles.bg}`}
            >
              {/* Accordion header */}
              <button
                onClick={() => toggleExpand(index)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {styles.icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xxs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles.badge}`}>
                        {finding.ruleId}
                      </span>
                      <span className="text-slate-400 text-xs">Line {finding.line}</span>
                    </div>
                    <h4 className="font-semibold text-sm text-slate-800 mt-0.5">{finding.title}</h4>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Accordion content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-white/60">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {finding.description}
                  </p>

                  {/* Vulnerable Code snippet */}
                  {finding.codeSnippet && (
                    <div className="mt-3 bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
                      <p className="text-slate-500 font-bold mb-1">// line {finding.line}</p>
                      <pre>{finding.codeSnippet}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
