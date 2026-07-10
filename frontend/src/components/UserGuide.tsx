import React from 'react';
import { BookOpen } from 'lucide-react';

export const UserGuide: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-8 max-w-4xl mx-auto animate-fade-in card-hover">
      {/* Introduction */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-stellar-blue animate-float" />
          <h3 className="text-lg font-bold text-slate-800">SoroShield Security Guide</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          SoroShield statically checks your Soroban Rust contract code for 10 common vulnerability categories. Below is the documentation of what each rule checks, why it matters, and how to write secure code.
        </p>
      </div>

      {/* Rules documentation list */}
      <div className="space-y-6">
        {/* Rule 1: missing require_auth */}
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1 bg-red-50 text-red-600 rounded border border-red-100 text-xxs font-bold uppercase mt-0.5 shrink-0">
              Rule 01
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Missing `require_auth` Check</h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                Any public function modifying contract state, moving token balances, or upgrading wasm code must verify that the caller is authorized to execute it. In Soroban, this is done by calling <code>address.require_auth()</code>.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-red-50/30 border border-red-100 p-3.5 rounded-lg text-xxs font-mono overflow-x-auto max-w-full">
              <p className="text-red-700 font-bold mb-1 select-none">// Vulnerable (Anyone can call withdraw)</p>
              <pre className="whitespace-pre overflow-x-auto text-[10px] leading-relaxed">{`pub fn withdraw(env: Env, to: Address, amount: i128) {
    let token_client = token::Client::new(&env, &token_addr);
    token_client.transfer(&env.current_contract_address(), &to, &amount);
}`}</pre>
            </div>
            <div className="bg-emerald-50/30 border border-emerald-100 p-3.5 rounded-lg text-xxs font-mono overflow-x-auto max-w-full">
              <p className="text-emerald-700 font-bold mb-1 select-none">// Secure (Authorized call only)</p>
              <pre className="whitespace-pre overflow-x-auto text-[10px] leading-relaxed">{`pub fn withdraw(env: Env, to: Address, amount: i128) {
    to.require_auth(); // Enforces caller auth
    let token_client = token::Client::new(&env, &token_addr);
    token_client.transfer(&env.current_contract_address(), &to, &amount);
}`}</pre>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Rule 2: Unchecked arithmetic */}
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1 bg-amber-50 text-amber-600 rounded border border-amber-100 text-xxs font-bold uppercase mt-0.5 shrink-0">
              Rule 02
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Unchecked Arithmetic Operator</h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                Using raw arithmetic operators like <code>+</code>, <code>-</code>, <code>*</code> can trigger silent wrapping overflows in release mode. Always use checked math functions like <code>checked_add</code> or <code>checked_sub</code> to catch overflow errors safely.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-amber-50/30 border border-amber-100 p-3.5 rounded-lg text-xxs font-mono overflow-x-auto max-w-full">
              <p className="text-amber-700 font-bold mb-1 select-none">// Vulnerable (Can overflow silently)</p>
              <pre className="whitespace-pre overflow-x-auto text-[10px] leading-relaxed">{`let total = val1 + val2;`}</pre>
            </div>
            <div className="bg-emerald-50/30 border border-emerald-100 p-3.5 rounded-lg text-xxs font-mono overflow-x-auto max-w-full">
              <p className="text-emerald-700 font-bold mb-1 select-none">// Secure (Safely handles overflow)</p>
              <pre className="whitespace-pre overflow-x-auto text-[10px] leading-relaxed">{`let total = val1.checked_add(val2).unwrap_or(0);`}</pre>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Remaining Rules short descriptions */}
        <div className="space-y-4.5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Analysis Checks</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 03</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Missing Input Validation</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Checks if numerical value variables (like amount/fee) are checked to verify they are positive (&gt;0) before processing.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 04</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Unbounded Storage Growth</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Warns when complex collections (like Vec or Map) are saved to persistent storage without boundary/pruning checks.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 05</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Unprotected Contract Upgrade</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Flags if <code>update_current_contract_wasm</code> is called inside a function that doesn't have an auth requirement.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 06</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Missing Balance Verification</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Warns if a payout transfer is executed without checking the pool or contract's sufficiency balance beforehand.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 07</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Panics in Paths</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Identifies <code>panic!</code>, <code>unwrap()</code>, <code>expect()</code>. Fail gracefully using <code>Result</code> and custom contract errors instead.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 08</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Hardcoded Secrets / Keys</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Scans file lines for hardcoded private keys (length 64 hex strings) or Stellar secret seeds (S...) left in source code.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 09</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Missing Event Emission</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Flags state-changing operations that do not publish tracking events. Highly recommended for indexing.</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="p-1 bg-slate-50 text-slate-500 rounded border border-slate-200 text-xxs font-bold uppercase h-fit mt-0.5">Rule 10</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">Checks-Effects-Interactions</h5>
                <p className="text-xxs text-slate-500 leading-relaxed mt-0.5">Warns when external contract queries or transfer clients are executed prior to final storage writes in the same execution.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
