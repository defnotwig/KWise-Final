/**
 * Comprehensive System Test for K-Wise Admin Backend
 * Tests auth, dashboard stats, real-time features, and database integrity
 */

const request = require('supertest');
const { query } = require('../config/db');

// Mock app for testing
const app = require('../server');

describe('K-Wise Admin System - Comprehensive Tests', () => {
  let authToken;
  let testUserId;
  
  beforeAll(async () => {
    // Get test auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@kwise.com',
        password: 'admin123'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
      testUserId = loginResponse.body.data.user.id;
    } else {
      console.log('Using fallback test credentials...');
      // Try alternative test user
      const fallbackResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      authToken = fallbackResponse.body.token;
      testUserId = fallbackResponse.body.data.user.id;
    }
  });

  describe('Authentication & Security', () => {
    test('Should protect dashboard stats endpoint', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats');
      
      expect(response.status).toBe(401);
    });

    test('Should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
    });

    test('Should update last_active_at on authenticated requests', async () => {
      const beforeTime = new Date();
      
      await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      const result = await query('SELECT last_active_at FROM users WHERE id = $1', [testUserId]);
      const lastActive = new Date(result.rows[0].last_active_at);
      
      expect(lastActive.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 60000); // Within last minute
    });
  });

  describe('Dashboard Statistics', () => {
    test('Should return correct dashboard stats structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('totalOrders');
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('totalProducts');
      expect(response.body.data).toHaveProperty('lowStockItems');
    });

    test('Should return non-negative values for all stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      const { data } = response.body;
      expect(data.totalUsers).toBeGreaterThanOrEqual(0);
      expect(data.activeUsers).toBeGreaterThanOrEqual(0);
      expect(data.totalOrders).toBeGreaterThanOrEqual(0);
      expect(data.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(data.totalProducts).toBeGreaterThanOrEqual(0);
      expect(data.lowStockItems).toBeGreaterThanOrEqual(0);
    });

    test('Should have activeUsers <= totalUsers', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      const { data } = response.body;
      expect(data.activeUsers).toBeLessThanOrEqual(data.totalUsers);
    });
  });

  describe('Real-time Messaging', () => {
    test('Should get user conversations', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should handle typing indicators', async () => {
      const response = await request(app)
        .post('/api/messages/typing')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId: 1,
          isTyping: true
        });
      
      expect([200, 404]).toContain(response.status); // 404 if no conversation exists
    });
  });

  describe('Database Integrity', () => {
    test('Should have required database columns', async () => {
      const userColumns = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
      `);
      
      const columnNames = userColumns.rows.map(row => row.column_name);
      expect(columnNames).toContain('last_active_at');
    });

    test('Should have pc_parts image_path column', async () => {
      const pcPartsColumns = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pc_parts' AND table_schema = 'public'
      `);
      
      const columnNames = pcPartsColumns.rows.map(row => row.column_name);
      expect(columnNames).toContain('image_path');
    });

    test('Should have performance indexes', async () => {
      const indexes = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('users', 'pc_parts', 'orders')
      `);
      
      const indexNames = indexes.rows.map(row => row.indexname);
      expect(indexNames.some(name => name.includes('last_active'))).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('Should allow dashboard requests within rate limit', async () => {
      const promises = Array(5).fill().map(() => 
        request(app)
          .get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid endpoints gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    test('Should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/messages/typing')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidField: 'invalid'
        });
      
      expect([400, 422]).toContain(response.status);
    });
  });
});
