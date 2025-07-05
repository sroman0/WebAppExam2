/**
 * DATABASE CONNECTION MODULE
 * 
 * This file provides a simple SQLite database connection for the Restaurant application.
 * Following the pattern from the professor's examples with clean separation of concerns.
 * 
 * The database schema and initial data are defined in restaurant.sql
 * Run: sqlite3 restaurant.sqlite < restaurant.sql to initialize the database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'database', 'restaurant.sqlite'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    // Enable foreign key constraints for referential integrity
    db.run('PRAGMA foreign_keys = ON');
  }
});

// Export the database connection for use in DAOs
module.exports = db;
