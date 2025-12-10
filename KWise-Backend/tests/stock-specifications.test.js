const request = require('supertest');
const app = require('../server');
const { query } = require('../config/db');

describe('Stock Specifications API', () => {
    let authToken;
    let testItemId;

    beforeAll(async () => {
        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'ludwig@kwise.com',
                password: 'ludwig123'
            });
        
        authToken = loginResponse.body.token;
    });

    afterAll(async () => {
        // Clean up test item
        if (testItemId) {
            await query('DELETE FROM pc_parts WHERE id = $1', [testItemId]);
        }
    });

    test('GET /api/stock/meta/:category returns specification fields with types', async () => {
        const response = await request(app)
            .get('/api/stock/meta/CPU')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);

        // Check that fields have proper structure
        const field = response.body.data[0];
        expect(field).toHaveProperty('name');
        expect(field).toHaveProperty('type');
        expect(field).toHaveProperty('required');
    });

    test('POST /api/stock creates item with boolean specifications', async () => {
        const formData = new FormData();
        formData.append('name', 'Test CPU with Integrated Graphics');
        formData.append('category', 'CPU');
        formData.append('brand', 'Test Brand');
        formData.append('price', '299.99');
        formData.append('stock', '10');
        formData.append('specifications', JSON.stringify({
            socket: 'AM4',
            cores: 6,
            threads: 12,
            integrated_gpu: true,
            base_clock: '3.6 GHz'
        }));

        const response = await request(app)
            .post('/api/stock')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Test CPU with Integrated Graphics',
                category: 'CPU',
                brand: 'Test Brand',
                price: '299.99',
                stock: '10',
                specifications: {
                    socket: 'AM4',
                    cores: 6,
                    threads: 12,
                    integrated_gpu: true,
                    base_clock: '3.6 GHz'
                }
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        testItemId = response.body.data.id;

        // Verify boolean field is stored correctly
        const dbResult = await query('SELECT specifications FROM pc_parts WHERE id = $1', [testItemId]);
        const specs = dbResult.rows[0].specifications;
        expect(specs.integrated_gpu).toBe(true);
        expect(typeof specs.integrated_gpu).toBe('boolean');
        expect(specs.cores).toBe(6);
        expect(typeof specs.cores).toBe('number');
    });

    test('PUT /api/stock/:id updates specifications with type conversion', async () => {
        const response = await request(app)
            .patch(`/api/stock/${testItemId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                specifications: {
                    integrated_gpu: false,
                    threads: 24,
                    tdp: 65
                }
            })
            .expect(200);

        expect(response.body.success).toBe(true);

        // Verify updated specifications
        const dbResult = await query('SELECT specifications FROM pc_parts WHERE id = $1', [testItemId]);
        const specs = dbResult.rows[0].specifications;
        expect(specs.integrated_gpu).toBe(false);
        expect(specs.threads).toBe(24);
        expect(specs.tdp).toBe(65);
        // Original socket should be preserved
        expect(specs.socket).toBe('AM4');
    });

    test('GET /api/stock/:id returns item with image_path and specifications', async () => {
        const response = await request(app)
            .get(`/api/stock/${testItemId}`)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('specifications');
        expect(response.body.data).toHaveProperty('image_url');
        expect(typeof response.body.data.specifications).toBe('object');
    });
});