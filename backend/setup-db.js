import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found at: ${schemaPath}`);
    process.exit(1);
  }
  
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

  // Candidate credentials to check
  const credentials = [
    { user: 'root', password: 'Pranessh@0309', description: 'root with Pranessh@0309' },
    { user: 'root', password: '24csr094', description: 'root with 24csr094' },
    { user: 'root', password: '', description: 'root (no password)' },
  ];

  let activeCred = null;
  let connection = null;

  for (const cred of credentials) {
    try {
      console.log(`Checking: ${cred.description}...`);
      connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: cred.user,
        password: cred.password,
        multipleStatements: true
      });
      console.log(`✓ Connected with ${cred.description}!`);
      activeCred = cred;
      break;
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }

  if (!activeCred) {
    console.error('\n❌ Could not connect to MySQL with any known credentials.');
    console.error('Please configure your MySQL server or create the .env manually.');
    process.exit(1);
  }

  try {
    console.log('\nRunning schema script to build transitops database...');
    // The schema file contains CREATE DATABASE IF NOT EXISTS transitops; USE transitops;
    await connection.query(schemaSQL);
    console.log('✓ Database tables created and seeded successfully!');
    await connection.end();

    // Now write the .env file automatically!
    const envContent = `PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=${activeCred.user}
DB_PASSWORD=${activeCred.password}
DB_NAME=transitops
JWT_SECRET=transitops_super_secret_key_2026
`;

    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log(`✓ Generated .env file successfully at: ${envPath}\n`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error running schema: ${error.message}`);
    process.exit(1);
  }
}

setupDatabase();
