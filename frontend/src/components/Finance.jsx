import React, { useState, useEffect } from 'react';

export default function Finance({ user, token }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Financial bento stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netMargin: 0,
    fleetValuation: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [type, setType] = useState('Revenue');
  const [category, setCategory] = useState('Trip Revenue');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [date, setDate] = useState('');

  const isFleetManager = user.role === 'Fleet Manager';

  useEffect(() => {
    fetchLedger();
    fetchStats();
  }, [token, searchQuery, categoryFilter, typeFilter]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/finance/ledger';
      const params = [];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (categoryFilter) params.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (typeFilter) params.push(`type=${encodeURIComponent(typeFilter)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve ledger data');
      const data = await response.json();
      setLedger(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/finance/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve finance stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setType('Revenue');
    setCategory('Trip Revenue');
    setAmount('');
    setDescription('');
    setReferenceId('');
    setDate('');
    setError('');
  };

  const handleOpenCreate = () => {
    if (!isFleetManager) return;
    resetForm();
    // Default date to today
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isFleetManager) return;

    if (!type || !category || !amount || !description || !date) {
      setError('All transaction specifications are required.');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be a positive value.');
      return;
    }

    const payload = {
      type,
      category,
      amount: parseFloat(amount),
      description: description.trim(),
      reference_id: referenceId ? referenceId.trim() : null,
      date
    };

    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/finance/ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      setSuccessMsg('Transaction logged successfully!');
      setShowModal(false);
      resetForm();
      fetchLedger();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            Financial Ledger
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Operational cash flow monitoring, asset valuation, and balance summaries.
          </p>
        </div>

        {isFleetManager ? (
          <button
            onClick={handleOpenCreate}
            className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-bold text-xs px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary-container/10"
          >
            <span className="material-symbols-outlined text-base">receipt_long</span>
            Log Transaction
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant font-mono">
            <span className="material-symbols-outlined text-base text-status-in-shop">shield_lock</span>
            READ-ONLY ACCESS FOR {user.role.toUpperCase()}
          </div>
        )}
      </header>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-status-available/10 border border-status-available/30 text-status-available rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {error && !showModal && (
        <div className="p-3 bg-error-container/30 border border-error/30 text-error rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Bento Grid Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Total Revenue</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-available">
            ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Operating Expense</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-error">
            ${stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Net Profit Margin</span>
          <div className={`text-3xl font-bold font-data-tabular mt-2 ${stats.netMargin >= 0 ? 'text-primary' : 'text-error'}`}>
            ${stats.netMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Fleet Asset Valuation</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-on-surface">
            ${stats.fleetValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </section>

      {/* Filtering Row */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg group max-w-md w-full">
          <span className="material-symbols-outlined text-sm text-on-surface-variant absolute left-3">search</span>
          <input
            type="text"
            placeholder="Search details or reference ID..."
            className="bg-transparent border-0 pl-9 pr-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-0 w-full font-data-tabular"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2.5 text-xs text-on-surface focus:ring-0 focus:outline-none w-36 font-sans"
          >
            <option value="">All Types</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expense</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2.5 text-xs text-on-surface focus:ring-0 focus:outline-none w-48 font-sans"
          >
            <option value="">All Categories</option>
            <option value="Trip Revenue">Trip Revenue</option>
            <option value="Maintenance Cost">Maintenance Cost</option>
            <option value="Driver Payout">Driver Payout</option>
            <option value="Fuel Expense">Fuel Expense</option>
            <option value="Asset Purchase">Asset Purchase</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
        </div>
      </section>

      {/* Ledger Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant/30 text-xs font-label-caps text-on-surface-variant uppercase">
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Category</th>
                <th className="p-4">Reference ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant font-mono">
                    Auditing ledger books...
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant font-mono">
                    No matching ledger transactions recorded.
                  </td>
                </tr>
              ) : (
                ledger.map(t => (
                  <tr key={t.id} className="hover:bg-surface-container-high/40 transition-colors">
                    {/* Transaction ID */}
                    <td className="p-4 font-bold text-on-surface-variant font-data-tabular">
                      TXN-{1000 + t.id}
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-surface-container-highest border border-outline-variant/30 text-[10px] uppercase font-mono">
                        {t.category}
                      </span>
                    </td>

                    {/* Reference ID */}
                    <td className="p-4 font-mono font-bold text-primary">
                      {t.reference_id || 'N/A'}
                    </td>

                    {/* Date */}
                    <td className="p-4 font-data-tabular text-on-surface-variant">
                      {new Date(t.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    {/* Description */}
                    <td className="p-4 font-semibold text-on-surface">
                      {t.description}
                    </td>

                    {/* Amount */}
                    <td className={`p-4 text-right font-bold font-data-tabular text-sm ${t.type === 'Revenue' ? 'text-status-available' : 'text-error'}`}>
                      {t.type === 'Revenue' ? '+' : '-'}${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="login-glass rounded-xl w-full max-w-[500px] overflow-hidden shadow-2xl relative">
            <div className="scanline"></div>
            
            <header className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">
                  receipt_long
                </span>
                Record Ledger entry
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-error-container/30 border border-error/30 text-error rounded text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Transaction Type</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      setCategory(e.target.value === 'Revenue' ? 'Trip Revenue' : 'Maintenance Cost');
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                    required
                  >
                    <option value="Revenue">Revenue (Income)</option>
                    <option value="Expense">Expense (Payment)</option>
                  </select>
                </div>
                
                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Category</label>
                  {type === 'Revenue' ? (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                      required
                    >
                      <option value="Trip Revenue">Trip Revenue</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                      required
                    >
                      <option value="Maintenance Cost">Maintenance Cost</option>
                      <option value="Driver Payout">Driver Payout</option>
                      <option value="Fuel Expense">Fuel Expense</option>
                      <option value="Asset Purchase">Asset Purchase</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Transaction Value ($)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150.00"
                    step="0.01"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Transaction Date</label>
                  <input
                    type="date"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Reference ID */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Reference ID / Document ID</label>
                <input
                  type="text"
                  placeholder="e.g. TRP-9021 or Fuel-Receipt-001"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-mono"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Detailed Description</label>
                <textarea
                  placeholder="Describe the nature of this transaction..."
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 h-20 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-outline-variant/40 hover:bg-surface-container-high rounded text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-bold rounded text-xs transition-colors"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
