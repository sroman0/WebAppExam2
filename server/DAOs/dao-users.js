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
  const user = await db.get(sql, [id]);
  return user;
}

// Verify password (hashed)
async function verifyPassword(user, password) {
  if (!user || !user.password) return false;
  return await bcrypt.compare(password, user.password);
}

// Export functions
module.exports = {
  getUserByUsername,
  getUserById,
  verifyPassword,
};
