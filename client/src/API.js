import dayjs from 'dayjs';

const SERVER_URL = 'http://localhost:3001/api/';

/**
 * Utility function for parsing the HTTP response.
 */
function getJson(httpResponsePromise) {
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then(response => {
        if (response.ok) {
          response.json()
            .then(json => resolve(json))
            .catch(() => reject({ error: "Cannot parse server response." }));
        } else {
          response.json()
            .then(json => reject(json)) // error message in the response body
            .catch(() => reject({ error: "Cannot parse server response." }));
        }
      })
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

//############################################################################
// DISHES AND INGREDIENTS (PUBLIC)
//############################################################################

// Fetch all base dishes with their sizes and prices
const getDishes = async () => {
  return getJson(
    fetch(SERVER_URL + 'dishes', { credentials: 'include' })
  );
};

// Fetch all ingredients with their prices, availability, and constraints
const getIngredients = async () => {
  return getJson(
    fetch(SERVER_URL + 'ingredients', { credentials: 'include' })
  );
};

//############################################################################
// ORDERS
//############################################################################

// Create a new order
const createOrder = async (order) => {
  return getJson(
    fetch(SERVER_URL + 'orders', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    })
  );
};

// Get user's order history
const getOrders = async () => {
  return getJson(
    fetch(SERVER_URL + 'orders', { credentials: 'include' })
  ).then(orders => orders.map(order => ({
    ...order,
    timestamp: order.timestamp ? dayjs(order.timestamp) : null,
  })));
};

// Cancel an order (requires 2FA)
const cancelOrder = async (orderId) => {
  return getJson(
    fetch(SERVER_URL + `orders/${orderId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
  );
};

//############################################################################
// AUTHENTICATION and 2FA
//############################################################################

// Log in a user with credentials
const logIn = async (credentials) => {
  return getJson(
    fetch(SERVER_URL + 'sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
  );
};

// Verify a TOTP code for 2FA
const logInTotp = async (code) => {
  return getJson(
    fetch(SERVER_URL + 'sessions/totp', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
  );
};

// Log out the current user
const logOut = async () => {
  return getJson(
    fetch(SERVER_URL + 'sessions/current', {
      method: 'DELETE',
      credentials: 'include'
    })
  );
};

// Fetch information about the currently logged-in user
const getUserInfo = async () => {
  return getJson(
    fetch(SERVER_URL + 'sessions/current', { credentials: 'include' })
  );
};

const API = {
  getDishes,
  getIngredients,
  createOrder,
  getOrders,
  cancelOrder,
  logIn,
  logInTotp,
  logOut,
  getUserInfo,
};

export default API;
