// API.js
// Handles all API calls to the backend server

const API_URL = 'http://localhost:3001'; // Adjust if your backend runs on a different port

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API Error');
  }
  return res.json();
}

const API = {
  // Fetch all base dishes
  getDishes: async () => {
    const res = await fetch(`${API_URL}/api/dishes`, { credentials: 'include' });
    return handleResponse(res);
  },

  // Fetch all ingredients
  getIngredients: async () => {
    const res = await fetch(`${API_URL}/api/ingredients`, { credentials: 'include' });
    return handleResponse(res);
  },

  // User login (with optional TOTP)
  login: async ({ username, password, totp }) => {
    const res = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, totp })
    });
    return handleResponse(res);
  },

  // Submit a new order
  submitOrder: async (order) => {
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    return handleResponse(res);
  },

  // Fetch user's orders
  getUserOrders: async () => {
    const res = await fetch(`${API_URL}/api/orders`, { credentials: 'include' });
    return handleResponse(res);
  },

  // Fetch details for a single order
  getOrderDetails: async (id) => {
    const res = await fetch(`${API_URL}/api/orders/${id}`, { credentials: 'include' });
    return handleResponse(res);
  },

  // Cancel an order
  cancelOrder: async (id) => {
    const res = await fetch(`${API_URL}/api/orders/${id}/cancel`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(res);
  },
};

export default API;
