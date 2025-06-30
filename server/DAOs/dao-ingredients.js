const db = require('../db');

// Get all ingredients with dependencies and incompatibilities
async function getAllIngredients() {
  // Get basic ingredient info
  const ingredients = await db.all('SELECT * FROM ingredients');

  // Get dependencies
  const depRows = await db.all('SELECT ingredient_id, required_ingredient_id FROM ingredient_dependencies');
  // Get incompatibilities
  const incRows = await db.all('SELECT ingredient_id, incompatible_ingredient_id FROM ingredient_incompatibilities');

  // Map dependencies and incompatibilities
  for (const ing of ingredients) {
    ing.dependencies = depRows.filter(d => d.ingredient_id === ing.id).map(d => d.required_ingredient_id);
    ing.incompatibilities = incRows.filter(i => i.ingredient_id === ing.id).map(i => i.incompatible_ingredient_id);
  }

  // Optionally, resolve dependency/incompatibility names
  const idToName = Object.fromEntries(ingredients.map(i => [i.id, i.name]));
  for (const ing of ingredients) {
    ing.dependencies = ing.dependencies.map(id => idToName[id]);
    ing.incompatibilities = ing.incompatibilities.map(id => idToName[id]);
  }

  return ingredients;
}

// Export functions
module.exports = {
  getAllIngredients,
};
