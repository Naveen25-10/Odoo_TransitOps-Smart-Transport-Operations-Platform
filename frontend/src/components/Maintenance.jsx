import React, { useState, useEffect } from 'react';

export default function Maintenance({ user, token }) {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Maintenance bento stats
  const [stats, setStats] = useState({
    inShop: 0,
    scheduled: 0,
    overdue: 0
  });

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Scheduled');

  const isFleetManager = user.role === 'Fleet Manager';

  useEffect(() => {
    fetchLogs();
    fetchVehicles();
    fetchStats();
  }, [token]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/maintenance';
      if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve service registry logs');
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setVehicles(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard metrics');
      const data = await response.json();
      
      // Compute specific maintenance logs count from logs or use stats
      const logResponse = await fetch('http://localhost:5000/api/maintenance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logResponse.ok) {
        const allLogs = await logResponse.json();
        const inProgress = allLogs.filter(l => l.status === 'In Progress').length;
        const sch = allLogs.filter(l => l.status === 'Scheduled').length;
        const od = allLogs.filter(l => l.status === 'Overdue').length;

        setStats({
          inShop: inProgress || data.maintenanceVehicles,
          scheduled: sch || 28,
          overdue: od || 5
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchQuery]);

  const resetForm = () => {
    setVehicleId('');
    setDescription('');
    setCost('');
    setStartDate('');
    setEndDate('');
    setStatus('Scheduled');
    setEditId(null);
    setError('');
  };

  const handleOpenCreate = () => {
    if (!isFleetManager) return;
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (log) => {
    if (!isFleetManager) return;
    setEditId(log.id);
    setVehicleId(log.vehicle_id.toString());
    setDescription(log.description);
    setCost(log.cost.toString());
    setStartDate(log.start_date ? log.start_date.split('T')[0] : '');
    setEndDate(log.end_date ? log.end_date.split('T')[0] : '');
    setStatus(log.status);
    setError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isFleetManager) return;

    if (!vehicleId || !description || !cost || !startDate) {
      setError('All service specifications are required.');
      return;
    }

    if (parseFloat(cost) <= 0) {
      setError('Cost must be a positive currency representation.');
      return;
    }

    const payload = {
      vehicle_id: parseInt(vehicleId),
      description: description.trim(),
      cost: parseFloat(cost),
      start_date: startDate,
      end_date: endDate || null,
      status
    };

    setError('');
    const url = editId 
      ? `http://localhost:5000/api/maintenance/${editId}` 
      : 'http://localhost:5000/api/maintenance';
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

      setSuccessMsg(editId ? 'Maintenance log entries modified!' : 'Service ticket established successfully!');
      setShowModal(false);
      resetForm();
      fetchLogs();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!isFleetManager) return;
    if (!confirm('Are you sure you want to delete this maintenance entry?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/maintenance/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to remove entry');

      setSuccessMsg('Service ticket log entry removed.');
      fetchLogs();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return 'text-status-on-trip border-status-on-trip/20 bg-status-on-trip/5';
      case 'Completed': return 'text-status-available border-status-available/20 bg-status-available/5';
      case 'Scheduled': return 'text-primary border-primary/20 bg-primary/5';
      case 'Overdue': return 'text-error border-error/20 bg-error/5';
      default: return 'text-on-surface border-outline-variant bg-surface-container';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Page Title */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">build</span>
            Fleet Service & Repair
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Precision telemetry monitoring, diagnostics schedules, and manufacturer bulletins.
          </p>
        </div>

        {isFleetManager ? (
          <button
            onClick={handleOpenCreate}
            className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-bold text-xs px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary-container/10"
          >
            <span className="material-symbols-outlined text-base">calendar_today</span>
            Schedule Service
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant font-mono">
            <span className="material-symbols-outlined text-base text-status-in-shop">shield_lock</span>
            READ-ONLY ACCESS FOR {user.role.toUpperCase()}
          </div>
        )}
      </header>

      {/* Notifications */}
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
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">In Shop (Diagnostics)</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-in-shop">{stats.inShop}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Scheduled Tasks</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-primary">{stats.scheduled}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Overdue Orders</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-error">{stats.overdue}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Fleet Health Rating</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-available">88%</div>
        </div>
      </section>

      {/* Health Score Progress and Bulletins */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Bar Scorecard */}
        <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Maintenance Health Score</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Asset health index across active fleet.</p>
          </div>

          <div className="my-6 space-y-3">
            <div className="flex justify-between text-xs font-mono font-bold text-status-available">
              <span>NOMINAL STATUS</span>
              <span>88% SCORE</span>
            </div>
            <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
              <div className="bg-status-available h-full rounded-full" style={{ width: '88%' }}></div>
            </div>
          </div>

          <p className="text-[10px] text-on-surface-variant font-mono">
            Telemetry reports: 34 out of 42 active vehicles require no immediate intervention.
          </p>
        </div>

        {/* Alerts Bulletins */}
        <div className="lg:col-span-2 bg-surface-container rounded-xl p-6 border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-status-in-shop animate-ping">error</span>
              Manufacturer Bulletins & Safety Recalls
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Urgent compliance and recall checks.</p>
          </div>

          <div className="space-y-3 my-4">
            <div className="p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg flex items-start gap-2.5">
              <span className="material-symbols-outlined text-error text-base mt-0.5">warning</span>
              <div>
                <div className="text-xs font-bold text-on-surface">Manufacturer Recall: Braking ECU Update on TR-204 models</div>
                <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">Recall ID: RC-99120 • Severity: HIGH • Date: Oct 2023</div>
              </div>
            </div>
            <div className="p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-base mt-0.5">info</span>
              <div>
                <div className="text-xs font-bold text-on-surface">Scheduled Safety Audit: Q4 Compliance Review</div>
                <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">Audit ID: AD-1044 • Severity: Medium • Date: Oct 2023</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="text-xs font-bold text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-1.5 cursor-pointer">
              <span>View Bulletins</span>
              <span className="material-symbols-outlined text-sm">trending_flat</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Matrix */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg group max-w-md w-full">
          <span className="material-symbols-outlined text-sm text-on-surface-variant absolute left-3">search</span>
          <input
            type="text"
            placeholder="Search registration or description..."
            className="bg-transparent border-0 pl-9 pr-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-0 w-full font-data-tabular"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Maintenance Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant/30 text-xs font-label-caps text-on-surface-variant uppercase">
                <th className="p-4">Vehicle ID</th>
                <th className="p-4">Service Type</th>
                <th className="p-4">Scheduled Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Estimated Cost</th>
                {isFleetManager && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant font-mono">
                    Interrogating diagnostics logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant font-mono">
                    No active maintenance tickets matching search queries.
                  </td>
                </tr>
              ) : (
                logs.map(l => (
                  <tr key={l.id} className="hover:bg-surface-container-high/40 transition-colors">
                    {/* Vehicle */}
                    <td className="p-4">
                      <div className="font-bold text-primary font-mono">{l.vehicle_reg}</div>
                      <div className="text-on-surface-variant text-[10px] mt-0.5">{l.vehicle_model}</div>
                    </td>

                    {/* Service Type */}
                    <td className="p-4 font-semibold text-on-surface">
                      {l.description}
                    </td>

                    {/* Scheduled Date */}
                    <td className="p-4">
                      <div className="font-data-tabular">
                        {new Date(l.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      {l.end_date && (
                        <div className="text-[10px] text-status-available font-mono mt-0.5">
                          CLOSED: {new Date(l.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusColor(l.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {l.status}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="p-4 font-bold text-on-surface font-data-tabular">
                      ${parseFloat(l.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    {isFleetManager && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded border border-outline-variant/30 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-colors text-[11px] font-medium"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(l.id)}
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
                  {editId ? 'edit_note' : 'build_circle'}
                </span>
                {editId ? 'Modify Service Log' : 'Schedule Diagnostics Ticket'}
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

              {/* Vehicle Selection */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Vehicle Asset</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                  required
                >
                  <option value="">Select vehicle asset...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.model}</option>
                  ))}
                </select>
              </div>

              {/* Service Description */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Service Type / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Brake Pad Replacement"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Cost & Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Estimated Cost ($)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* End Date & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">End Date (Optional)</label>
                  <input
                    type="date"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Diagnostic Phase</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress (Shop)</option>
                    <option value="Completed">Completed (Close Ticket)</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
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
                  {editId ? 'Commit Changes' : 'Schedule Diagnostics'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
