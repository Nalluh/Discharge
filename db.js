const { Pool } = require('pg');

const pool = new Pool({
  user: '',
  host: '',
  database: '',
  password: '',
  port: 5432, // Default PostgreSQL port
});

module.exports = pool;

//postgres://postgres:macbook@localhost:5432/postgres
