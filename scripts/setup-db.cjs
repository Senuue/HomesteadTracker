#!/usr/bin/env node
'use strict';
// Creates the target database (if missing) and applies db/local_postgres.sql
// Usage: node scripts/setup-db.cjs

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

function getConnInfo() {
  let url = (process.env.DATABASE_URL || '').trim();
  if (url) {
    try {
      const u = new URL(url);
      return { url, dbName: u.pathname.replace(/^\//, '') || 'postgres' };
    } catch (e) {
      console.error('\n[setup-db] Invalid DATABASE_URL. Please ensure it is a valid URL.');
      process.exit(1);
    }
  }
  // Fallback to discrete envs
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || '';
  const database = process.env.PGDATABASE || 'homestead_tracker';
  const fallbackUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  return { url: fallbackUrl, dbName: database };
}

async function ensureDatabase(adminUrl, dbName) {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    console.log(`[setup-db] Ensuring database exists: ${dbName}`);
    await client.query(`CREATE DATABASE ${JSON.stringify(dbName).replace(/"/g, '')}`);
    console.log('[setup-db] Database created.');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('[setup-db] Database already exists.');
    } else {
      console.error('[setup-db] Error creating database:', err.message);
      throw err;
    }
  } finally {
    await client.end();
  }
}

async function applySchema(dbUrl) {
  const sqlPath = path.resolve(__dirname, '..', 'db', 'local_postgres.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    console.log('[setup-db] Applying schema from db/local_postgres.sql ...');
    await client.query(sql);
    console.log('[setup-db] Schema applied successfully.');
  } finally {
    await client.end();
  }
}

(async () => {
  const { url, dbName } = getConnInfo();
  const u = new URL(url);
  // Build admin URL pointing to the default 'postgres' database
  const adminUrl = `${u.protocol}//${u.username}${u.password ? ':' + u.password : ''}@${u.host}/postgres`;

  await ensureDatabase(adminUrl, dbName);
  await applySchema(url);
  console.log('[setup-db] Done.');
})();
