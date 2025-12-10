# K-Wise Database Setup Guide

## 🚀 Overview

This guide will help you set up the comprehensive PC parts database for your K-Wise system. The new database structure includes detailed specifications for all PC components with proper relationships and data integrity.

## 📋 What's New

### Database Structure
- **Main Table**: `pc_parts` - Overview of all components
- **Specialized Tables**: Detailed specifications for each component type
- **Relationships**: Proper foreign key relationships between tables
- **Images**: Support for component images (webp format recommended)

### Component Categories
1. **CPU** - Processors with detailed specs (cores, threads, benchmarks)
2. **GPU** - Graphics cards with performance metrics
3. **Motherboard** - Motherboards with socket and chipset info
4. **RAM** - Memory modules with speed and configuration
5. **Storage** - SSDs and HDDs with interface details
6. **PSU** - Power supplies with efficiency ratings
7. **Case** - PC cases with form factors
8. **Cooling** - Fans and coolers with performance specs
9. **Monitor** - Displays with resolution and refresh rates
10. **Keyboard** - Input devices with switch types
11. **Mouse** - Pointing devices with DPI and tracking
12. **Headphones** - Audio devices with frequency response
13. **Speakers** - Audio output with wattage specs
14. **Webcam** - Video input devices with resolution

## 🛠️ Setup Instructions

### Prerequisites
- PostgreSQL database running (KWiseDB)
- Node.js environment
- Access to the backend directory

### Step 1: Database Schema Creation

1. **Navigate to the backend directory:**
   ```bash
   cd KWise-Backend
   ```

2. **Create the database schema:**
   ```bash
   node setup-database.js
   ```

   This script will:
   - Create all necessary tables
   - Set up proper indexes for performance
   - Populate with sample data
   - Establish relationships between tables

### Step 2: Verify Database Setup

1. **Check if tables were created:**
   ```sql
   \dt
   ```

2. **Verify data population:**
   ```sql
   SELECT COUNT(*) FROM pc_parts;
   SELECT category, COUNT(*) FROM pc_parts GROUP BY category;
   ```

### Step 3: Start the Enhanced Backend

1. **Use the enhanced stock controller:**
   - The system now uses `stockControllerEnhanced.js`
   - Provides detailed component specifications
   - Supports CRUD operations on all components

2. **Start the backend server:**
   ```bash
   node working-server.js
   ```

## 🔧 API Endpoints

### Stock Management
- `GET /api/stock/categories` - Get all categories with counts
- `GET /api/stock/category/:category` - Get items by category with specs
- `GET /api/stock/:id` - Get item by ID with full details
- `POST /api/stock/add` - Add new item
- `PUT /api/stock/update/:id` - Update existing item
- `DELETE /api/stock/delete/:id` - Delete item

### Advanced Features
- `GET /api/stock/search` - Search across all components
- `GET /api/stock/low-stock` - Get low stock alerts
- `GET /api/stock/statistics` - Get inventory statistics

## 📊 Data Structure

### Example Component Data
```json
{
  "id": 11,
  "name": "AMD RYZEN 5 8400F",
  "category": "CPU",
  "brand": "AMD",
  "price": 8495.00,
  "stock": 100,
  "image_url": null,
  "specifications": {
    "socket": "AM5",
    "series": "Ryzen 5",
    "cores": 6,
    "threads": 12,
    "base_clock": 3.7,
    "turbo_clock": 4.8,
    "overall_score": 115.2,
    "benchmark_score": 11800
  }
}
```

## 🖼️ Image Support

### Adding Component Images
1. **Convert images to WebP format** (recommended for performance)
2. **Upload to your image hosting service**
3. **Update the `image_url` field** in the database
4. **Images will display in the admin interface**

### Image Requirements
- **Format**: WebP (recommended), PNG, JPG
- **Size**: Optimize for web (max 500KB per image)
- **Dimensions**: Consistent aspect ratios (e.g., 16:9)

## 🔍 Testing the System

### Frontend Testing
1. **Navigate to Admin → Stock**
2. **Click on any category** (CPU, GPU, etc.)
3. **View detailed specifications** for each component
4. **Test CRUD operations** (add, edit, delete)

### Backend Testing
1. **Test API endpoints** using Postman or similar
2. **Verify data relationships** between tables
3. **Check performance** with large datasets

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check connection credentials in `config/db.js`
   - Ensure KWiseDB database exists

2. **Table Creation Failures**
   - Check PostgreSQL permissions
   - Verify no conflicting table names
   - Review error logs for specific issues

3. **Data Population Issues**
   - Check for duplicate ID conflicts
   - Verify SQL syntax in setup script
   - Ensure all required fields are provided

### Debug Commands

```bash
# Check database connection
node -e "require('./config/db').testConnection()"

# Verify table structure
psql -d KWiseDB -c "\d pc_parts"

# Check data counts
psql -d KWiseDB -c "SELECT category, COUNT(*) FROM pc_parts GROUP BY category;"
```

## 📈 Performance Optimization

### Database Indexes
- Primary keys are automatically indexed
- Category and brand indexes for faster queries
- Price indexes for sorting and filtering

### Query Optimization
- Use prepared statements for repeated queries
- Implement pagination for large result sets
- Cache frequently accessed data

## 🔄 Maintenance

### Regular Tasks
1. **Backup database** weekly
2. **Update component prices** as needed
3. **Add new components** to appropriate tables
4. **Monitor stock levels** and set alerts

### Data Updates
1. **Price changes** - Update both component and pc_parts tables
2. **Stock adjustments** - Update pc_parts table
3. **New components** - Add to both specialized and main tables

## 🎯 Next Steps

### Future Enhancements
1. **Bulk import/export** functionality
2. **Advanced search filters** (price range, specifications)
3. **Component compatibility** checking
4. **Inventory forecasting** and analytics
5. **Integration with supplier APIs**

### Customization
1. **Add new component types** by creating new tables
2. **Extend specifications** for existing components
3. **Customize admin interface** for specific needs
4. **Implement business logic** for your use case

## 📞 Support

If you encounter any issues during setup:
1. **Check the error logs** in the console
2. **Verify database connectivity**
3. **Review the setup script** for syntax errors
4. **Ensure all dependencies** are installed

---

**🎉 Congratulations!** Your K-Wise system now has a comprehensive, professional-grade PC parts database that will scale with your business needs.
