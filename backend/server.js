import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'transitops_super_secret_key_2026';

app.use(cors());
app.use(express.json());

// --- DATABASE SEEDING FOR AUTHENTICATION ---
async function seedUsers() {
  try {
    const users = await db.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      console.log('Seeding default operators with secure password hashes...');
      const defaultUsers = [
        { email: 'manager@transitops.io', password: 'manager123', name: 'Frank Miller', role: 'Fleet Manager' },
        { email: 'driver@transitops.io', password: 'driver123', name: 'Alex Mercer', role: 'Driver' },
        { email: 'safety@transitops.io', password: 'safety123', name: 'Sarah Jenkins', role: 'Safety Officer' },
        { email: 'analyst@transitops.io', password: 'analyst123', name: 'Diana Prince', role: 'Financial Analyst' }
      ];

      for (const u of defaultUsers) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        await db.query(
          'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
          [u.email, passwordHash, u.role, u.name]
        );
      }
      console.log('✓ Seeding complete: Default users created successfully.');
    }
  } catch (error) {
    console.error('❌ Failed to seed default users:', error.message);
  }
}

// Initialize database seed
seedUsers();

// --- AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Role authorization builder
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}

// --- AUTHENTICATION ENDPOINTS ---

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: 'All fields (email, password, name, role) are required' });
  }

  const validRoles = ['Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role assignment' });
  }

  try {
    // Check if email already exists
    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Identifier already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
      [email, passwordHash, role, name]
    );

    res.status(201).json({ message: 'Operator credentials registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Credentials identifier and security key required' });
  }

  try {
    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me (Verify active session)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});


// --- VEHICLE REGISTRY ENDPOINTS ---

