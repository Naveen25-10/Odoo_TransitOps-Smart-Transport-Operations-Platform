import React, { useEffect, useState } from 'react';
import { getDashboard, getMonthly, getRoi } from '../../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './Reports.css';

const Reports = () => {
  const [kpis, setKpis] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [roiData, setRoiData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, monthRes, roiRes] = await Promise.all([
          getDashboard(), getMonthly(), getRoi()
        ]);
        setKpis(dashRes.data);
        setMonthlyData(monthRes.data);
        setRoiData(roiRes.data);
      } catch (error) {
        toast.error("Failed to fetch report data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = (type) => {
    toast.info(`Exporting ${type}... (UI only)`);
  };

  if (loading) {
    return <div className="loading-state">Loading dashboard data...</div>;
  }

  return (
    <div className="reports-container">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <div className="header-actions-btn">
          <button className="btn btn-outline" onClick={() => handleExport('CSV')}>
            <FiDownload /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('PDF')}>
            <FiDownload /> Export PDF
          </button>
        </div>
      </div>
      
      {kpis && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <h3>Fuel Efficiency</h3>
            <p className="kpi-value">{kpis.fuelEfficiency}</p>
          </div>
          <div className="kpi-card">
            <h3>Fleet Utilization</h3>
            <p className="kpi-value">{kpis.fleetUtilization}</p>
          </div>
          <div className="kpi-card">
            <h3>Operational Cost</h3>
            <p className="kpi-value">{kpis.operationalCost}</p>
          </div>
          <div className="kpi-card">
            <h3>Vehicle ROI</h3>
            <p className="kpi-value">{kpis.vehicleROI}</p>
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Monthly Cost Analysis</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="fuel" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                <Area type="monotone" dataKey="expenses" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Vehicle Utilization (%)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="vehicle" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="utilization" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="tables-grid">
        <div className="table-card">
          <h3>Fuel Summary</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Fuel Cost</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((d, i) => (
                  <tr key={i}>
                    <td>{d.month}</td>
                    <td>${d.fuel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card">
          <h3>Expense Summary</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Expenses</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((d, i) => (
                  <tr key={i}>
                    <td>{d.month}</td>
                    <td>${d.expenses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
