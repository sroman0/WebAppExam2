const db = require('../db');
const bcrypt = require('bcrypt');

//----------------------------------------------------------------------------
// Get user based on the ID
exports.getUserById = (id) => {
  return new Promise((resolve, reject) => {
    
    // We get the user but we do not retrieve the password hash
    const sql = `
      SELECT id, username, secret
      FROM users
      WHERE id = ?
    `;

    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(undefined);
      else {
        const user = {
          id: row.id,
          username: row.username,
          secret: row.secret
        };
        resolve(user);
      }
    });
  });
};

//----------------------------------------------------------------------------
// Get user by username and password
exports.getUser = (username, password) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, username, password, secret
      FROM users
      WHERE username = ?
    `;
    db.get(sql, [username], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(false);
      else {
        // Use bcrypt.compare with callback (no await!)
        bcrypt.compare(password, row.password, (err, isValid) => {
          if (err) reject(err);
          else if (!isValid) resolve(false);
          else {
            const user = {
              id: row.id,
              username: row.username,
              secret: row.secret
            };
            resolve(user);
          }
        });
      }
    });
  });
};
