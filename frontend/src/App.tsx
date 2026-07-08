import { useState, useEffect } from 'react';
import { 
  Shield, 
  BookOpen, 
  AlertCircle, 
  LayoutDashboard, 
  FileBadge, 
  LogOut, 
  Lock, 
  User, 
  Server, 
  Globe, 
  Activity, 
  ArrowRight,
  ShieldCheck,
  Terminal,
  Key,
  Info,
  HelpCircle
} from 'lucide-react';
import { WalletConnect } from './components/WalletConnect';
import { StatsBar } from './components/StatsBar';
import { ScanEditor } from './components/ScanEditor';
import { FindingsList } from './components/FindingsList';
import type { Finding } from './components/FindingsList';
import { CertificateModal } from './components/CertificateModal';
import { CertificateDirectory } from './components/CertificateDirectory';
import { UserGuide } from './components/UserGuide';

import { getOnChainStats } from './lib/contract';
import { computeCodeHash, API_URL } from './lib/stellar';

function App() {
  // Auth & Credentials States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  
  // Registration Inputs
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');

  // Login Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scan' | 'registry' | 'guide'>('dashboard');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Stats State
  const [totalCertificates, setTotalCertificates] = useState(0);
  const [totalIssues, setTotalIssues] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  // Scan State
  const [scanning, setScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [codeHash, setCodeHash] = useState<string>('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [syntaxError, setSyntaxError] = useState<{ message: string; line: number; column: number } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);

  // URL Hash query for routing
  const [urlHash, setUrlHash] = useState<string | null>(null);

  // System Statuses
  const [backendOnline, setBackendOnline] = useState(false);
  const [testnetOnline, setTestnetOnline] = useState(false);

  // Check storage & routing on load
  useEffect(() => {
    const storedUser = localStorage.getItem('soroshield_username');
    if (storedUser) {
      setHasCredentials(true);
      setCurrentUser(storedUser);
    }

    const path = window.location.pathname;
    if (path.startsWith('/cert/')) {
      const hash = path.substring(6);
      if (hash.length === 64) {
        setUrlHash(hash);
        setIsLoggedIn(true); // Bypass login for direct share link verification
        setActiveTab('registry');
      }
    }
    loadStats();
    checkSystemStatus();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const stats = await getOnChainStats();
      setTotalCertificates(stats.totalCertificates);
      setTotalIssues(stats.totalIssues);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const checkSystemStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/status`);
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    }
    try {
      const res = await fetch('https://horizon-testnet.stellar.org');
      setTestnetOnline(res.ok);
    } catch {
      setTestnetOnline(false);
    }
  };

  // Register Handler
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim()) {
      setRegError('Username and password cannot be empty.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    localStorage.setItem('soroshield_username', regUsername.trim());
    localStorage.setItem('soroshield_password', regPassword);
    setHasCredentials(true);
    setCurrentUser(regUsername.trim());
    setIsLoggedIn(true);
    setRegError('');
  };

  // Login Handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedUser = localStorage.getItem('soroshield_username');
    const storedPass = localStorage.getItem('soroshield_password');
    if (username === storedUser && password === storedPass) {
      setIsLoggedIn(true);
      setCurrentUser(username);
      setAuthError('');
    } else {
      setAuthError('Invalid username or password.');
    }
  };

  const handleScan = async (code: string) => {
    setScanning(true);
    setScanCompleted(false);
    setFindings([]);
    setSyntaxError(null);

    try {
      const hash = await computeCodeHash(code);
      setCodeHash(hash);

      const response = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const mappedFindings: Finding[] = data.findings.map((f: any) => ({
          ruleId: f.ruleId,
          title: f.title,
          severity: f.severity.toLowerCase(),
          description: f.description,
          line: f.line,
          codeSnippet: f.codeSnippet,
        }));
        setFindings(mappedFindings);
        setScanCompleted(true);
        loadStats();
      } else if (data.error && data.error.message) {
        setSyntaxError({
          message: data.error.message,
          line: data.error.line,
          column: data.error.column,
        });
      } else {
        throw new Error(data.error || 'Scan compilation failed.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      alert(err.message || 'Failed to connect to scanner API. Ensure backend is running.');
    } finally {
      setScanning(false);
    }
  };

  const handleMintClick = () => {
    if (!walletAddress) {
      alert('Please connect your Freighter wallet to mint an Audit Certificate.');
      return;
    }
    setModalOpen(true);
  };

  const handleMintSuccess = () => {
    loadStats();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  // Render Authentication Face
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background highlights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-stellar-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-8 shadow-2xl relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="w-14 h-14 bg-stellar-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-stellar-blue/20 mb-4">
            <Shield className="w-8 h-8 fill-current" />
          </div>

          {!hasCredentials ? (
            /* Registration Setup Screen */
            <>
              <div className="text-xl font-bold !text-white tracking-tight">Set Up Console Credentials</div>
              <p className="text-slate-300 text-xs mt-1.5 text-center max-w-xs leading-relaxed">
                Configure a secure administrator username and password to store credentials locally in your browser.
              </p>

              <form onSubmit={handleRegisterSubmit} className="w-full mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-slate-300 text-xxs font-bold uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Username..."
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-stellar-blue transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 text-xxs font-bold uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Password..."
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-stellar-blue transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 text-xxs font-bold uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Re-enter password..."
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-stellar-blue transition-all"
                    />
                  </div>
                </div>

                {regError && (
                  <p className="text-red-400 text-xxs font-medium mt-1 leading-relaxed bg-red-950/30 border border-red-900/40 p-2 rounded-lg">
                    {regError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-stellar-blue text-white font-bold py-2.5 rounded-xl text-sm transition-all hover:bg-stellar-dark-blue shadow-md active:scale-98 cursor-pointer"
                >
                  Save and Enter Console
                </button>
              </form>
            </>
          ) : (
            /* Login Sign In Screen */
            <>
              <div className="text-xl font-bold !text-white tracking-tight">SoroShield Console Login</div>
              <p className="text-slate-300 text-xs mt-1.5 text-center max-w-xs leading-relaxed">
                Log in to access your audit workbench.
              </p>

              <form onSubmit={handleLoginSubmit} className="w-full mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-slate-300 text-xxs font-bold uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Username..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-stellar-blue transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 text-xxs font-bold uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-stellar-blue transition-all"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-red-400 text-xxs font-medium mt-1 leading-relaxed bg-red-950/30 border border-red-900/40 p-2 rounded-lg">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-stellar-blue text-white font-bold py-2.5 rounded-xl text-sm transition-all hover:bg-stellar-dark-blue shadow-md active:scale-98 cursor-pointer"
                >
                  Sign In to Console
                </button>
              </form>

              <button
                onClick={() => {
                  if (confirm("Reset current credentials? You will have to set a new password.")) {
                    localStorage.removeItem('soroshield_username');
                    localStorage.removeItem('soroshield_password');
                    setHasCredentials(false);
                  }
                }}
                className="text-slate-500 hover:text-slate-300 text-xxs mt-4 hover:underline transition-all"
              >
                Reset Credentials
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render Sidebar Layout
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans antialiased text-slate-800 animate-fade-in">
      
      {/* Left Sidebar Nav */}
      <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col justify-between shrink-0 border-r border-slate-800 relative z-30">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950/20">
            <div className="w-8 h-8 bg-stellar-blue text-white rounded-lg flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 fill-current" />
            </div>
            <div>
              <div className="text-sm font-bold !text-white tracking-tight leading-none">SoroShield</div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Security Node</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className={`w-4.5 h-4.5 ${activeTab === 'dashboard' ? 'text-stellar-blue' : ''}`} />
              <span>Overview Console</span>
            </button>

            <button
              onClick={() => setActiveTab('scan')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'scan'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <Terminal className={`w-4.5 h-4.5 ${activeTab === 'scan' ? 'text-stellar-blue' : ''}`} />
              <span>Audit Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('registry')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'registry'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <FileBadge className={`w-4.5 h-4.5 ${activeTab === 'registry' ? 'text-stellar-blue' : ''}`} />
              <span>On-Chain Registry</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <BookOpen className={`w-4.5 h-4.5 ${activeTab === 'guide' ? 'text-stellar-blue' : ''}`} />
              <span>Security Guide</span>
            </button>
          </nav>
        </div>

        {/* User Card Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-stellar-blue/10 text-stellar-blue font-bold text-xs flex items-center justify-center border border-stellar-blue/30 uppercase">
              {currentUser ? currentUser.substring(0, 1) : 'A'}
            </div>
            <div>
              <div className="text-xxs font-bold !text-slate-300 uppercase leading-none truncate max-w-[120px]">{currentUser || 'Admin'}</div>
              <p className="text-[9px] text-slate-500 leading-none mt-1.5 truncate max-w-[120px]" title={walletAddress || undefined}>
                {walletAddress ? truncateAddress(walletAddress) : 'No Wallet Connected'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/30 rounded-xl text-xs font-semibold transition-all active:scale-98 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area (Header + Scrollable Dashboard View) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/60 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-stellar-blue" />
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              SoroShield &raquo; {activeTab === 'dashboard' ? 'Overview Console' : activeTab === 'scan' ? 'Audit Workspace' : activeTab === 'registry' ? 'On-Chain Registry' : 'Developer Guide'}
            </div>
          </div>

          {/* Freighter Wallet connected indicator */}
          <WalletConnect onWalletConnected={setWalletAddress} walletAddress={walletAddress} />
        </header>

        {/* Dynamic Panel Scroll Workspace */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {/* VIEW 1: Dashboard overview */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              {/* Header Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
                <div>
                  <div className="text-xl font-bold text-slate-800 tracking-tight">Security Console &raquo; Overview Dashboard</div>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage static analyzer suites, check service states, and registry ledger transactions.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('scan')}
                    className="inline-flex items-center gap-1.5 bg-stellar-blue text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:bg-stellar-dark-blue hover:shadow-lg active:scale-95 cursor-pointer"
                  >
                    <span>Open Audit Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Total Registry stats */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registry Statistics</div>
                <StatsBar totalCertificates={totalCertificates} totalIssues={totalIssues} loading={loadingStats} />
              </div>

              {/* Connection Status & Documentation Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* System Guide (Heath Indicator) */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Server className="w-4.5 h-4.5 text-stellar-blue" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health Guide</h4>
                  </div>
                  
                  <p className="text-xxs text-slate-400 leading-relaxed">
                    SoroShield operates as a decentralized hybrid stack. Below are active diagnostic status logs showing connectivity between your console node, scan engine, and the Stellar network.
                  </p>

                  <div className="space-y-3 text-xs pt-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500"><Terminal className="w-4 h-4" /> Static Audit API</span>
                      {backendOnline ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">Online</span>
                      ) : (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded font-bold text-[10px]">Offline</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500"><Globe className="w-4 h-4" /> Stellar Testnet RPC</span>
                      {testnetOnline ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">Connected</span>
                      ) : (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded font-bold text-[10px]">Disconnected</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500"><Activity className="w-4 h-4" /> System Load</span>
                      <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-bold text-[10px]">0.02 ms</span>
                    </div>
                  </div>
                </div>

                {/* User Guide (Getting Started) */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3.5 col-span-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Info className="w-4.5 h-4.5 text-stellar-blue" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Onboarding Guide</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-600">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-700">How to run an Audit Scan:</p>
                      <ul className="list-decimal list-inside space-y-1.5 text-slate-500 leading-relaxed text-xxs">
                        <li>Navigate to the <strong>Audit Workspace</strong> sidebar tab.</li>
                        <li>Paste your Rust contract into the workspace Monaco editor.</li>
                        <li>Click <strong>Scan Contract</strong> to parse code patterns.</li>
                        <li>Review findings list tagged by severity rules.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="font-bold text-slate-700">How to Mint a Certificate:</p>
                      <ul className="list-decimal list-inside space-y-1.5 text-slate-500 leading-relaxed text-xxs">
                        <li>Connect your Freighter Wallet in the header.</li>
                        <li>Ensure Freighter has Testnet XLM (use Laboratory Friendbot).</li>
                        <li>Click **Mint Certificate** inside the workspace findings panel.</li>
                        <li>Review parameters and approve signature in the Freighter popup.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* How it works system overview */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <HelpCircle className="w-4.5 h-4.5 text-stellar-blue" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">How SoroShield Works</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-slate-500">
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-700">1. Static AST Parsing</h5>
                    <p className="text-xxs">
                      The analyzer parses your contract lines into an Abstract Syntax Tree (AST). It inspects code structure for security rules like auth bounds, unchecked operators, and event omissions.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-700">2. Code Hashing</h5>
                    <p className="text-xxs">
                      A unique SHA-256 fingerprint is calculated for your code. This hash represents your contract and stores scan findings permanently on the blockchain.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-700">3. Fee-Sponsored Minting</h5>
                    <p className="text-xxs">
                      SoroShield sponsors network gas fees for first-time wallets using a backend fee-bump envelope signature, charging only the baseline scan fee.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Audit Workspace */}
          {activeTab === 'scan' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Scanner Terminal</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Locally analyze Rust code patterns for security weaknesses.</p>
                </div>
                <div className="bg-amber-50 text-amber-800 px-3.5 py-1.5 rounded-xl text-xxs font-semibold border border-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pattern scanner assists developer review; it does not replace a manual audit.</span>
                </div>
              </div>

              {/* Asymmetric Split Layout (66% Workspace Editor / 33% Findings Explorer) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-stretch">
                <div className="lg:col-span-2 flex flex-col">
                  <ScanEditor onScan={handleScan} loading={scanning} />
                </div>
                <div className="lg:col-span-1 flex flex-col">
                  <FindingsList
                    findings={findings}
                    scanCompleted={scanCompleted}
                    onMintClick={handleMintClick}
                    syntaxError={syntaxError}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: On-Chain registry directory */}
          {activeTab === 'registry' && (
            <div className="animate-fade-in">
              <CertificateDirectory initialSearchQuery={urlHash} />
            </div>
          )}

          {/* VIEW 4: Technical documentation guide */}
          {activeTab === 'guide' && (
            <div className="animate-fade-in">
              <UserGuide />
            </div>
          )}
        </div>
      </div>

      {/* Certificate Minting Modal */}
      <CertificateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        codeHash={codeHash}
        criticalCount={criticalCount}
        warningCount={warningCount}
        infoCount={infoCount}
        walletAddress={walletAddress}
        onSuccess={handleMintSuccess}
      />
    </div>
  );
}

export default App;
