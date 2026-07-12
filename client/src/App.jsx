import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import Reports from './pages/Reports/Reports';
import FuelExpense from './pages/FuelExpense/FuelExpense';
import Settings from './pages/Settings/Settings';

function App() {
  return (
    <Router>
      <Layout>
        <ToastContainer theme="dark" position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/reports" replace />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/fuel-expense" element={<FuelExpense />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
