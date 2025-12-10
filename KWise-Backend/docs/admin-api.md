# Admin API Documentation - K-Wise System

## Base URL
```
http://localhost:5000/api
```

## Authentication
All Admin endpoints require authentication via JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## 1. Authentication Endpoints

### POST /api/auth/login
**Purpose**: User login
**Request Body**:
```json
{
  "email": "admin@pcwise.com",
  "password": "Admin@123"
}
```
**Response**:
```json
{
  "status": "success",
  "token": "token-123-1234567890",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@pcwise.com",
    "role": "superadmin"
  }
}
```

### POST /api/auth/register
**Purpose**: Create new user account
**Request Body**:
```json
{
  "name": "New User",
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "admin",
  "referenceEmail": "ref@example.com"
}
```

### POST /api/auth/forgot-password
**Purpose**: Request password reset
**Request Body**:
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password
**Purpose**: Reset password with token
**Request Body**:
```json
{
  "resetToken": "123456",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

## 2. User Management Endpoints

### GET /api/users
**Purpose**: List all users with pagination and search
**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Search by name, email, or role

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "_id": 1,
      "name": "Admin User",
      "email": "admin@pcwise.com",
      "role": "superadmin",
      "reference_email": "admin@pcwise.com",
      "last_login": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "pages": 2
  }
}
```

### GET /api/users/:id
**Purpose**: Get user by ID
**Response**: Single user object

### POST /api/users
**Purpose**: Create new user
**Request Body**:
```json
{
  "name": "New User",
  "email": "user@example.com",
  "password": "password123",
  "role": "admin",
  "referenceEmail": "ref@example.com"
}
```

### PUT /api/users/:id
**Purpose**: Update user
**Request Body**: Any combination of name, email, password, role

### DELETE /api/users/:id
**Purpose**: Delete user (soft delete preferred)
**Response**: Success message

## 3. Stock Management Endpoints

### GET /api/stock
**Purpose**: List all stock items with filtering and pagination
**Query Parameters**:
- `partType` (string, optional) - Filter by component type
- `q` (string, optional) - Search query
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `sort` (string, default: "updated_at:desc")

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Intel Core i7-12700K",
      "category": "cpu",
      "brand": "Intel",
      "price": 399.99,
      "stock": 15,
      "created_at": "2024-01-01T00:00:00Z",
      "specs": {
        "socket": "LGA1700",
        "cores": 12,
        "threads": 20,
        "base_clock": 3.6,
        "turbo_clock": 5.0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 236,
    "pages": 12
  }
}
```

### GET /api/stock/:id
**Purpose**: Get detailed stock item information
**Response**: Complete item with specifications
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Intel Core i7-12700K",
    "category": "cpu",
    "brand": "Intel",
    "price": 399.99,
    "stock": 15,
    "created_at": "2024-01-01T00:00:00Z",
    "specifications": {
      "socket": "LGA1700",
      "cores": 12,
      "threads": 20,
      "base_clock": 3.6,
      "turbo_clock": 5.0,
      "tdp": 125,
      "lithography": 10,
      "overall_score": 95.5,
      "benchmark_score": 92.3
    }
  }
}
```

### POST /api/stock
**Purpose**: Create new stock item
**Request Body**:
```json
{
  "name": "New CPU",
  "category": "cpu",
  "brand": "Intel",
  "price": 299.99,
  "stock": 10,
  "specifications": {
    "socket": "LGA1700",
    "cores": 8,
    "threads": 16
  }
}
```

### PUT /api/stock/:id
**Purpose**: Update stock item
**Request Body**: Any combination of fields

### DELETE /api/stock/:id
**Purpose**: Delete stock item (soft delete)
**Response**: Success message

### GET /api/stock/meta
**Purpose**: Get metadata for stock forms
**Response**:
```json
{
  "status": "success",
  "data": {
    "partTypes": ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "pc_case", "monitor", "mouse", "keyboard", "cooling", "speakers", "headphones", "webcam"],
    "specFields": {
      "cpu": ["socket", "cores", "threads", "base_clock", "turbo_clock", "tdp"],
      "gpu": ["memory_type", "memory_capacity", "core_clock", "boost_clock", "tdp"],
      "motherboard": ["socket", "chipset", "memory_type", "max_ram", "ram_slots"]
    }
  }
}
```