// GET /api/vehicles (With search, filter, and sorting)
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const { search, type, status, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (registration_number LIKE ? OR model LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const vehicles = await db.query(sql, params);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/vehicles (Create - Restricted to Fleet Manager / Admin roles)
app.post('/api/vehicles', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { registration_number, model, type, max_load, odometer, acquisition_cost, status } = req.body;

  if (!registration_number || !model || !type || max_load === undefined || odometer === undefined || acquisition_cost === undefined) {
    return res.status(400).json({ message: 'All vehicle characteristics are required' });
  }

  // Validate fields
  if (parseFloat(max_load) <= 0 || parseFloat(odometer) < 0 || parseFloat(acquisition_cost) <= 0) {
    return res.status(400).json({ message: 'Operational statistics must be positive metrics' });
  }

  try {
    // Unique check
    const existing = await db.query('SELECT id FROM vehicles WHERE registration_number = ?', [registration_number]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A vehicle with this registration number is already active in grid' });
    }

    const result = await db.query(
      'INSERT INTO vehicles (registration_number, model, type, max_load, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        registration_number.toUpperCase().trim(),
        model.trim(),
        type.trim(),
        parseFloat(max_load),
        parseFloat(odometer),
        parseFloat(acquisition_cost),
        status || 'Available'
      ]
    );

    const newVehicleId = result.insertId;
    const [newVehicle] = await db.query('SELECT * FROM vehicles WHERE id = ?', [newVehicleId]);
    res.status(201).json(newVehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/vehicles/:id (Update - Restricted to Fleet Manager)
app.put('/api/vehicles/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  const { registration_number, model, type, max_load, odometer, acquisition_cost, status } = req.body;

  if (!registration_number || !model || !type || max_load === undefined || odometer === undefined || acquisition_cost === undefined || !status) {
    return res.status(400).json({ message: 'All vehicle fields are required for modification' });
  }

  if (parseFloat(max_load) <= 0 || parseFloat(odometer) < 0 || parseFloat(acquisition_cost) <= 0) {
    return res.status(400).json({ message: 'Operational statistics must be positive metrics' });
  }

  try {
    // Unique check excluding current id
    const existing = await db.query(
      'SELECT id FROM vehicles WHERE registration_number = ? AND id != ?',
      [registration_number, id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Registration number conflict' });
    }

    await db.query(
      'UPDATE vehicles SET registration_number = ?, model = ?, type = ?, max_load = ?, odometer = ?, acquisition_cost = ?, status = ? WHERE id = ?',
      [
        registration_number.toUpperCase().trim(),
        model.trim(),
        type.trim(),
        parseFloat(max_load),
        parseFloat(odometer),
        parseFloat(acquisition_cost),
        status,
        id
      ]
    );

    const [updatedVehicle] = await db.query('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!updatedVehicle) {
      return res.status(404).json({ message: 'Vehicle not located in grid' });
    }
    res.json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/vehicles/:id (Delete - Restricted to Fleet Manager)
app.delete('/api/vehicles/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.query('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    await db.query('DELETE FROM vehicles WHERE id = ?', [id]);
    res.json({ message: 'Vehicle successfully decommissioned from registry' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- DRIVERS API ENDPOINTS ---

// GET /api/drivers (With search and status filtering)
app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR license_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC';
    const drivers = await db.query(sql, params);
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/drivers (Create - Restricted to Fleet Manager)
app.post('/api/drivers', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { name, license_number, license_category, license_expiry, contact_number, safety_score, status } = req.body;

  if (!name || !license_number || !license_category || !license_expiry || !contact_number) {
    return res.status(400).json({ message: 'Missing required driver specifications' });
  }

  try {
    const existing = await db.query('SELECT id FROM drivers WHERE license_number = ?', [license_number]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'License number already registered' });
    }

    const result = await db.query(
      'INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        license_number.toUpperCase().trim(),
        license_category.trim(),
        license_expiry,
        contact_number.trim(),
        safety_score ? parseFloat(safety_score) : 5.0,
        status || 'Available'
      ]
    );

    const newDriver = {
      id: result.insertId,
      name,
      license_number,
      license_category,
      license_expiry,
      contact_number,
      safety_score: safety_score ? parseFloat(safety_score) : 5.0,
      status: status || 'Available'
    };
    res.status(201).json(newDriver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/drivers/:id (Update - Restricted to Fleet Manager)
app.put('/api/drivers/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  const { name, license_number, license_category, license_expiry, contact_number, safety_score, status } = req.body;

  if (!name || !license_number || !license_category || !license_expiry || !contact_number || !status) {
    return res.status(400).json({ message: 'All driver details are required for updates' });
  }

  try {
    const existing = await db.query('SELECT id FROM drivers WHERE license_number = ? AND id != ?', [license_number, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'License number conflict' });
    }

    await db.query(
      'UPDATE drivers SET name = ?, license_number = ?, license_category = ?, license_expiry = ?, contact_number = ?, safety_score = ?, status = ? WHERE id = ?',
      [
        name.trim(),
        license_number.toUpperCase().trim(),
        license_category.trim(),
        license_expiry,
        contact_number.trim(),
        parseFloat(safety_score),
        status,
        id
      ]
    );

    res.json({ id, name, license_number, license_category, license_expiry, contact_number, safety_score, status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/drivers/:id (Delete - Restricted to Fleet Manager)
app.delete('/api/drivers/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM drivers WHERE id = ?', [id]);
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- TRIPS API ENDPOINTS ---

// GET /api/trips (With search and status filtering)
app.get('/api/trips', authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT t.*, 
             v.registration_number as vehicle_reg, v.model as vehicle_model,
             d.name as driver_name, d.contact_number as driver_contact
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (t.source LIKE ? OR t.destination LIKE ? OR d.name LIKE ? OR v.registration_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.id DESC';
    const trips = await db.query(sql, params);
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/trips (Create - Restricted to Fleet Manager)
app.post('/api/trips', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status } = req.body;

  if (!source || !destination || cargo_weight === undefined || planned_distance === undefined) {
    return res.status(400).json({ message: 'Source, destination, cargo weight, and planned distance are required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        source.trim(),
        destination.trim(),
        vehicle_id ? parseInt(vehicle_id) : null,
        driver_id ? parseInt(driver_id) : null,
        parseFloat(cargo_weight),
        parseFloat(planned_distance),
        status || 'Draft'
      ]
    );

    const tripId = result.insertId;

    // If trip status is Dispatched, update vehicle status and driver status to 'On Trip'
    if (status === 'Dispatched') {
      if (vehicle_id) await db.query("UPDATE vehicles SET status = 'On Trip' WHERE id = ?", [vehicle_id]);
      if (driver_id) await db.query("UPDATE drivers SET status = 'On Trip' WHERE id = ?", [driver_id]);
    }

    res.status(201).json({ id: tripId, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status: status || 'Draft' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/trips/:id (Update - Restricted to Fleet Manager)
app.put('/api/trips/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status } = req.body;

  if (!source || !destination || cargo_weight === undefined || planned_distance === undefined || !status) {
    return res.status(400).json({ message: 'Missing fields for updating trip' });
  }

  try {
    const previousTrips = await db.query('SELECT * FROM trips WHERE id = ?', [id]);
    if (previousTrips.length === 0) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    const oldTrip = previousTrips[0];

    await db.query(
      'UPDATE trips SET source = ?, destination = ?, vehicle_id = ?, driver_id = ?, cargo_weight = ?, planned_distance = ?, status = ? WHERE id = ?',
      [
        source.trim(),
        destination.trim(),
        vehicle_id ? parseInt(vehicle_id) : null,
        driver_id ? parseInt(driver_id) : null,
        parseFloat(cargo_weight),
        parseFloat(planned_distance),
        status,
        id
      ]
    );

    const cleanUpAssigned = async (vId, dId) => {
      if (vId) {
        const activeVeh = await db.query("SELECT id FROM trips WHERE vehicle_id = ? AND status = 'Dispatched' AND id != ?", [vId, id]);
        if (activeVeh.length === 0) {
          await db.query("UPDATE vehicles SET status = 'Available' WHERE id = ?", [vId]);
        }
      }
      if (dId) {
        const activeDrv = await db.query("SELECT id FROM trips WHERE driver_id = ? AND status = 'Dispatched' AND id != ?", [dId, id]);
        if (activeDrv.length === 0) {
          await db.query("UPDATE drivers SET status = 'Available' WHERE id = ?", [dId]);
        }
      }
    };

    if (status === 'Dispatched') {
      if (vehicle_id) await db.query("UPDATE vehicles SET status = 'On Trip' WHERE id = ?", [vehicle_id]);
      if (driver_id) await db.query("UPDATE drivers SET status = 'On Trip' WHERE id = ?", [driver_id]);
      if (oldTrip.vehicle_id && oldTrip.vehicle_id !== parseInt(vehicle_id)) {
        await cleanUpAssigned(oldTrip.vehicle_id, null);
      }
      if (oldTrip.driver_id && oldTrip.driver_id !== parseInt(driver_id)) {
        await cleanUpAssigned(null, oldTrip.driver_id);
      }
    } else if (status === 'Completed') {
      await cleanUpAssigned(vehicle_id || oldTrip.vehicle_id, driver_id || oldTrip.driver_id);
      const revenueAmount = parseFloat(planned_distance) * 8.75;
      await db.query(
        "INSERT INTO financial_ledger (type, category, amount, description, reference_id, date) VALUES ('Revenue', 'Trip Revenue', ?, ?, ?, CURDATE())",
        [revenueAmount, `Trip ID TRP-${id} completed from ${source} to ${destination}`, `TRP-${id}`, ]
      );
    } else if (status === 'Cancelled' || status === 'Draft') {
      await cleanUpAssigned(vehicle_id || oldTrip.vehicle_id, driver_id || oldTrip.driver_id);
    }

    res.json({ message: 'Trip updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/trips/:id (Delete - Restricted to Fleet Manager)
app.delete('/api/trips/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM trips WHERE id = ?', [id]);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- MAINTENANCE LOGS API ENDPOINTS ---

// GET /api/maintenance
app.get('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT m.*, v.registration_number as vehicle_reg, v.model as vehicle_model, v.type as vehicle_type
      FROM maintenance_logs m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (m.description LIKE ? OR v.registration_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY m.id DESC';
    const logs = await db.query(sql, params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/maintenance (Create - Restricted to Fleet Manager)
app.post('/api/maintenance', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { vehicle_id, description, cost, start_date, status } = req.body;

  if (!vehicle_id || !description || cost === undefined || !start_date) {
    return res.status(400).json({ message: 'Missing maintenance details' });
  }

  try {
    const result = await db.query(
      'INSERT INTO maintenance_logs (vehicle_id, description, cost, start_date, status) VALUES (?, ?, ?, ?, ?)',
      [parseInt(vehicle_id), description.trim(), parseFloat(cost), start_date, status || 'Scheduled']
    );

    if (status === 'In Progress' || status === 'Overdue') {
      await db.query("UPDATE vehicles SET status = 'In Shop' WHERE id = ?", [vehicle_id]);
    }

    const [veh] = await db.query('SELECT registration_number FROM vehicles WHERE id = ?', [vehicle_id]);
    await db.query(
      "INSERT INTO financial_ledger (type, category, amount, description, reference_id, date) VALUES ('Expense', 'Maintenance Cost', ?, ?, ?, ?)",
      [parseFloat(cost), `Service check: ${description}`, veh ? veh.registration_number : 'Vehicle ID ' + vehicle_id, start_date]
    );

    res.status(201).json({ id: result.insertId, vehicle_id, description, cost, start_date, status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/maintenance/:id (Update - Restricted to Fleet Manager)
app.put('/api/maintenance/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  const { vehicle_id, description, cost, start_date, end_date, status } = req.body;

  if (!vehicle_id || !description || cost === undefined || !start_date || !status) {
    return res.status(400).json({ message: 'All maintenance specifications are required for update' });
  }

  try {
    await db.query(
      'UPDATE maintenance_logs SET vehicle_id = ?, description = ?, cost = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?',
      [parseInt(vehicle_id), description.trim(), parseFloat(cost), start_date, end_date || null, status, id]
    );

    if (status === 'Completed') {
      await db.query("UPDATE vehicles SET status = 'Available' WHERE id = ?", [vehicle_id]);
    } else if (status === 'In Progress' || status === 'Overdue') {
      await db.query("UPDATE vehicles SET status = 'In Shop' WHERE id = ?", [vehicle_id]);
    }

    res.json({ message: 'Maintenance record updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/maintenance/:id (Delete - Restricted to Fleet Manager)
app.delete('/api/maintenance/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM maintenance_logs WHERE id = ?', [id]);
    res.json({ message: 'Maintenance entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- FINANCIAL LEDGER API ENDPOINTS ---

// GET /api/finance/ledger
app.get('/api/finance/ledger', authenticateToken, async (req, res) => {
  try {
    const { category, type, search } = req.query;
    let sql = 'SELECT * FROM financial_ledger WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (search) {
      sql += ' AND (description LIKE ? OR reference_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY date DESC, id DESC';
    const transactions = await db.query(sql, params);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/finance/ledger (Create - Restricted to Fleet Manager)
app.post('/api/finance/ledger', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { type, category, amount, description, reference_id, date } = req.body;

  if (!type || !category || amount === undefined || !description || !date) {
    return res.status(400).json({ message: 'All ledger properties are required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO financial_ledger (type, category, amount, description, reference_id, date) VALUES (?, ?, ?, ?, ?, ?)',
      [type, category.trim(), parseFloat(amount), description.trim(), reference_id ? reference_id.trim() : null, date]
    );

    res.status(201).json({ id: result.insertId, type, category, amount, description, reference_id, date });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/finance/stats
app.get('/api/finance/stats', authenticateToken, async (req, res) => {
  try {
    const [rev] = await db.query("SELECT SUM(amount) as total FROM financial_ledger WHERE type = 'Revenue'");
    const [exp] = await db.query("SELECT SUM(amount) as total FROM financial_ledger WHERE type = 'Expense'");
    const [assetVal] = await db.query("SELECT SUM(acquisition_cost) as total FROM vehicles WHERE status != 'Retired'");

    const totalRevenue = parseFloat(rev.total || 0);
    const totalExpenses = parseFloat(exp.total || 0);
    const netMargin = totalRevenue - totalExpenses;
    const fleetValuation = parseFloat(assetVal.total || 0);

    res.json({
      totalRevenue,
      totalExpenses,
      netMargin,
      fleetValuation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- DASHBOARD ENDPOINTS ---

// GET /api/dashboard/stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [activeVehicles] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'On Trip'");
    const [availableVehicles] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'Available'");
    const [maintenanceVehicles] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'In Shop'");
    const [totalActiveFleet] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status != 'Retired'");
    const [activeTrips] = await db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'Dispatched'");
    const [pendingTrips] = await db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'Draft'");
    const [driversOnDuty] = await db.query("SELECT COUNT(*) as count FROM drivers WHERE status IN ('Available', 'On Trip')");
    const [totalDrivers] = await db.query("SELECT COUNT(*) as count FROM drivers");
    const [offDutyDrivers] = await db.query("SELECT COUNT(*) as count FROM drivers WHERE status = 'Off Duty'");
    const [suspendedDrivers] = await db.query("SELECT COUNT(*) as count FROM drivers WHERE status = 'Suspended'");

    const activeCount = activeVehicles.count || 0;
    const totalActiveCount = totalActiveFleet.count || 0;
    const fleetUtilization = totalActiveCount > 0 ? parseFloat(((activeCount / totalActiveCount) * 100).toFixed(1)) : 0.0;

    res.json({
      activeVehicles: activeCount,
      availableVehicles: availableVehicles.count || 0,
      maintenanceVehicles: maintenanceVehicles.count || 0,
      totalActiveFleet: totalActiveCount,
      activeTrips: activeTrips.count || 0,
      pendingTrips: pendingTrips.count || 0,
      driversOnDuty: driversOnDuty.count || 0,
      totalDrivers: totalDrivers.count || 0,
      offDutyDrivers: offDutyDrivers.count || 0,
      suspendedDrivers: suspendedDrivers.count || 0,
      fleetUtilization
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/reset
app.post('/api/admin/reset', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return res.status(404).json({ message: 'Schema file not found' });
    }
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    await connection.query(schemaSQL);
    await connection.end();

    // Re-seed default user operators
    await seedUsers();

    res.json({ message: 'Database reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`🚀 TransitOps Operational Backend running on http://localhost:${PORT}`);
});
