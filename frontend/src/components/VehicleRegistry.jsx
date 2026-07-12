import React, { useState, useEffect } from 'react';

export default function VehicleRegistry({ user, token }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null); // Null for Create, Id for Edit

  // Form fields
  const [regNum, setRegNum] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('Van');
  const [maxLoad, setMaxLoad] = useState('');
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState('Available');

  // RBAC verification helper
  const isFleetManager = user.role === 'Fleet Manager';

  const [stats, setStats] = useState({
    availableVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    totalActiveFleet: 0
  });

  useEffect(() => {
    fetchVehicles();
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve vehicle data');
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRegNum('');
    setModel('');
    setType('Van');
    setMaxLoad('');
    setOdometer('');
    setCost('');
    setStatus('Available');
    setEditId(null);
    setError('');
  };

  const handleOpenCreate = () => {
    if (!isFleetManager) return;
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (vehicle) => {
    if (!isFleetManager) return;
    setEditId(vehicle.id);
    setRegNum(vehicle.registration_number);
    setModel(vehicle.model);
    setType(vehicle.type);
    setMaxLoad(vehicle.max_load.toString());
    setOdometer(vehicle.odometer.toString());
    setCost(vehicle.acquisition_cost.toString());
    setStatus(vehicle.status);
    setError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isFleetManager) return;

    if (!regNum || !model || !type || !maxLoad || !odometer || !cost) {
      setError('All parameters are required.');
      return;
    }

    if (parseFloat(maxLoad) <= 0 || parseFloat(odometer) < 0 || parseFloat(cost) <= 0) {
      setError('Metrics must be positive values (odometer must be non-negative).');
      return;
    }

    const payload = {
      registration_number: regNum.toUpperCase().trim(),
      model: model.trim(),
      type: type.trim(),
      max_load: parseFloat(maxLoad),
      odometer: parseFloat(odometer),
      acquisition_cost: parseFloat(cost),
      status
    };

    setError('');
    const url = editId 
      ? `http://localhost:5000/api/vehicles/${editId}` 
      : 'http://localhost:5000/api/vehicles';
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

      setSuccessMsg(editId ? 'Vehicle characteristics updated!' : 'Vehicle successfully registered!');
      setShowModal(false);
      resetForm();
      fetchVehicles();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!isFleetManager) return;
    if (!confirm('Are you sure you want to decommission and remove this vehicle from service?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete vehicle');

      setSuccessMsg('Vehicle decommissioned successfully!');
      fetchVehicles();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'text-status-available border-status-available/20 bg-status-available/5';
      case 'On Trip': return 'text-status-on-trip border-status-on-trip/20 bg-status-on-trip/5';
      case 'In Shop': return 'text-status-in-shop border-status-in-shop/20 bg-status-in-shop/5';
      case 'Retired': return 'text-status-retired border-status-retired/20 bg-status-retired/5';
      default: return 'text-on-surface border-outline-variant bg-surface-container';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Registry Title and Actions */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">local_shipping</span>
            Vehicle Registry
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Maintain the master registry of transportation assets on the active grid.
          </p>
        </div>

        {isFleetManager ? (
          <button
            onClick={handleOpenCreate}
            className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-headline-lg-mobile text-xs font-bold px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary-container/10"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Register Vehicle
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant font-mono">
            <span className="material-symbols-outlined text-base text-status-in-shop">shield_lock</span>
            READ-ONLY ACCESS FOR {user.role.toUpperCase()}
          </div>
        )}
      </header>

      {/* Bento Grid Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Available Fleet</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-available">
            {stats.availableVehicles} / {stats.totalActiveFleet}
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">On Mission (Active)</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-primary">
            {stats.activeVehicles} active
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Maintenance (In Shop)</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-in-shop">
            {stats.maintenanceVehicles} in shop
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-label-caps text-on-surface-variant">Operational Efficiency</span>
          <div className="text-3xl font-bold font-data-tabular mt-2 text-status-available">94.2%</div>
        </div>
      </section>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3 bg-status-available/10 border border-status-available/30 text-status-available rounded-lg text-xs flex items-center gap-2 animate-pulse">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && !showModal && (
        <div className="p-3 bg-error-container/30 border border-error/30 text-error rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Vehicles */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="login-glass rounded-xl p-6 border border-outline-variant/20 animate-pulse h-48"></div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant/20">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-3">inventory_2</span>
          <h3 className="text-base font-bold text-on-surface">No vehicles registered</h3>
          <p className="text-xs text-on-surface-variant mt-1">Start by clicking the Register Vehicle button to add assets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div 
              key={v.id} 
              className="login-glass rounded-xl p-6 border border-outline-variant/20 flex flex-col justify-between relative group hover:border-primary/40 transition-all duration-300 shadow-lg hover:shadow-primary/5"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-primary font-data-tabular tracking-wide text-sm bg-surface-container px-2.5 py-1 rounded border border-outline-variant/35">
                    {v.registration_number}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusColor(v.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {v.status}
                  </span>
                </div>
                
                <h3 className="text-base font-bold text-on-surface tracking-tight">{v.model}</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{v.type}</p>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-3 gap-2 my-6 pt-4 border-t border-outline-variant/20">
                <div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-label-caps tracking-wider">Payload Cap</div>
                  <div className="text-xs font-bold text-on-surface mt-0.5 font-data-tabular">{v.max_load} kg</div>
                </div>
                <div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-label-caps tracking-wider">Odometer</div>
                  <div className="text-xs font-bold text-on-surface mt-0.5 font-data-tabular">{parseFloat(v.odometer).toLocaleString()} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-label-caps tracking-wider">Cost</div>
                  <div className="text-xs font-bold text-on-surface mt-0.5 font-data-tabular">${parseFloat(v.acquisition_cost).toLocaleString()}</div>
                </div>
              </div>

              {/* Card Footer Actions */}
              {isFleetManager && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/10">
                  <button
                    onClick={() => handleOpenEdit(v)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-outline-variant/30 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-colors text-[11px] font-medium"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-error/25 hover:bg-error-container/20 text-error transition-colors text-[11px] font-medium"
                  >
                    <span className="material-symbols-outlined text-xs">delete</span>
                    Decommission
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="login-glass rounded-xl w-full max-w-[500px] overflow-hidden shadow-2xl relative">
            <div className="scanline"></div>
            
            {/* Modal Header */}
            <header className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">
                  {editId ? 'edit_note' : 'add_road'}
                </span>
                {editId ? 'Modify Fleet Asset' : 'Register New Fleet Asset'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-error-container/30 border border-error/30 text-error rounded text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Number & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. VAN-05"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded pl-3 pr-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular uppercase"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Vehicle Type</label>
                  <select
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="Van">Van</option>
                    <option value="Light Truck">Light Truck</option>
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Electric Truck">Electric Truck</option>
                    <option value="Trailer">Trailer</option>
                  </select>
                </div>
              </div>

              {/* Model Description */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Vehicle Name / Model</label>
                <input
                  type="text"
                  placeholder="e.g. Ford Transit 350 HD"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                />
              </div>

              {/* Capacity, Odometer, Cost */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Max Capacity (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Odometer (km)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Acquisition Cost</label>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 font-data-tabular"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase">Status</label>
                <select
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-0"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="In Shop">In Shop</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              {/* Action Buttons */}
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
                  {editId ? 'Apply Changes' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
