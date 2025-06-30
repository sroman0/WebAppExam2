const db = require('../db');

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
  
  // Add ingredients to the order
  for (const ingId of ingredientIds) {
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (?, ?)', [orderId, ingId]);
  }
  
  return orderId;
}

// Cancel an order (set cancelled=1)
async function cancelOrder(orderId) {
  await db.run('UPDATE orders SET cancelled = 1 WHERE id = ?', [orderId]);
}

module.exports = {
  getOrdersByUser,
  getOrderDetails,
  createOrder,
  cancelOrder,
};
