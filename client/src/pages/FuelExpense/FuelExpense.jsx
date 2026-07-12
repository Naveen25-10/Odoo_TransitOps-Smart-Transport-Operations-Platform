import React, { useState, useEffect } from 'react';
import { getFuelLogs, getExpenses, addFuelLog, addExpense } from '../../services/api';
import { FiPlus, FiFilter, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './FuelExpense.css';

const FuelExpense = () => {
  const [activeTab, setActiveTab] = useState('fuel');
  const [logs, setLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchVehicle, setSearchVehicle] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Dashboard Stats
  const [stats, setStats] = useState({ totalFuel: 0, totalExpense: 0, totalOperational: 0 });

  useEffect(() => {
    fetchData();
    fetchAllStats();
  }, [activeTab]);

  const fetchAllStats = async () => {
    try {
      const [fuelRes, expRes] = await Promise.all([getFuelLogs(), getExpenses()]);
      const totalFuel = fuelRes.data.reduce((sum, item) => sum + Number(item.cost || 0), 0);
      const totalExpense = expRes.data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      setStats({
        totalFuel,
        totalExpense,
        totalOperational: totalFuel + totalExpense
      });
    } catch (error) {
      console.error("Error fetching stats", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'fuel') {
        const res = await getFuelLogs();
        setLogs(res.data);
      } else {
        const res = await getExpenses();
        setLogs(res.data);
      }
    } catch (error) {
      toast.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeTab === 'fuel') {
        await addFuelLog(formData);
        toast.success("Fuel log added successfully");
      } else {
        await addExpense(formData);
        toast.success("Expense added successfully");
      }
      setShowModal(false);
      setFormData({});
      fetchData();
      fetchAllStats();
    } catch (error) {
      toast.error("Error adding entry");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchVehicle = log.vehicle?.toLowerCase().includes(searchVehicle.toLowerCase());
    const matchDate = filterDate ? log.date === filterDate : true;
    return matchVehicle && matchDate;
  });

  return (
    <div className="fuel-expense-container">
      <div className="header-actions">
        <h1>Fuel & Expense Management</h1>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'fuel' ? 'active' : ''}`}
            onClick={() => setActiveTab('fuel')}
          >
            Fuel Logs
          </button>
          <button 
            className={`tab-btn ${activeTab === 'expense' ? 'active' : ''}`}
            onClick={() => setActiveTab('expense')}
          >
            Expense Logs
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Fuel Cost</h3>
          <p className="stat-value">${stats.totalFuel.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Total Expenses</h3>
          <p className="stat-value">${stats.totalExpense.toLocaleString()}</p>
        </div>
        <div className="stat-card highlight">
          <h3>Operational Cost</h3>
          <p className="stat-value">${stats.totalOperational.toLocaleString()}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search vehicles..." 
            className="form-control" 
            value={searchVehicle}
            onChange={e => setSearchVehicle(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <input 
            type="date" 
            className="form-control" 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)} 
          />
          <button className="btn btn-outline" onClick={() => {setSearchVehicle(''); setFilterDate('');}}>
            Clear
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> Add {activeTab === 'fuel' ? 'Fuel Log' : 'Expense'}
          </button>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading data...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Date</th>
                {activeTab === 'fuel' ? (
                  <>
                    <th>Fuel (Liters)</th>
                    <th>Cost ($)</th>
                    <th>Odometer</th>
                  </>
                ) : (
                  <>
                    <th>Type</th>
                    <th>Amount ($)</th>
                    <th>Remarks</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.vehicle}</td>
                  <td>{log.date}</td>
                  {activeTab === 'fuel' ? (
                    <>
                      <td>{log.fuel}</td>
                      <td>${log.cost}</td>
                      <td>{log.odometer}</td>
                    </>
                  ) : (
                    <>
                      <td><span className="badge">{log.type}</span></td>
                      <td>${log.amount}</td>
                      <td>{log.remarks}</td>
                    </>
                  )}
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center'}}>No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add {activeTab === 'fuel' ? 'Fuel Log' : 'Expense'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Vehicle Name</label>
                <input required type="text" name="vehicle" className="form-control" onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input required type="date" name="date" className="form-control" onChange={handleInputChange} />
              </div>
              {activeTab === 'fuel' ? (
                <>
                  <div className="form-group">
                    <label>Fuel Quantity (Liters)</label>
                    <input required type="number" name="fuel" className="form-control" onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Cost ($)</label>
                    <input required type="number" name="cost" className="form-control" onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Odometer Reading</label>
                    <input required type="number" name="odometer" className="form-control" onChange={handleInputChange} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Expense Type</label>
                    <select required name="type" className="form-control" onChange={handleInputChange}>
                      <option value="">Select Type</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Toll">Toll</option>
                      <option value="Repair">Repair</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input required type="number" name="amount" className="form-control" onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Remarks</label>
                    <input type="text" name="remarks" className="form-control" onChange={handleInputChange} />
                  </div>
                </>
              )}
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelExpense;
