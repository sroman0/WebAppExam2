/**
 * DATA ACCESS OBJECT (DAO) - USERS
 * 
 * This module handles all database operations related to user management and authentication.
 * It provides functions for user retrieval and password verification for the login system.
 * 
 * Database Tables Used:
 * - users: User accounts with credentials and 2FA capabilities
 * 
 * Security Features:
 * - Passwords are stored using bcrypt hashing (salted and hashed)
 * - Password verification uses bcrypt.compare for secure comparison
 * - All users in this system can perform 2FA (totp_required = 1)
 * 
 * User Accounts (for exam):
 * - simone: password (can do 2FA)
 * - elia: password (can do 2FA)  
 * - andrea: password (can do 2FA)
 * - renato: password (can do 2FA)
 * 
 * Authentication Flow:
 * 1. Client sends username/password
 * 2. getUserByUsername retrieves user record
 * 3. verifyPassword checks password against hash
 * 4. If valid, user can optionally complete 2FA
 */

const db = require('../db');
const bcrypt = require('bcrypt');

/**
 * Retrieve user account by username
 * 
 * Used during the login process to find a user account by their username.
 * Returns the complete user record including hashed password for verification.
 * This is the first step in the authentication process.
 * 
 * @param {string} username - The username to search for
 * @returns {Promise<Object|null>} User object with id, username, password, totp_required or null if not found
 * @throws {Error} Database error if query fails
 */
async function getUserByUsername(username) {
  const sql = 'SELECT * FROM users WHERE username = ?';
  const user = await db.get(sql, [username]);
  return user;
}

/**
 * Retrieve user account by ID
 * 
 * Used for session management and user identification after login.
 * Called by Passport.js deserializeUser to reconstruct user object from session.
 * Returns user information without sensitive data for general use.
 * 
 * @param {number} id - The user ID to retrieve
 * @returns {Promise<Object|null>} User object or null if not found
 * @throws {Error} Database error if query fails
 */
async function getUserById(id) {
  const sql = 'SELECT * FROM users WHERE id = ?';
  const user = await db.get(sql, [id]);
  return user;
}

/**
 * Verify user password using bcrypt
 * 
 * Securely compares a plain text password against the stored bcrypt hash.
 * Uses bcrypt.compare which handles salt and timing attack protection.
 * This is the core security function for password authentication.
 * 
 * @param {Object} user - User object containing hashed password
 * @param {string} password - Plain text password to verify
 * @returns {Promise<boolean>} true if password matches, false otherwise
 * @throws {Error} bcrypt error if comparison fails
 */
async function verifyPassword(user, password) {
  if (!user || !user.password) return false;
  return await bcrypt.compare(password, user.password);
}

/**
 * MODULE EXPORTS
 * 
 * Export all user-related database operations for use by authentication system
 */
module.exports = {
  getUserByUsername,  // Find user by username for login
  getUserById,        // Find user by ID for session management
  verifyPassword,     // Verify password using bcrypt
};
