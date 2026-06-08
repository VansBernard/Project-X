import pool from '../db.js';

export async function requireDatabase(t) {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (error) {
    t.skip(`Database unavailable, skipping integration test: ${error.message}`);
    return false;
  }
}
