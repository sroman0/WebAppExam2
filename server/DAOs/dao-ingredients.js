/**
 * DATA ACCESS OBJECT (DAO) - INGREDIENTS
 * 
 * This module handles all database operations related to ingredients in the restaurant system.
 * It manages ingredient information, availability tracking, and constraint relationships.
 * 
 * Database Tables Used:
 * - ingredients: Base ingredient data (name, price, availability)
 * - ingredient_dependencies: Required ingredient relationships
 * - ingredient_incompatibilities: Incompatible ingredient pairs
 * 
 * Business Logic:
 * - Ingredients can have limited or unlimited availability
 * - Dependencies: Some ingredients require others (e.g., tomatoes require olives)
 * - Incompatibilities: Some ingredients cannot be combined (e.g., eggs incompatible with mushrooms)
 * - Availability is tracked and updated when orders are placed/cancelled
 * 
 * Constraint Examples:
 * - tomatoes require olives
 * - parmesan requires mozzarella
 * - mozzarella requires tomatoes
 * - tuna requires olives
 * - eggs incompatible with mushrooms and tomatoes
 * - ham incompatible with mushrooms
 * - olives incompatible with anchovies
 */

const db = require('../db');

/**
 * Retrieve all ingredients with their constraints and availability
 * 
 * This function performs complex queries to gather complete ingredient information
 * including dependency and incompatibility relationships. It's used by the frontend
 * to display ingredient options and enforce constraints during order creation.
 * 
 * @returns {Promise<Array>} Array of ingredient objects with:
 *   - id: Ingredient identifier
 *   - name: Ingredient name
 *   - price: Cost per ingredient
 *   - availability: Available quantity (null = unlimited)
 *   - requires: Array of required ingredient names
 *   - incompatible: Array of incompatible ingredient names
 * @throws {Error} Database error if queries fail
 */
async function getAllIngredients() {
  // Get basic ingredient information (id, name, price, availability)
  const ingredients = await db.all('SELECT * FROM ingredients ORDER BY id');

  // Get ingredient dependencies - what each ingredient requires
  const depRows = await db.all(`
    SELECT d.ingredient_id, i.name as required_name 
    FROM ingredient_dependencies d 
    JOIN ingredients i ON d.required_ingredient_id = i.id
  `);
  
  // Get ingredient incompatibilities - what each ingredient conflicts with
  const incRows = await db.all(`
    SELECT inc.ingredient_id, i.name as incompatible_name 
    FROM ingredient_incompatibilities inc 
    JOIN ingredients i ON inc.incompatible_ingredient_id = i.id
  `);

  // Attach constraint information to each ingredient
  for (const ing of ingredients) {
    // Add array of required ingredient names
    ing.requires = depRows
      .filter(d => d.ingredient_id === ing.id)
      .map(d => d.required_name);
    
    // Add array of incompatible ingredient names
    ing.incompatible = incRows
      .filter(i => i.ingredient_id === ing.id)
      .map(i => i.incompatible_name);
  }

  return ingredients;
}

/**
 * Update ingredient availability when an order is placed
 * 
 * Reduces the available quantity of an ingredient when it's used in an order.
 * Only affects ingredients with limited availability (non-null availability field).
 * Prevents over-ordering by checking availability before updating.
 * 
 * @param {number} ingredientId - ID of the ingredient to update
 * @param {number} quantityUsed - Amount to reduce from availability (typically 1)
 * @returns {Promise<boolean>} true if update successful, false if insufficient availability
 * @throws {Error} Database error if queries fail
 */
async function updateIngredientAvailability(ingredientId, quantityUsed) {
  // Check current availability for ingredients with limited stock
  const ingredient = await db.get('SELECT availability FROM ingredients WHERE id = ?', [ingredientId]);
  if (ingredient && ingredient.availability !== null) {
    // Ensure sufficient availability before updating
    if (ingredient.availability < quantityUsed) {
      return false; // Not enough stock available
    }
    // Reduce availability by the amount used
    const newAvailability = ingredient.availability - quantityUsed;
    await db.run('UPDATE ingredients SET availability = ? WHERE id = ?', [newAvailability, ingredientId]);
  }
  // Return true for unlimited ingredients or successful updates
  return true;
}

/**
 * Restore ingredient availability when an order is cancelled
 * 
 * Increases the available quantity of an ingredient when an order is cancelled.
 * Only affects ingredients with limited availability (non-null availability field).
 * This ensures ingredient stock is properly managed across the application.
 * 
 * @param {number} ingredientId - ID of the ingredient to restore
 * @param {number} quantityToRestore - Amount to add back to availability (typically 1)
 * @throws {Error} Database error if queries fail
 */
async function restoreIngredientAvailability(ingredientId, quantityToRestore) {
  // Only restore stock for ingredients with limited availability
  const ingredient = await db.get('SELECT availability FROM ingredients WHERE id = ?', [ingredientId]);
  if (ingredient && ingredient.availability !== null) {
    // Add the quantity back to available stock
    const newAvailability = ingredient.availability + quantityToRestore;
    await db.run('UPDATE ingredients SET availability = ? WHERE id = ?', [newAvailability, ingredientId]);
  }
}

/**
 * Retrieve a specific ingredient by its ID
 * 
 * Used for validation and detail retrieval during order processing.
 * Returns complete ingredient information including availability status.
 * 
 * @param {number} id - The ingredient ID to retrieve
 * @returns {Promise<Object|null>} Ingredient object or null if not found
 * @throws {Error} Database error if query fails
 */
async function getIngredientById(id) {
  return await db.get('SELECT * FROM ingredients WHERE id = ?', [id]);
}

/**
 * MODULE EXPORTS
 * 
 * Export all ingredient-related database operations for use by API routes
 */
module.exports = {
  getAllIngredients,              // Get all ingredients with constraints and availability
  updateIngredientAvailability,   // Reduce ingredient availability when order placed
  restoreIngredientAvailability,  // Restore ingredient availability when order cancelled
  getIngredientById,              // Get specific ingredient by ID
};
