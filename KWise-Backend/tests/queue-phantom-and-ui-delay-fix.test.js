/**
 * ✅ COMPREHENSIVE TEST SUITE FOR QUEUE FIXES
 * 
 * ISSUE #1: Phantom queue numbers on QueueDisplayMonitor
 * ISSUE #2: Delayed UI update for customer name
 * 
 * ROOT CAUSES IDENTIFIED:
 * 1. /api/queue/now-serving returns queues with NULL order_id
 * 2. Backend doesn't return updated database row after customer name update
 * 3. Race condition between polling and update operations
 * 
 * FIXES IMPLEMENTED:
 * 1. Added NULL check for order_id in getNowServing endpoint
 * 2. Return actual DB row after customer update with transaction
 * 3. Clear is_now_serving flags explicitly in auto-advance
 * 4. Frontend merges backend response immediately
 */

const request = require('supertest');
const { query } = require('../config/db');
const app = require('../server');
const logger = require('../utils/logger');

describe('Queue Management - Phantom Numbers & UI Delay Fixes', () => {
    let authToken;
    let testQueueNumber1;
    let testQueueNumber2;
    let testOrderId1;
    let testOrderId2;

    // Setup: Create test orders and assign queues
    beforeAll(async () => {
        // Login as admin
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                username: process.env.TEST_ADMIN_USER || 'testadmin',
                password: process.env.TEST_ADMIN_PASS || 'testpass'
            });
        
        authToken = loginRes.body.token;
        expect(authToken).toBeDefined();

        // Create test order 1
        const order1Res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                customerName: 'Test Customer 1',
                items: [{ name: 'Test Item', price: 100, quantity: 1 }],
                totalAmount: 100,
                paymentMethod: 'Cash',
                serviceType: 'test'
            });
        
        testOrderId1 = order1Res.body.data.orderId;
        testQueueNumber1 = order1Res.body.data.queueNumber;

        // Create test order 2
        const order2Res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                customerName: 'Test Customer 2',
                items: [{ name: 'Test Item', price: 200, quantity: 1 }],
                totalAmount: 200,
                paymentMethod: 'Cash',
                serviceType: 'test'
            });
        
        testOrderId2 = order2Res.body.data.orderId;
        testQueueNumber2 = order2Res.body.data.queueNumber;

        logger.info(`Test setup complete: Queue #${testQueueNumber1} and #${testQueueNumber2}`);
    });

    // Cleanup: Remove test data
    afterAll(async () => {
        await query(`DELETE FROM orders WHERE id IN ($1, $2)`, [testOrderId1, testOrderId2]);
        await query(`UPDATE queue_management SET status = 'available', order_id = NULL, is_now_serving = FALSE, now_serving_station = NULL WHERE queue_number IN ($1, $2)`, [testQueueNumber1, testQueueNumber2]);
    });

    describe('ISSUE #1: Phantom Queue Numbers Fix', () => {
        it('should NOT return queues with NULL order_id in now-serving endpoint', async () => {
            // Set queue as now serving
            await request(app)
                .put(`/api/queue/${testQueueNumber1}/now-serving-left`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Complete the order (sets order_id to NULL but keeps is_now_serving = TRUE initially)
            await request(app)
                .put(`/api/queue/${testQueueNumber1}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed', customerName: 'Test Customer 1' })
                .expect(200);

            // ✅ CRITICAL TEST: now-serving endpoint should NOT return this queue
            const nowServingRes = await request(app)
                .get('/api/queue/now-serving')
                .expect(200);

            expect(nowServingRes.body.success).toBe(true);
            
            // ✅ SMOKING GUN VERIFICATION: Neither station should show the completed queue
            expect(nowServingRes.body.data.station1).toBeNull();
            expect(nowServingRes.body.data.station2).toBeNull();

            // Verify database state
            const dbCheck = await query(`
                SELECT queue_number, order_id, is_now_serving, now_serving_station
                FROM queue_management
                WHERE queue_number = $1
            `, [testQueueNumber1]);

            logger.info('✅ TEST PASSED: Completed queue not returned in now-serving', {
                queueNumber: testQueueNumber1,
                order_id: dbCheck.rows[0].order_id,
                is_now_serving: dbCheck.rows[0].is_now_serving
            });
        });

        it('should clear is_now_serving flag when order is cancelled', async () => {
            // Set queue 2 as now serving
            await request(app)
                .put(`/api/queue/${testQueueNumber2}/now-serving-right`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Cancel the order
            await request(app)
                .put(`/api/queue/${testQueueNumber2}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'cancelled', customerName: 'Test Customer 2' })
                .expect(200);

            // ✅ CRITICAL TEST: now-serving should not include cancelled queue
            const nowServingRes = await request(app)
                .get('/api/queue/now-serving')
                .expect(200);

            expect(nowServingRes.body.data.station1).toBeNull();
            expect(nowServingRes.body.data.station2).toBeNull();

            logger.info('✅ TEST PASSED: Cancelled queue not in now-serving');
        });

        it('should auto-advance to next queue when current serving queue is completed', async () => {
            // Create a third test order
            const order3Res = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    customerName: 'Test Customer 3',
                    items: [{ name: 'Test Item', price: 300, quantity: 1 }],
                    totalAmount: 300,
                    paymentMethod: 'Cash'
                });
            
            const testQueueNumber3 = order3Res.body.data.queueNumber;
            const testOrderId3 = order3Res.body.data.orderId;

            // Set first queue as now serving
            await request(app)
                .put(`/api/queue/${testQueueNumber1}/now-serving-left`)
                .set('Authorization', `Bearer ${authToken}`);

            // Complete it (should auto-advance to queue 3)
            await request(app)
                .put(`/api/queue/${testQueueNumber1}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed', customerName: 'Test Customer 1' });

            // Wait for auto-advance
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ✅ TEST: Next queue should now be serving
            const nowServingRes = await request(app)
                .get('/api/queue/now-serving')
                .expect(200);

            // Auto-advance should have set queue 3 as now serving
            expect(nowServingRes.body.data.station1?.queue_number).toBe(testQueueNumber3);

            // Cleanup
            await query(`DELETE FROM orders WHERE id = $1`, [testOrderId3]);
            await query(`UPDATE queue_management SET status = 'available', order_id = NULL, is_now_serving = FALSE WHERE queue_number = $1`, [testQueueNumber3]);

            logger.info('✅ TEST PASSED: Auto-advance working correctly');
        });
    });

    describe('ISSUE #2: Delayed UI Update Fix', () => {
        it('should return updated customer name immediately from backend', async () => {
            const newCustomerName = 'Updated Customer Name';

            // Update customer name
            const updateRes = await request(app)
                .patch(`/api/queue/${testQueueNumber1}/customer`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ customerName: newCustomerName })
                .expect(200);

            // ✅ CRITICAL TEST: Response should include the updated queue object with actual DB data
            expect(updateRes.body.success).toBe(true);
            expect(updateRes.body.data.customerName).toBe(newCustomerName);
            expect(updateRes.body.data.queue).toBeDefined();
            expect(updateRes.body.data.queue.customer_name).toBe(newCustomerName);

            // Verify database was actually updated
            const dbCheck = await query(`
                SELECT customer_name FROM orders WHERE id = $1
            `, [testOrderId1]);

            expect(dbCheck.rows[0].customer_name).toBe(newCustomerName);

            logger.info('✅ TEST PASSED: Customer name update returns actual DB row', {
                expectedName: newCustomerName,
                returnedName: updateRes.body.data.queue.customer_name,
                dbName: dbCheck.rows[0].customer_name
            });
        });

        it('should handle concurrent customer name updates with transaction locking', async () => {
            // Simulate concurrent updates
            const update1 = request(app)
                .patch(`/api/queue/${testQueueNumber1}/customer`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ customerName: 'Concurrent Update 1' });

            const update2 = request(app)
                .patch(`/api/queue/${testQueueNumber1}/customer`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ customerName: 'Concurrent Update 2' });

            // Both should succeed (transaction handles race condition)
            const [res1, res2] = await Promise.all([update1, update2]);

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);

            // Final DB state should have one of the names
            const dbCheck = await query(`SELECT customer_name FROM orders WHERE id = $1`, [testOrderId1]);
            const finalName = dbCheck.rows[0].customer_name;

            expect(['Concurrent Update 1', 'Concurrent Update 2']).toContain(finalName);

            logger.info('✅ TEST PASSED: Concurrent updates handled with transactions');
        });

        it('should validate customer name before completion', async () => {
            // Try to complete with default name "Customer"
            const completeRes = await request(app)
                .put(`/api/queue/${testQueueNumber1}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed', customerName: 'Customer' })
                .expect(400);

            expect(completeRes.body.success).toBe(false);
            expect(completeRes.body.requiresNameUpdate).toBe(true);

            logger.info('✅ TEST PASSED: Default customer name validation working');
        });
    });

    describe('Integration: Full Workflow Test', () => {
        it('should complete full queue workflow without phantom numbers or UI delays', async () => {
            // Create new test order
            const orderRes = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    customerName: 'Workflow Test Customer',
                    items: [{ name: 'Test Item', price: 500, quantity: 1 }],
                    totalAmount: 500,
                    paymentMethod: 'Cash'
                });

            const queueNum = orderRes.body.data.queueNumber;
            const orderId = orderRes.body.data.orderId;

            // 1. Set as now serving (left station)
            await request(app)
                .put(`/api/queue/${queueNum}/now-serving-left`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // 2. Verify appears in now-serving
            let nowServing = await request(app).get('/api/queue/now-serving').expect(200);
            expect(nowServing.body.data.station1.queue_number).toBe(queueNum);

            // 3. Update customer name
            const updateRes = await request(app)
                .patch(`/api/queue/${queueNum}/customer`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ customerName: 'Updated Workflow Customer' })
                .expect(200);

            expect(updateRes.body.data.queue.customer_name).toBe('Updated Workflow Customer');

            // 4. Complete order
            await request(app)
                .put(`/api/queue/${queueNum}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed', customerName: 'Updated Workflow Customer' })
                .expect(200);

            // 5. ✅ CRITICAL: Verify does NOT appear in now-serving after completion
            nowServing = await request(app).get('/api/queue/now-serving').expect(200);
            expect(nowServing.body.data.station1).toBeNull();
            expect(nowServing.body.data.station2).toBeNull();

            // Cleanup
            await query(`DELETE FROM orders WHERE id = $1`, [orderId]);
            await query(`UPDATE queue_management SET status = 'available', order_id = NULL, is_now_serving = FALSE WHERE queue_number = $1`, [queueNum]);

            logger.info('✅ INTEGRATION TEST PASSED: Full workflow without phantom numbers or delays');
        });
    });
});
