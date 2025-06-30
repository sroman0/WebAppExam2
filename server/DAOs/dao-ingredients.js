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

// Export functions
module.exports = {
  getAllIngredients,
};
