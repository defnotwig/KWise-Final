/**
 * Enhanced WebSocket Service for Real-Time Features
 * Week 2 Implementation - Phase 3.2
 * 
 * Features:
 * - Real-time stock updates (<500ms latency)
 * - Real-time price changes (<500ms latency)
 * - Product availability notifications
 * - Order status updates
 * - Admin dashboard real-time metrics
 * - AI analysis progress tracking
 * 
 * Target: <500ms latency for all broadcasts
 * Deployment: Hyper-V with RTX 5060 + ZeroTier network
 */

const logger = require('../utils/logger');

class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedClients = new Map(); // Track all connected clients
        this.subscriptions = new Map(); // Track product subscriptions
        this.performanceMetrics = {
            totalBroadcasts: 0,
            averageLatency: 0,
            latencies: []
        };
    }

    /**
     * Initialize WebSocket service with Socket.io instance
     */
    initialize(io) {
        this.io = io;
        logger.info('🔌 Enhanced WebSocket Service initialized');
        
        // Setup connection handlers
        this.setupConnectionHandlers();
        
        // Start metrics collection
        this.startMetricsCollection();
    }

    /**
     * Setup WebSocket connection handlers
     */
    setupConnectionHandlers() {
        if (!this.io) {
            logger.error('❌ Socket.io not initialized');
            return;
        }

        this.io.on('connection', (socket) => {
            const userId = socket.userId;
            const userName = socket.userName;
            
            logger.info(`🔌 WebSocket connected: ${userName} (${userId}) - Socket: ${socket.id}`);
            
            // Store client connection
            this.connectedClients.set(socket.id, {
                userId,
                userName,
                connectedAt: new Date(),
                subscriptions: new Set()
            });

            // Handle product subscription
            socket.on('subscribe_products', (productIds) => {
                this.subscribeToProducts(socket, productIds);
            });

            // Handle product unsubscription
            socket.on('unsubscribe_products', (productIds) => {
                this.unsubscribeFromProducts(socket, productIds);
            });

            // Handle category subscription
            socket.on('subscribe_category', (category) => {
                this.subscribeToCategory(socket, category);
            });

            // Handle price alert subscription
            socket.on('subscribe_price_alerts', () => {
                socket.join(`price_alerts_${userId}`);
                logger.info(`📊 User ${userName} subscribed to price alerts`);
            });

            // Handle admin metrics subscription
            if (socket.userRole === 'admin' || socket.userRole === 'superadmin') {
                socket.on('subscribe_admin_metrics', () => {
                    socket.join('admin_metrics');
                    logger.info(`📊 Admin ${userName} subscribed to real-time metrics`);
                    
                    // Send initial metrics
                    this.broadcastAdminMetrics(socket);
                });
            }

            // Handle AI analysis subscription
            socket.on('subscribe_ai_analysis', (sessionId) => {
                socket.join(`ai_analysis_${sessionId}`);
                logger.info(`🤖 User ${userName} subscribed to AI analysis progress: ${sessionId}`);
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            // Send welcome message
            socket.emit('connection_established', {
                message: 'Real-time connection established',
                features: ['stock_updates', 'price_changes', 'order_updates', 'notifications'],
                latencyTarget: '<500ms',
                timestamp: new Date()
            });
        });
    }

    /**
     * Subscribe socket to product updates
     */
    subscribeToProducts(socket, productIds) {
        if (!Array.isArray(productIds)) {
            productIds = [productIds];
        }

        const client = this.connectedClients.get(socket.id);
        if (!client) return;

        productIds.forEach(productId => {
            const room = `product_${productId}`;
            socket.join(room);
            client.subscriptions.add(room);
            
            // Track subscription
            if (!this.subscriptions.has(productId)) {
                this.subscriptions.set(productId, new Set());
            }
            this.subscriptions.get(productId).add(socket.id);
        });

        logger.info(`📦 User ${client.userName} subscribed to ${productIds.length} products`);
        
        socket.emit('subscription_confirmed', {
            productIds,
            subscribedAt: new Date()
        });
    }

    /**
     * Unsubscribe socket from product updates
     */
    unsubscribeFromProducts(socket, productIds) {
        if (!Array.isArray(productIds)) {
            productIds = [productIds];
        }

        const client = this.connectedClients.get(socket.id);
        if (!client) return;

        productIds.forEach(productId => {
            const room = `product_${productId}`;
            socket.leave(room);
            client.subscriptions.delete(room);
            
            // Remove from subscriptions tracker
            if (this.subscriptions.has(productId)) {
                this.subscriptions.get(productId).delete(socket.id);
                if (this.subscriptions.get(productId).size === 0) {
                    this.subscriptions.delete(productId);
                }
            }
        });

        logger.info(`📦 User ${client.userName} unsubscribed from ${productIds.length} products`);
    }

    /**
     * Subscribe to category updates
     */
    subscribeToCategory(socket, category) {
        const room = `category_${category}`;
        socket.join(room);
        
        const client = this.connectedClients.get(socket.id);
        if (client) {
            client.subscriptions.add(room);
            logger.info(`📂 User ${client.userName} subscribed to category: ${category}`);
        }
        
        socket.emit('category_subscription_confirmed', {
            category,
            subscribedAt: new Date()
        });
    }

    /**
     * Broadcast stock update to subscribed clients
     * Target: <500ms latency
     */
    async broadcastStockUpdate(productId, newStock, oldStock = null) {
        const startTime = Date.now();
        
        try {
            const room = `product_${productId}`;
            const payload = {
                productId,
                stock: newStock,
                previousStock: oldStock,
                timestamp: new Date(),
                changeType: this.getStockChangeType(newStock, oldStock)
            };

            // Broadcast to subscribed clients
            this.io.to(room).emit('stock_update', payload);
            
            // Broadcast to admins
            this.io.to('admin_room').emit('admin_stock_update', payload);

            const latency = Date.now() - startTime;
            this.recordLatency(latency);
            
            logger.info(`📦 Stock update broadcast for product ${productId}: ${newStock} (${latency}ms)`);
            
            // Alert if latency exceeds target
            if (latency > 500) {
                logger.warn(`⚠️ Stock update latency exceeded target: ${latency}ms > 500ms`);
            }

            return { success: true, latency };
        } catch (error) {
            logger.error(`❌ Failed to broadcast stock update for product ${productId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Broadcast price change to subscribed clients
     * Target: <500ms latency
     */
    async broadcastPriceChange(productId, newPrice, oldPrice, changePercentage) {
        const startTime = Date.now();
        
        try {
            const room = `product_${productId}`;
            const payload = {
                productId,
                price: newPrice,
                previousPrice: oldPrice,
                changePercentage: changePercentage || this.calculateChangePercentage(newPrice, oldPrice),
                timestamp: new Date(),
                changeType: newPrice > oldPrice ? 'increase' : 'decrease'
            };

            // Broadcast to subscribed clients
            this.io.to(room).emit('price_update', payload);
            
            // Broadcast to admins
            this.io.to('admin_room').emit('admin_price_update', payload);
            
            // Check if any users have price alerts for this product
            await this.checkPriceAlerts(productId, newPrice, oldPrice);

            const latency = Date.now() - startTime;
            this.recordLatency(latency);
            
            logger.info(`💰 Price update broadcast for product ${productId}: ₱${newPrice} (${latency}ms)`);
            
            if (latency > 500) {
                logger.warn(`⚠️ Price update latency exceeded target: ${latency}ms > 500ms`);
            }

            return { success: true, latency };
        } catch (error) {
            logger.error(`❌ Failed to broadcast price change for product ${productId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Broadcast category-wide updates (e.g., flash sale, new arrivals)
     */
    async broadcastCategoryUpdate(category, updateType, data) {
        const startTime = Date.now();
        
        try {
            const room = `category_${category}`;
            const payload = {
                category,
                updateType,
                data,
                timestamp: new Date()
            };

            this.io.to(room).emit('category_update', payload);
            
            const latency = Date.now() - startTime;
            this.recordLatency(latency);
            
            logger.info(`📂 Category update broadcast for ${category}: ${updateType} (${latency}ms)`);
            
            return { success: true, latency };
        } catch (error) {
            logger.error(`❌ Failed to broadcast category update:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Broadcast order status update to user
     */
    async broadcastOrderUpdate(userId, orderId, status, additionalData = {}) {
        const startTime = Date.now();
        
        try {
            const payload = {
                orderId,
                status,
                ...additionalData,
                timestamp: new Date()
            };

            this.io.to(`user_${userId}`).emit('order_update', payload);
            this.io.to('admin_room').emit('admin_order_update', { userId, ...payload });
            
            const latency = Date.now() - startTime;
            this.recordLatency(latency);
            
            logger.info(`📦 Order update broadcast to user ${userId}: Order ${orderId} - ${status} (${latency}ms)`);
            
            return { success: true, latency };
        } catch (error) {
            logger.error(`❌ Failed to broadcast order update:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Broadcast AI analysis progress
     */
    async broadcastAIProgress(sessionId, progress, stage, data = {}) {
        const startTime = Date.now();
        
        try {
            const room = `ai_analysis_${sessionId}`;
            const payload = {
                sessionId,
                progress, // 0-100
                stage, // 'deterministic', 'database_rules', 'ai_analysis', 'complete'
                data,
                timestamp: new Date()
            };

            this.io.to(room).emit('ai_analysis_progress', payload);
            
            const latency = Date.now() - startTime;
            
            logger.debug(`🤖 AI progress broadcast: ${sessionId} - ${stage} ${progress}% (${latency}ms)`);
            
            return { success: true, latency };
        } catch (error) {
            logger.error(`❌ Failed to broadcast AI progress:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Broadcast real-time admin metrics
     */
    async broadcastAdminMetrics(socket = null) {
        try {
            const metrics = await this.collectAdminMetrics();
            const payload = {
                metrics,
                timestamp: new Date()
            };

            if (socket) {
                // Send to specific socket
                socket.emit('admin_metrics', payload);
            } else {
                // Broadcast to all admins
                this.io.to('admin_metrics').emit('admin_metrics', payload);
            }

            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to broadcast admin metrics:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check and trigger price alerts
     */
    async checkPriceAlerts(productId, newPrice, oldPrice) {
        try {
            const { query } = require('../config/db');
            
            // Find active price alerts for this product
            const result = await query(
                `SELECT pa.*, u.id as user_id, u.name as user_name
                 FROM price_alerts pa
                 JOIN users u ON pa.user_id = u.id
                 WHERE pa.product_id = $1 
                   AND pa.is_active = true
                   AND (
                     (pa.alert_type = 'price_drop' AND $2 < pa.target_price)
                     OR (pa.alert_type = 'price_rise' AND $2 > pa.target_price)
                     OR (pa.alert_type = 'any_change')
                   )`,
                [productId, newPrice]
            );

            if (result.rows.length > 0) {
                logger.info(`🔔 Triggering ${result.rows.length} price alerts for product ${productId}`);
                
                for (const alert of result.rows) {
                    const payload = {
                        alertId: alert.id,
                        productId,
                        newPrice,
                        oldPrice,
                        targetPrice: alert.target_price,
                        alertType: alert.alert_type,
                        triggered: true,
                        timestamp: new Date()
                    };

                    // Send to user
                    this.io.to(`price_alerts_${alert.user_id}`).emit('price_alert_triggered', payload);
                    
                    // Mark alert as triggered
                    await query(
                        'UPDATE price_alerts SET last_triggered_at = NOW() WHERE id = $1',
                        [alert.id]
                    );
                }
            }
        } catch (error) {
            logger.error(`❌ Failed to check price alerts:`, error);
        }
    }

    /**
     * Collect real-time admin metrics
     */
    async collectAdminMetrics() {
        try {
            const { query } = require('../config/db');
            
            // Get current stats with individual error handling
            let orders24h = 0, totalStock = 0, revenue24h = 0, activeUsers = 0;
            
            try {
                const orders = await query('SELECT COUNT(*) as count FROM orders WHERE created_at > NOW() - INTERVAL \'24 hours\'');
                orders24h = Number.parseInt(orders.rows[0]?.count || 0, 10);
            } catch (e) {
                // Silent fail for non-critical metric
            }
            
            try {
                const stock = await query('SELECT SUM(stock) as total_stock FROM pc_parts WHERE is_active = true');
                totalStock = Number.parseInt(stock.rows[0]?.total_stock || 0, 10);
            } catch (e) {
                // Silent fail for non-critical metric
            }
            
            try {
                const revenue = await query(`
                    SELECT SUM(oi.quantity * oi.price) as revenue 
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.created_at > NOW() - INTERVAL '24 hours' 
                    AND o.status != 'cancelled'
                `);
                revenue24h = Number.parseFloat(revenue.rows[0]?.revenue || 0);
            } catch (e) {
                // Silent fail for non-critical metric
            }
            
            try {
                const users = await query('SELECT COUNT(*) as count FROM users WHERE last_active_at > NOW() - INTERVAL \'5 minutes\' OR last_activity > NOW() - INTERVAL \'5 minutes\'');
                activeUsers = Number.parseInt(users.rows[0]?.count || 0, 10);
            } catch (e) {
                // Silent fail for non-critical metric
            }

            return {
                orders24h,
                totalStock,
                revenue24h,
                activeUsers,
                connectedClients: this.connectedClients.size,
                activeSubscriptions: this.subscriptions.size,
                averageLatency: this.performanceMetrics.averageLatency,
                totalBroadcasts: this.performanceMetrics.totalBroadcasts
            };
        } catch (error) {
            // Return default metrics on catastrophic failure
            return {
                orders24h: 0,
                totalStock: 0,
                revenue24h: 0,
                activeUsers: 0,
                connectedClients: this.connectedClients.size,
                activeSubscriptions: this.subscriptions.size,
                averageLatency: 0,
                totalBroadcasts: 0
            };
        }
    }

    /**
     * Handle client disconnect
     */
    handleDisconnect(socket) {
        const client = this.connectedClients.get(socket.id);
        
        if (client) {
            logger.info(`🔌 WebSocket disconnected: ${client.userName} (${client.userId})`);
            
            // Clean up subscriptions
            client.subscriptions.forEach(room => {
                const productId = room.replace('product_', '');
                if (this.subscriptions.has(productId)) {
                    this.subscriptions.get(productId).delete(socket.id);
                    if (this.subscriptions.get(productId).size === 0) {
                        this.subscriptions.delete(productId);
                    }
                }
            });
            
            this.connectedClients.delete(socket.id);
        }
    }

    /**
     * Record broadcast latency for performance monitoring
     */
    recordLatency(latencyMs) {
        this.performanceMetrics.totalBroadcasts++;
        this.performanceMetrics.latencies.push(latencyMs);
        
        // Keep only last 100 latencies for rolling average
        if (this.performanceMetrics.latencies.length > 100) {
            this.performanceMetrics.latencies.shift();
        }
        
        // Calculate average
        const sum = this.performanceMetrics.latencies.reduce((a, b) => a + b, 0);
        this.performanceMetrics.averageLatency = Math.round(sum / this.performanceMetrics.latencies.length);
    }

    /**
     * Start periodic metrics collection
     */
    startMetricsCollection() {
        // Broadcast admin metrics every 5 seconds
        setInterval(async () => {
            if (this.io) {
                await this.broadcastAdminMetrics();
            }
        }, 5000);
        
        logger.info('📊 Admin metrics broadcasting started (every 5 seconds)');
    }

    /**
     * Get stock change type
     */
    getStockChangeType(newStock, oldStock) {
        if (oldStock === null) return 'initial';
        if (newStock === 0 && oldStock > 0) return 'out_of_stock';
        if (newStock > 0 && oldStock === 0) return 'back_in_stock';
        if (newStock > oldStock) return 'restocked';
        if (newStock < oldStock) return 'sold';
        return 'unchanged';
    }

    /**
     * Calculate price change percentage
     */
    calculateChangePercentage(newPrice, oldPrice) {
        if (!oldPrice || oldPrice === 0) return 0;
        return ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            connectedClients: this.connectedClients.size,
            activeSubscriptions: this.subscriptions.size,
            totalBroadcasts: this.performanceMetrics.totalBroadcasts,
            averageLatency: this.performanceMetrics.averageLatency,
            targetLatency: 500,
            latencyStatus: this.performanceMetrics.averageLatency < 500 ? '✅ EXCELLENT' : '⚠️ SLOW'
        };
    }

    /**
     * Get connected clients info (for monitoring)
     */
    getConnectedClients() {
        const clients = [];
        this.connectedClients.forEach((client, socketId) => {
            clients.push({
                socketId,
                userId: client.userId,
                userName: client.userName,
                connectedAt: client.connectedAt,
                subscriptions: Array.from(client.subscriptions)
            });
        });
        return clients;
    }
}

// Export singleton instance
const websocketService = new WebSocketService();
module.exports = websocketService;
