/**
 * DATABASE INITIALIZATION AND CONFIGURATION MODULE
 * 
 * This file handles the SQLite database setup for the Restaurant application.
 * It creates all necessary tables, populates them with initial data, and provides
 * utility functions for database operations.
 * 
 * Database Structure:
 * - users: User accounts with 2FA capabilities
 * - dishes: Base dishes (pizza, pasta, salad)
 * - dish_sizes: Size variants with prices and ingredient limits
 * - ingredients: Available ingredients with prices and availability
 * - ingredient_dependencies: Required ingredient relationships
 * - ingredient_incompatibilities: Incompatible ingredient pairs
 * - orders: Customer orders with status tracking
 * - order_ingredients: Ingredients included in each order
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');

// Open the SQLite database with async/await support
const dbPromise = open({
  filename: path.join(__dirname, 'database', 'restaurant.sqlite'),
  driver: sqlite3.Database
});

/**
 * DATABASE UTILITY FUNCTIONS
 * These functions provide a clean interface for database operations
 */

// Helper to run a query and return all rows
async function all(sql, params = []) {
  const db = await dbPromise;
  return db.all(sql, params);
}

// Helper to run a query and return a single row
async function get(sql, params = []) {
  const db = await dbPromise;
  return db.get(sql, params);
}

// Helper to run a query (insert/update/delete)
async function run(sql, params = []) {
  const db = await dbPromise;
  return db.run(sql, params);
}

/**
 * DATABASE INITIALIZATION FUNCTION
 * 
 * Creates all necessary tables and populates them with initial data according to exam requirements.
 * This function is called when the server starts to ensure the database is properly set up.
 */
