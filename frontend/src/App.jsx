import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import VehicleRegistry from './components/VehicleRegistry';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('transitops_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('transitops_user')) || null);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Verify active session on load
  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Expired session');
        return res.json();
      })
      .then(data => {
        setUser(data.user);
        localStorage.setItem('transitops_user', JSON.stringify(data.user));
      })
      .catch(() => {
        handleLogout();
      });
    }
  }, [token]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('transitops_token', newToken);
    localStorage.setItem('transitops_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      {/* Global Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 px-4 md:px-8 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-container rounded flex items-center justify-center shadow-lg shadow-primary-container/20">
            <span className="material-symbols-outlined text-on-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              terminal
            </span>
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-primary">TransitOps</h1>
            <p className="text-[9px] font-label-caps text-on-surface-variant tracking-wider uppercase leading-none">Ops Grid</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              currentTab === 'registry'
                ? 'bg-primary-container text-on-primary-container shadow-md shadow-primary-container/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-base">local_shipping</span>
            Vehicle Registry
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-semibold text-on-surface">{user.name}</span>
            <span className="text-[10px] font-mono text-on-surface-variant">{user.role}</span>
          </div>

          <div className="h-8 w-px bg-outline-variant/35 hidden md:block"></div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center p-2 rounded-lg border border-outline-variant/30 hover:border-error/50 hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all"
            title="Log Out Operator"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </nav>

      {/* Main View Container */}
      <main className="flex-1 py-4">
        {currentTab === 'dashboard' ? (
          <Dashboard user={user} token={token} />
        ) : (
          <VehicleRegistry user={user} token={token} />
        )}
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
