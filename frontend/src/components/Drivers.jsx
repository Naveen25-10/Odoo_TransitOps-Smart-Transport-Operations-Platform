import React, { useState, useEffect } from 'react';

export default function Drivers({ user, token }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Stats from backend
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeOnTrip: 0,
    offDuty: 0,
    suspended: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('CAT C');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [safetyScore, setSafetyScore] = useState('5.0');
  const [status, setStatus] = useState('Available');

  const isFleetManager = user.role === 'Fleet Manager';

  useEffect(() => {
    fetchDrivers();
    fetchStats();
  }, [token]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/drivers';
      const params = [];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve driver telemetry');
      const data = await response.json();
      setDrivers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats({
        totalDrivers: data.totalDrivers || 0,
        activeOnTrip: data.driversOnDuty - data.availableVehicles > 0 ? data.driversOnDuty : Math.max(data.activeTrips, 0), // Calculate active on trip
        offDuty: data.offDutyDrivers || 0,
        suspended: data.suspendedDrivers || 0
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch when filter changes
  useEffect(() => {
    fetchDrivers();
  }, [searchQuery, statusFilter]);

  const resetForm = () => {
    setName('');
    setLicenseNum('');
    setLicenseCategory('CAT C');
    setLicenseExpiry('');
    setContactNumber('');
    setSafetyScore('5.0');
    setStatus('Available');
    setEditId(null);
    setError('');
  };

  const handleOpenCreate = () => {
    if (!isFleetManager) return;
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (driver) => {
    if (!isFleetManager) return;
    setEditId(driver.id);
    setName(driver.name);
    setLicenseNum(driver.license_number);
    setLicenseCategory(driver.license_category);
    // Format date string to YYYY-MM-DD
    const expiryDate = driver.license_expiry ? driver.license_expiry.split('T')[0] : '';
    setLicenseExpiry(expiryDate);
    setContactNumber(driver.contact_number);
    setSafetyScore(driver.safety_score.toString());
    setStatus(driver.status);
    setError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isFleetManager) return;

    if (!name || !licenseNum || !licenseCategory || !licenseExpiry || !contactNumber) {
      setError('All specifications are required.');
      return;
    }

    const payload = {
      name: name.trim(),
      license_number: licenseNum.toUpperCase().trim(),
      license_category: licenseCategory.trim(),
      license_expiry: licenseExpiry,
      contact_number: contactNumber.trim(),
      safety_score: parseFloat(safetyScore),
      status
    };

    setError('');
    const url = editId 
      ? `http://localhost:5000/api/drivers/${editId}` 
      : 'http://localhost:5000/api/drivers';
    const method = editId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
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

      setSuccessMsg(editId ? 'Driver profile updated!' : 'Driver profile registered!');
      setShowModal(false);
      resetForm();
      fetchDrivers();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!isFleetManager) return;
    if (!confirm('Are you sure you want to remove this driver from the system?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/drivers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete driver');

      setSuccessMsg('Driver profile successfully removed.');
      fetchDrivers();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'text-status-available border-status-available/20 bg-status-available/5';
      case 'On Trip': return 'text-status-on-trip border-status-on-trip/20 bg-status-on-trip/5';
      case 'Off Duty': return 'text-status-retired border-status-retired/20 bg-status-retired/5';
      case 'Suspended': return 'text-error border-error/20 bg-error/5';
      default: return 'text-on-surface border-outline-variant bg-surface-container';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Title Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">badge</span>
            Personnel Logistics
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Managing {stats.totalDrivers} active operators across 4 regions.
          </p>
        </div>

        {isFleetManager ? (
          <button
            onClick={handleOpenCreate}
            className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-bold text-xs px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary-container/10"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add Driver
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
          <span className="material-symbols-outlined text-sm animate-bounce">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && !showModal && (
        <div className="p-3 bg-error-container/30 border border-error/30 text-error rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Total Drivers</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-on-surface">{stats.totalDrivers}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Active On Trip</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-primary">
            {stats.activeOnTrip || Math.max(stats.totalDrivers - stats.offDuty - stats.suspended, 0)}
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Off Duty</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-retired">{stats.offDuty}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Suspended</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-error">{stats.suspended}</div>
        </div>
      </section>

      {/* Filtering Row */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg group max-w-md w-full">
          <span className="material-symbols-outlined text-sm text-on-surface-variant absolute left-3">search</span>
          <input
            type="text"
            placeholder="Find operator or license..."
            className="bg-transparent border-0 pl-9 pr-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-0 w-full font-data-tabular"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2.5 text-xs text-on-surface focus:ring-0 focus:outline-none w-48"
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="Off Duty">Off Duty</option>
          <option value="Suspended">Suspended</option>
        </select>
      </section>

      {/* Drivers Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant/30 text-xs font-label-caps text-on-surface-variant uppercase">
                <th className="p-4">Operator Identity</th>
                <th className="p-4">Status</th>
                <th className="p-4">Safety Score</th>
                <th className="p-4">License Data</th>
                {isFleetManager && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-on-surface-variant font-mono">
                    Acquiring operator records...
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-on-surface-variant font-mono">
                    No matching operators identified in system records.
                  </td>
                </tr>
              ) : (
                drivers.map(d => (
                  <tr key={d.id} className="hover:bg-surface-container-high/40 transition-colors">
                    {/* Operator Identity */}
                    <td className="p-4 flex items-center gap-3">
                      <img 
                        src="/avatars/driver.png"
                        alt={d.name}
                        className="w-9 h-9 rounded-full object-cover border border-outline-variant/40 shadow-sm bg-surface-container-highest"
                      />
                      <div>
                        <div className="font-bold text-on-surface text-sm">{d.name}</div>
                        <div className="text-on-surface-variant text-[11px] font-mono mt-0.5">{d.contact_number}</div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusColor(d.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {d.status}
                      </span>
                    </td>

                    {/* Safety Score */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface font-data-tabular">{parseFloat(d.safety_score).toFixed(1)} / 5.0</span>
                        <div className="w-20 bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${d.safety_score >= 4.5 ? 'bg-status-available' : d.safety_score >= 3.5 ? 'bg-status-in-shop' : 'bg-error'}`}
                            style={{ width: `${(d.safety_score / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* License Data */}
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-primary font-mono">{d.license_number}</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-surface-container-highest text-[10px] text-on-surface-variant font-mono uppercase border border-outline-variant/30">
                          {d.license_category}
                        </span>
                      </div>
                      <div className="text-[10px] text-on-surface-variant font-mono mt-1">
                        EXP: {new Date(d.license_expiry).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>

                    {/* Actions */}
                    {isFleetManager && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded border border-outline-variant/30 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-colors text-[11px] font-medium"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded border border-error/25 hover:bg-error-container/20 text-error transition-colors text-[11px] font-medium"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="login-glass rounded-xl w-full max-w-[500px] overflow-hidden shadow-2xl relative">
            <div className="scanline"></div>
            
            <header className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">
                  {editId ? 'edit_note' : 'person_add'}
                </span>
                {editId ? 'Modify Operator Profile' : 'Register Operator Profile'}
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

              {/* Name & Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Frank Miller"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Contact Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +15550211"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* License Details */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5 col-span-2">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">License Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-8921X"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular uppercase"
                    value={licenseNum}
                    onChange={(e) => setLicenseNum(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. CAT C"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Expiry Date & Safety Score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">License Expiry</label>
                  <input
                    type="date"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Safety Score (0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="5.0"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Operational Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </select>
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
                  {editId ? 'Apply Changes' : 'Add Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
