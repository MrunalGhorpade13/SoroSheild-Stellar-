import React, { useState } from 'react';
import { BookOpen, AlertTriangle, ShieldCheck, Terminal, HelpCircle } from 'lucide-react';

interface Rule {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  whyItMatters: string;
  vulnerableCode: string;
  secureCode: string;
}

const RULES: Rule[] = [
  {
    id: "Rule 01",
    title: "Missing require_auth Check",
    severity: "critical",
    description: "Any public function modifying contract state, moving token balances, or upgrading wasm code must verify that the caller is authorized to execute it. In Soroban, this is done by calling address.require_auth().",
    whyItMatters: "Without require_auth, anyone on the network can call your state-modifying functions (e.g., withdrawing all pooled funds or taking over administration).",
    vulnerableCode: `pub fn withdraw(env: Env, to: Address, amount: i128) {
    let token_client = token::Client::new(&env, &token_addr);
    token_client.transfer(&env.current_contract_address(), &to, &amount);
}`,
    secureCode: `pub fn withdraw(env: Env, to: Address, amount: i128) {
    to.require_auth(); // Enforces caller authorization
    let token_client = token::Client::new(&env, &token_addr);
    token_client.transfer(&env.current_contract_address(), &to, &amount);
}`
  },
  {
    id: "Rule 02",
    title: "Unchecked Arithmetic Operator",
    severity: "warning",
    description: "Using raw arithmetic operators (+, -, *) can trigger silent wrapping overflows in release mode. Always use checked math functions to catch overflow errors safely.",
    whyItMatters: "Silent overflows can cause critical variables (like pool balances or lockup periods) to warp to unexpected values, leading to protocol collapse.",
    vulnerableCode: `let total = val1 + val2;`,
    secureCode: `let total = val1.checked_add(val2).unwrap_or(0);`
  },
  {
    id: "Rule 03",
    title: "Missing Input Validation",
    severity: "warning",
    description: "numerical parameter values (such as fee or transfer amount) must be checked to verify they are positive and within expected bounds before processing.",
    whyItMatters: "Negative inputs can lead to exploit patterns (e.g. depositing negative amounts to withdraw tokens, or negative interest rate calculations).",
    vulnerableCode: `pub fn deposit(env: Env, amount: i128) {
    // Directly increases balance without checking bounds
    let mut bal = env.storage().instance().get(&Key).unwrap_or(0);
    bal += amount;
    env.storage().instance().set(&Key, &bal);
}`,
    secureCode: `pub fn deposit(env: Env, amount: i128) {
    if amount <= 0 {
        panic!("Amount must be strictly positive");
    }
    let mut bal = env.storage().instance().get(&Key).unwrap_or(0);
    bal += amount;
    env.storage().instance().set(&Key, &bal);
}`
  },
  {
    id: "Rule 04",
    title: "Unbounded Storage Growth",
    severity: "warning",
    description: "Collections such as Vec or Map should not grow infinitely in persistent storage. Implement boundary limits or pruning routines.",
    whyItMatters: "Unlimited storage growth leads to massive gas usage during deserialization, which eventually hits resource limits and locks up the contract permanently (Dos/eviction).",
    vulnerableCode: `let mut list = storage.get(&Key).unwrap_or_else(|| Vec::new(&env));
list.push_back(val);
storage.set(&Key, &list);`,
    secureCode: `let mut list = storage.get(&Key).unwrap_or_else(|| Vec::new(&env));
if list.len() >= 20 {
    list.pop_front(); // Evicts oldest items to prevent memory leaks
}
list.push_back(val);
storage.set(&Key, &list);`
  },
  {
    id: "Rule 05",
    title: "Unprotected Contract Upgrade",
    severity: "critical",
    description: "The update_current_contract_wasm invocation updates the smart contract implementation. This method must be highly protected behind authorization guards.",
    whyItMatters: "If left unprotected, an attacker can overwrite the smart contract with malicious logic, immediately draining all locked funds and taking over state registries.",
    vulnerableCode: `pub fn upgrade(env: Env, new_wasm: Bytes) {
    env.update_current_contract_wasm(&new_wasm);
}`,
    secureCode: `pub fn upgrade(env: Env, new_wasm: Bytes) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    admin.require_auth(); // Only the designated admin can deploy upgrades
    env.update_current_contract_wasm(&new_wasm);
}`
  },
  {
    id: "Rule 06",
    title: "Missing Balance Verification",
    severity: "warning",
    description: "Transfers of tokens must verify that the contract's local pool balance is sufficient to cover the transaction before execution.",
    whyItMatters: "Skipping balance checks causes operations to crash mid-execution, resulting in incomplete state changes and a bad developer experience.",
    vulnerableCode: `token_client.transfer(&env.current_contract_address(), &to, &amount);`,
    secureCode: `let balance = token_client.balance(&env.current_contract_address());
if balance < amount {
    panic!("Insufficient contract reserves to fulfill withdrawal");
}
token_client.transfer(&env.current_contract_address(), &to, &amount);`
  },
  {
    id: "Rule 07",
    title: "Panics in Paths",
    severity: "info",
    description: "Avoid using panicking statements like panic!, unwrap(), or expect() directly in core functions. Fail gracefully using custom errors and Rust's Result pattern.",
    whyItMatters: "Panics immediately abort the transaction, making debugging on-chain difficult. Graceful errors return readable error codes that frontends can easily parse.",
    vulnerableCode: `let val = storage.get(&Key).unwrap();`,
    secureCode: `let val = storage.get(&Key).ok_or(ContractError::NotFound)?;`
  },
  {
    id: "Rule 08",
    title: "Hardcoded Secrets / Keys",
    severity: "critical",
    description: "Never hardcode public addresses, private keys, or seed phrases directly in contract source code.",
    whyItMatters: "Hardcoded addresses make the contract rigid (unable to migrate admin keys), while hardcoded private keys leak authority immediately upon publishing the source code.",
    vulnerableCode: `let admin_addr = Address::from_string(&env.current_contract_address()); // Hardcoded string`,
    secureCode: `let admin_addr: Address = env.storage().instance().get(&DataKey::Admin).unwrap(); // Loaded dynamically from storage`
  },
  {
    id: "Rule 09",
    title: "Missing Event Emission",
    severity: "info",
    description: "State-modifying functions should always emit events tracking the execution metadata and parameter updates.",
    whyItMatters: "Without events, indexing tools (like Mercury or Horizon) cannot track contract activity, making audits and frontend real-time updates extremely difficult.",
    vulnerableCode: `pub fn update_fee(env: Env, new_fee: i128) {
    env.storage().instance().set(&DataKey::ScanFee, &new_fee);
}`,
    secureCode: `pub fn update_fee(env: Env, new_fee: i128) {
    env.storage().instance().set(&DataKey::ScanFee, &new_fee);
    // Emit event for data indexing
    env.events().publish((Symbol::new(&env, "fee_updated"),), new_fee);
}`
  },
  {
    id: "Rule 10",
    title: "Checks-Effects-Interactions",
    severity: "warning",
    description: "Conform to the CEI pattern: perform input checks, perform state modifications (effects), and only then execute external contract calls (interactions).",
    whyItMatters: "Interacting with external contracts before modifying state introduces reentrancy risks where attackers re-enter your contract using stale state data.",
    vulnerableCode: `token_client.transfer(&env.current_contract_address(), &to, &amount);
storage.set(&Balance, &new_balance);`,
    secureCode: `storage.set(&Balance, &new_balance); // State effect first
token_client.transfer(&env.current_contract_address(), &to, &amount); // External interaction last`
  }
];

