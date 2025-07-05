/**
 * RESTAURANT WEB APPLICATION - EXPRESS SERVER
 * 
 * This is the main server file for the restaurant ordering system.
 * It provides a RESTful API for managing dishes, ingredients, orders, and user authentication.
 * 
 * Key Features:
 * - User authentication with username/password + optional 2FA (TOTP)
 * - Order management with ingredient constraints and validation
 * - Real-time ingredient availability tracking
 * - Express-validator for input validation following professor's patterns
 * - Session management with SQLite store
 * - CORS support for client-server separation
 * 
 * API Endpoints:
 * - GET /api/dishes - Browse available dishes and sizes
 * - GET /api/ingredients - Browse ingredients with constraints
 * - GET /api/orders - View user's order history
 * - GET /api/orders/:id - View specific order details
 * - POST /api/orders - Create new order with validation
 * - DELETE /api/orders/:id - Cancel order (requires 2FA)
 * - POST /api/sessions - User login
 * - POST /api/login-totp - TOTP verification
 * - GET /api/sessions/current - Get current user
 * - DELETE /api/sessions/current - Logout
 */

'use strict';

// Core Express.js and middleware imports
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const { check, validationResult } = require('express-validator');

// Data Access Objects for database operations
const DishesDAO = require('./DAOs/dao-dishes');
const IngredientsDAO = require('./DAOs/dao-ingredients');
const OrdersDAO = require('./DAOs/dao-orders');
const UsersDAO = require('./DAOs/dao-users');
const { initDB } = require('./db');

// Authentication strategies
const LocalStrategy = require('passport-local').Strategy;

// TOTP (Time-based One-Time Password) imports - following professor's implementation
const base32 = require('thirty-two');
const TotpStrategy = require('passport-totp').Strategy;

/**
 * SERVER CONFIGURATION
 */
const app = express();
const PORT = 3001;

/**
 * MIDDLEWARE SETUP
 */

// CORS configuration for client-server separation
// Allows requests from Vite dev server on different ports
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true  // Allow cookies and sessions
}));

// Parse JSON request bodies
app.use(express.json());

// Session management with SQLite store for persistence
app.use(session({
  secret: 'a-very-secret-key', // Change in production
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ 
    db: 'sessions.sqlite', 
    dir: path.join(__dirname, 'database') 
  }),
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour session timeout
}));

// Initialize Passport.js for authentication
app.use(passport.initialize());
app.use(passport.session());

/**
 * PASSPORT.JS AUTHENTICATION STRATEGIES
 */

// Local Strategy for username/password authentication
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await UsersDAO.getUserByUsername(username);
    //console.log('Login attempt:', username, !!user);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    
    const valid = await UsersDAO.verifyPassword(user, password);
    //console.log('Password valid:', valid);
    if (!valid) return done(null, false, { message: 'Incorrect password.' });
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Serialize user for session storage
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UsersDAO.getUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// TOTP Strategy for two-factor authentication - following professor's implementation
passport.use(new TotpStrategy(
  function (user, done) {
    // Fixed secret for all users as specified in exam requirements
    // In production, each user would have their own secret
    const secret = 'LXBSMDTMSP2I5XFXIYRGFVWSFI';
    return done(null, base32.decode(secret), 30);  // 30 = period of key validity in seconds
  }
));

/**
 * API ROUTES - PUBLIC ENDPOINTS
 * These endpoints don't require authentication and provide general information
 */

// GET /api/dishes - Retrieve all available dishes with sizes and prices
app.get('/api/dishes', async (req, res) => {
  try {
    const dishes = await DishesDAO.getAllDishes();
    res.json(dishes);
  } catch (err) {
    console.error('Error fetching dishes:', err);
    res.status(500).json({ error: 'Failed to fetch dishes.' });
  }
});

