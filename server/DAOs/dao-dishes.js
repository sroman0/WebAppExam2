const db = require('../db');

//----------------------------------------------------------------------------
// Get all dishes
exports.getAllDishes = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id, name FROM dishes ORDER BY id';
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

//----------------------------------------------------------------------------
// Get dish by ID
exports.getDishById = (dishId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM dishes WHERE id = ?';
    db.get(sql, [dishId], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(undefined);
      else resolve(row);
    });
  });
};