export const UserGuide: React.FC = () => {
  const [activeRuleIdx, setActiveRuleIdx] = useState(0);
  const activeRule = RULES[activeRuleIdx];

  const getSeverityStyles = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200/60';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      case 'info':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-slate-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] max-w-5xl mx-auto overflow-hidden animate-fade-in flex flex-col md:flex-row min-h-[580px]">
      
      {/* Sidebar Rules List */}
      <div className="w-full md:w-80 bg-[#FAFAFA] border-r border-slate-200/60 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200/60 bg-[#FFFFFF]">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen className="w-5 h-5 text-stellar-blue animate-float" />
            <h3 className="text-sm font-bold text-slate-800">Security Index</h3>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Select a vulnerability rule below to explore code remediations.
          </p>
        </div>
        
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[550px] flex-1">
          {RULES.map((rule, idx) => (
            <button
              key={rule.id}
              onClick={() => setActiveRuleIdx(idx)}
              className={`w-full text-left p-4.5 transition-all flex flex-col gap-1.5 cursor-pointer ${
                activeRuleIdx === idx
                  ? 'bg-[#FFFFFF] border-l-4 border-stellar-blue shadow-sm'
                  : 'hover:bg-[#F3F4F6]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{rule.id}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold capitalize ${getSeverityStyles(rule.severity)}`}>
                  {rule.severity}
                </span>
              </div>
              <h4 className={`text-xs font-bold transition-colors ${
                activeRuleIdx === idx ? 'text-stellar-blue' : 'text-slate-700'
              }`}>
                {rule.title}
              </h4>
            </button>
          ))}
        </div>
      </div>

      {/* Main Details View */}
      <div className="flex-1 p-8 bg-[#FFFFFF] flex flex-col justify-between">
        <div className="space-y-6">
          
          {/* Header Title */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className={`text-[10px] px-2.5 py-1 rounded-md border font-bold uppercase ${getSeverityStyles(activeRule.severity)}`}>
                {activeRule.id} &bull; {activeRule.severity}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{activeRule.title}</h2>
          </div>

          {/* Description & Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <h4 className="text-xxs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-stellar-blue" />
                Rule Definition
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-[#F8F9FA] p-4 rounded-xl border border-slate-100">
                {activeRule.description}
              </p>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xxs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Why It Matters
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/20 p-4 rounded-xl border border-amber-100/40">
                {activeRule.whyItMatters}
              </p>
            </div>
          </div>

          {/* Code Compare Blocks */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xxs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Remediation Comparison
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Vulnerable Code block */}
              <div className="bg-[#FFF5F5] border border-red-100 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="text-[10px] text-red-700 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-red-200/30 pb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                    Vulnerable Code Pattern
                  </div>
                  <pre className="text-[10px] font-mono text-red-900 leading-relaxed whitespace-pre overflow-x-auto max-w-full">
                    {activeRule.vulnerableCode}
                  </pre>
                </div>
              </div>

              {/* Secure Code block */}
              <div className="bg-[#F3FAF6] border border-emerald-100 p-4 rounded-xl flex flex-col justify-between animate-glow">
                <div>
                  <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-emerald-200/30 pb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Secure Remediated Pattern
                  </div>
                  <pre className="text-[10px] font-mono text-emerald-900 leading-relaxed whitespace-pre overflow-x-auto max-w-full">
                    {activeRule.secureCode}
                  </pre>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-slate-100 mt-6 pt-4.5 flex items-center gap-2 text-[10px] text-slate-400">
          <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
          <span>Select any other rule in the index sidebar to inspect its security safeguards.</span>
        </div>
      </div>

    </div>
  );
};
