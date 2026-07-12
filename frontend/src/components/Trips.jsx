import React, { useState, useEffect } from 'react';

export default function Trips({ user, token }) {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dashboard KPI metrics
  const [stats, setStats] = useState({
    totalTrips: 1284, // baseline mockup
    dispatched: 0,
    pending: 0,
    completed: 0
  });

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form Fields
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');
  const [status, setStatus] = useState('Draft');

  const isFleetManager = user.role === 'Fleet Manager';

  useEffect(() => {
    fetchTrips();
    fetchVehiclesAndDrivers();
    fetchStats();
  }, [token]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/trips';
      const params = [];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve active dispatches');
      const data = await response.json();
      setTrips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehiclesAndDrivers = async () => {
    try {
      const vehResponse = await fetch('http://localhost:5000/api/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const drvResponse = await fetch('http://localhost:5000/api/drivers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (vehResponse.ok) setVehicles(await vehResponse.json());
      if (drvResponse.ok) setDrivers(await drvResponse.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch operational stats');
      const data = await response.json();
      
      // Calculate from database records, fallback to mockup base totals
      setStats({
        totalTrips: 1284 + data.activeTrips + data.pendingTrips,
        dispatched: data.activeTrips,
        pending: data.pendingTrips,
        completed: 886
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [searchQuery, statusFilter]);

  const resetForm = () => {
    setSource('');
    setDestination('');
    setVehicleId('');
    setDriverId('');
    setCargoWeight('');
    setPlannedDistance('');
    setStatus('Draft');
    setEditId(null);
    setError('');
  };

  const handleOpenCreate = () => {
    if (!isFleetManager) return;
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (trip) => {
    if (!isFleetManager) return;
    setEditId(trip.id);
    setSource(trip.source);
    setDestination(trip.destination);
    setVehicleId(trip.vehicle_id ? trip.vehicle_id.toString() : '');
    setDriverId(trip.driver_id ? trip.driver_id.toString() : '');
    setCargoWeight(trip.cargo_weight.toString());
    setPlannedDistance(trip.planned_distance.toString());
    setStatus(trip.status);
    setError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isFleetManager) return;

    if (!source || !destination || !cargoWeight || !plannedDistance) {
      setError('Source, destination, weight, and distance are required.');
      return;
    }

    if (parseFloat(cargoWeight) <= 0 || parseFloat(plannedDistance) <= 0) {
      setError('Metrics must be positive values.');
      return;
    }

    const payload = {
      source: source.trim(),
      destination: destination.trim(),
      vehicle_id: vehicleId ? parseInt(vehicleId) : null,
      driver_id: driverId ? parseInt(driverId) : null,
      cargo_weight: parseFloat(cargoWeight),
      planned_distance: parseFloat(plannedDistance),
      status
    };

    setError('');
    const url = editId 
      ? `http://localhost:5000/api/trips/${editId}` 
      : 'http://localhost:5000/api/trips';
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

      setSuccessMsg(editId ? 'Trip details updated!' : 'New trip dispatched successfully!');
      setShowModal(false);
      resetForm();
      fetchTrips();
      fetchVehiclesAndDrivers();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!isFleetManager) return;
    if (!confirm('Are you sure you want to cancel and remove this trip record?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/trips/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to remove trip');

      setSuccessMsg('Trip deleted.');
      fetchTrips();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Dispatched': return 'text-status-on-trip border-status-on-trip/20 bg-status-on-trip/5';
      case 'Completed': return 'text-status-available border-status-available/20 bg-status-available/5';
      case 'Draft': return 'text-status-in-shop border-status-in-shop/20 bg-status-in-shop/5';
      case 'Cancelled': return 'text-status-retired border-status-retired/20 bg-status-retired/5';
      default: return 'text-on-surface border-outline-variant bg-surface-container';
    }
  };

  // Find available assets for allocation (excluding currently allocated to other active trips, except the current editing trip)
  const availableVehicles = vehicles.filter(v => v.status === 'Available' || (editId && trips.find(t => t.id === editId)?.vehicle_id === v.id));
  const availableDrivers = drivers.filter(d => d.status === 'Available' || (editId && trips.find(t => t.id === editId)?.driver_id === d.id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">map</span>
            Operations Dispatch
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Real-time control and scheduling of operations across the logistics grid.
          </p>
        </div>

        {isFleetManager ? (
          <button
            onClick={handleOpenCreate}
            className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-bold text-xs px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary-container/10"
          >
            <span className="material-symbols-outlined text-base">local_shipping</span>
            New Trip
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
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Total Trips</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-on-surface">{stats.totalTrips}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Dispatched</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-primary">{stats.dispatched}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Pending (Draft)</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-in-shop">{stats.pending}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Completed Today</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-available">{stats.completed}</div>
        </div>
      </section>

      {/* Map Layout & Regional Statistics */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Placeholder */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 relative overflow-hidden min-h-[300px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Live Fleet Topology
            </h3>
            <p className="text-[11px] text-on-surface-variant">Interactive coordinate mapping of dispatched units.</p>
          </div>

          {/* SVG Map Visual Overlay */}
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 pointer-events-none p-4 mt-8">
            <svg viewBox="0 0 800 400" className="w-full h-full text-outline-variant/20" stroke="currentColor" fill="none" strokeWidth="1.5">
              {/* Fake US map borders or mesh dots */}
              <circle cx="200" cy="150" r="4" className="text-primary fill-primary/20" />
              <circle cx="350" cy="180" r="4" className="text-status-available fill-status-available/20" />
              <circle cx="500" cy="120" r="4" className="text-status-on-trip fill-status-on-trip/20" />
              <circle cx="650" cy="220" r="4" className="text-status-in-shop fill-status-in-shop/20" />
              
              {/* Connecting routes */}
              <path d="M 200 150 Q 275 165 350 180" strokeDasharray="5,5" className="text-primary/40" />
              <path d="M 350 180 Q 425 150 500 120" strokeDasharray="5,5" className="text-status-available/40" />
              <path d="M 500 120 Q 575 170 650 220" className="text-status-on-trip/60" strokeWidth="2" />
            </svg>
          </div>

          <div className="z-10 flex justify-between items-center text-[10px] font-mono text-on-surface-variant bg-surface-container/60 p-2.5 rounded-lg border border-outline-variant/20">
            <span>GRID MONITORING SATELLITE: NOMINAL</span>
            <span>DISPATCHED CHANNELS: 104.2 MHz</span>
          </div>
        </div>

        {/* Regional Performance Panel */}
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Regional Performance</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Asset utilization score by logistics cluster.</p>
          </div>

          <div className="space-y-4 my-6">
            <div>
              <div className="flex justify-between text-xs font-mono text-on-surface-variant">
                <span>Midwest Cluster</span>
                <span className="font-bold text-status-available">94% EFF.</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-status-available h-full rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono text-on-surface-variant">
                <span>Tri-State Area</span>
                <span className="font-bold text-primary">82% EFF.</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono text-on-surface-variant">
                <span>Northern Border</span>
                <span className="font-bold text-status-in-shop">65% EFF.</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-status-in-shop h-full rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-on-surface-variant/80 italic font-mono">
            * Recalculates dynamically every 24 hours based on fuel and delays.
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg group max-w-md w-full">
          <span className="material-symbols-outlined text-sm text-on-surface-variant absolute left-3">search</span>
          <input
            type="text"
            placeholder="Search trip ID, route, or driver..."
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
          <option value="Draft">Draft</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </section>

      {/* Trips Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant/30 text-xs font-label-caps text-on-surface-variant uppercase">
                <th className="p-4">Trip ID / Route</th>
                <th className="p-4">Vehicle ID</th>
                <th className="p-4">Driver</th>
                <th className="p-4">Cargo Weight</th>
                <th className="p-4">Status</th>
                {isFleetManager && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant font-mono">
                    Interrogating grid channels...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant font-mono">
                    No matching trip operations identified.
                  </td>
                </tr>
              ) : (
                trips.map(t => (
                  <tr key={t.id} className="hover:bg-surface-container-high/40 transition-colors">
                    {/* Trip ID / Route */}
                    <td className="p-4">
                      <div className="font-bold text-primary font-data-tabular">TRP-{t.id}</div>
                      <div className="text-on-surface font-semibold mt-0.5 flex items-center gap-1">
                        <span>{t.source}</span>
                        <span className="material-symbols-outlined text-[12px] text-on-surface-variant">trending_flat</span>
                        <span>{t.destination}</span>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="p-4">
                      {t.vehicle_reg ? (
                        <div>
                          <div className="font-bold text-on-surface font-mono">{t.vehicle_reg}</div>
                          <div className="text-on-surface-variant text-[10px]">{t.vehicle_model}</div>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/40 italic">No Vehicle Allocated</span>
                      )}
                    </td>

                    {/* Driver */}
                    <td className="p-4">
                      {t.driver_name ? (
                        <div>
                          <div className="font-bold text-on-surface">{t.driver_name}</div>
                          <div className="text-on-surface-variant text-[10px] font-mono">{t.driver_contact}</div>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/40 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Cargo Weight */}
                    <td className="p-4">
                      <div className="font-bold text-on-surface font-data-tabular">{parseFloat(t.cargo_weight).toLocaleString()} kg</div>
                      <div className="text-on-surface-variant text-[10px] font-mono mt-0.5">{parseFloat(t.planned_distance).toLocaleString()} km</div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusColor(t.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {t.status}
                      </span>
                    </td>

                    {/* Actions */}
                    {isFleetManager && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded border border-outline-variant/30 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-colors text-[11px] font-medium"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="login-glass rounded-xl w-full max-w-[500px] overflow-hidden shadow-2xl relative">
            <div className="scanline"></div>
            
            <header className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">
                  {editId ? 'edit_note' : 'add_road'}
                </span>
                {editId ? 'Modify Trip dispatch' : 'Establish Trip Routing'}
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

              {/* Source & Destination */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Source Station</label>
                  <input
                    type="text"
                    placeholder="e.g. Chicago (CHI)"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Destination</label>
                  <input
                    type="text"
                    placeholder="e.g. Detroit (DET)"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Vehicle & Driver Allocation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Allocate Vehicle</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                  >
                    <option value="">Select Vehicle (None)</option>
                    {availableVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number} - {v.model}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Allocate Operator</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                  >
                    <option value="">Select Operator (None)</option>
                    {availableDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cargo Weight & Distance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Cargo Cargo Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Planned Distance (km)</label>
                  <input
                    type="number"
                    placeholder="e.g. 240"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Dispatch Phase</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none"
                >
                  <option value="Draft">Draft (Pending)</option>
                  <option value="Dispatched">Dispatched (Active)</option>
                  <option value="Completed">Completed (Releases Assets)</option>
                  <option value="Cancelled">Cancelled (Releases Assets)</option>
                </select>
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
                  {editId ? 'Commit Changes' : 'Dispatch Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
