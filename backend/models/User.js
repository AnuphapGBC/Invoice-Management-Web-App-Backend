// backend/models/User.js
const db = require('../database/db');

class User {
  static async createUser({ username, password, role, email }) {
    const [result] = await db.query(
      'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
      [username, password, role, email]
    );
    return result;
  }

  static async getUserByUsername(username) {
    const [user] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return user[0];
  }

  static async getUserById(id) {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return user[0];
  }

  static async getAllUsers() {
    const [users] = await db.query('SELECT * FROM users');
    return users;
  }

  static async updateUser(id, { username, role, email }) {
    const [result] = await db.query(
      'UPDATE users SET username = ?, role = ?, email = ? WHERE id = ?',
      [username, role, email, id]
    );
    return result;
  }

  static async deleteUser(id) {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    return result;
  }
}

module.exports = User;