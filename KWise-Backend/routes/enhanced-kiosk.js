/**
 * Enhanced Kiosk Routes
 * Adds product comparison and AI compatibility endpoints
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { query } = require('../config/db');
const productComparisonService = require('../services/productComparisonService');
const aiCompatibilityService = require('../services/aiCompatibilityService');
const enhancedSessionLockService = require('../services/enhancedSessionLockService');

// POST /api/kiosk/compare - Compare two products with AI analysis
router.post('/compare', async (req, res) => {
    try {
        const { product1Id, product2Id, sessionId } = req.body;

        logger.info(`🔍 Comparison request: Product ${product1Id} vs ${product2Id}`);

        if (!product1Id || !product2Id) {
            return res.status(400).json({
                success: false,
                message: 'Both product1Id and product2Id are required'
            });
        }

        if (product1Id === product2Id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot compare the same product'
            });
        }

        // Perform comparison
        const comparison = await productComparisonService.compareProducts(
            parseInt(product1Id),
            parseInt(product2Id),
            sessionId
        );

        res.json({
            success: true,
            data: comparison
        });

    } catch (error) {
        logger.error('❌ Comparison error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to compare products'
        });
    }
});

// GET /api/kiosk/compare/history - Get comparison history
router.get('/compare/history', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const history = await productComparisonService.getComparisonHistory(
            parseInt(limit)
        );

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        logger.error('❌ Error fetching comparison history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comparison history'
        });
    }
});

// GET /api/kiosk/compatible/:productId - Get compatible components for a product
// ALSO SUPPORT: /api/kiosk/product/:productId/compatible for backward compatibility
router.get('/compatible/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        logger.info(`🔍 Compatibility request for product: ${productId}`);

        // Get the base product with full details including socket, TDP, etc.
        const baseProductQuery = `
            SELECT p.*, 
                   cpu.socket as cpu_socket, cpu.tdp as cpu_tdp,
                   mb.socket as mb_socket, mb.chipset, mb.memory_type as mb_memory_type,
                   ram.memory_type as ram_memory_type,
                   gpu.tdp as gpu_tdp
            FROM pc_parts p
            LEFT JOIN cpu ON p.id = cpu.id AND p.category = 'CPU'
            LEFT JOIN motherboard mb ON p.id = mb.id AND p.category = 'Motherboard'
            LEFT JOIN ram ON p.id = ram.id AND p.category = 'RAM'
            LEFT JOIN gpu ON p.id = gpu.id AND p.category = 'GPU'
            WHERE p.id = $1 AND p.is_active = true
        `;

        const baseProduct = await query(baseProductQuery, [productId]);

        if (baseProduct.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const product = baseProduct.rows[0];

        // Get compatible components based on product category
        let motherboards = [], coolers = [], ram = [], cpus = [], gpus = [], psus = [];

        // 🚀 PERFORMANCE FIX: Execute ALL compatibility queries in PARALLEL
        const startTime = Date.now();

        // For CPU: Get compatible motherboards, coolers, RAM
        if (product.category === 'CPU') {
            const socket = product.cpu_socket;
            const tdp = product.cpu_tdp || 0;

            // 🚀 Execute all queries in parallel using Promise.all
            const [mbResult, coolerResult, ramResult] = await Promise.all([
                // Get compatible motherboards (matching socket)
                query(`
                    SELECT p.*, mb.socket, mb.chipset, mb.memory_type, mb.max_ram,
                           CASE 
                               WHEN mb.socket = $1 THEN 100
                               ELSE 0
                           END as compatibility_score
                    FROM pc_parts p
                    JOIN motherboard mb ON p.id = mb.id
                    WHERE p.category = 'Motherboard' 
                      AND p.is_active = true 
                      AND p.kiosk_visible = true
                      AND mb.socket = $1
                    ORDER BY compatibility_score DESC, p.price ASC
                    LIMIT 50
                `, [socket]),

                // Get compatible coolers (adequate TDP rating)
                query(`
                    SELECT p.*, c.tdp_rating, c.water_cooled, c.height,
                           CASE 
                               WHEN c.tdp_rating >= $1 * 1.2 THEN 100
                               WHEN c.tdp_rating >= $1 THEN 90
                               WHEN c.tdp_rating >= $1 * 0.8 THEN 75
                               ELSE 50
                           END as compatibility_score
                    FROM pc_parts p
                    JOIN cooling c ON p.id = c.id
                    WHERE p.category = 'Cooling' 
                      AND p.is_active = true 
                      AND p.kiosk_visible = true
                    ORDER BY compatibility_score DESC, p.price ASC
                    LIMIT 50
                `, [tdp]),

                // Get compatible RAM (DDR4/DDR5 based on CPU support)
                query(`
                    SELECT p.*, r.memory_type, r.speed, r.cas_latency, r.total_capacity,
                           CASE 
                               WHEN r.memory_type IN ('DDR5', 'DDR4') THEN 100
                               WHEN r.memory_type = 'DDR3' THEN 0
                               ELSE 50
                           END as compatibility_score
                    FROM pc_parts p
                    JOIN ram r ON p.id = r.id
                    WHERE p.category = 'RAM' 
                      AND p.is_active = true 
                      AND p.kiosk_visible = true
                      AND r.memory_type != 'DDR3'
                    ORDER BY compatibility_score DESC, p.price ASC
                    LIMIT 50
                `)
            ]);

            motherboards = mbResult.rows;
            coolers = coolerResult.rows;
            ram = ramResult.rows;

            const queryTime = Date.now() - startTime;
            logger.info(`⚡ Compatibility queries completed in ${queryTime}ms (parallel)`);
        }

        res.json({
            success: true,
            data: {
                motherboards,
                coolers,
                ram,
                cpus,
                gpus,
                psus,
                baseProduct: product
            }
        });

    } catch (error) {
        logger.error('❌ Compatibility check error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check compatibility'
        });
    }
});

// Backward compatibility alias: /api/kiosk/product/:productId/compatible
router.get('/product/:productId/compatible', async (req, res) => {
    try {
        const { productId } = req.params;

        logger.info(`🔍 Compatibility request (backward compat) for product: ${productId}`);

        // Get the base product with full details
        const baseProductQuery = `
            SELECT p.*, 
                   cpu.socket as cpu_socket, cpu.tdp as cpu_tdp,
                   mb.socket as mb_socket, mb.chipset, mb.memory_type as mb_memory_type,
                   ram.memory_type as ram_memory_type,
                   gpu.tdp as gpu_tdp
            FROM pc_parts p
            LEFT JOIN cpu ON p.id = cpu.id AND p.category = 'CPU'
            LEFT JOIN motherboard mb ON p.id = mb.id AND p.category = 'Motherboard'
            LEFT JOIN ram ON p.id = ram.id AND p.category = 'RAM'
            LEFT JOIN gpu ON p.id = gpu.id AND p.category = 'GPU'
            WHERE p.id = $1 AND p.is_active = true
        `;

        const baseProduct = await query(baseProductQuery, [productId]);

        if (baseProduct.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const product = baseProduct.rows[0];

        // Get compatible components based on product category
        let motherboards = [], coolers = [], ram = [], cpus = [], gpus = [], psus = [];

        // 🚀 PERFORMANCE FIX: Execute ALL compatibility queries in PARALLEL
        // This reduces latency from ~500ms (sequential) to ~50-100ms (parallel)
        const startTime = Date.now();

        // For CPU: Get compatible motherboards, coolers, RAM
        if (product.category === 'CPU') {
            const socket = product.cpu_socket;
            const tdp = product.cpu_tdp || 0;

            // 🚀 Execute all queries in parallel using Promise.all
            const [mbResult, coolerResult, ramResult] = await Promise.all([
                // Get compatible motherboards (matching socket, NO AM5 for Intel CPUs)
                query(`
                    SELECT p.*, mb.socket, mb.chipset, mb.memory_type, mb.max_ram,
                           CASE 
                               WHEN mb.socket = $1 THEN 100
                               ELSE 0
                           END as compatibility_score
                    FROM pc_parts p
                    JOIN motherboard mb ON p.id = mb.id
                    WHERE p.category = 'Motherboard' 
                      AND p.is_active = true 
                      AND p.kiosk_visible = true
                      AND mb.socket = $1
                    ORDER BY compatibility_score DESC, p.price ASC
                    LIMIT 50
                `, [socket]),

                // Get compatible coolers (adequate TDP rating)
                query(`
                    SELECT p.*, c.tdp_rating, c.water_cooled, c.height,
                           CASE 
                               WHEN c.tdp_rating >= $1 * 1.2 THEN 100
                               WHEN c.tdp_rating >= $1 THEN 90
                               WHEN c.tdp_rating >= $1 * 0.8 THEN 75
                               ELSE 50
                           END as compatibility_score
                    FROM pc_parts p
                    JOIN cooling c ON p.id = c.id
                    WHERE p.category = 'Cooling' 
                      AND p.is_active = true 
                      AND p.kiosk_visible = true
                    ORDER BY compatibility_score DESC, p.price ASC
                    LIMIT 50
                `, [tdp]),

                // Get compatible RAM (NO DDR3 for modern CPUs!)
                query(`
                    SELECT p.*, r.memory_type, r.speed, r.cas_latency, r.total_capacity,
                           CASE 
                               WHEN r.memory_type IN ('DDR5', 'DDR4') THEN 100
                               ELSE 0
                           END as compatibility_score
                    FROM pc_parts p
                    JOIN ram r ON p.id = r.id
                    WHERE p.category = 'RAM' 
                      AND p.is_active = true 
                      AND p.kiosk_visible = true
                      AND r.memory_type IN ('DDR5', 'DDR4')
                    ORDER BY compatibility_score DESC, p.price ASC
                    LIMIT 50
                `)
            ]);

            motherboards = mbResult.rows;
            coolers = coolerResult.rows;
            ram = ramResult.rows;

            const queryTime = Date.now() - startTime;
            logger.info(`⚡ Compatibility queries completed in ${queryTime}ms (parallel execution)`);
        }

        res.json({
            success: true,
            data: {
                motherboards,
                coolers,
                ram,
                cpus,
                gpus,
                psus,
                baseProduct: product
            }
        });

    } catch (error) {
        logger.error('❌ Compatibility check error (backward compat):', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check compatibility'
        });
    }
});

// POST /api/kiosk/session/init - Initialize kiosk session
router.post('/session/init', async (req, res) => {
    try {
        const { sessionId, tabletId, cart } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const session = await enhancedSessionLockService.initializeSession(sessionId, {
            tablet_id: tabletId,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            cart
        });

        res.json({
            success: true,
            data: session,
            message: 'Session initialized successfully'
        });

    } catch (error) {
        logger.error('❌ Session init error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize session'
        });
    }
});

// POST /api/kiosk/session/heartbeat - Update session activity
router.post('/session/heartbeat', async (req, res) => {
    try {
        const { sessionId, cart } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        await enhancedSessionLockService.updateSessionActivity(sessionId, cart);

        res.json({
            success: true,
            message: 'Session activity updated'
        });

    } catch (error) {
        logger.error('❌ Session heartbeat error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update session'
        });
    }
});

// GET /api/kiosk/session/active - Get active sessions (admin)
router.get('/session/active', async (req, res) => {
    try {
        const sessions = await enhancedSessionLockService.getActiveSessions();

        res.json({
            success: true,
            data: sessions
        });

    } catch (error) {
        logger.error('❌ Error fetching active sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active sessions'
        });
    }
});

// GET /api/kiosk/session/stats - Get session statistics
router.get('/session/stats', async (req, res) => {
    try {
        const stats = await enhancedSessionLockService.getSessionStatistics();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('❌ Error fetching session stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session statistics'
        });
    }
});

module.exports = router;

