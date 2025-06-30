-- SQL schema for the restaurant application
-- Tables: users, dishes, ingredients, ingredient_constraints, orders, order_ingredients

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- hashed
  isAdmin INTEGER DEFAULT 0,
  has2FA INTEGER DEFAULT 0
);

-- Dishes table (pizza, pasta, salad)
CREATE TABLE IF NOT EXISTS dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- Dish sizes (Small, Medium, Large)
CREATE TABLE IF NOT EXISTS dish_sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dish_id INTEGER NOT NULL,
  size TEXT NOT NULL,
  price REAL NOT NULL,
  max_ingredients INTEGER NOT NULL,
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  price REAL NOT NULL,
  availability INTEGER -- NULL means unlimited
);

-- Ingredient constraints: dependencies (requires)
CREATE TABLE IF NOT EXISTS ingredient_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  required_ingredient_id INTEGER NOT NULL,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (required_ingredient_id) REFERENCES ingredients(id)
);

-- Ingredient constraints: incompatibilities
CREATE TABLE IF NOT EXISTS ingredient_incompatibilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  incompatible_ingredient_id INTEGER NOT NULL,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (incompatible_ingredient_id) REFERENCES ingredients(id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  dish_id INTEGER NOT NULL,
  size TEXT NOT NULL,
  total REAL NOT NULL,
  date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
);

-- Order ingredients (many-to-many)
CREATE TABLE IF NOT EXISTS order_ingredients (
  order_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  PRIMARY KEY (order_id, ingredient_id)
);

-- Insert base dishes
INSERT INTO dishes (id, name) VALUES (1, 'Pizza'), (2, 'Pasta'), (3, 'Salad');

-- Insert dish sizes (Small, Medium, Large) for each dish
INSERT INTO dish_sizes (dish_id, size, price, max_ingredients) VALUES
  (1, 'Small', 5, 3), (1, 'Medium', 7, 5), (1, 'Large', 9, 7),
  (2, 'Small', 5, 3), (2, 'Medium', 7, 5), (2, 'Large', 9, 7),
  (3, 'Small', 5, 3), (3, 'Medium', 7, 5), (3, 'Large', 9, 7);

-- Insert ingredients (with price and initial availability)
INSERT INTO ingredients (id, name, price, availability) VALUES
  (1, 'mozzarella', 1.00, 3),
  (2, 'tomatoes', 0.50, NULL),
  (3, 'mushrooms', 0.80, 3),
  (4, 'ham', 1.20, 2),
  (5, 'olives', 0.70, NULL),
  (6, 'tuna', 1.50, 2),
  (7, 'eggs', 1.00, NULL),
  (8, 'anchovies', 1.50, 1),
  (9, 'parmesan', 1.20, NULL),
  (10, 'carrots', 0.40, NULL),
  (11, 'potatoes', 0.30, NULL);

-- Insert ingredient incompatibilities
-- eggs are incompatible with mushrooms and tomatoes
INSERT INTO ingredient_incompatibilities (ingredient_id, incompatible_ingredient_id) VALUES
  (7, 3), (7, 2),
-- ham is incompatible with mushrooms
  (4, 3),
-- olives are incompatible with anchovies
  (5, 8);

-- Insert ingredient dependencies
-- tomatoes require olives
INSERT INTO ingredient_dependencies (ingredient_id, required_ingredient_id) VALUES
  (2, 5),
-- parmesan requires mozzarella
  (9, 1),
-- mozzarella requires tomatoes
  (1, 2),
-- tuna requires olives
  (6, 5);

-- Insert users (passwords are bcrypt hashes for 'password')
INSERT INTO users (id, username, password, isAdmin, has2FA) VALUES
  (1, 'alice', '$2b$10$0V9R2tnfBNPMIBsTgNn3X.LZ02S6.da8eU6v7Dx5IYLpjihvJMzSy', 0, 1),
  (2, 'bob', '$2b$10$0V9R2tnfBNPMIBsTgNn3X.LZ02S6.da8eU6v7Dx5IYLpjihvJMzSy', 0, 0),
  (3, 'carol', '$2b$10$0V9R2tnfBNPMIBsTgNn3X.LZ02S6.da8eU6v7Dx5IYLpjihvJMzSy', 0, 1),
  (4, 'dave', '$2b$10$0V9R2tnfBNPMIBsTgNn3X.LZ02S6.da8eU6v7Dx5IYLpjihvJMzSy', 0, 0);

-- Example orders and order_ingredients can be added after user login and order logic is implemented.
