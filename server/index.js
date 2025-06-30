'use strict';

// Express server for the restaurant web application
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');


const DishesDAO = require('./DAOs/dao-dishes');
const IngredientsDAO = require('./DAOs/dao-ingredients');
const OrdersDAO = require('./DAOs/dao-orders');
const UsersDAO = require('./DAOs/dao-users');
const LocalStrategy = require('passport-local').Strategy;
const speakeasy = require('speakeasy');

const app = express();
const PORT = 3001;

// CORS configuration for client-server separation
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Session management
app.use(session({
  secret: 'a-very-secret-key', // Change in production
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'database') }),
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// Passport.js setup (to be configured)
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for username/password
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await UsersDAO.getUserByUsername(username);
    console.log('Login attempt:', username, !!user);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    const valid = await UsersDAO.verifyPassword(user, password);
    console.log('Password valid:', valid);
    if (!valid) return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UsersDAO.getUserById(id); // fixed: use correct DAO function
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// API routes (to be implemented)
// app.use('/api/sessions', authRoutes);
// app.use('/api/dishes', dishRoutes);
// app.use('/api/ingredients', ingredientRoutes);
// app.use('/api/orders', orderRoutes);

// GET /api/dishes - get all base dishes with sizes and prices
app.get('/api/dishes', async (req, res) => {
  try {
    const dishes = await DishesDAO.getAllDishes();
    res.json(dishes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dishes.' });
  }
});

// GET /api/ingredients - get all ingredients with constraints and availability
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await IngredientsDAO.getAllIngredients();
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ingredients.' });
  }
});

// GET /api/orders - get all orders for the authenticated user
app.get('/api/orders', async (req, res) => {
  // For now, use a placeholder userId (replace with req.user.id after auth is implemented)
  const userId = 1; // TODO: use req.user.id
  try {
    const orders = await OrdersDAO.getOrdersByUser(userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// GET /api/orders/:id - get details for a single order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await OrdersDAO.getOrderDetails(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details.' });
  }
});

// POST /api/orders - create a new order for the authenticated user
app.post('/api/orders', async (req, res) => {
  // For now, use a placeholder userId (replace with req.user.id after auth is implemented)
  const userId = 1; // TODO: use req.user.id
  const { dishId, size, ingredients, total } = req.body;
  if (!dishId || !size || !Array.isArray(ingredients) || typeof total !== 'number') {
    return res.status(400).json({ error: 'Invalid order data.' });
  }
  try {
    const orderId = await OrdersDAO.createOrder(userId, dishId, size, total, ingredients);
    res.status(201).json({ orderId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// POST /api/orders/:id/cancel - cancel an order (requires 2FA, to be checked after auth is implemented)
app.post('/api/orders/:id/cancel', async (req, res) => {
  // For now, skip 2FA check; add after auth is implemented
  try {
    await OrdersDAO.cancelOrder(req.params.id);
    res.json({ message: 'Order cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// POST /api/sessions - login (with optional TOTP)
app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      console.log('Passport error:', err);
      return next(err);
    }
    if (!user) {
      console.log('No user after passport.authenticate:', info);
      return res.status(401).json({ error: info && info.message ? info.message : 'Unauthorized' });
    }
    // If user has 2FA, check TOTP
    if (user.has2FA) {
      const { totp } = req.body;
      if (!totp) {
        console.log('2FA required but not provided');
        return res.status(401).json({ require2FA: true });
      }
      const verified = speakeasy.totp.verify({
        secret: 'LXBSMDTMSP2I5XFXIYRGFVWSFI',
        encoding: 'base32',
        token: totp
      });
      if (!verified) {
        console.log('Invalid 2FA code');
        return res.status(401).json({ error: 'Invalid 2FA code.' });
      }
    }
    req.login(user, (err) => {
      if (err) {
        console.log('req.login error:', err);
        return next(err);
      }
      console.log('Login successful, session established for user:', user.username);
      res.json({ id: user.id, username: user.username, require2FA: !!user.has2FA });
    });
  })(req, res, next);
});

// GET /api/sessions/current - get current user
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    const { id, username, isAdmin, has2FA } = req.user;
    res.json({ id, username, isAdmin, has2FA });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// DELETE /api/sessions/current - logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Restaurant API running.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