## 4. Dashboard Endpoints

### GET /api/dashboard/summary
**Purpose**: Get dashboard overview data
**Response**:
```json
{
  "status": "success",
  "data": {
    "totals": {
      "users": 12,
      "activeProducts": 236,
      "lowStockCount": 5,
      "totalOrders": 0,
      "totalRevenue": 0
    },
    "salesLast30d": {
      "orders": 0,
      "revenue": 0,
      "growth": 0
    },
    "ordersByStatus": {
      "pending": 0,
      "processing": 0,
      "completed": 0,
      "cancelled": 0
    },
    "recentLogs": [
      {
        "id": 1,
        "action": "user_login",
        "entity": "user",
        "user_id": 1,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "topMovingSKUs": [
      {
        "id": 1,
        "name": "Intel Core i7-12700K",
        "category": "cpu",
        "stock": 15,
        "price": 399.99
      }
    ]
  }
}
```

### GET /api/dashboard/stats
**Purpose**: Get detailed statistics
**Response**: Extended statistics data

### GET /api/dashboard/recent-orders
**Purpose**: Get recent orders
**Response**: List of recent orders

### GET /api/dashboard/top-products
**Purpose**: Get top-selling products
**Response**: List of top products

### GET /api/dashboard/sales-chart
**Purpose**: Get sales chart data
**Response**: Chart data for frontend visualization

## 5. Settings Endpoints

### GET /api/settings
**Purpose**: Get all system settings
**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "key": "company_name",
      "value": "K-Wise Systems",
      "type": "string",
      "description": "Company name for display"
    }
  ]
}
```

### PUT /api/settings
**Purpose**: Update system settings
**Request Body**:
```json
{
  "settings": [
    {
      "key": "company_name",
      "value": "New Company Name"
    }
  ]
}
```

## 6. Logs Endpoints

### GET /api/logs
**Purpose**: Get system logs with filtering
**Query Parameters**:
- `level` (string, optional) - Log level filter
- `from` (date, optional) - Start date
- `to` (date, optional) - End date
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "action": "user_login",
      "entity": "user",
      "entity_id": 1,
      "details": {"ip": "192.168.1.1"},
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### POST /api/logs/test
**Purpose**: Create test log entry (dev only)
**Request Body**:
```json
{
  "action": "test_action",
  "entity": "test_entity",
  "details": {"test": "data"}
}
```

## 7. Order Management Endpoints

### GET /api/orders
**Purpose**: List orders with filtering
**Query Parameters**:
- `status` (string, optional) - Filter by status
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "order_number": "ORD-001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "status": "pending",
      "total_amount": 1299.99,
      "payment_status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "pages": 0
  }
}
```

### GET /api/orders/:id
**Purpose**: Get order details
**Response**: Complete order with items

### PATCH /api/orders/:id/status
**Purpose**: Update order status
**Request Body**:
```json
{
  "status": "processing"
}
```

## 8. Developer Tools Endpoints

### GET /api/dev/health
**Purpose**: System health check
**Response**:
```json
{
  "status": "success",
  "data": {
    "db": "up",
    "version": "1.0.0",
    "migrations": "current",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### POST /api/dev/run-e2e-reset
**Purpose**: Run password reset E2E test (dev only)
**Response**: Test results

## 9. Error Responses

### Standard Error Format
```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## 10. Pagination

### Standard Pagination Response
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Pagination Query Parameters
- `page`: Page number (1-based)
- `limit`: Items per page (max 100)

## 11. Search & Filtering

### Text Search
- Search across name, description, brand fields
- Case-insensitive partial matching
- Multiple word support

### Filtering
- Category-based filtering
- Price range filtering
- Stock level filtering
- Date range filtering

### Sorting
- Default: `updated_at:desc`
- Supported: `name:asc`, `price:asc`, `price:desc`, `stock:asc`

## 12. Rate Limiting

### Default Limits
- **Authentication**: 5 requests per minute
- **API Calls**: 100 requests per minute
- **File Uploads**: 10 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## 13. CORS Configuration

### Allowed Origins
- `http://localhost:3000` (React dev)
- `http://localhost:3001` (React alt port)
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

### Allowed Methods
- GET, POST, PUT, DELETE, PATCH, OPTIONS

### Allowed Headers
- Content-Type, Authorization, X-Requested-With
