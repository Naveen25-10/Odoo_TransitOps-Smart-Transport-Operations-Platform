import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiPieChart, FiDollarSign, FiSettings } from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>TransitOps</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/reports" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <FiPieChart className="nav-icon" />
          <span>Reports</span>
        </NavLink>
        <NavLink to="/fuel-expense" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <FiDollarSign className="nav-icon" />
          <span>Fuel & Expense</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <FiSettings className="nav-icon" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
