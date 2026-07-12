import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

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


// --- DASHBOARD ENDPOINTS ---

// GET /api/dashboard/stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Active Vehicles (On Trip)
    const [activeVehicles] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'On Trip'");
    
    // Available Vehicles (Available)
    const [availableVehicles] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'Available'");
    
    // In Maintenance (In Shop)
    const [maintenanceVehicles] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'In Shop'");
    
    // Total Active Fleet (excluding retired)
    const [totalActiveFleet] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status != 'Retired'");
    
    // Active Trips
    const [activeTrips] = await db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'Dispatched'");
    
    // Pending Trips
    const [pendingTrips] = await db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'Draft'");
    
    // Drivers On Duty (Available or On Trip)
    const [driversOnDuty] = await db.query("SELECT COUNT(*) as count FROM drivers WHERE status IN ('Available', 'On Trip')");

    // Fleet utilization: (On Trip Vehicles / Total Active Fleet) * 100
    const activeCount = activeVehicles.count || 0;
    const totalActiveCount = totalActiveFleet.count || 0;
    const fleetUtilization = totalActiveCount > 0 ? parseFloat(((activeCount / totalActiveCount) * 100).toFixed(1)) : 0.0;

    res.json({
      activeVehicles: activeCount,
      availableVehicles: availableVehicles.count || 0,
      maintenanceVehicles: maintenanceVehicles.count || 0,
      activeTrips: activeTrips.count || 0,
      pendingTrips: pendingTrips.count || 0,
      driversOnDuty: driversOnDuty.count || 0,
      fleetUtilization
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`🚀 TransitOps Operational Backend running on http://localhost:${PORT}`);
});
