import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

export const getDashboard = () => api.get('/reports/dashboard');
export const getMonthly = () => api.get('/reports/monthly');
export const getRoi = () => api.get('/reports/roi'); // Updated

export const getFuelLogs = () => api.get('/fuel');
export const addFuelLog = (data) => api.post('/fuel', data);

export const getExpenses = () => api.get('/expenses');
export const addExpense = (data) => api.post('/expenses', data);

export const getProfile = () => api.get('/settings/profile');
export const updateProfile = (data) => api.put('/settings/profile', data);
export const updatePassword = (data) => api.put('/settings/password', data);
export const getRoles = () => api.get('/settings/roles');

export default api;
