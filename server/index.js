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
const { initDB } = require('./db');
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

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check 2FA requirement for certain operations
const requires2FA = (req, res, next) => {
  if (req.isAuthenticated() && req.session.totpVerified) {
    return next();
  }
  res.status(403).json({ error: '2FA verification required for this operation' });
};

// GET /api/orders - get all orders for the authenticated user
app.get('/api/orders', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  try {
    const orders = await OrdersDAO.getOrdersByUser(userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// GET /api/orders/:id - get details for a single order
app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
  try {
    const order = await OrdersDAO.getOrderDetails(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    // Check if order belongs to current user
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details.' });
  }
});

// POST /api/orders - create a new order for the authenticated user
app.post('/api/orders', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { dish_id, size, ingredients } = req.body;
  
  if (!dish_id || !size || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Invalid order data.' });
  }
  
  try {
    // Calculate total price
    const sizePrice = { small: 5, medium: 7, large: 9 }[size] || 0;
    const ingredientsData = await IngredientsDAO.getAllIngredients();
    const selectedIngredients = ingredientsData.filter(ing => ingredients.includes(ing.id));
    const ingredientsPrice = selectedIngredients.reduce((sum, ing) => sum + ing.price, 0);
    const total = sizePrice + ingredientsPrice;
    
    // TODO: Add constraint validation here
    
    const orderId = await OrdersDAO.createOrder(userId, dish_id, size, total, ingredients);
    res.status(201).json({ orderId, message: 'Order created successfully' });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// DELETE /api/orders/:id - cancel an order (requires 2FA)
app.delete('/api/orders/:id', requires2FA, async (req, res) => {
  try {
    const order = await OrdersDAO.getOrderDetails(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    
    // Check if order belongs to current user
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    await OrdersDAO.cancelOrder(req.params.id);
    res.json({ message: 'Order cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// POST /api/sessions - login (with optional TOTP)
app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Passport error:', err);
      return next(err);
    }
    if (!user) {
      console.log('No user after passport.authenticate:', info);
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    
    req.logIn(user, (err) => {
      if (err) return next(err);
      
      // Check if user has 2FA enabled
      if (user.totp_required) {
        // Store pending 2FA status in session
        req.session.pending2FA = true;
        req.session.pendingUserId = user.id;
        req.session.totpVerified = false;
        return res.json({ 
          canDoTotp: true, 
          user: { 
            id: user.id, 
            name: user.username,
            username: user.username 
          } 
        });
      } else {
        // No 2FA required, return user info
        req.session.totpVerified = false;
        return res.json({ 
          user: { 
            id: user.id, 
            name: user.username,
            username: user.username, 
            isTotp: false 
          } 
        });
      }
    });
  })(req, res, next);
});

// POST /api/sessions/totp - verify TOTP code
app.post('/api/sessions/totp', async (req, res) => {
  const { code } = req.body;
  
  if (!req.session.pending2FA || !req.session.pendingUserId) {
    return res.status(400).json({ error: 'No pending 2FA verification' });
  }
  
  try {
    // Use the secret from the exam specification
    const secret = 'LXBSMDTMSP2I5XFXIYRGFVWSFI';
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow some time drift
    });
    
    if (verified) {
      // Mark 2FA as verified
      req.session.totpVerified = true;
      req.session.pending2FA = false;
      
      const user = await UsersDAO.getUserById(req.session.pendingUserId);
      delete req.session.pendingUserId;
      
      res.json({ 
        message: '2FA verified successfully',
        user: {
          id: user.id,
          name: user.username,
          username: user.username,
          isTotp: true
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid TOTP code' });
    }
  } catch (err) {
    console.error('TOTP verification error:', err);
    res.status(500).json({ error: 'TOTP verification failed' });
  }
});

// GET /api/sessions/current - get current user
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      id: req.user.id, 
      name: req.user.username,
      username: req.user.username, 
      isTotp: req.session.totpVerified || false 
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// DELETE /api/sessions/current - logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Session destruction failed' });
      res.json({ message: 'Logged out successfully' });
    });
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Restaurant API running.' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDB();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
