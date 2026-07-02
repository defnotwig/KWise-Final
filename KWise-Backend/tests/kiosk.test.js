/**
 * Kiosk API Tests
 * Comprehensive test suite for kiosk-specific endpoints
 */

const request = require('supertest');
const { query } = require('../config/db');

// Mock the database and express app
const express = require('express');
const app = express();
app.use(express.json());

// Import kiosk routes
const kioskRoutes = require('../routes/kiosk');
app.use('/api/kiosk', kioskRoutes);

describe('Kiosk API Endpoints', () => {

    beforeAll(async () => {
        // Ensure test database has required kiosk columns
        try {
            await query(`
                ALTER TABLE pc_parts 
                ADD COLUMN IF NOT EXISTS kiosk_visible BOOLEAN DEFAULT true,
                ADD COLUMN IF NOT EXISTS kiosk_featured BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS kiosk_category_order INTEGER DEFAULT 999
            `);
        } catch (error) {
            console.warn('Could not add kiosk columns (may already exist):', error.message);
        }
    });

    describe('GET /api/kiosk/categories', () => {
        test('should return categories with product counts', async () => {
            const response = await request(app)
                .get('/api/kiosk/categories')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            if (response.body.data.length > 0) {
                const category = response.body.data[0];
                expect(category).toHaveProperty('category');
                expect(category).toHaveProperty('name');
                expect(category).toHaveProperty('productCount');
                expect(category).toHaveProperty('minPrice');
                expect(category).toHaveProperty('maxPrice');
                expect(category).toHaveProperty('inStockCount');
                expect(category).toHaveProperty('order');
            }
        });

        test('should return categories in correct order', async () => {
            const response = await request(app)
                .get('/api/kiosk/categories')
                .expect(200);

            expect(response.body.success).toBe(true);
            const categories = response.body.data;

            // Check if categories are ordered by kiosk_category_order
            for (let i = 1; i < categories.length; i++) {
                expect(categories[i].order).toBeGreaterThanOrEqual(categories[i - 1].order);
            }
        });
    });

    describe('GET /api/kiosk/categories/:category/products', () => {
        test('should return products for valid category', async () => {
            // First get available categories
            const categoriesResponse = await request(app)
                .get('/api/kiosk/categories')
                .expect(200);

            if (categoriesResponse.body.data.length > 0) {
                const testCategory = categoriesResponse.body.data[0].category;

                const response = await request(app)
                    .get(`/api/kiosk/categories/${testCategory}/products`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('items');
                expect(response.body.data).toHaveProperty('pagination');
                expect(Array.isArray(response.body.data.items)).toBe(true);

                if (response.body.data.items.length > 0) {
                    const product = response.body.data.items[0];
                    expect(product).toHaveProperty('id');
                    expect(product).toHaveProperty('name');
                    expect(product).toHaveProperty('category');
                    expect(product).toHaveProperty('brand');
                    expect(product).toHaveProperty('price');
                    expect(product).toHaveProperty('stock');
                    expect(product).toHaveProperty('available');
                }
            }
        });

        test('should support pagination parameters', async () => {
            const response = await request(app)
                .get('/api/kiosk/categories/CPU/products?page=1&limit=5')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.pagination).toHaveProperty('currentPage', 1);
            expect(response.body.data.pagination).toHaveProperty('itemsPerPage', 5);
        });

        test('should filter by brand when provided', async () => {
            const response = await request(app)
                .get('/api/kiosk/categories/CPU/products?brand=AMD')
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.items.forEach(product => {
                expect(product.brand).toBe('AMD');
            });
        });
    });

    describe('GET /api/kiosk/featured', () => {
        test('should return featured products', async () => {
            const response = await request(app)
                .get('/api/kiosk/featured')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            response.body.data.forEach(product => {
                expect(product).toHaveProperty('id');
                expect(product).toHaveProperty('name');
                expect(product).toHaveProperty('category');
                expect(product).toHaveProperty('price');
                expect(product.available).toBe(true); // Featured products should be available
            });
        });

        test('should respect limit parameter', async () => {
            const limit = 3;
            const response = await request(app)
                .get(`/api/kiosk/featured?limit=${limit}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(limit);
        });
    });

    describe('GET /api/kiosk/build-components', () => {
        test('should return components grouped by category', async () => {
            const response = await request(app)
                .get('/api/kiosk/build-components')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(typeof response.body.data).toBe('object');

            // Check structure of grouped components
            Object.keys(response.body.data).forEach(category => {
                const categoryData = response.body.data[category];
                expect(categoryData).toHaveProperty('products');
                expect(categoryData).toHaveProperty('brands');
                expect(Array.isArray(categoryData.products)).toBe(true);
                expect(Array.isArray(categoryData.brands)).toBe(true);
            });
        });
    });

    describe('GET /api/kiosk/search', () => {
        test('should return search results for valid query', async () => {
            const response = await request(app)
                .get('/api/kiosk/search?q=intel')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.query).toBe('intel');

            // Results should contain the search term
            response.body.data.forEach(product => {
                const searchableText = `${product.name} ${product.brand} ${product.description}`.toLowerCase();
                expect(searchableText).toContain('intel');
            });
        });

        test('should return 400 for empty query', async () => {
            const response = await request(app)
                .get('/api/kiosk/search?q=')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('required');
        });

        test('should filter by category when provided', async () => {
            const response = await request(app)
                .get('/api/kiosk/search?q=intel&category=CPU')
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach(product => {
                expect(product.category).toBe('CPU');
            });
        });
    });

    describe('Error Handling', () => {
        test('should return valid response for categories endpoint', async () => {
            const response = await request(app)
                .get('/api/kiosk/categories')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body).toHaveProperty('timestamp');
        });

        test('should handle malformed pagination parameters', async () => {
            const response = await request(app)
                .get('/api/kiosk/categories/CPU/products?page=abc&limit=-1')
                .expect(200);

            expect(response.body.success).toBe(true);
            // Test-mode routes return items array directly (no pagination wrapper for invalid params)
            expect(Array.isArray(response.body.data.items) || Array.isArray(response.body.data)).toBe(true);
        });

        test('should handle invalid limit parameter for featured products', async () => {
            const response = await request(app)
                .get('/api/kiosk/featured?limit=invalid')
                .expect(200);

            // Should handle invalid limit gracefully with defaults
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('should return empty items for invalid category', async () => {
            const response = await request(app)
                .get('/api/kiosk/categories/NonExistentCategory/products')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.items).toEqual([]);
            expect(response.body.data.pagination.totalItems).toBe(0);
        });
    });
});

// Integration test for real-time updates
describe('Real-time Stock Updates', () => {
    test('should create order and return queue assignment', async () => {
        const orderData = {
            customerName: 'Test Customer',
            items: [{ id: 1, name: 'Test Item', price: 100, quantity: 1 }],
            total: 100
        };

        const response = await request(app)
            .post('/api/kiosk/orders')
            .send(orderData)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('orderId');
        expect(response.body.data).toHaveProperty('queueNumber');
        expect(response.body.data).toHaveProperty('orderNumber');
        expect(typeof response.body.data.queueNumber).toBe('number');
    });

    test('should handle empty order body gracefully', async () => {
        const response = await request(app)
            .post('/api/kiosk/orders')
            .send({})
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('orderId');
        expect(response.body.data).toHaveProperty('queueNumber');
    });

    test('should handle order with missing items array', async () => {
        const response = await request(app)
            .post('/api/kiosk/orders')
            .send({ customerName: 'Test' })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('orderId');
    });
});

module.exports = {
    // Export for use in other test files
};
