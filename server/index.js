'use strict';

// This file sets up an Express server with Passport.js for authentication,
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');

const passport = require('passport');
const base32 = require('thirty-two');
const LocalStrategy = require('passport-local');
const TotpStrategy = require('passport-totp').Strategy;

// Import the Data Access Objects (DAOs) for users, dishes, ingredients, and orders
const daoUsers = require('./DAOs/dao-users');
const daoDishes = require('./DAOs/dao-dishes');
const daoIngredients = require('./DAOs/dao-ingredients');
const daoOrders = require('./DAOs/dao-orders');

const { validationResult, body } = require('express-validator');

//----------------------------------------------------------------------------
// Create the Express app and configure middleware
const app = express();
const port = 3001;

//----------------------------------------------------------------------------
// Middleware setup
app.use(morgan('dev'));
app.use(express.json());

// Enable CORS for the frontend communication
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

//----------------------------------------------------------------------------
// Session management
app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

//----------------------------------------------------------------------------
// Initialize Passport.js for authentication
// The local strategy is used for username/password authentication
passport.use(new LocalStrategy(
  function(username, password, done) {
    daoUsers.getUser(username, password)
      .then(user => {
        if (!user) return done(null, false, { message: 'Incorrect username or password.' });
        return done(null, user);
      })
      .catch(err => done(err));
  }
));

//----------------------------------------------------------------------------
// The TOTP strategy is used for two-factor authentication (2FA)
passport.use(new TotpStrategy(
  function(user, done) {
    // Fixed secret for all users as specified in exam requirements
    if (!user.secret) return done(null, null);
    return done(null, base32.decode(user.secret), 30);
  }
));

//----------------------------------------------------------------------------
// Serialize and deserialize user instances to support sessions
// The serialization is used to store user ID in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  daoUsers.getUserById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

//----------------------------------------------------------------------------
// middleware to check if user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

//----------------------------------------------------------------------------
// middleware to check if user has completed TOTP
function isTotp(req, res, next) {
  if (req.session.method === 'totp') return next();
  return res.status(401).json({ error: 'TOTP authentication required' });
}

//----------------------------------------------------------------------------
// Helper to send user info to client, including isTotp
function clientUserInfo(req) {
  const user = req.user;
  return {
    id: user.id, 
    username: user.username, 
    name: user.username, 
    canDoTotp: true, // For this exam, all users can perform TOTP
    isTotp: req.session.method === 'totp'  // Whether user has completed 2FA
  };
}


//#############################################################################
// Authentication APIs

// Login (username/password)
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) return res.status(401).json(info);
    
    req.login(user, function(err) {
      if (err) return next(err);
      
      // For this restaurant app, all users can do TOTP
      req.session.secondFactor = 'pending';
      return res.json({
        ...clientUserInfo(req),
        canDoTotp: true,
        isTotp: false
      });
    });
  })(req, res, next);
});

//----------------------------------------------------------------------------
// TOTP verification (2FA)
app.post('/api/login-totp', isLoggedIn, function(req, res, next) {
  passport.authenticate('totp', function(err, user, info) {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Invalid TOTP' });
    
    req.session.method = 'totp';
    delete req.session.secondFactor;
    return res.json(clientUserInfo(req));
  })(req, res, next);
});

//----------------------------------------------------------------------------
// Get current user session
app.get('/api/sessions/current', function(req, res) {
  if (req.isAuthenticated()) {
    res.json(clientUserInfo(req));
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

//----------------------------------------------------------------------------
// Logout
app.delete('/api/sessions/current', function(req, res) {
  req.logout(function(err) {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({});
  });
});


//#############################################################################
// Restaurant APIs

//----------------------------------------------------------------------------
// Get all dishes (public)
app.get('/api/dishes', async (req, res) => {
  try {
    const dishes = await daoDishes.getAllDishes();
    res.json(dishes);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Get all ingredients (public)
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await daoIngredients.getAllIngredients();
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Get user's orders (authentication required)
app.get('/api/orders', isLoggedIn, async (req, res) => {
  try {
    const orders = await daoOrders.getOrdersByUser(req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Get specific order details (authentication required)
app.get('/api/orders/:id', isLoggedIn, async (req, res) => {
  try {
    const order = await daoOrders.getOrderDetails(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Authorization check - ensure user owns this order
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Create new order (authentication required)
app.post('/api/orders', isLoggedIn, [
  body('dish_id').isInt({min: 1}).withMessage('Valid dish ID is required'),
  body('size').isIn(['small', 'medium', 'large']).withMessage('Valid size is required'),
  body('ingredients').isArray().withMessage('Ingredients must be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({error: errors.array()});
  }

  try {
    const { dish_id, size, ingredients } = req.body;
    
    // Get ingredient data for validation
    const ingredientsData = await daoIngredients.getAllIngredients();
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
    
    // Validate ingredient constraints
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
    
    // Create order
    const orderId = await daoOrders.createOrder(req.user.id, dish_id, size, total, ingredients);
    
    // Update ingredient availability for new orders only (not pre-loaded orders)
    for (const ingredient of selectedIngredients) {
      if (ingredient.availability !== null) {
        await daoIngredients.updateIngredientAvailability(ingredient.id, 1);
      }
    }
    
    res.status(201).json({ id: orderId });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

//----------------------------------------------------------------------------
// Cancel order (TOTP authentication required)
app.delete('/api/orders/:id', isLoggedIn, isTotp, async (req, res) => {
  try {
    const order = await daoOrders.getOrderDetails(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Authorization check
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Cancel the order
    await daoOrders.cancelOrder(req.params.id);
    
    // Restore ingredient availability
    if (order.ingredients && order.ingredients.length > 0) {
      for (const ingredient of order.ingredients) {
        const ingredientData = await daoIngredients.getIngredientById(ingredient.id);
        if (ingredientData && ingredientData.availability !== null) {
          await daoIngredients.restoreIngredientAvailability(ingredient.id, 1);
        }
      }
    }
    
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});


//----------------------------------------------------------------------------
// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
