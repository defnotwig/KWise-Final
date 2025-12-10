# K-Wise Backend

Backend server for the PC WISE admin system.

## System Overview

This is a Node.js Express server that provides API endpoints for the PC WISE admin system. It includes user authentication, stock management, order processing, and system settings.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables (or use the defaults):
   ```
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   
   # Database
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=humbleludwig13
   DB_NAME=KWiseDB
   DB_PORT=5432
   
   # JWT
   JWT_SECRET=eq8hnXKk5nz6VmDP7UfBCMGQrtEsvFcxgy9SazhN4J8TLRWYmP2vV3bAQKpj7wdH6u4EDkXtc95GJZrsPYLqB3NfZ
   JWT_EXPIRES_IN=1d
   ```

3. Start the server:
   ```
   node server.js
   ```

## Default Admin Credentials

The system comes with a default admin account:
- Email: `admin@pcwise.com`
- Password: `Admin@123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/me` - Get current authenticated user
- `PATCH /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Stock
- `GET /api/stock` - Get all stock items
- `GET /api/stock/:id` - Get stock item by ID
- `POST /api/stock` - Add a new stock item
- `PUT /api/stock/:id` - Update a stock item
- `DELETE /api/stock/:id` - Delete a stock item

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create a new order
- `PUT /api/orders/:id` - Update an order
- `DELETE /api/orders/:id` - Delete an order

### Settings
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings

## Troubleshooting

### Admin Login Issues

If you're having trouble logging in with the default admin credentials, you can use the included diagnostic script to reset the admin account:

```
node fix-admin.js
```

This script will:
1. Check if the admin account exists
2. Verify the password hash
3. Reset the password if needed

### Server Connection Issues

If the server starts but you can't connect to it, check the following:

1. Make sure the server is listening on the correct interface (default: 0.0.0.0)
2. Verify the port is correct and not being used by another application (default: 5000)
3. Check if there are any errors in the console output

### Testing Connectivity

To test if the server is running correctly:

1. Check the health endpoint: http://localhost:5000/api/health
2. Use the login test script: `node test-login.js`

## Development Notes

- The server uses PostgreSQL for database storage
- Authentication is handled with JWT tokens
- Password hashing is done with bcrypt
- Environment variables use dotenv for configuration 