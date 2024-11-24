const express = require('express');
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Test Database Query Route
router.get('/testdb', async (req, res) => {
  try {
    const [users] = await db.query("SELECT * FROM users WHERE username = 'admin_user'");
    console.log("Test DB Query Result:", users);
    res.send(users);
  } catch (error) {
    console.error("DB Query Failed:", error);
    res.status(500).send("DB Query Failed");
  }
});

// Create User
router.post('/', async (req, res) => {
  const { username, password, role, email } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, email]
    );
    res.status(201).json({
      message: 'User created successfully',
      id: result.insertId,
      username,
      role,
      email
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(400).json({ message: 'Failed to create user', error: error.message });
  }
});

// Get All Users
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users');
    res.status(200).json({ message: 'Users retrieved successfully', users });
  } catch (error) {
    console.error('Failed to retrieve users:', error);
    res.status(500).json({ message: 'Failed to retrieve users', error: error.message });
  }
});

// Get User by ID
router.get('/id/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Fetching user by ID:', id); // Debugging log
  try {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      console.error('User not found with ID:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User retrieved successfully', ...user[0] });
  } catch (error) {
    console.error('Failed to retrieve user by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve user', error: error.message });
  }
});

// Update User
router.put('/:id', async (req, res) => {
  const { username, role, email } = req.body;
  const { id } = req.params;
  console.log('Updating user with ID:', id); // Debugging log
  try {
    const [result] = await db.query(
      'UPDATE users SET username = ?, role = ?, email = ? WHERE id = ?',
      [username, role, email, id]
    );
    if (result.affectedRows === 0) {
      console.error('User not found with ID:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      message: 'User updated successfully',
      id,
      username,
      role,
      email
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(400).json({ message: 'Failed to update user', error: error.message });
  }
});

// Delete User
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Deleting user with ID:', id); // Debugging log
  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      console.error('User not found with ID:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// Get User by Username
router.get('/username/:username', async (req, res) => {
  // console.log('User routes initialized');
  const { username } = req.params;
  // console.log('Username received from request:', username); // Debugging log

  try {
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    // console.log('Query result:', users); // Debugging log

    if (users.length === 0) {
      console.error('User not found:', username);
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error('Failed to get user by username:', error);
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
});

module.exports = router;
