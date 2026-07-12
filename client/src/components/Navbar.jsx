import React from 'react';
import { FiBell, FiUser } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="navbar-search">
        {/* Placeholder for search if needed */}
      </div>
      <div className="navbar-actions">
        <button className="icon-btn">
          <FiBell />
        </button>
        <div className="user-profile">
          <div className="avatar">
            <FiUser />
          </div>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
