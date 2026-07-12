import React, { useState, useEffect } from 'react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  // Mouse tilt micro-interaction for the card
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      
      const moveX = (x - 0.5) * 10;
      const moveY = (y - 0.5) * 10;
      
      setRotation({ x: -moveY, y: moveX });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide operator identifier and security credentials.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onLoginSuccess(data.token, data.user);
      }, 1200);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="font-body-md text-body-md flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Ambient Background Element */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDw-AKdXQiMYq11J38ibWsCJ932BUkoLxoUggzWiwIIRUUW2xH9nZAn56-8oMwIfSlOwxM-s5K2QdpJiMW88BrSw8KKsYpVT1quP-0DBSYWxG33kK-orTfxOCuDmMHsF9HzEzW6QkPD71VaGWsuIH1mXLO7JdiqXWHlB-mnZktikIklEBy6zPkW6fO7Mk3rp0XUEKZD-EXr-eH1JjwsEnEtz-odVQ5mfbop5tzg36TZ9hU3Mz57jRY7Tg')"
          }}
        ></div>
      </div>

      {/* Main Authentication Container */}
      <main className="relative z-10 w-full max-w-[440px] flex flex-col gap-8">
        {/* Brand Header */}
        <header className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-primary-container/20">
            <span className="material-symbols-outlined text-on-primary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              terminal
            </span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight font-bold">
            TransitOps
          </h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mt-1">
            Unified Fleet Management System
          </p>
        </header>

        {/* Login Card */}
        <section 
          className="login-glass rounded-xl p-8 relative overflow-hidden shadow-2xl transition-transform duration-75 ease-out"
          style={{
            transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
          }}
        >
          <div className="scanline"></div>
          <div className="mb-6">
            <h2 className="font-title-md text-title-md text-on-surface mb-2">Secure Access</h2>
            <p className="text-on-surface-variant font-body-sm text-body-sm">Authorization required to access the operational grid.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container/30 border border-error/30 text-error rounded text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection (Visual Indicator of RBAC) */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Access Level</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className="flex items-center justify-center gap-2 p-2.5 rounded bg-surface-container-high border border-outline-variant text-primary font-label-caps text-label-caps hover:bg-surface-container-highest transition-colors cursor-default" 
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">shield</span>
                  RBAC ACTIVE
                </button>
                <div className="flex items-center justify-center px-2 py-1 rounded border border-outline-variant/30 text-on-surface-variant font-body-sm text-body-sm italic">
                  Role-based login
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="email">
                Operator Identifier
              </label>
              <div className="relative flex items-center input-focus-glow group">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  mail
                </span>
                <input 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-3 text-on-surface focus:outline-none focus:ring-0 font-data-tabular text-data-tabular" 
                  id="email" 
                  placeholder="email@transitops.io" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || success}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="password">
                Security Credentials
              </label>
              <div className="relative flex items-center input-focus-glow group">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-3 text-on-surface focus:outline-none focus:ring-0 font-data-tabular text-data-tabular" 
                  id="password" 
                  placeholder="••••••••" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                />
              </div>
            </div>

            {/* Submit Action */}
            <button 
              className={`w-full text-on-primary-container font-headline-lg-mobile text-headline-lg-mobile font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                success 
                  ? 'bg-status-available text-background' 
                  : 'bg-primary-container hover:bg-primary-container/90'
              }`} 
              type="submit"
              disabled={loading || success}
            >
              {success ? (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  AUTHORIZED
                </>
              ) : loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  VERIFYING...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    login
                  </span>
                  AUTHORIZE
                </>
              )}
            </button>
          </form>
        </section>

        {/* Footer / Secondary Links */}
        <footer className="flex flex-col items-center gap-4 text-on-surface-variant font-body-sm text-body-sm">
          <div className="text-center text-xs opacity-60 max-w-sm">
            <p className="mb-1 font-label-caps">PRO-TIP Seed Accounts:</p>
            <p className="font-mono">manager@transitops.io / manager123 (Fleet Manager)</p>
            <p className="font-mono">safety@transitops.io / safety123 (Safety Officer)</p>
          </div>
          <div className="flex items-center gap-4">
            <a className="hover:text-on-surface transition-colors" href="#">Privacy Protocol</a>
            <span className="w-1 h-1 bg-outline rounded-full"></span>
            <a className="hover:text-on-surface transition-colors" href="#">Support Desk</a>
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <span className="font-label-caps">Encrypted Session: AES-256</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
