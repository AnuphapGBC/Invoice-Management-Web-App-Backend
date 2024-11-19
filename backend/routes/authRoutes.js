// backend/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [user] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (user.length === 0 || !bcrypt.compareSync(password, user[0].password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user[0].id, role: user[0].role }, 'secretKey', { expiresIn: '1h' });
    res.json({ success: true, user: { username: user[0].username, role: user[0].role }, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;