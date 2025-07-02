const db = require('../db');

// Get all dishes (simplified - all dishes have the same pricing structure)
async function getAllDishes() {
  const sql = `SELECT id, name FROM dishes ORDER BY id`;
  return await db.all(sql);
}

// Export functions
module.exports = {
  getAllDishes,
};