// GET /api/ingredients - Retrieve all ingredients with constraints and availability
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await IngredientsDAO.getAllIngredients();
    res.json(ingredients);
  } catch (err) {
    console.error('Error fetching ingredients:', err);
    res.status(500).json({ error: 'Failed to fetch ingredients.' });
  }
});

/**
 * AUTHENTICATION MIDDLEWARE
 */

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user has completed 2FA (TOTP) for sensitive operations
const isTotp = (req, res, next) => {
  if (req.session.method === 'totp')
    return next();
  return res.status(401).json({ error: 'Missing TOTP authentication' });
};

/**
 * API ROUTES - ORDER MANAGEMENT (AUTHENTICATED)
 * These endpoints require user authentication and handle order operations
 */

// GET /api/orders - Retrieve all orders for the authenticated user
app.get('/api/orders', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  try {
    const orders = await OrdersDAO.getOrdersByUser(userId);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// GET /api/orders/:id - Retrieve details for a specific order
app.get('/api/orders/:id', 
  [
    check('id').isInt({min: 1}).withMessage('Order ID must be a positive integer')
  ],
  isAuthenticated, 
  async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    const order = await OrdersDAO.getOrderDetails(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    
    // Ensure order belongs to the current user (authorization check)
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    res.json(order);
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: 'Failed to fetch order details.' });
  }
});

// POST /api/orders - Create a new order with comprehensive validation
app.post('/api/orders', 
  [
    check('dish_id').isInt({min: 1}).withMessage('Dish ID must be a positive integer'),
    check('size').isIn(['small', 'medium', 'large']).withMessage('Size must be small, medium, or large'),
    check('ingredients').isArray().withMessage('Ingredients must be an array'),
    check('ingredients.*').isInt({min: 1}).withMessage('Each ingredient ID must be a positive integer')
  ],
  isAuthenticated, 
  async (req, res) => {
    // Check for express-validator errors
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json( errors.errors );
    }

    const userId = req.user.id;
    const { dish_id, size, ingredients } = req.body;
    
    try {
      // Get ingredient data for business logic validation
      const ingredientsData = await IngredientsDAO.getAllIngredients();
      const selectedIngredients = ingredientsData.filter(ing => ingredients.includes(ing.id));
      
      // Validate ingredient count based on dish size constraints
      const maxIngredients = { small: 3, medium: 5, large: 7 }[size] || 0;
      if (selectedIngredients.length > maxIngredients) {
        return res.status(422).json({ 
          error: `${size} size can only have ${maxIngredients} ingredients` 
        });
      }
      
      // Validate ingredient availability (stock check)
      for (const ingredient of selectedIngredients) {
        if (ingredient.availability !== null && ingredient.availability <= 0) {
          return res.status(422).json({ 
            error: `Not enough ${ingredient.name} available` 
          });
        }
      }
      
      // Validate ingredient constraints (dependencies and incompatibilities)
      const selectedNames = selectedIngredients.map(ing => ing.name);
      
      for (const ingredient of selectedIngredients) {
        // Check ingredient dependencies (e.g., tomatoes require olives)
        if (ingredient.requires && ingredient.requires.length > 0) {
          for (const required of ingredient.requires) {
            if (!selectedNames.includes(required)) {
              return res.status(422).json({ 
                error: `${ingredient.name} requires ${required}` 
              });
            }
          }
        }
        
        // Check ingredient incompatibilities (e.g., eggs incompatible with mushrooms)
        if (ingredient.incompatible && ingredient.incompatible.length > 0) {
          for (const incompatible of ingredient.incompatible) {
            if (selectedNames.includes(incompatible)) {
              return res.status(422).json({ 
                error: `${ingredient.name} is incompatible with ${incompatible}` 
              });
            }
          }
        }
      }
      
      // Calculate total price (base dish price + ingredient prices)
      const sizePrice = { small: 5, medium: 7, large: 9 }[size] || 0;
      const ingredientsPrice = selectedIngredients.reduce((sum, ing) => sum + ing.price, 0);
      const total = sizePrice + ingredientsPrice;
      
      // Create the order in the database
      const orderId = await OrdersDAO.createOrder(userId, dish_id, size, total, ingredients);
      res.status(201).json({ orderId, message: 'Order created successfully' });
    } catch (err) {
      console.log(err);  // Log for debugging during development
      res.status(503).json({ error: 'Database error' });
    }
  }
);

