const db = require('../db');

// Get all ingredients with dependencies and incompatibilities
async function getAllIngredients() {
  // Get basic ingredient info
  const ingredients = await db.all('SELECT * FROM ingredients ORDER BY id');

  // Get dependencies
  const depRows = await db.all(`
    SELECT d.ingredient_id, i.name as required_name 
    FROM ingredient_dependencies d 
    JOIN ingredients i ON d.required_ingredient_id = i.id
  `);
  
  // Get incompatibilities
  const incRows = await db.all(`
    SELECT inc.ingredient_id, i.name as incompatible_name 
    FROM ingredient_incompatibilities inc 
    JOIN ingredients i ON inc.incompatible_ingredient_id = i.id
  `);

  // Map dependencies and incompatibilities
  for (const ing of ingredients) {
    ing.requires = depRows
      .filter(d => d.ingredient_id === ing.id)
      .map(d => d.required_name);
    
    ing.incompatible = incRows
      .filter(i => i.ingredient_id === ing.id)
      .map(i => i.incompatible_name);
  }

  return ingredients;
}

// Update ingredient availability (reduce when order is confirmed) - returns true if successful
async function updateIngredientAvailability(ingredientId, quantityUsed) {
  // Only update if ingredient has limited availability
  const ingredient = await db.get('SELECT availability FROM ingredients WHERE id = ?', [ingredientId]);
  if (ingredient && ingredient.availability !== null) {
    if (ingredient.availability < quantityUsed) {
      return false; // Not enough availability
    }
    const newAvailability = ingredient.availability - quantityUsed;
    await db.run('UPDATE ingredients SET availability = ? WHERE id = ?', [newAvailability, ingredientId]);
  }
  return true;
}

// Restore ingredient availability (when order is cancelled)
async function restoreIngredientAvailability(ingredientId, quantityToRestore) {
  // Only restore if ingredient has limited availability
  const ingredient = await db.get('SELECT availability FROM ingredients WHERE id = ?', [ingredientId]);
  if (ingredient && ingredient.availability !== null) {
    const newAvailability = ingredient.availability + quantityToRestore;
    await db.run('UPDATE ingredients SET availability = ? WHERE id = ?', [newAvailability, ingredientId]);
  }
}

// Get ingredient by ID
async function getIngredientById(id) {
  return await db.get('SELECT * FROM ingredients WHERE id = ?', [id]);
}

// Export functions
module.exports = {
  getAllIngredients,
  updateIngredientAvailability,
  restoreIngredientAvailability,
  getIngredientById,
};
