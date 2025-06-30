const db = require('../db');
const bcrypt = require('bcrypt');

// Get user by username
async function getUserByUsername(username) {
  const sql = 'SELECT * FROM users WHERE username = ?';
  const user = await db.get(sql, [username]);
  return user;
}

// Get user by id
async function getUserById(id) {
  const sql = 'SELECT * FROM users WHERE id = ?';
  return await db.get(sql, [id]);
}

// Verify password (hashed)
async function verifyPassword(user, password) {
  if (!user) return false;
  return await bcrypt.compare(password, user.password);
}

// Export functions
module.exports = {
  getUserByUsername,
  getUserById,
  verifyPassword,
};
