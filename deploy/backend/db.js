import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

function getSslConfig() {
  const sslMode = process.env.PGSSLMODE || (process.env.DATABASE_URL ? 'require' : 'disable');

  if (sslMode === 'disable') {
    return false;
  }

  if (sslMode === 'no-verify' || sslMode === 'require') {
    // For Supabase and similar services, disable certificate verification
    return { rejectUnauthorized: false };
  }

  return true;
}

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'financing_app',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || ''
    };

const ssl = getSslConfig();

if (ssl) {
  poolConfig.ssl = ssl;
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(1);
});

export default pool;
