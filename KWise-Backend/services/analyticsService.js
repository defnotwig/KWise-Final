/**
 * Analytics Service
 * TASK 11: Advanced Analytics Dashboard
 * Provides detailed analytics data for admin dashboard
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Get revenue trends over time (daily, weekly, monthly)
 * @param {string} period - 'daily', 'weekly', 'monthly', 'yearly'
 * @param {number} limit - Number of data points to return
 * @returns {Promise<Array>} Revenue trend data
 */
const getRevenueTrends = async (period = 'daily', limit = 30) => {
  try {
    let groupByClause;
    let dateFormat;
    let intervalUnit;

    switch (period) {
      case 'weekly':
        groupByClause = "DATE_TRUNC('week', created_at)";
        dateFormat = "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')";
        intervalUnit = 'week';
        break;
      case 'monthly':
        groupByClause = "DATE_TRUNC('month', created_at)";
        dateFormat = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')";
        intervalUnit = 'month';
        break;
      case 'yearly':
        groupByClause = "DATE_TRUNC('year', created_at)";
        dateFormat = "TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY')";
        intervalUnit = 'year';
        break;
      case 'daily':
      default:
        groupByClause = "DATE(created_at)";
        dateFormat = "TO_CHAR(DATE(created_at), 'YYYY-MM-DD')";
        intervalUnit = 'day';
    }

    const safeLimit = Number.parseInt(limit, 10) || 30;

    const query = `
      SELECT 
        ${dateFormat} as period,
        COUNT(*)::int as order_count,
        COALESCE(SUM(total_amount), 0)::decimal(10,2) as revenue,
        COALESCE(AVG(total_amount), 0)::decimal(10,2) as avg_order_value
      FROM orders
      WHERE status != 'cancelled'
        AND created_at >= NOW() - $1 * INTERVAL '1 ${intervalUnit}'
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause} ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [safeLimit, safeLimit]);
    
    return result.rows.map(row => ({
      period: row.period,
      orderCount: row.order_count,
      revenue: Number.parseFloat(row.revenue),
      avgOrderValue: Number.parseFloat(row.avg_order_value)
    }));
  } catch (error) {
    logger.error('Error fetching revenue trends:', error);
    throw error;
  }
};

/**
 * Get top selling products
 * @param {number} limit - Number of products to return
 * @param {string} timeframe - 'all', 'month', 'week', 'day'
 * @returns {Promise<Array>} Top products data
 */
const getTopProducts = async (limit = 10, timeframe = 'all') => {
  try {
    let whereClause = '';
    
    if (timeframe === 'month') {
      whereClause = "AND o.created_at >= NOW() - INTERVAL '30 days'";
    } else if (timeframe === 'week') {
      whereClause = "AND o.created_at >= NOW() - INTERVAL '7 days'";
    } else if (timeframe === 'day') {
      whereClause = "AND o.created_at >= NOW() - INTERVAL '1 day'";
    }

    const query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.tier,
        p.price,
        COUNT(oi.product_id)::int as times_sold,
        SUM(oi.quantity)::int as total_quantity,
        COALESCE(SUM(oi.quantity * oi.price), 0)::decimal(10,2) as total_revenue
      FROM order_items oi
      JOIN pc_parts p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
        ${whereClause}
      GROUP BY p.id, p.name, p.category, p.tier, p.price
      ORDER BY total_revenue DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      tier: row.tier,
      price: Number.parseFloat(row.price),
      timesSold: row.times_sold,
      totalQuantity: row.total_quantity,
      totalRevenue: Number.parseFloat(row.total_revenue)
    }));
  } catch (error) {
    logger.error('Error fetching top products:', error);
    throw error;
  }
};

/**
 * Get category performance analytics
 * @returns {Promise<Array>} Category performance data
 */
const getCategoryPerformance = async () => {
  try {
    const query = `
      SELECT 
        p.category,
        COUNT(DISTINCT oi.order_id)::int as order_count,
        SUM(oi.quantity)::int as total_quantity,
        COALESCE(SUM(oi.quantity * oi.price), 0)::decimal(10,2) as revenue,
        COALESCE(AVG(oi.quantity * oi.price), 0)::decimal(10,2) as avg_sale_value
      FROM order_items oi
      JOIN pc_parts p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.category
      ORDER BY revenue DESC
    `;

    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      category: row.category,
      orderCount: row.order_count,
      totalQuantity: row.total_quantity,
      revenue: Number.parseFloat(row.revenue),
      avgSaleValue: Number.parseFloat(row.avg_sale_value)
    }));
  } catch (error) {
    logger.error('Error fetching category performance:', error);
    throw error;
  }
};

/**
 * Get order status distribution
 * @returns {Promise<Array>} Order status distribution
 */
const getOrderStatusDistribution = async () => {
  try {
    const query = `
      SELECT 
        status,
        COUNT(*)::int as count,
        COALESCE(SUM(total_amount), 0)::decimal(10,2) as total_value
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      status: row.status,
      count: row.count,
      totalValue: Number.parseFloat(row.total_value)
    }));
  } catch (error) {
    logger.error('Error fetching order status distribution:', error);
    throw error;
  }
};

