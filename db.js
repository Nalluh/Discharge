const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Weekend-Discharges',
  password: 'macbook',
  port: 5432, // Default PostgreSQL port
});

module.exports = pool;

//postgres://postgres:macbook@localhost:5432/postgres
