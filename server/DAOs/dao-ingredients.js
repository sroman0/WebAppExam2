const db = require('../db');

//----------------------------------------------------------------------------
// Get all ingredients with dependencies and incompatibilities
exports.getAllIngredients = () => {
  return new Promise((resolve, reject) => {
    // Get basic ingredient information first
    db.all('SELECT * FROM ingredients ORDER BY id', (err, ingredients) => {
      if (err) {
        reject(err);
        return;
      }

      // Get ingredient dependencies - what each ingredient requires
      db.all(`
        SELECT d.dependent_ingredient_id, i.name as required_name 
        FROM ingredient_dependencies d 
        JOIN ingredients i ON d.required_ingredient_id = i.id
      `, (err, depRows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Get ingredient incompatibilities - what each ingredient conflicts with
        db.all(`
          SELECT inc.ingredient_id, i.name as incompatible_name 
          FROM ingredient_incompatibilities inc 
          JOIN ingredients i ON inc.incompatible_ingredient_id = i.id
        `, (err, incRows) => {
          if (err) {
            reject(err);
            return;
          }

          // Attach constraint information to each ingredient
          for (const ing of ingredients) {
            // Add array of required ingredient names
            ing.requires = depRows
              .filter(d => d.dependent_ingredient_id === ing.id)
              .map(d => d.required_name);
            
            // Add array of incompatible ingredient names
            ing.incompatible = incRows
              .filter(i => i.ingredient_id === ing.id)
              .map(i => i.incompatible_name);
          }

          resolve(ingredients);
        });
      });
    });
  });
};

//----------------------------------------------------------------------------
// Update ingredient availability when an order is placed
exports.updateIngredientAvailability = (ingredientId, quantityUsed) => {
  return new Promise((resolve, reject) => {
    // Check current availability for ingredients with limited stock
    db.get('SELECT availability FROM ingredients WHERE id = ?', [ingredientId], (err, ingredient) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (ingredient && ingredient.availability !== null) {
        // Ensure sufficient availability before updating
        if (ingredient.availability < quantityUsed) {
          resolve(false); // Not enough stock available
          return;
        }
        // Reduce availability by the amount used
        const newAvailability = ingredient.availability - quantityUsed;
        db.run('UPDATE ingredients SET availability = ? WHERE id = ?', [newAvailability, ingredientId], (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(true);
        });
      } else {
        // Return true for unlimited ingredients or successful updates
        resolve(true);
      }
    });
  });
};

//----------------------------------------------------------------------------
// Restore ingredient availability when an order is cancelled
exports.restoreIngredientAvailability = (ingredientId, quantityToRestore) => {
  return new Promise((resolve, reject) => {
    // Only restore stock for ingredients with limited availability
    db.get('SELECT availability FROM ingredients WHERE id = ?', [ingredientId], (err, ingredient) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (ingredient && ingredient.availability !== null) {
        // Add the quantity back to available stock
        const newAvailability = ingredient.availability + quantityToRestore;
        db.run('UPDATE ingredients SET availability = ? WHERE id = ?', [newAvailability, ingredientId], (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      } else {
        resolve(); // No action needed for unlimited ingredients
      }
    });
  });
};

//----------------------------------------------------------------------------
// Get ingredient by ID
exports.getIngredientById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM ingredients WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(undefined);
      else resolve(row);
    });
  });
};


