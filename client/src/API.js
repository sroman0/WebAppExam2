import dayjs from 'dayjs';

const SERVER_URL = 'http://localhost:3001/api/';

/**
 * A utility function for parsing the HTTP response.
 */
function getJson(httpResponsePromise) {
  // server API always return JSON, in case of error the format is the following { error: <message> } 
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then((response) => {
        if (response.ok) {

         // the server always returns a JSON, even empty {}. Never null or non json, otherwise the method will fail
         response.json()
            .then( json => resolve(json) )
            .catch( err => reject({ error: "Cannot parse server response" }))

        } else {
          // analyzing the cause of error
          response.json()
            .then(obj => 
              reject(obj)
              ) // error msg in the response body
            .catch(err => reject({ error: "Cannot parse server response" })) // something else
        }
      })
      .catch(err => 
        reject({ error: "Cannot communicate"  })
      ) // connection error
  });
}

/**
 * Getting from the server side and returning the list of dishes.
 */
const getDishes = async () => {
  return getJson(
    fetch(SERVER_URL + 'dishes', { credentials: 'include' })
  );
};

/**
 * Getting from the server side and returning the list of ingredients.
 */
const getIngredients = async () => {
  return getJson(
    fetch(SERVER_URL + 'ingredients', { credentials: 'include' })
  );
};

/**
 * Getting from the server side and returning the list of orders for the authenticated user.
 */
const getOrders = async () => {
  return getJson(
    fetch(SERVER_URL + 'orders', { credentials: 'include' })
  ).then(orders => {
    return orders.map((order) => {
      const clientOrder = {
        id: order.id,
        dish_id: order.dish_id,
        dish_name: order.dish_name,
        size: order.size,
        total: order.total,
        status: order.status,
        user_id: order.user_id,
        ingredients: order.ingredients || []
      }
      if (order.timestamp != null)
        clientOrder.timestamp = dayjs(order.timestamp);
      return clientOrder;
    })
  })
}

/**
 * This function adds a new order in the back-end.
 */
function addOrder(order) {
  return getJson(
    fetch(SERVER_URL + "orders", {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order) 
    })
  )
}

/**
 * This function deletes an order from the back-end.
 */
function deleteOrder(orderId) {
  return getJson(
    fetch(SERVER_URL + "orders/" + orderId, {
      method: 'DELETE',
      credentials: 'include'
    })
  )
}


/*** Authentication functions ***/

/**
 * This function wants the TOTP code
 * It executes the 2FA.
 */
const totpVerify = async (totpCode) => {
  return getJson(fetch(SERVER_URL + 'login-totp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',  // this parameter specifies that authentication cookie must be forwarded
    body: JSON.stringify({code: totpCode}),
  })
  )
};

/**
 * This function wants username and password inside a "credentials" object.
 * It executes the log-in.
 */
const logIn = async (credentials) => {
  return getJson(fetch(SERVER_URL + 'sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',  // this parameter specifies that authentication cookie must be forwarded
    body: JSON.stringify(credentials),
  })
  )
};

/**
 * This function is used to verify if the user is still logged-in.
 * It returns a JSON object with the user info.
 */
const getUserInfo = async () => {
  return getJson(fetch(SERVER_URL + 'sessions/current', {
    // this parameter specifies that authentication cookie must be forwarded
    credentials: 'include'
  })
  )
};

/**
 * This function destroy the current user's session and execute the log-out.
 */
const logOut = async() => {
  return getJson(fetch(SERVER_URL + 'sessions/current', {
    method: 'DELETE',
    credentials: 'include'  // this parameter specifies that authentication cookie must be forwarded
  })
  )
}

const API = { getDishes, getIngredients, getOrders, addOrder, deleteOrder,
              logIn, getUserInfo, logOut, totpVerify };
export default API;
