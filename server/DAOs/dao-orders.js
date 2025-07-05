/**
 * DATA ACCESS OBJECT (DAO) - ORDERS
 * 
 * This module handles all database operations related to orders in the restaurant system.
 * It manages order creation, retrieval, cancellation, and ingredient availability tracking.
 * 
 * Database Tables Used:
 * - orders: Order records with user, dish, size, total, date, and status
 * - order_ingredients: Junction table linking orders to their ingredients
 * - dishes: Referenced for dish names and details
 * - ingredients: Referenced for ingredient details and availability updates
 * 
 * Business Logic:
 * - Orders track dish selection, size, total price, and timestamp
 * - Each order has a list of selected ingredients
 * - Ingredient availability is updated when orders are placed/cancelled
 * - Orders can be cancelled which restores ingredient availability
 * - Status is derived from cancelled flag (0 = confirmed, 1 = cancelled)
 * 
 * Integration:
 * - Coordinates with IngredientsDAO for availability management
 * - Ensures data consistency between orders and ingredient stock
 */

const db = require('../db');
const IngredientsDAO = require('./dao-ingredients');

/**
 * Retrieve all orders for a specific user with complete details
 * 
 * Fetches the order history for a user including dish information, ingredients,
 * and status. Orders are returned in descending date order (newest first).
 * Each order includes its associated ingredients for complete information display.
 * 
 * @param {number} userId - The user ID to fetch orders for
 * @returns {Promise<Array>} Array of order objects with:
 *   - id: Order identifier
 *   - dish_id, dish_name: Dish information
 *   - size: Order size (small/medium/large)
 *   - total: Calculated total price
 *   - date, timestamp: Order date/time
 *   - cancelled: Cancellation flag (0/1)
 *   - status: Human-readable status (confirmed/cancelled)
 *   - ingredients: Array of ingredient objects
 * @throws {Error} Database error if queries fail
 */
async function getOrdersByUser(userId) {
  const sql = `SELECT o.id, o.dish_id, d.name as dish_name, o.size, o.total, o.date, o.cancelled,
                      CASE WHEN o.cancelled = 1 THEN 'cancelled' ELSE 'confirmed' END as status
               FROM orders o JOIN dishes d ON o.dish_id = d.id
               WHERE o.user_id = ? ORDER BY o.date DESC`;
  const orders = await db.all(sql, [userId]);
  
  // Attach ingredient details to each order
  for (const order of orders) {
    order.ingredients = await getOrderIngredients(order.id);
    order.timestamp = order.date; // Frontend compatibility
  }
  return orders;
}

/**
 * Retrieve detailed information for a specific order
 * 
 * Gets complete order information including dish details and ingredients.
 * Used for order detail views and authorization checks.
 * 
 * @param {number} orderId - The order ID to retrieve
 * @returns {Promise<Object|null>} Order object with complete details or null if not found
 * @throws {Error} Database error if queries fail
 */
async function getOrderDetails(orderId) {
  const sql = `SELECT o.*, d.name as dish_name FROM orders o JOIN dishes d ON o.dish_id = d.id WHERE o.id = ?`;
  const order = await db.get(sql, [orderId]);
  if (!order) return null;
  
  // Attach ingredient details and format for frontend
  order.ingredients = await getOrderIngredients(orderId);
  order.timestamp = order.date; // Frontend compatibility
  order.status = order.cancelled ? 'cancelled' : 'confirmed';
  return order;
}

/**
 * Helper function: Get all ingredients for a specific order
 * 
 * Retrieves the list of ingredients selected for an order with their details.
 * Used internally by other order functions to build complete order objects.
 * 
 * @param {number} orderId - The order ID to get ingredients for
 * @returns {Promise<Array>} Array of ingredient objects with id, name, and price
 * @throws {Error} Database error if query fails
 */
async function getOrderIngredients(orderId) {
  const sql = `SELECT i.id, i.name, i.price 
               FROM order_ingredients oi 
               JOIN ingredients i ON oi.ingredient_id = i.id 
               WHERE oi.order_id = ?`;
  return await db.all(sql, [orderId]);
}

/**
 * Create a new order with ingredient availability management
 * 
 * Creates a new order record and associates selected ingredients with it.
 * Automatically updates ingredient availability for items with limited stock.
 * Implements transactional logic to ensure data consistency - if any ingredient
 * becomes unavailable during creation, the entire order is cancelled.
 * 
 * @param {number} userId - ID of the user placing the order
 * @param {number} dishId - ID of the selected dish
 * @param {string} size - Size selection (small/medium/large)
 * @param {number} total - Calculated total price
 * @param {Array<number>} ingredientIds - Array of selected ingredient IDs
 * @returns {Promise<number>} The ID of the created order
 * @throws {Error} If ingredient availability check fails or database error occurs
 */
async function createOrder(userId, dishId, size, total, ingredientIds) {
  const sql = `INSERT INTO orders (user_id, dish_id, size, total, date, cancelled) 
               VALUES (?, ?, ?, ?, datetime('now'), 0)`;
  const result = await db.run(sql, [userId, dishId, size, total]);
  const orderId = result.lastID;
  
  // Process each ingredient: add to order and update availability
  for (const ingId of ingredientIds) {
    // Link ingredient to order
    await db.run('INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (?, ?)', [orderId, ingId]);
    
    // Update ingredient availability (reduce by 1 portion)
    // Re-check availability to prevent race conditions
    const success = await IngredientsDAO.updateIngredientAvailability(ingId, 1);
    if (!success) {
      // Availability check failed - cancel order and throw error
      await db.run('UPDATE orders SET cancelled = 1 WHERE id = ?', [orderId]);
      const ingredient = await IngredientsDAO.getIngredientById(ingId);
      throw new Error(`Not enough ${ingredient.name} available`);
    }
  }
  
  return orderId;
}

/**
 * Cancel an existing order and restore ingredient availability
 * 
 * Sets the order status to cancelled and restores the availability of all
 * ingredients that were used in the order. This ensures proper inventory
 * management when orders are cancelled.
 * 
 * @param {number} orderId - ID of the order to cancel
 * @throws {Error} Database error if queries fail
 */
async function cancelOrder(orderId) {
  // Get order ingredients before cancelling to restore their availability
  const ingredients = await getOrderIngredients(orderId);
  
  // Mark order as cancelled
  await db.run('UPDATE orders SET cancelled = 1 WHERE id = ?', [orderId]);
  
  // Restore availability for each ingredient (add 1 portion back)
  for (const ingredient of ingredients) {
    await IngredientsDAO.restoreIngredientAvailability(ingredient.id, 1);
  }
}

/**
 * MODULE EXPORTS
 * 
 * Export all order-related database operations for use by API routes
 */
module.exports = {
  getOrdersByUser,  // Get all orders for a specific user with details
  getOrderDetails,  // Get detailed information for a specific order
  createOrder,      // Create new order with ingredient availability management
  cancelOrder,      // Cancel order and restore ingredient availability
};
