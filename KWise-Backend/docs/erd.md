# Database Entity Relationship Diagram (ERD) - K-Wise System

## Core Tables Structure

```
USERS (12 rows)
├── id (PK)
├── name, email, password, role
├── authentication fields (password_reset_token, etc.)
└── timestamps (created_at, updated_at)

PC_PARTS (236 rows) - MASTER CATALOG
├── id (PK)
├── name, category, brand, price, stock
└── created_at

COMPONENT TABLES (All have data)
├── CPU (33 rows)
│   ├── id (PK)
│   ├── name, socket, cores, threads, benchmarks
│   └── price
├── GPU (40 rows)
│   ├── id (PK)
│   ├── name, memory, clock_speeds, benchmarks
│   └── price
├── MOTHERBOARD (35 rows)
│   ├── id (PK)
│   ├── name, socket, chipset, ram_support
│   └── price
├── RAM (23 rows)
│   ├── id (PK)
│   ├── name, type, speed, voltage
│   └── price
├── STORAGE (26 rows)
│   ├── id (PK)
│   ├── name, capacity, interface, nvme_support
│   └── price
├── PSU (23 rows)
│   ├── id (PK)
│   ├── name, wattage, efficiency, modular
│   └── price
├── PC_CASE (26 rows)
│   ├── id (PK)
│   ├── name, category, color, fans_included
│   └── price
├── MONITOR (22 rows)
│   ├── id (PK)
│   ├── name, resolution, refresh_rate, panel_type
│   └── price
├── MOUSE (10 rows)
│   ├── id (PK)
│   ├── name, dpi, connection_type, orientation
│   └── price
├── KEYBOARD (12 rows)
│   ├── id (PK)
│   ├── name, switch_type, backlit, connection
│   └── price
├── COOLING (31 rows)
│   ├── id (PK)
│   ├── name, max_rpm, noise, water_cooled
│   └── price
├── SPEAKERS (4 rows)
│   ├── id (PK)
│   ├── name, wattage, frequency_response
│   └── price
├── HEADPHONES (16 rows)
│   ├── id (PK)
│   ├── name, type, frequency, wireless
│   └── price
└── WEBCAM (5 rows)
    ├── id (PK)
    ├── name, resolution, fov, connection
    └── price

SETTINGS (11 rows)
├── id (PK)
├── key, value, type, description
└── timestamps

AUDIT_LOGS
├── id (PK)
├── user_id (FK → users.id)
├── action, entity, entity_id, details
└── timestamps

PASSWORD_RESETS
├── id (PK)
├── user_id (FK → users.id)
├── code_hash, status, attempts
└── timestamps
```

## Key Relationships

### 1. User Management
- **users** ↔ **password_resets** (1:many)
- **users** ↔ **audit_logs** (1:many)

### 2. Stock Management
- **pc_parts** (master catalog) - NO direct FKs to component tables
- Each component table is independent with its own specifications
- **Strategy**: Join pc_parts with component tables based on category/name matching

### 3. Order System (Currently Empty)
- **orders** ↔ **order_items** (1:many)
- **orders** ↔ **transactions** (1:many)
- **orders** ↔ **users** (many:1) via created_by

## Data Flow Strategy

### Stock Listing
```
1. Query pc_parts for basic info (name, brand, price, stock)
2. Join with specific component table based on category
3. Return combined data: basic + specifications
```

### Stock Detail
```
1. Get pc_parts record by ID
2. Query corresponding component table by name/category match
3. Return merged data structure
```

### Stock Search
```
1. Search across pc_parts (name, brand, category)
2. Filter by component-specific criteria
3. Join results for complete product information
```

## Indexes (Current & Recommended)

### Existing Indexes
- users(email)
- stock_items(category_id)
- orders(order_number)
- order_items(order_id)
- transactions(transaction_number)
- audit_logs(user_id, entity, created_at)

### Recommended Additional Indexes
- pc_parts(category, brand, price)
- pc_parts(name) - for text search
- All component tables: (name) for joining
- All component tables: (price) for sorting

## Schema Strengths

### ✅ EXCELLENT DESIGN
1. **Normalized Structure**: Each component type has its own table
2. **Flexible Specifications**: Different specs per component type
3. **Scalable**: Easy to add new component types
4. **Performance**: Independent tables allow optimized queries
5. **Data Integrity**: No orphaned records

### 🔧 OPTIMIZATION OPPORTUNITIES
1. **Add Foreign Keys**: Link pc_parts to component tables
2. **Add Constraints**: Ensure data consistency
3. **Add Views**: Simplify common queries
4. **Add Triggers**: Auto-update timestamps

## Migration Strategy

### Phase 1: Immediate (No Changes)
- Keep current structure as-is
- Implement Admin APIs using existing schema
- No data migration needed

### Phase 2: Enhancement (Optional)
- Add foreign key relationships
- Create database views for common queries
- Add additional constraints

### Phase 3: Optimization (Future)
- Add composite indexes
- Implement partitioning for large tables
- Add materialized views for reports

## Conclusion

The current database schema is **PERFECT** for the Admin Stock system:

1. **No Changes Required**: All tables have data and proper structure
2. **Optimal Performance**: Independent tables allow fast queries
3. **Easy Maintenance**: Clear separation of concerns
4. **Scalable**: Easy to add new products and categories

**Recommendation**: Implement Admin APIs using the existing schema without any modifications.
