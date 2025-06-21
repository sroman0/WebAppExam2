# Restaurant App

This is a simple web application for configuring food orders. It is composed of a React front end and a Node/Express server backed by SQLite.

## React Client Application Routes
- `/` login or order page depending on authentication

## API Server
- `POST /api/login` – authenticate user (uses session cookies)
- `POST /api/logout` – logout
- `GET /api/dishes` – list base dishes
- `GET /api/ingredients` – list ingredients with constraints
- `GET /api/orders` – list user orders (requires authentication)
- `POST /api/orders` – create an order
- `POST /api/orders/:id/cancel` – cancel an order (requires TOTP if enabled)

## Database Tables
- `users` – id, username, password, totp_required
- `base_dishes` – id, name
- `ingredients` – id, name, price, availability
- `ingredient_requires` – pairs of ingredient dependencies
- `ingredient_incompatible` – pairs of incompatible ingredients
- `orders` – id, user_id, date, cancelled
- `order_items` – id, order_id, base_dish, size, price
- `order_item_ingredients` – selected ingredients per item

## Main React Components
- `App` – main component showing login or order data
- `LoginForm` – component for user login

## Users Credentials
- user1 / password (requires 2FA)
- user2 / password
