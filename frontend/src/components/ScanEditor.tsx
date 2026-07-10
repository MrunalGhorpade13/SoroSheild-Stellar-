import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Upload, FileCode, CheckCircle } from 'lucide-react';

interface ScanEditorProps {
  onScan: (code: string) => void;
  loading: boolean;
}

const DEFAULT_TEMPLATE = `use soroban_sdk::{contract, contractimpl, Address, Env, token};

#[contract]
pub struct TokenVault;

#[contractimpl]
impl TokenVault {
    // VULNERABLE: No require_auth check on the submitter
    pub fn withdraw(env: Env, token_addr: Address, to: Address, amount: i128) {
        let token_client = token::Client::new(&env, &token_addr);
        
        // VULNERABLE: Unchecked arithmetic used here
        let double_amount = amount + amount; 

        // VULNERABLE: Direct payout without verifying balance sufficiency
        token_client.transfer(&env.current_contract_address(), &to, &double_amount);
    }
}`;

export const ScanEditor: React.FC<ScanEditorProps> = ({ onScan, loading }) => {
  const [code, setCode] = useState<string>(DEFAULT_TEMPLATE);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          setCode(e.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleScanClick = () => {
    if (!code.trim()) {
      alert('Please enter some contract code before scanning.');
      return;
    }
    onScan(code);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[520px] card-hover">
      {/* Editor Control Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-stellar-blue" />
          <span className="font-semibold text-slate-700">Contract Workspace</span>
        </div>

        <div className="flex items-center gap-3">
          {/* File Upload Option */}
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all text-xs font-semibold">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload .rs File</span>
            <input
              type="file"
              accept=".rs"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Trigger Scan Button */}
          <button
            onClick={handleScanClick}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-stellar-blue text-white px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:bg-stellar-dark-blue active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Analyzing...' : 'Scan Contract'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="flex-1 w-full relative">
        <Editor
          height="100%"
          defaultLanguage="rust"
          theme="vs-light"
          value={code}
          onChange={(val) => setCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: loading,
            padding: { top: 12, bottom: 12 },
          }}
          loading={
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400 gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-stellar-blue border-t-transparent"></span>
              <span>Loading Monaco Editor...</span>
            </div>
          }
        />
      </div>
      
      {/* Editor footer */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-xxs text-slate-400 flex items-center justify-between">
        <span>Press "Scan Contract" to run a local pattern-based static audit.</span>
        <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> offline mode active</span>
      </div>
    </div>
  );
};
