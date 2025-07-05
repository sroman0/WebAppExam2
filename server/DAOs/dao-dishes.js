/**
 * DATA ACCESS OBJECT (DAO) - DISHES
 * 
 * This module handles all database operations related to dishes in the restaurant system.
 * It provides functions to retrieve dish information including base dishes and their pricing structure.
 * 
 * Database Tables Used:
 * - dishes: Contains base dish types (pizza, pasta, salad)
 * - dish_sizes: Contains size variants with prices and ingredient limits
 * 
 * Business Logic:
 * - All dishes follow the same pricing structure (small: €5, medium: €7, large: €9)
 * - Each size has different ingredient limits (small: 3, medium: 5, large: 7)
 * - Pricing is handled consistently across all dish types
 */

const db = require('../db');

/**
 * Retrieve all available base dishes
 * 
 * Returns the fundamental dish types available in the restaurant.
 * This is used by the frontend to display the dish selection menu.
 * 
 * @returns {Promise<Array>} Array of dish objects with id and name
 * @throws {Error} Database error if query fails
 */
async function getAllDishes() {
  const sql = `SELECT id, name FROM dishes ORDER BY id`;
  return await db.all(sql);
}

/**
 * MODULE EXPORTS
 * 
 * Export all dish-related database operations for use by API routes
 */
module.exports = {
  getAllDishes,  // Get all base dishes (pizza, pasta, salad)
};
