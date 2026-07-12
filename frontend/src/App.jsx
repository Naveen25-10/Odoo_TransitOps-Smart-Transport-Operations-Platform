import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import VehicleRegistry from './components/VehicleRegistry';
import Drivers from './components/Drivers';
import Trips from './components/Trips';
import Maintenance from './components/Maintenance';
import Finance from './components/Finance';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');

  const getAvatarPath = (role) => {
    switch (role) {
      case 'Fleet Manager': return '/avatars/manager.png';
      case 'Safety Officer': return '/avatars/safety.png';
      case 'Financial Analyst': return '/avatars/analyst.png';
      default: return '/avatars/driver.png';
    }
  };

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      {/* Global Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-container rounded flex items-center justify-center shadow-lg shadow-primary-container/20">
            <span className="material-symbols-outlined text-on-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              terminal
            </span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-base tracking-tight text-primary">TransitOps</h1>
            <p className="text-[9px] font-label-caps text-on-surface-variant tracking-wider uppercase leading-none">Ops Grid</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[65%] sm:max-w-none no-scrollbar">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shrink-0 ${
              currentTab === 'dashboard'
                ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Dashboard
          </button>
          
          <button
            onClick={() => setCurrentTab('registry')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shrink-0 ${
              currentTab === 'registry'
                ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-base">local_shipping</span>
            Vehicles
          </button>

          <button
            onClick={() => setCurrentTab('drivers')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shrink-0 ${
              currentTab === 'drivers'
                ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-base">badge</span>
            Drivers
          </button>

          <button
            onClick={() => setCurrentTab('trips')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shrink-0 ${
              currentTab === 'trips'
                ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-base">map</span>
            Dispatch
          </button>

          <button
            onClick={() => setCurrentTab('maintenance')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shrink-0 ${
              currentTab === 'maintenance'
                ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-base">build</span>
            Service
          </button>

          <button
            onClick={() => setCurrentTab('finance')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shrink-0 ${
              currentTab === 'finance'
                ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            Ledger
          </button>

        </div>

        {/* User Card & Logout */}
        <div className="flex items-center gap-3 bg-surface-container-high/40 border border-outline-variant/20 pl-2.5 pr-3 py-1.5 rounded-xl">
          <img 
            src={getAvatarPath(user.role)} 
            alt={user.name} 
            className="w-7 h-7 rounded-full object-cover border border-outline-variant/50 shadow-sm bg-surface-container-highest"
          />
          <div className="hidden md:flex flex-col items-start leading-none">
            <span className="text-xs font-semibold text-on-surface">{user.name}</span>
            <span className="text-[9px] font-mono text-on-surface-variant/80 mt-0.5">{user.role}</span>
          </div>

          <div className="h-6 w-px bg-outline-variant/30 hidden md:block"></div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center p-1.5 rounded-lg border border-outline-variant/30 hover:border-error/50 hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all"
            title="Log Out Operator"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </nav>

      {/* Main View Container */}
      <main className="flex-1 py-4">
        {currentTab === 'dashboard' && <Dashboard user={user} token={token} />}
        {currentTab === 'registry' && <VehicleRegistry user={user} token={token} />}
        {currentTab === 'drivers' && <Drivers user={user} token={token} />}
        {currentTab === 'trips' && <Trips user={user} token={token} />}
        {currentTab === 'maintenance' && <Maintenance user={user} token={token} />}
        {currentTab === 'finance' && <Finance user={user} token={token} />}
      </main>

      {/* Global Status Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/20 py-3 px-4 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-on-surface-variant font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-status-available animate-pulse"></span>
          <span>OPERATIONAL GRID CONVERGED: AES-256 SESSION ACTIVE</span>
        </div>
        <div>
          <span>© 2026 TransitOps Platform. All systems nominal.</span>
        </div>
      </footer>
    </div>
  );
}
