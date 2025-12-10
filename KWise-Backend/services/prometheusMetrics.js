/**
 * Prometheus Metrics Service
 * Week 2 Implementation - Phase 3.2
 * 
 * Comprehensive performance monitoring for K-Wise backend
 * - HTTP request metrics
 * - Database query performance
 * - AI response times
 * - Cache hit rates
 * - WebSocket connections
 * - System resource usage
 * 
 * Deployment: Optimized for Hyper-V with RTX 5060
 * Integration: Prometheus + Grafana dashboard
 */

const promClient = require('prom-client');
const logger = require('../utils/logger');

class PrometheusMetrics {
    constructor() {
        // Create a Registry
        this.register = new promClient.Registry();
        
        // Add default metrics (CPU, memory, etc.)
        promClient.collectDefaultMetrics({ 
            register: this.register,
            prefix: 'kwise_',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
        });

        // Initialize custom metrics
        this.initializeMetrics();
        
        logger.info('📊 Prometheus metrics initialized');
    }

    /**
     * Initialize all custom metrics
     */
    initializeMetrics() {
        // ============================================
        // HTTP METRICS
        // ============================================
        
        // HTTP request duration histogram
        this.httpRequestDuration = new promClient.Histogram({
            name: 'kwise_http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });
        this.register.registerMetric(this.httpRequestDuration);

        // HTTP request total counter
        this.httpRequestsTotal = new promClient.Counter({
            name: 'kwise_http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code']
        });
        this.register.registerMetric(this.httpRequestsTotal);

        // HTTP request size summary
        this.httpRequestSize = new promClient.Summary({
            name: 'kwise_http_request_size_bytes',
            help: 'Size of HTTP requests in bytes',
            labelNames: ['method', 'route'],
            percentiles: [0.5, 0.9, 0.95, 0.99]
        });
        this.register.registerMetric(this.httpRequestSize);

        // HTTP response size summary
        this.httpResponseSize = new promClient.Summary({
            name: 'kwise_http_response_size_bytes',
            help: 'Size of HTTP responses in bytes',
            labelNames: ['method', 'route', 'status_code'],
            percentiles: [0.5, 0.9, 0.95, 0.99]
        });
        this.register.registerMetric(this.httpResponseSize);

        // ============================================
        // DATABASE METRICS
        // ============================================
        
        // Database query duration histogram
        this.dbQueryDuration = new promClient.Histogram({
            name: 'kwise_db_query_duration_seconds',
            help: 'Duration of database queries in seconds',
            labelNames: ['query_type', 'table', 'operation'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });
        this.register.registerMetric(this.dbQueryDuration);

        // Database queries total counter
        this.dbQueriesTotal = new promClient.Counter({
            name: 'kwise_db_queries_total',
            help: 'Total number of database queries',
            labelNames: ['query_type', 'table', 'operation', 'status']
        });
        this.register.registerMetric(this.dbQueriesTotal);

        // Database connection pool gauge
        this.dbConnectionPool = new promClient.Gauge({
            name: 'kwise_db_connection_pool_size',
            help: 'Current database connection pool size',
            labelNames: ['state'] // active, idle, waiting
        });
        this.register.registerMetric(this.dbConnectionPool);

        // Database errors counter
        this.dbErrors = new promClient.Counter({
            name: 'kwise_db_errors_total',
            help: 'Total number of database errors',
            labelNames: ['error_type', 'table']
        });
        this.register.registerMetric(this.dbErrors);

        // ============================================
        // AI METRICS
        // ============================================
        
        // AI response time histogram
        this.aiResponseTime = new promClient.Histogram({
            name: 'kwise_ai_response_time_seconds',
            help: 'Duration of AI analysis in seconds',
            labelNames: ['model', 'scenario', 'cache_status'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
        });
        this.register.registerMetric(this.aiResponseTime);

        // AI requests total counter
        this.aiRequestsTotal = new promClient.Counter({
            name: 'kwise_ai_requests_total',
            help: 'Total number of AI requests',
            labelNames: ['model', 'scenario', 'status']
        });
        this.register.registerMetric(this.aiRequestsTotal);

        // AI cache hit rate gauge
        this.aiCacheHitRate = new promClient.Gauge({
            name: 'kwise_ai_cache_hit_rate',
            help: 'AI response cache hit rate percentage',
            labelNames: ['cache_type']
        });
        this.register.registerMetric(this.aiCacheHitRate);

        // AI circuit breaker state gauge
        this.aiCircuitBreakerState = new promClient.Gauge({
            name: 'kwise_ai_circuit_breaker_state',
            help: 'AI circuit breaker state (0=closed, 1=open, 2=half-open)',
            labelNames: ['scenario']
        });
        this.register.registerMetric(this.aiCircuitBreakerState);

        // AI token usage counter
        this.aiTokensUsed = new promClient.Counter({
            name: 'kwise_ai_tokens_used_total',
            help: 'Total number of AI tokens used',
            labelNames: ['model', 'scenario']
        });
        this.register.registerMetric(this.aiTokensUsed);

        // ============================================
        // CACHE METRICS
        // ============================================
        
        // Cache operations counter
        this.cacheOperations = new promClient.Counter({
            name: 'kwise_cache_operations_total',
            help: 'Total number of cache operations',
            labelNames: ['cache_type', 'operation', 'result'] // hit, miss, set, delete
        });
        this.register.registerMetric(this.cacheOperations);

        // Cache size gauge
        this.cacheSize = new promClient.Gauge({
            name: 'kwise_cache_size_entries',
            help: 'Current cache size in entries',
            labelNames: ['cache_type']
        });
        this.register.registerMetric(this.cacheSize);

        // Cache hit rate gauge
        this.cacheHitRate = new promClient.Gauge({
            name: 'kwise_cache_hit_rate',
            help: 'Cache hit rate percentage',
            labelNames: ['cache_type']
        });
        this.register.registerMetric(this.cacheHitRate);

        // ============================================
        // WEBSOCKET METRICS
        // ============================================
        
        // WebSocket connections gauge
        this.websocketConnections = new promClient.Gauge({
            name: 'kwise_websocket_connections_current',
            help: 'Current number of WebSocket connections',
            labelNames: ['user_role']
        });
        this.register.registerMetric(this.websocketConnections);

        // WebSocket messages counter
        this.websocketMessages = new promClient.Counter({
            name: 'kwise_websocket_messages_total',
            help: 'Total number of WebSocket messages',
            labelNames: ['direction', 'event_type'] // inbound/outbound
        });
        this.register.registerMetric(this.websocketMessages);

        // WebSocket broadcast latency histogram
        this.websocketLatency = new promClient.Histogram({
            name: 'kwise_websocket_broadcast_latency_seconds',
            help: 'WebSocket broadcast latency in seconds',
            labelNames: ['event_type'],
            buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1]
        });
        this.register.registerMetric(this.websocketLatency);

        // ============================================
        // BUSINESS METRICS
        // ============================================
        
        // Orders counter
        this.ordersTotal = new promClient.Counter({
            name: 'kwise_orders_total',
            help: 'Total number of orders',
            labelNames: ['status']
        });
        this.register.registerMetric(this.ordersTotal);

        // Revenue gauge
        this.revenue = new promClient.Gauge({
            name: 'kwise_revenue_total',
            help: 'Total revenue in PHP',
            labelNames: ['period'] // daily, weekly, monthly
        });
        this.register.registerMetric(this.revenue);

        // Stock level gauge
        this.stockLevel = new promClient.Gauge({
            name: 'kwise_stock_level',
            help: 'Current stock level for products',
            labelNames: ['product_id', 'category']
        });
        this.register.registerMetric(this.stockLevel);

        // Active users gauge
        this.activeUsers = new promClient.Gauge({
            name: 'kwise_active_users',
            help: 'Current number of active users',
            labelNames: ['role']
        });
        this.register.registerMetric(this.activeUsers);

        // ============================================
        // SYSTEM METRICS
        // ============================================
        
        // GPU usage gauge (for RTX 5060 monitoring)
        this.gpuUsage = new promClient.Gauge({
            name: 'kwise_gpu_usage_percent',
            help: 'GPU usage percentage',
            labelNames: ['gpu_model']
        });
        this.register.registerMetric(this.gpuUsage);

        // GPU memory gauge
        this.gpuMemory = new promClient.Gauge({
            name: 'kwise_gpu_memory_used_bytes',
            help: 'GPU memory used in bytes',
            labelNames: ['gpu_model']
        });
        this.register.registerMetric(this.gpuMemory);

        // NVMe SSD metrics
        this.diskIO = new promClient.Gauge({
            name: 'kwise_disk_io_operations',
            help: 'Disk I/O operations per second',
            labelNames: ['operation'] // read, write
        });
        this.register.registerMetric(this.diskIO);
    }

    /**
     * Record HTTP request
     */
    recordHttpRequest(method, route, statusCode, duration, requestSize = 0, responseSize = 0) {
        this.httpRequestDuration.labels(method, route, statusCode).observe(duration);
        this.httpRequestsTotal.labels(method, route, statusCode).inc();
        
        if (requestSize > 0) {
            this.httpRequestSize.labels(method, route).observe(requestSize);
        }
        
        if (responseSize > 0) {
            this.httpResponseSize.labels(method, route, statusCode).observe(responseSize);
        }
    }

    /**
     * Record database query
     */
    recordDbQuery(queryType, table, operation, duration, status = 'success') {
        this.dbQueryDuration.labels(queryType, table, operation).observe(duration);
        this.dbQueriesTotal.labels(queryType, table, operation, status).inc();
    }

    /**
     * Record database error
     */
    recordDbError(errorType, table) {
        this.dbErrors.labels(errorType, table).inc();
    }

    /**
     * Update database connection pool stats
     */
    updateDbConnectionPool(active, idle, waiting) {
        this.dbConnectionPool.labels('active').set(active);
        this.dbConnectionPool.labels('idle').set(idle);
        this.dbConnectionPool.labels('waiting').set(waiting);
    }

    /**
     * Record AI request
     */
    recordAiRequest(model, scenario, duration, cacheStatus, status = 'success', tokensUsed = 0) {
        this.aiResponseTime.labels(model, scenario, cacheStatus).observe(duration);
        this.aiRequestsTotal.labels(model, scenario, status).inc();
        
        if (tokensUsed > 0) {
            this.aiTokensUsed.labels(model, scenario).add(tokensUsed);
        }
    }

    /**
     * Update AI cache hit rate
     */
    updateAiCacheHitRate(cacheType, hitRate) {
        this.aiCacheHitRate.labels(cacheType).set(hitRate);
    }

    /**
     * Update AI circuit breaker state
     */
    updateAiCircuitBreakerState(scenario, state) {
        // 0=closed, 1=open, 2=half-open
        const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
        this.aiCircuitBreakerState.labels(scenario).set(stateValue);
    }

    /**
     * Record cache operation
     */
    recordCacheOperation(cacheType, operation, result) {
        this.cacheOperations.labels(cacheType, operation, result).inc();
    }

    /**
     * Update cache stats
     */
    updateCacheStats(cacheType, size, hitRate) {
        this.cacheSize.labels(cacheType).set(size);
        this.cacheHitRate.labels(cacheType).set(hitRate);
    }

    /**
     * Update WebSocket connections
     */
    updateWebSocketConnections(userRole, count) {
        this.websocketConnections.labels(userRole).set(count);
    }

    /**
     * Record WebSocket message
     */
    recordWebSocketMessage(direction, eventType) {
        this.websocketMessages.labels(direction, eventType).inc();
    }

    /**
     * Record WebSocket broadcast latency
     */
    recordWebSocketLatency(eventType, latency) {
        this.websocketLatency.labels(eventType).observe(latency);
    }

    /**
     * Record order
     */
    recordOrder(status) {
        this.ordersTotal.labels(status).inc();
    }

    /**
     * Update revenue
     */
    updateRevenue(period, amount) {
        this.revenue.labels(period).set(amount);
    }

    /**
     * Update stock level
     */
    updateStockLevel(productId, category, stock) {
        this.stockLevel.labels(productId, category).set(stock);
    }

    /**
     * Update active users
     */
    updateActiveUsers(role, count) {
        this.activeUsers.labels(role).set(count);
    }

    /**
     * Update GPU metrics
     */
    updateGpuMetrics(gpuModel, usage, memoryUsed) {
        this.gpuUsage.labels(gpuModel).set(usage);
        this.gpuMemory.labels(gpuModel).set(memoryUsed);
    }

    /**
     * Update disk I/O
     */
    updateDiskIO(operation, value) {
        this.diskIO.labels(operation).set(value);
    }

    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        return await this.register.metrics();
    }

    /**
     * Get metrics as JSON
     */
    async getMetricsJSON() {
        const metrics = await this.register.getMetricsAsJSON();
        return metrics;
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.register.resetMetrics();
        logger.info('📊 Prometheus metrics reset');
    }

    /**
     * Get health check data
     */
    async getHealthCheck() {
        try {
            const metrics = await this.getMetricsJSON();
            
            return {
                status: 'healthy',
                metrics: {
                    http_requests: metrics.find(m => m.name === 'kwise_http_requests_total')?.values?.reduce((sum, v) => sum + v.value, 0) || 0,
                    db_queries: metrics.find(m => m.name === 'kwise_db_queries_total')?.values?.reduce((sum, v) => sum + v.value, 0) || 0,
                    ai_requests: metrics.find(m => m.name === 'kwise_ai_requests_total')?.values?.reduce((sum, v) => sum + v.value, 0) || 0,
                    websocket_connections: metrics.find(m => m.name === 'kwise_websocket_connections_current')?.values?.reduce((sum, v) => sum + v.value, 0) || 0
                },
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('❌ Failed to get health check:', error);
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

// Export singleton instance
const prometheusMetrics = new PrometheusMetrics();
module.exports = prometheusMetrics;
