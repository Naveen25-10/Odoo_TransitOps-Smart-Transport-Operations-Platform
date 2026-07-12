import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, token }) {
  const [stats, setStats] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock regions for realistic context
  const regions = ['North', 'East', 'South', 'West', 'Central'];

  useEffect(() => {
    fetchStats();
    fetchVehicles();
  }, [token]);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load dashboard metrics');
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
      if (!response.ok) throw new Error('Failed to load fleet registry');
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically assign mock regions to seeded vehicles for display filtering
  const getVehicleRegion = (id) => {
    const regionIndex = id % regions.length;
    return regions[regionIndex];
  };

  // Filter vehicles on-the-fly for the dashboard view
  const filteredVehicles = vehicles.filter(v => {
    const region = getVehicleRegion(v.id);
    const matchesSearch = v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter ? v.type.toLowerCase() === typeFilter.toLowerCase() : true;
    const matchesStatus = statusFilter ? v.status === statusFilter : true;
    const matchesRegion = regionFilter ? region === regionFilter : true;
    
    return matchesSearch && matchesType && matchesStatus && matchesRegion;
  });

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
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Welcome Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container rounded-xl p-6 border border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 text-xs font-label-caps text-primary uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-status-available animate-ping"></span>
            Live Operations Terminal
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface mt-1">
            Welcome back, {user.name}
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Operational Clearance: <span className="font-semibold text-primary">{user.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-data-tabular bg-background px-4 py-2.5 rounded-lg border border-outline-variant/20">
          <span className="material-symbols-outlined text-sm text-primary">schedule</span>
          <span>SYSTEM DATE: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Fleet Utilization */}
        <div className="login-glass rounded-xl p-5 border border-outline-variant/30 relative flex flex-col justify-between group hover:border-primary/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-xs uppercase tracking-wider">Fleet Utilization</span>
              <span className="material-symbols-outlined text-primary text-xl">analytics</span>
            </div>
            <div className="text-3xl font-bold tracking-tight font-data-tabular mt-2 text-primary">
              {stats.fleetUtilization}%
            </div>
          </div>
          <div className="w-full bg-surface-container-lowest h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-1000" 
              style={{ width: `${Math.min(stats.fleetUtilization, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI: Active Vehicles */}
        <div className="login-glass rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-status-on-trip/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-xs uppercase tracking-wider">Active Vehicles</span>
              <span className="material-symbols-outlined text-status-on-trip text-xl">local_shipping</span>
            </div>
            <div className="text-3xl font-bold tracking-tight font-data-tabular mt-2 text-on-surface">
              {stats.activeVehicles} <span className="text-xs font-normal text-on-surface-variant">on grid</span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant mt-4 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-on-trip"></span>
            Associated with {stats.activeTrips} active dispatches
          </div>
        </div>

        {/* KPI: Available Vehicles */}
        <div className="login-glass rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-status-available/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-xs uppercase tracking-wider">Available Fleet</span>
              <span className="material-symbols-outlined text-status-available text-xl">check_circle</span>
            </div>
            <div className="text-3xl font-bold tracking-tight font-data-tabular mt-2 text-status-available">
              {stats.availableVehicles}
            </div>
          </div>
          <div className="text-xs text-on-surface-variant mt-4 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-available"></span>
            Ready for instant routing allocation
          </div>
        </div>

        {/* KPI: In Shop */}
        <div className="login-glass rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-status-in-shop/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-xs uppercase tracking-wider">In Maintenance</span>
              <span className="material-symbols-outlined text-status-in-shop text-xl">build</span>
            </div>
            <div className="text-3xl font-bold tracking-tight font-data-tabular mt-2 text-status-in-shop">
              {stats.maintenanceVehicles}
            </div>
          </div>
          <div className="text-xs text-on-surface-variant mt-4 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-in-shop"></span>
            Currently undergoing active diagnostics
          </div>
        </div>
      </section>

      {/* Auxiliary Stats Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex items-center gap-4">
          <div className="w-10 h-10 bg-surface-container-low rounded-lg flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-label-caps uppercase">Pending Trips</div>
            <div className="text-xl font-bold text-on-surface font-data-tabular">{stats.pendingTrips} Drafts</div>
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex items-center gap-4">
          <div className="w-10 h-10 bg-surface-container-low rounded-lg flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">badge</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-label-caps uppercase">Drivers On Duty</div>
            <div className="text-xl font-bold text-on-surface font-data-tabular">{stats.driversOnDuty} Active</div>
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex items-center gap-4">
          <div className="w-10 h-10 bg-surface-container-low rounded-lg flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">monitoring</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-label-caps uppercase">Operations Status</div>
            <div className="text-xl font-bold text-status-available font-data-tabular flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-status-available"></span>
              NOMINAL
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Fleet Overview with Live Filtering */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-on-surface">Fleet Filter Matrix</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Filter the operational grid to track specific assets.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg group">
              <span className="material-symbols-outlined text-sm text-on-surface-variant absolute left-3">search</span>
              <input
                type="text"
                placeholder="Search registration/model..."
                className="bg-transparent border-0 pl-9 pr-4 py-2 text-xs text-on-surface focus:outline-none focus:ring-0 w-48 md:w-56 font-data-tabular"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-xs text-on-surface focus:ring-0 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="Van">Van</option>
              <option value="Heavy Truck">Heavy Truck</option>
              <option value="Electric Truck">Electric Truck</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-xs text-on-surface focus:ring-0 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>

            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-xs text-on-surface focus:ring-0 focus:outline-none"
            >
              <option value="">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {(typeFilter || statusFilter || regionFilter || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter('');
                  setStatusFilter('');
                  setRegionFilter('');
                  setSearchQuery('');
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs border border-error/20 hover:bg-error-container/20 text-error transition-colors"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Fleet Table Grid */}
        <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant/30 text-xs font-label-caps text-on-surface-variant uppercase">
                  <th className="p-4">Reg Number</th>
                  <th className="p-4">Model</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Load Limit</th>
                  <th className="p-4">Odometer</th>
                  <th className="p-4">Region</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-on-surface-variant font-mono">
                      Requesting telemetry data...
                    </td>
                  </tr>
                ) : filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-on-surface-variant font-mono">
                      No matching vehicles identified on grid.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map(v => (
                    <tr key={v.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="p-4 font-bold text-primary font-data-tabular">{v.registration_number}</td>
                      <td className="p-4 font-semibold text-on-surface">{v.model}</td>
                      <td className="p-4 text-on-surface-variant">{v.type}</td>
                      <td className="p-4 font-data-tabular text-on-surface">{parseFloat(v.max_load).toLocaleString()} kg</td>
                      <td className="p-4 font-data-tabular text-on-surface-variant">{parseFloat(v.odometer).toLocaleString()} km</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-surface-container-highest border border-outline-variant/30 text-[10px] uppercase font-mono">
                          {getVehicleRegion(v.id)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusColor(v.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-container-high/50 p-3 px-4 flex items-center justify-between text-xs text-on-surface-variant font-mono">
            <span>GRID TELEMETRY ACTIVE</span>
            <span>SHOWN: {filteredVehicles.length} / {vehicles.length} VEHICLES</span>
          </div>
        </div>
      </section>
    </div>
  );
}
