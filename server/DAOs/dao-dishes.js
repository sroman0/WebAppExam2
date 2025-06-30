const db = require('../db');

// Get all dishes with their sizes and prices
async function getAllDishes() {
  const sql = `SELECT d.id as dishId, d.name as dishName, ds.size, ds.price, ds.max_ingredients
               FROM dishes d JOIN dish_sizes ds ON d.id = ds.dish_id
               ORDER BY d.id, ds.id`;
  const rows = await db.all(sql);
  // Group by dish
  const dishes = [];
  let lastId = null;
  let current = null;
  for (const row of rows) {
    if (row.dishId !== lastId) {
      if (current) dishes.push(current);
      current = { id: row.dishId, name: row.dishName, sizes: [] };
      lastId = row.dishId;
    }
    current.sizes.push({ name: row.size, price: row.price, maxIngredients: row.max_ingredients });
  }
  if (current) dishes.push(current);
  return dishes;
}

// Export functions
module.exports = {
  getAllDishes,
};
