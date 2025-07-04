'use strict';

// Express server for the restaurant web application
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const { check, validationResult } = require('express-validator');

const DishesDAO = require('./DAOs/dao-dishes');
const IngredientsDAO = require('./DAOs/dao-ingredients');
const OrdersDAO = require('./DAOs/dao-orders');
const UsersDAO = require('./DAOs/dao-users');
const { initDB } = require('./db');
const LocalStrategy = require('passport-local').Strategy;

// TOTP imports - following professor's implementation
const base32 = require('thirty-two');
const TotpStrategy = require('passport-totp').Strategy;

const app = express();
const PORT = 3001;

// CORS configuration for client-server separation
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
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

// TOTP Strategy - following professor's implementation
passport.use(new TotpStrategy(
  function (user, done) {
    // For this exam, we use a fixed secret as specified in the requirements
    // In case .secret does not exist, decode() will return an empty buffer
    const secret = 'LXBSMDTMSP2I5XFXIYRGFVWSFI';
    return done(null, base32.decode(secret), 30);  // 30 = period of key validity
  }
));

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
const isTotp = (req, res, next) => {
  if (req.session.method === 'totp')
    return next();
  return res.status(401).json({ error: 'Missing TOTP authentication' });
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
    // Get ingredient data for validation
    const ingredientsData = await IngredientsDAO.getAllIngredients();
    const selectedIngredients = ingredientsData.filter(ing => ingredients.includes(ing.id));
    
    // Validate ingredient count based on size
    const maxIngredients = { small: 3, medium: 5, large: 7 }[size] || 0;
    if (selectedIngredients.length > maxIngredients) {
      return res.status(400).json({ 
        error: `${size} size can only have ${maxIngredients} ingredients` 
      });
    }
    
    // Validate ingredient availability
    for (const ingredient of selectedIngredients) {
      if (ingredient.availability !== null && ingredient.availability <= 0) {
        return res.status(400).json({ 
          error: `Not enough ${ingredient.name} available` 
        });
      }
    }
    
    // Validate ingredient constraints (dependencies and incompatibilities)
    const selectedNames = selectedIngredients.map(ing => ing.name);
    
    for (const ingredient of selectedIngredients) {
      // Check dependencies
      if (ingredient.requires && ingredient.requires.length > 0) {
        for (const required of ingredient.requires) {
          if (!selectedNames.includes(required)) {
            return res.status(400).json({ 
              error: `${ingredient.name} requires ${required}` 
            });
          }
        }
      }
      
      // Check incompatibilities
      if (ingredient.incompatible && ingredient.incompatible.length > 0) {
        for (const incompatible of ingredient.incompatible) {
          if (selectedNames.includes(incompatible)) {
            return res.status(400).json({ 
              error: `${ingredient.name} is incompatible with ${incompatible}` 
            });
          }
        }
      }
    }
    
    // Calculate total price
    const sizePrice = { small: 5, medium: 7, large: 9 }[size] || 0;
    const ingredientsPrice = selectedIngredients.reduce((sum, ing) => sum + ing.price, 0);
    const total = sizePrice + ingredientsPrice;
    
    const orderId = await OrdersDAO.createOrder(userId, dish_id, size, total, ingredients);
    res.status(201).json({ orderId, message: 'Order created successfully' });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// DELETE /api/orders/:id - cancel an order (requires 2FA)
app.delete('/api/orders/:id', isAuthenticated, isTotp, async (req, res) => {
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

// Helper function to return client user info - following professor's pattern
function clientUserInfo(req) {
  const user = req.user;
  return {
    id: user.id, 
    username: user.username, 
    name: user.username, 
    canDoTotp: true, // For this exam, all users can do TOTP
    isTotp: req.session.method === 'totp'
  };
}

// POST /api/sessions - login following professor's pattern
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', (err, user, info) => { 
    if (err)
      return next(err);
    if (!user) {
      // display wrong login messages
      return res.status(401).json({ error: info?.message || 'Incorrect username or password'});
    }
    // success, perform the login and establish a login session
    req.login(user, (err) => {
      if (err)
        return next(err);
      
      // req.user contains the authenticated user, we send all the user info back
      // this is coming from userDao.getUser() in LocalStrategy Verify Fn
      return res.json(clientUserInfo(req));
    });
  })(req, res, next);
});

// POST /api/login-totp - TOTP verification following professor's pattern
app.post('/api/login-totp', isAuthenticated,
  passport.authenticate('totp'),   // passport expects the totp value to be in: body.code
  function(req, res) {
    req.session.method = 'totp';
    res.json({otp: 'authorized'});
  }
);

// GET /api/sessions/current - get current user following professor's pattern
app.get('/api/sessions/current', (req, res) => {
  if(req.isAuthenticated()) {
    res.status(200).json(clientUserInfo(req));
  } else {
    res.status(401).json({error: 'Not authenticated'});
  }
});

// DELETE /api/sessions/current - logout following professor's pattern
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.status(200).json({});
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
