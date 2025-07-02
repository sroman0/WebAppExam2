const db = require('../db');
const IngredientsDAO = require('./dao-ingredients');

// Get all orders for a user (with dish, size, total, date, and ingredients)
async function getOrdersByUser(userId) {
  const sql = `SELECT o.id, o.dish_id, d.name as dish_name, o.size, o.total, o.date, o.cancelled,
                      CASE WHEN o.cancelled = 1 THEN 'cancelled' ELSE 'confirmed' END as status
               FROM orders o JOIN dishes d ON o.dish_id = d.id
               WHERE o.user_id = ? ORDER BY o.date DESC`;
  const orders = await db.all(sql, [userId]);
  
  for (const order of orders) {
    order.ingredients = await getOrderIngredients(order.id);
    order.timestamp = order.date; // Frontend expects timestamp
  }
  return orders;
}

// Get details for a single order
async function getOrderDetails(orderId) {
  const sql = `SELECT o.*, d.name as dish_name FROM orders o JOIN dishes d ON o.dish_id = d.id WHERE o.id = ?`;
  const order = await db.get(sql, [orderId]);
  if (!order) return null;
  
  order.ingredients = await getOrderIngredients(orderId);
  order.timestamp = order.date; // Frontend expects timestamp
  order.status = order.cancelled ? 'cancelled' : 'confirmed';
  return order;
}

// Helper: get ingredients for an order
async function getOrderIngredients(orderId) {
  const sql = `SELECT i.id, i.name, i.price 
               FROM order_ingredients oi 
               JOIN ingredients i ON oi.ingredient_id = i.id 
               WHERE oi.order_id = ?`;
  return await db.all(sql, [orderId]);
}

// Create a new order
async function createOrder(userId, dishId, size, total, ingredientIds) {
  const sql = `INSERT INTO orders (user_id, dish_id, size, total, date, cancelled) 
               VALUES (?, ?, ?, ?, datetime('now'), 0)`;
  const result = await db.run(sql, [userId, dishId, size, total]);
  const orderId = result.lastID;
  
  // Add ingredients to the order and update availability
  for (const ingId of ingredientIds) {
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (?, ?)', [orderId, ingId]);
    // Update ingredient availability (reduce by 1 portion) - check availability again
    const success = await IngredientsDAO.updateIngredientAvailability(ingId, 1);
    if (!success) {
      // If availability update fails, cancel the order and throw error
      await db.run('UPDATE orders SET cancelled = 1 WHERE id = ?', [orderId]);
      const ingredient = await IngredientsDAO.getIngredientById(ingId);
      throw new Error(`Not enough ${ingredient.name} available`);
    }
  }
  
  return orderId;
}

// Cancel an order (set cancelled=1 and restore ingredient availability)
async function cancelOrder(orderId) {
  // Get order ingredients before cancelling to restore availability
  const ingredients = await getOrderIngredients(orderId);
  
  // Set order as cancelled
  await db.run('UPDATE orders SET cancelled = 1 WHERE id = ?', [orderId]);
  
  // Restore ingredient availability
  for (const ingredient of ingredients) {
    await IngredientsDAO.restoreIngredientAvailability(ingredient.id, 1);
  }
}

module.exports = {
  getOrdersByUser,
  getOrderDetails,
  createOrder,
  cancelOrder,
};
