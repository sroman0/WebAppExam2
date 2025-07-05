const db = require('../db');
const IngredientsDAO = require('./dao-ingredients');

//----------------------------------------------------------------------------
// Get all orders for a specific user with ingredients
exports.getOrdersByUser = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT o.id, o.dish_id, d.name as dish_name, o.size, o.total, o.date, o.status
      FROM orders o 
      JOIN dishes d ON o.dish_id = d.id
      WHERE o.user_id = ? 
      ORDER BY o.date DESC
    `;
    
    db.all(sql, [userId], (err, orders) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (orders.length === 0) {
        resolve([]);
        return;
      }
      
      // Get ingredients for each order using callback-based approach
      let completed = 0;
      const ordersWithIngredients = new Array(orders.length);
      
      orders.forEach((order, index) => {
        getOrderIngredients(order.id, (err, ingredients) => {
          if (err) {
            reject(err);
            return;
          }
          
          ordersWithIngredients[index] = {
            ...order,
            ingredients: ingredients,
            timestamp: order.date // Frontend compatibility
          };
          completed++;
          
          if (completed === orders.length) {
            resolve(ordersWithIngredients);
          }
        });
      });
    });
  });
}

//----------------------------------------------------------------------------
// Get order details
exports.getOrderDetails = (orderId) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT o.*, d.name as dish_name FROM orders o JOIN dishes d ON o.dish_id = d.id WHERE o.id = ?`;
    
    db.get(sql, [orderId], (err, order) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!order) {
        resolve(null);
        return;
      }
      
      // Get ingredients for this order
      getOrderIngredients(orderId, (err, ingredients) => {
        if (err) {
          reject(err);
          return;
        }
        
        order.ingredients = ingredients;
        order.timestamp = order.date; // Frontend compatibility
        resolve(order);
      });
    });
  });
};

//----------------------------------------------------------------------------
// Helper function to get ingredients for an order (callback-based)
function getOrderIngredients(orderId, callback) {
  const sql = `
    SELECT i.id, i.name, i.price 
    FROM order_ingredients oi 
    JOIN ingredients i ON oi.ingredient_id = i.id 
    WHERE oi.order_id = ?
  `;
  
  db.all(sql, [orderId], callback);
}

//----------------------------------------------------------------------------
// Create a new order (simplified like Renato's pattern)
exports.createOrder = (userId, dishId, size, total, ingredientIds) => {
  return new Promise((resolve, reject) => {
    // Insert order first
    const sql = `
      INSERT INTO orders (user_id, dish_id, size, total, date, status)
      VALUES (?, ?, ?, ?, datetime('now'), 'confirmed')
    `;
    
    db.run(sql, [userId, dishId, size, total], function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      const orderId = this.lastID;
      
      // Insert ingredients if any
      if (ingredientIds && ingredientIds.length > 0) {
        insertOrderIngredients(orderId, ingredientIds, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(orderId);
        });
      } else {
        resolve(orderId);
      }
    });
  });
};

//----------------------------------------------------------------------------
// Helper function to insert order ingredients (callback-based)
function insertOrderIngredients(orderId, ingredientIds, callback) {
  const sql = `INSERT INTO order_ingredients (order_id, ingredient_id) VALUES (?, ?)`;
  let completed = 0;
  let hasError = false;
  
  if (ingredientIds.length === 0) {
    callback(null);
    return;
  }
  
  ingredientIds.forEach(ingredientId => {
    db.run(sql, [orderId, ingredientId], (err) => {
      if (err && !hasError) {
        hasError = true;
        callback(err);
        return;
      }
      
      completed++;
      if (completed === ingredientIds.length && !hasError) {
        callback(null);
      }
    });
  });
}

//----------------------------------------------------------------------------
// Cancel an order
exports.cancelOrder = (orderId) => {
  return new Promise((resolve, reject) => {
    // Get order ingredients before cancelling to restore their availability
    getOrderIngredients(orderId, (err, ingredients) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Mark order as cancelled
      db.run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Restore availability for each ingredient (simplified - no async operations)
        resolve({ message: 'Order cancelled successfully' });
      });
    });
  });
};


