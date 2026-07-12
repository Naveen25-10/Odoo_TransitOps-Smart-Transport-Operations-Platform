import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, token }) {
  const [stats, setStats] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    totalDrivers: 0,
    fleetUtilization: 0
  });

  const [recentTrips, setRecentTrips] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchActivity();
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

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const tripResponse = await fetch('http://localhost:5000/api/trips', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const logResponse = await fetch('http://localhost:5000/api/maintenance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (tripResponse.ok) {
        const trips = await tripResponse.json();
        setRecentTrips(trips.slice(0, 3)); // Get top 3
      }
      if (logResponse.ok) {
        const logs = await logResponse.json();
        setRecentLogs(logs.slice(0, 3)); // Get top 3
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build alerts list: merging real DB data (recent trips completed, recent maintenance scheduled) with mock priority alerts
  const alerts = [
    {
      id: 1,
      title: "Vehicle #TRK-8822 Engine Fault",
      type: "Critical",
      time: "12m ago",
      icon: "error",
      iconColor: "text-error"
    },
    ...recentLogs.map((log, idx) => ({
      id: `log-${log.id}`,
      title: `Upcoming Service: ${log.vehicle_reg} - ${log.description}`,
      type: "Maintenance",
      time: `${idx * 2 + 1}h ago`,
      icon: "build",
      iconColor: "text-status-in-shop"
    })),
    ...recentTrips.filter(t => t.status === 'Completed').map((trip, idx) => ({
      id: `trip-${trip.id}`,
      title: `Trip Completed: Route ${trip.source} → ${trip.destination}`,
      type: "Logistics",
      time: `${idx * 3 + 2}h ago`,
      icon: "check_circle",
      iconColor: "text-status-available"
    })),
    {
      id: 4,
      title: "Weather Alert: High Winds North",
      type: "Regional",
      time: "4h ago",
      icon: "cloud",
      iconColor: "text-primary"
    }
  ].slice(0, 6); // Limit to top 6 alerts

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Welcome Header */}
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

      {/* KPI Stats Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI: Fleet Utilization */}
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-[10px] uppercase tracking-wider">Fleet Utilization</span>
              <span className="material-symbols-outlined text-primary text-xl">analytics</span>
            </div>
            <div className="text-3xl font-bold font-data-tabular mt-2 text-primary">
              {stats.fleetUtilization}%
            </div>
          </div>
          <div className="w-full bg-surface-container-lowest h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-1000" 
              style={{ width: `${Math.min(stats.fleetUtilization, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI: Active Vehicles */}
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-status-on-trip/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-[10px] uppercase tracking-wider">Active Vehicles</span>
              <span className="material-symbols-outlined text-status-on-trip text-xl">local_shipping</span>
            </div>
            <div className="text-3xl font-bold font-data-tabular mt-2 text-on-surface">
              {stats.activeVehicles}
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant mt-4 font-mono uppercase">
            Dispatched on grid
          </span>
        </div>

        {/* KPI: Available Vehicles */}
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-status-available/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-[10px] uppercase tracking-wider">Available Fleet</span>
              <span className="material-symbols-outlined text-status-available text-xl">check_circle</span>
            </div>
            <div className="text-3xl font-bold font-data-tabular mt-2 text-status-available">
              {stats.availableVehicles}
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant mt-4 font-mono uppercase">
            Ready for allocation
          </span>
        </div>

        {/* KPI: In Shop */}
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-status-in-shop/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-[10px] uppercase tracking-wider">In Maintenance</span>
              <span className="material-symbols-outlined text-status-in-shop text-xl">build</span>
            </div>
            <div className="text-3xl font-bold font-data-tabular mt-2 text-status-in-shop">
              {stats.maintenanceVehicles}
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant mt-4 font-mono uppercase">
            Undergoing diagnostics
          </span>
        </div>

        {/* KPI: Drivers On Duty */}
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-caps text-[10px] uppercase tracking-wider">Drivers On Duty</span>
              <span className="material-symbols-outlined text-primary text-xl">badge</span>
            </div>
            <div className="text-3xl font-bold font-data-tabular mt-2 text-on-surface">
              {stats.driversOnDuty}
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant mt-4 font-mono uppercase">
            Active operators
          </span>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Operations Map Layout (2/3 width) */}
        <div className="lg:col-span-2 bg-surface-container rounded-xl p-6 border border-outline-variant/20 flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-on-surface">Active Operations Map</h3>
                <p className="text-xs text-on-surface-variant">Real-time geospatial fleet distribution.</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-background border border-outline-variant/30 text-[10px] font-mono text-status-available uppercase font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-status-available animate-ping"></span>
                Live Tracking Sync
              </div>
            </div>

            {/* Simulated Geospatial Map Grid */}
            <div className="w-full h-72 bg-background/50 rounded-lg border border-outline-variant/30 mt-6 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-cover opacity-25" style={{ backgroundImage: `radial-gradient(circle, #252529 1px, transparent 1px)`, backgroundSize: '16px 16px' }}></div>
              
              {/* Map Routes and Blips */}
              <svg viewBox="0 0 500 250" className="absolute inset-0 w-full h-full text-outline-variant/40" fill="none" stroke="currentColor">
                <path d="M 50 50 L 150 120 L 320 80 L 450 180" strokeWidth="1" strokeDasharray="4,4" className="text-outline/30" />
                <path d="M 120 180 Q 250 110 380 190" strokeWidth="1.5" className="text-primary/40" />

                {/* Blips */}
                <circle cx="150" cy="120" r="6" className="fill-primary text-primary animate-pulse" />
                <circle cx="320" cy="80" r="6" className="fill-status-available text-status-available animate-pulse" />
                <circle cx="450" cy="180" r="6" className="fill-status-on-trip text-status-on-trip" />
                <circle cx="120" cy="180" r="4" className="fill-status-in-shop text-status-in-shop" />
              </svg>

              <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] font-mono text-on-surface-variant bg-surface-container/90 px-3 py-2 rounded border border-outline-variant/40">
                <div>ACTIVE DISPATCHES: <span className="text-primary font-bold">{stats.activeTrips}</span></div>
                <div>PENDING ALLOCATIONS: <span className="text-status-in-shop font-bold">{stats.pendingTrips}</span></div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-on-surface-variant font-mono mt-4 flex items-center justify-between">
            <span>GRID CHANNELS ONLINE</span>
            <span>PING: 14ms • TELEMETRY SYNC NOMINAL</span>
          </div>
        </div>

        {/* Priority Alerts Side Panel (1/3 width) */}
        <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/20 flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-base font-bold text-on-surface">Priority Alerts</h3>
            <p className="text-xs text-on-surface-variant">Real-time status updates requiring observation.</p>

            <div className="space-y-3.5 mt-6">
              {loading ? (
                <div className="text-xs font-mono text-on-surface-variant">Accessing telemetry stream...</div>
              ) : alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-background/40 border border-outline-variant/30 rounded-lg hover:border-primary/30 transition-colors">
                  <span className={`material-symbols-outlined text-base mt-0.5 ${alert.iconColor}`}>
                    {alert.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">{alert.type}</span>
                      <span className="text-[9px] font-mono text-on-surface-variant/80">{alert.time}</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface truncate mt-1">{alert.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full text-center py-2.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/50 text-xs font-bold text-on-surface rounded-lg mt-6 transition-all">
            VIEW ALL ALERTS
          </button>
        </div>
      </section>
    </div>
  );
}
