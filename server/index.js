'use strict';

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const cors = require('cors');
const speakeasy = require('speakeasy');

const initDB = require('./db');

const app = express();
const port = 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

let db;
initDB().then((d) => { db = d; });

passport.use(new LocalStrategy(async (username, password, cb) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE username=?', [username]);
    if (!user) return cb(null, false, 'Incorrect username');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return cb(null, false, 'Incorrect password');
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id=?', [id]);
    cb(null, user);
  } catch (err) {
    cb(err);
  }
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'not authenticated' });
}

app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, totp_required: req.user.totp_required });
});

app.post('/api/logout', (req, res) => {
  req.logout(() => res.end());
});

app.get('/api/dishes', async (req, res) => {
  const rows = await db.all('SELECT * FROM base_dishes');
  res.json(rows);
});

app.get('/api/ingredients', async (req, res) => {
  const ingredients = await db.all('SELECT * FROM ingredients');
  const requires = await db.all('SELECT * FROM ingredient_requires');
  const inc = await db.all('SELECT * FROM ingredient_incompatible');
  res.json({ ingredients, requires, incompatible: inc });
});

app.get('/api/orders', isLoggedIn, async (req, res) => {
  const orders = await db.all('SELECT * FROM orders WHERE user_id=?', [req.user.id]);
  for (const order of orders) {
    order.items = await db.all('SELECT * FROM order_items WHERE order_id=?', [order.id]);
    for (const item of order.items) {
      item.ingredients = await db.all('SELECT ingredient_id FROM order_item_ingredients WHERE order_item_id=?', [item.id]);
    }
  }
  res.json(orders);
});

app.post('/api/orders', isLoggedIn, async (req, res) => {
  const { baseDish, size, ingredients } = req.body;
  const result = await db.run('INSERT INTO orders (user_id, date) VALUES (?, datetime("now"))', [req.user.id]);
  const orderId = result.lastID;
  const priceBase = { Small: 5, Medium: 7, Large: 9 }[size];
  const item = await db.run('INSERT INTO order_items (order_id, base_dish, size, price) VALUES (?,?,?,?)', [orderId, baseDish, size, priceBase]);
  const itemId = item.lastID;
  for (const ing of ingredients) {
    await db.run('INSERT INTO order_item_ingredients (order_item_id, ingredient_id) VALUES (?,?)', [itemId, ing]);
  }
  res.json({ orderId });
});

app.post('/api/orders/:id/cancel', isLoggedIn, async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!order) return res.status(404).end();
  if (req.user.totp_required) {
    const { token } = req.body;
    const verified = speakeasy.totp.verify({ secret: 'LXBSMDTMSP2I5XFXIYRGFVWSFI', encoding: 'base32', token });
    if (!verified) return res.status(401).json({ error: 'invalid token' });
  }
  await db.run('UPDATE orders SET cancelled=1 WHERE id=?', [order.id]);
  res.end();
});

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));
