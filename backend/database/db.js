// backend/database/db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'test1234',
  database: 'invoice_management',
});

module.exports = pool.promise();