// DELETE /api/orders/:id - Cancel an order (requires 2FA authentication)
app.delete('/api/orders/:id', 
  [ check('id').isInt({min: 1}).withMessage('Order ID must be a positive integer') ],
  isAuthenticated, 
  isTotp,  // Requires 2FA for security
  async (req, res) => {
    // Check for express-validator errors
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json( errors.errors );
    }

    try {
      // Verify order exists and belongs to current user
      const order = await OrdersDAO.getOrderDetails(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      
      // Authorization check - ensure user owns this order
      if (order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      
      // Perform the cancellation
      await OrdersDAO.cancelOrder(req.params.id);
      res.json({ message: 'Order cancelled successfully.' });
    } catch (err) {
      console.log(err);  // Log for debugging during development
      res.status(503).json({ error: 'Database error' });
    }
  }
);

/**
 * UTILITY FUNCTIONS
 */

// Helper function to return client-safe user information - following professor's pattern
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

/**
 * API ROUTES - AUTHENTICATION AND SESSION MANAGEMENT
 * These endpoints handle user login, logout, and session verification
 */

// POST /api/sessions - User login with username and password
app.post('/api/sessions',
  [
    check('username').isLength({min: 1}).withMessage('Username required'),
    check('password').isLength({min: 1}).withMessage('Password required')
  ],
  function(req, res, next) {
    // Check for validation errors
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json( errors.errors );
    }
    
    // Use Passport Local Strategy for authentication
    passport.authenticate('local', (err, user, info) => { 
      if (err)
        return next(err);
      if (!user) {
        // Authentication failed - send error message
        return res.status(401).json({ error: info?.message || 'Incorrect username or password'});
      }
      // Authentication successful - establish login session
      req.login(user, (err) => {
        if (err)
          return next(err);
        
        // Return user information to client
        return res.json(clientUserInfo(req));
      });
    })(req, res, next);
  }
);

// POST /api/login-totp - Two-factor authentication verification
app.post('/api/login-totp', 
  isAuthenticated,  // User must be logged in first
  [
    check('code').isLength({min: 6, max: 6}).withMessage('TOTP code must be 6 digits').isNumeric().withMessage('TOTP code must be numeric')
  ],
  function(req, res, next) {
    // Check for validation errors
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json( errors.errors );
    }
    
    // Use Passport TOTP Strategy - expects the TOTP code in req.body.code
    passport.authenticate('totp')(req, res, next);
  },
  function(req, res) {
    // TOTP verification successful - mark session as 2FA authenticated
    req.session.method = 'totp';
    res.json({otp: 'authorized'});
  }
);

// GET /api/sessions/current - Retrieve current authenticated user information
app.get('/api/sessions/current', (req, res) => {
  if(req.isAuthenticated()) {
    res.status(200).json(clientUserInfo(req));
  } else {
    res.status(401).json({error: 'Not authenticated'});
  }
});

// DELETE /api/sessions/current - User logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.status(200).json({});
  });
});

// GET / - Root endpoint for API status check
app.get('/', (req, res) => {
  res.json({ message: 'Restaurant API running.' });
});

/**
 * UTILITY FUNCTIONS AND SERVER INITIALIZATION
 */

// Express-validator error formatter - converts validation errors to strings
// Following professor's pattern for consistent error formatting
const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
  return `${location}[${param}]: ${msg}`;
};

// Initialize database and start the Express server
async function startServer() {
  try {
    // Initialize database tables and populate with sample data
    await initDB();
    //console.log('Database initialized successfully');
    
    // Start the HTTP server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();
