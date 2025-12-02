const path = require('path');

// Support Postgres if DATABASE_URL is provided, otherwise use SQLite for local dev
const DATABASE_URL = process.env.DATABASE_URL;

let db = null;
let pool = null;

if (DATABASE_URL) {
  // Use connection pool for production PostgreSQL
  const { Pool } = require('pg');
  pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Create a PostgreSQL interface
  db = {
    // Modern async query method
    query: (sql, params = []) => pool.query(sql, params),
    
    // Legacy callback-based methods for backward compatibility
    run: (sql, params = [], callback) => {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 0;
      pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
      
      pool.query(pgSql, params)
        .then((result) => {
          if (callback) {
            callback.call({ lastID: result.rows[0]?.id, changes: result.rowCount }, null);
          }
        })
        .catch((err) => {
          console.error('PG query error:', err.message, pgSql);
          if (callback) callback(err);
        });
    },
    get: (sql, params = [], callback) => {
      let pgSql = sql;
      let paramIndex = 0;
      pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
      
      pool.query(pgSql, params)
        .then((result) => callback(null, result.rows[0]))
        .catch((err) => callback(err));
    },
    all: (sql, params = [], callback) => {
      let pgSql = sql;
      let paramIndex = 0;
      pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
      
      pool.query(pgSql, params)
        .then((result) => callback(null, result.rows))
        .catch((err) => callback(err));
    },
    serialize: (callback) => {
      if (callback) callback();
    },
    exec: (sql, callback) => {
      pool.query(sql)
        .then(() => { if (callback) callback(null); })
        .catch((err) => { if (callback) callback(err); });
    }
  };
  
  console.log('Using PostgreSQL database');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '../../database.db');
  const sqliteDb = new sqlite3.Database(dbPath);
  
  // Wrap SQLite with query method for consistency
  db = {
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        sqliteDb.all(sql.replace(/\$\d+/g, '?'), params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows });
        });
      });
    },
    run: sqliteDb.run.bind(sqliteDb),
    get: sqliteDb.get.bind(sqliteDb),
    all: sqliteDb.all.bind(sqliteDb),
    serialize: sqliteDb.serialize.bind(sqliteDb),
    exec: sqliteDb.exec.bind(sqliteDb)
  };
  
  console.log('Using SQLite database');
}

module.exports = { db, pool };