/**
 * Get customer insights (order patterns)
 * @returns {Promise<Object>} Customer insights data
 */
const getCustomerInsights = async () => {
  try {
    // Get order frequency distribution
    const frequencyQuery = `
      SELECT 
        CASE 
          WHEN order_count = 1 THEN 'One-time'
          WHEN order_count BETWEEN 2 AND 5 THEN 'Occasional (2-5)'
          WHEN order_count BETWEEN 6 AND 10 THEN 'Regular (6-10)'
          ELSE 'Frequent (10+)'
        END as customer_type,
        COUNT(*)::int as customer_count
      FROM (
        SELECT customer_name, COUNT(*) as order_count
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY customer_name
      ) customer_orders
      GROUP BY customer_type
      ORDER BY 
        CASE customer_type
          WHEN 'One-time' THEN 1
          WHEN 'Occasional (2-5)' THEN 2
          WHEN 'Regular (6-10)' THEN 3
          ELSE 4
        END
    `;

    // Get average order value by customer segment
    const avgValueQuery = `
      SELECT 
        CASE 
          WHEN total_spent < 50000 THEN 'Budget (<50K)'
          WHEN total_spent BETWEEN 50000 AND 100000 THEN 'Mid-range (50K-100K)'
          WHEN total_spent BETWEEN 100000 AND 200000 THEN 'Premium (100K-200K)'
          ELSE 'High-end (200K+)'
        END as segment,
        COUNT(*)::int as customer_count,
        COALESCE(AVG(total_spent), 0)::decimal(10,2) as avg_spending
      FROM (
        SELECT customer_name, SUM(total_amount) as total_spent
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY customer_name
      ) customer_spending
      GROUP BY segment
      ORDER BY 
        CASE segment
          WHEN 'Budget (<50K)' THEN 1
          WHEN 'Mid-range (50K-100K)' THEN 2
          WHEN 'Premium (100K-200K)' THEN 3
          ELSE 4
        END
    `;

    const [frequencyResult, avgValueResult] = await Promise.all([
      pool.query(frequencyQuery),
      pool.query(avgValueQuery)
    ]);

    return {
      orderFrequency: frequencyResult.rows.map(row => ({
        customerType: row.customer_type,
        customerCount: row.customer_count
      })),
      spendingSegments: avgValueResult.rows.map(row => ({
        segment: row.segment,
        customerCount: row.customer_count,
        avgSpending: Number.parseFloat(row.avg_spending)
      }))
    };
  } catch (error) {
    logger.error('Error fetching customer insights:', error);
    throw error;
  }
};

/**
 * Get hourly order patterns (for peak time analysis)
 * @returns {Promise<Array>} Hourly order distribution
 */
const getOrderPatterns = async () => {
  try {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*)::int as order_count,
        COALESCE(AVG(total_amount), 0)::decimal(10,2) as avg_order_value
      FROM orders
      WHERE status != 'cancelled'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const result = await pool.query(query);
    
    // Fill in missing hours with 0 values
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      orderCount: 0,
      avgOrderValue: 0
    }));

    result.rows.forEach(row => {
      hourlyData[row.hour] = {
        hour: row.hour,
        orderCount: row.order_count,
        avgOrderValue: Number.parseFloat(row.avg_order_value)
      };
    });

    return hourlyData;
  } catch (error) {
    logger.error('Error fetching order patterns:', error);
    throw error;
  }
};

/**
 * Get comprehensive analytics summary
 * @returns {Promise<Object>} Complete analytics data
 */
const getAnalyticsSummary = async () => {
  try {
    const [
      dailyTrends,
      topProducts,
      categoryPerformance,
      statusDistribution,
      customerInsights,
      orderPatterns
    ] = await Promise.all([
      getRevenueTrends('daily', 30),
      getTopProducts(10, 'all'),
      getCategoryPerformance(),
      getOrderStatusDistribution(),
      getCustomerInsights(),
      getOrderPatterns()
    ]);

    return {
      revenueTrends: dailyTrends,
      topProducts,
      categoryPerformance,
      orderStatus: statusDistribution,
      customerInsights,
      orderPatterns,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error fetching analytics summary:', error);
    throw error;
  }
};

module.exports = {
  getRevenueTrends,
  getTopProducts,
  getCategoryPerformance,
  getOrderStatusDistribution,
  getCustomerInsights,
  getOrderPatterns,
  getAnalyticsSummary
};