async function initDB() {
  const db = await dbPromise;

  // Create all database tables with proper relationships
  await db.exec(`
    -- User accounts table with 2FA support
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      totp_required INTEGER DEFAULT 1  -- 1 means user CAN use 2FA, 0 means cannot
    );

    -- Base dishes (pizza, pasta, salad)
    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    -- Dish size variants with pricing and ingredient limits
    CREATE TABLE IF NOT EXISTS dish_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_id INTEGER NOT NULL,
      size TEXT NOT NULL,                -- small, medium, large
      price REAL NOT NULL,               -- base price for this size
      max_ingredients INTEGER NOT NULL,  -- maximum allowed ingredients for this size
      FOREIGN KEY (dish_id) REFERENCES dishes(id)
    );

    -- Available ingredients with pricing and availability constraints
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      availability INTEGER -- NULL means unlimited, number means limited quantity
    );

    -- Ingredient dependency relationships (ingredient A requires ingredient B)
    CREATE TABLE IF NOT EXISTS ingredient_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      required_ingredient_id INTEGER NOT NULL,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
      FOREIGN KEY (required_ingredient_id) REFERENCES ingredients(id)
    );

    -- Ingredient incompatibility relationships (ingredient A cannot be with ingredient B)
    CREATE TABLE IF NOT EXISTS ingredient_incompatibilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      incompatible_ingredient_id INTEGER NOT NULL,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
      FOREIGN KEY (incompatible_ingredient_id) REFERENCES ingredients(id)
    );

    -- Customer orders with status tracking
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      size TEXT NOT NULL,               -- small, medium, large
      total REAL NOT NULL,              -- calculated total price
      date TEXT DEFAULT (datetime('now')), -- order timestamp
      cancelled INTEGER DEFAULT 0,     -- 0 = active, 1 = cancelled
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (dish_id) REFERENCES dishes(id)
    );

    -- Junction table for ingredients included in each order
    CREATE TABLE IF NOT EXISTS order_ingredients (
      order_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      PRIMARY KEY (order_id, ingredient_id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );
  `);

  /**
   * POPULATE INITIAL DATA
   * Only insert data if tables are empty to avoid duplicates
   */

  // Check if dishes exist, if not create base dishes
  const dishCount = await db.get('SELECT COUNT(*) as count FROM dishes');
  if (dishCount.count === 0) {
    // Insert the three base dishes as per exam requirements
    await db.run("INSERT INTO dishes (name) VALUES ('pizza'), ('pasta'), ('salad')");
    
    // Insert size variants for all dishes (small/medium/large with different prices and limits)
    const dishes = await db.all('SELECT id FROM dishes ORDER BY id');
    for (const dish of dishes) {
      await db.run('INSERT INTO dish_sizes (dish_id, size, price, max_ingredients) VALUES (?, ?, ?, ?)', [dish.id, 'small', 5, 3]);
      await db.run('INSERT INTO dish_sizes (dish_id, size, price, max_ingredients) VALUES (?, ?, ?, ?)', [dish.id, 'medium', 7, 5]);
      await db.run('INSERT INTO dish_sizes (dish_id, size, price, max_ingredients) VALUES (?, ?, ?, ?)', [dish.id, 'large', 9, 7]);
    }
  }

  // Check if ingredients exist, if not create ingredient catalog
  const ingredientCount = await db.get('SELECT COUNT(*) as count FROM ingredients');
  if (ingredientCount.count === 0) {
    // Insert ingredients with fixed IDs, prices and availability as per exam specifications
    // Format: [id, name, price, availability] - availability null means unlimited
    const ingredients = [
      [1, 'mozzarella', 1.00, 3],     // Limited to 3 portions
      [2, 'tomatoes', 0.50, null],    // Unlimited
      [3, 'mushrooms', 0.80, 3],      // Limited to 3 portions
      [4, 'ham', 1.20, 2],            // Limited to 2 portions (will be reduced to 1 by sample orders)
      [5, 'olives', 0.70, null],      // Unlimited
      [6, 'tuna', 1.50, 2],           // Limited to 2 portions
      [7, 'eggs', 1.00, null],        // Unlimited
      [8, 'anchovies', 1.50, 1],      // Limited to 1 portion
      [9, 'parmesan', 1.20, null],    // Unlimited
      [10, 'carrots', 0.40, null],    // Unlimited
      [11, 'potatoes', 0.30, null]    // Unlimited
    ];
    
    for (const [id, name, price, availability] of ingredients) {
      await db.run('INSERT INTO ingredients (id, name, price, availability) VALUES (?, ?, ?, ?)', 
                   [id, name, price, availability]);
    }

    // Insert ingredient dependencies as per exam specifications
    // Format: [ingredient_id, required_ingredient_id] - ingredient A requires ingredient B
    const dependencies = [
      [2, 5], // tomatoes require olives
      [9, 1], // parmesan requires mozzarella
      [1, 2], // mozzarella requires tomatoes
      [6, 5]  // tuna requires olives
    ];
    
    for (const [ingredientId, requiredId] of dependencies) {
      await db.run('INSERT INTO ingredient_dependencies (ingredient_id, required_ingredient_id) VALUES (?, ?)', 
                   [ingredientId, requiredId]);
    }

    // Insert ingredient incompatibilities as per exam specifications
    // Format: [ingredient_id, incompatible_ingredient_id] - ingredient A cannot be with ingredient B
    const incompatibilities = [
      [7, 3], [7, 2], // eggs incompatible with mushrooms and tomatoes
      [4, 3],         // ham incompatible with mushrooms
      [5, 8]          // olives incompatible with anchovies
    ];
    
    for (const [ingredientId, incompatibleId] of incompatibilities) {
      await db.run('INSERT INTO ingredient_incompatibilities (ingredient_id, incompatible_ingredient_id) VALUES (?, ?)', 
                   [ingredientId, incompatibleId]);
      // Add reverse incompatibility (if A is incompatible with B, then B is incompatible with A)
      await db.run('INSERT INTO ingredient_incompatibilities (ingredient_id, incompatible_ingredient_id) VALUES (?, ?)', 
                   [incompatibleId, ingredientId]);
    }
  }

  // Check if users exist, if not create test user accounts
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    // Create test users with hashed passwords as per exam requirements
    // All users can perform 2FA or skip it (totp_required = 1 means they CAN do TOTP, not that it's mandatory)
    const hashedPassword = await bcrypt.hash('password', 10);
    
    const users = [
      [1, 'simone', hashedPassword, 1],  // Can do 2FA
      [2, 'elia', hashedPassword, 1],    // Can do 2FA
      [3, 'andrea', hashedPassword, 1],  // Can do 2FA
      [4, 'renato', hashedPassword, 1]   // Can do 2FA
    ];
    
    for (const [id, username, password, totp_required] of users) {
      await db.run('INSERT INTO users (id, username, password, totp_required) VALUES (?, ?, ?, ?)', 
                   [id, username, password, totp_required]);
    }

    // Create sample orders to meet exam requirements: 2 users with orders
    // User 1 (simone): 2 small dishes
    // User 2 (elia): 1 medium and 1 large dish
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [1, 1, 'small', 6.00, '2025-06-29 10:00:00']); // simone: pizza small with tomatoes+olives
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [1, 2, 'small', 5.50, '2025-06-29 11:00:00']); // simone: pasta small with tomatoes+olives
    
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [2, 1, 'medium', 8.20, '2025-06-29 12:00:00']); // elia: pizza medium with ham
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [2, 3, 'large', 10.50, '2025-06-29 13:00:00']); // elia: salad large with tomatoes+olives

    // Add ingredients to the sample orders (respecting dependency constraints)
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (1, 2)'); // simone order 1: tomatoes
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (1, 5)'); // simone order 1: olives (required by tomatoes)
    
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (2, 2)'); // simone order 2: tomatoes
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (2, 5)'); // simone order 2: olives (required by tomatoes)
    
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (3, 4)'); // elia order 1: ham
    
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (4, 2)'); // elia order 2: tomatoes
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (4, 5)'); // elia order 2: olives
    
    // Update ingredient availability after sample orders to reflect usage
    // Ham was used once, so decrease availability from 2 to 1
    await db.run('UPDATE ingredients SET availability = 1 WHERE name = ?', ['ham']);
  }

  return db;
}

/**
 * MODULE EXPORTS
 * 
 * Export the database initialization function and utility functions
 * for use by other modules (DAOs, routes, etc.)
 */
module.exports = {
  initDB,    // Initialize database with tables and sample data
  all,       // Execute query and return all matching rows
  get,       // Execute query and return single row
  run,       // Execute insert/update/delete query
};
