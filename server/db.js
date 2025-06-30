const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Open the SQLite database with async/await support
const dbPromise = open({
  filename: path.join(__dirname, 'database', 'restaurant.sqlite'),
  driver: sqlite3.Database
});

// Helper to run a query and return all rows
async function all(sql, params) {
  const db = await dbPromise;
  return db.all(sql, params);
}

// Helper to run a query and return a single row
async function get(sql, params) {
  const db = await dbPromise;
  return db.get(sql, params);
}

// Helper to run a query (insert/update/delete)
async function run(sql, params) {
  const db = await dbPromise;
  return db.run(sql, params);
}

async function initDB() {
  const db = await open({
    filename: path.join(__dirname, 'restaurant.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      totp_required INTEGER
    );

    CREATE TABLE IF NOT EXISTS base_dishes (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      availability INTEGER
    );

    CREATE TABLE IF NOT EXISTS ingredient_requires (
      ingredient_id INTEGER,
      required_id INTEGER,
      PRIMARY KEY (ingredient_id, required_id)
    );

    CREATE TABLE IF NOT EXISTS ingredient_incompatible (
      ingredient_id INTEGER,
      incompatible_id INTEGER,
      PRIMARY KEY (ingredient_id, incompatible_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      date TEXT,
      cancelled INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      base_dish INTEGER,
      size TEXT,
      price REAL
    );

    CREATE TABLE IF NOT EXISTS order_item_ingredients (
      order_item_id INTEGER,
      ingredient_id INTEGER,
      PRIMARY KEY(order_item_id, ingredient_id)
    );
  `);

  const row = await db.get('SELECT COUNT(*) as count FROM base_dishes');
  if (!row.count) {
    await db.run('INSERT INTO base_dishes (name) VALUES ("pizza"),("pasta"),("salad")');
  }

  // insert ingredients if not exist
  const ingRow = await db.get('SELECT COUNT(*) as count FROM ingredients');
  if (!ingRow.count) {
    const ingredients = [
      ['mozzarella', 1.0, 3],
      ['tomatoes', 0.5, null],
      ['mushrooms', 0.8, 3],
      ['ham', 1.2, 2],
      ['olives', 0.7, null],
      ['tuna', 1.5, 2],
      ['eggs', 1.0, null],
      ['anchovies', 1.5, 1],
      ['parmesan', 1.2, null],
      ['carrots', 0.4, null],
      ['potatoes', 0.3, null]
    ];
    for (const [name, price, avail] of ingredients) {
      await db.run('INSERT INTO ingredients (name, price, availability) VALUES (?,?,?)', [name, price, avail]);
    }

    // dependencies
    const dep = [
      ['tomatoes', 'olives'],
      ['parmesan', 'mozzarella'],
      ['mozzarella', 'tomatoes'],
      ['tuna', 'olives']
    ];
    for (const [ing, req] of dep) {
      await db.run(`INSERT INTO ingredient_requires (ingredient_id, required_id)
        SELECT i1.id, i2.id FROM ingredients i1, ingredients i2 WHERE i1.name=? AND i2.name=?`, [ing, req]);
    }

    // incompatibilities
    const inc = [
      ['eggs', 'mushrooms'],
      ['eggs', 'tomatoes'],
      ['ham', 'mushrooms'],
      ['ham', 'olives'],
      ['olives', 'anchovies']
    ];
    for (const [ing, incp] of inc) {
      await db.run(`INSERT INTO ingredient_incompatible (ingredient_id, incompatible_id)
        SELECT i1.id, i2.id FROM ingredients i1, ingredients i2 WHERE i1.name=? AND i2.name=?`, [ing, incp]);
    }
  }

  // create test users
  const userRow = await db.get('SELECT COUNT(*) as count FROM users');
  if (!userRow.count) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password', 10);
    await db.run('INSERT INTO users (username, password, totp_required) VALUES ("user1", ?, 1)', [hash]);
    await db.run('INSERT INTO users (username, password, totp_required) VALUES ("user2", ?, 0)', [hash]);
  }

  return db;
}

module.exports = {
  initDB,
  all,
  get,
  run,
};
