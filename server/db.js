const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');

// Open the SQLite database with async/await support
const dbPromise = open({
  filename: path.join(__dirname, 'database', 'restaurant.sqlite'),
  driver: sqlite3.Database
});

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

async function initDB() {
  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      totp_required INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dish_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_id INTEGER NOT NULL,
      size TEXT NOT NULL,
      price REAL NOT NULL,
      max_ingredients INTEGER NOT NULL,
      FOREIGN KEY (dish_id) REFERENCES dishes(id)
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      availability INTEGER -- NULL means unlimited
    );

    CREATE TABLE IF NOT EXISTS ingredient_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      required_ingredient_id INTEGER NOT NULL,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
      FOREIGN KEY (required_ingredient_id) REFERENCES ingredients(id)
    );

    CREATE TABLE IF NOT EXISTS ingredient_incompatibilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      incompatible_ingredient_id INTEGER NOT NULL,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
      FOREIGN KEY (incompatible_ingredient_id) REFERENCES ingredients(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      size TEXT NOT NULL,
      total REAL NOT NULL,
      date TEXT DEFAULT (datetime('now')),
      cancelled INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (dish_id) REFERENCES dishes(id)
    );

    CREATE TABLE IF NOT EXISTS order_ingredients (
      order_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      PRIMARY KEY (order_id, ingredient_id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );
  `);

  // Check if dishes exist
  const dishCount = await db.get('SELECT COUNT(*) as count FROM dishes');
  if (dishCount.count === 0) {
    await db.run("INSERT INTO dishes (name) VALUES ('pizza'), ('pasta'), ('salad')");
    
    // Insert dish sizes for all three dishes
    const dishes = await db.all('SELECT id FROM dishes ORDER BY id');
    for (const dish of dishes) {
      await db.run('INSERT INTO dish_sizes (dish_id, size, price, max_ingredients) VALUES (?, ?, ?, ?)', [dish.id, 'small', 5, 3]);
      await db.run('INSERT INTO dish_sizes (dish_id, size, price, max_ingredients) VALUES (?, ?, ?, ?)', [dish.id, 'medium', 7, 5]);
      await db.run('INSERT INTO dish_sizes (dish_id, size, price, max_ingredients) VALUES (?, ?, ?, ?)', [dish.id, 'large', 9, 7]);
    }
  }

  // Check if ingredients exist
  const ingredientCount = await db.get('SELECT COUNT(*) as count FROM ingredients');
  if (ingredientCount.count === 0) {
    // Insert ingredients with prices and availability as per exam specs
    const ingredients = [
      [1, 'mozzarella', 1.00, 3],
      [2, 'tomatoes', 0.50, null],
      [3, 'mushrooms', 0.80, 3],
      [4, 'ham', 1.20, 2],
      [5, 'olives', 0.70, null],
      [6, 'tuna', 1.50, 2],
      [7, 'eggs', 1.00, null],
      [8, 'anchovies', 1.50, 1],
      [9, 'parmesan', 1.20, null],
      [10, 'carrots', 0.40, null],
      [11, 'potatoes', 0.30, null]
    ];
    
    for (const [id, name, price, availability] of ingredients) {
      await db.run('INSERT INTO ingredients (id, name, price, availability) VALUES (?, ?, ?, ?)', 
                   [id, name, price, availability]);
    }

    // Insert dependencies as per exam specs
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

    // Insert incompatibilities as per exam specs
    const incompatibilities = [
      [7, 3], [7, 2], // eggs incompatible with mushrooms and tomatoes
      [4, 3],         // ham incompatible with mushrooms
      [5, 8]          // olives incompatible with anchovies
    ];
    
    for (const [ingredientId, incompatibleId] of incompatibilities) {
      await db.run('INSERT INTO ingredient_incompatibilities (ingredient_id, incompatible_ingredient_id) VALUES (?, ?)', 
                   [ingredientId, incompatibleId]);
      // Add reverse incompatibility
      await db.run('INSERT INTO ingredient_incompatibilities (ingredient_id, incompatible_ingredient_id) VALUES (?, ?)', 
                   [incompatibleId, ingredientId]);
    }
  }

  // Check if users exist
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    // Create test users with hashed passwords
    const hashedPassword = await bcrypt.hash('password', 10);
    
    const users = [
      [1, 'alice', hashedPassword, 1], // 2FA enabled
      [2, 'bob', hashedPassword, 0],   // No 2FA
      [3, 'charlie', hashedPassword, 1], // 2FA enabled
      [4, 'dave', hashedPassword, 0]   // No 2FA
    ];
    
    for (const [id, username, password, totp_required] of users) {
      await db.run('INSERT INTO users (id, username, password, totp_required) VALUES (?, ?, ?, ?)', 
                   [id, username, password, totp_required]);
    }

    // Create some sample orders to meet exam requirements
    // 2 users with orders: alice (2 small dishes), bob (1 medium, 1 large)
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [1, 1, 'small', 6.00, '2025-06-29 10:00:00']); // alice: pizza small with tomatoes
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [1, 2, 'small', 5.50, '2025-06-29 11:00:00']); // alice: pasta small with tomatoes
    
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [2, 1, 'medium', 8.20, '2025-06-29 12:00:00']); // bob: pizza medium with ham
    await db.run('INSERT INTO orders (user_id, dish_id, size, total, date) VALUES (?, ?, ?, ?, ?)', 
                 [2, 3, 'large', 10.50, '2025-06-29 13:00:00']); // bob: salad large with tomatoes+olives

    // Add ingredients to orders
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (1, 2)'); // alice order 1: tomatoes
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (1, 5)'); // alice order 1: olives (required by tomatoes)
    
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (2, 2)'); // alice order 2: tomatoes
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (2, 5)'); // alice order 2: olives (required by tomatoes)
    
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (3, 4)'); // bob order 1: ham
    
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (4, 2)'); // bob order 2: tomatoes
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (4, 5)'); // bob order 2: olives
    
    // Update ingredient availability after sample orders (to match exam requirements)
    // Ham was used once, so decrease from 2 to 1
    await db.run('UPDATE ingredients SET availability = 1 WHERE name = ?', ['ham']);
  }

  return db;
}

module.exports = {
  initDB,
  all,
  get,
  run,
};
