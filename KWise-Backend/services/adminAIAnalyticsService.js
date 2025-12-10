/**
 * Admin AI Analytics Service
 * TASK 14 - PHASE 4: AI Analytics for Admin Dashboard
 * Intelligent business insights and predictions
 */

const axios = require('axios');
const pool = require('../config/db');
const logger = require('../utils/logger');
const ollamaService = require('../ai/services/ollamaService'); // PHASE 4: Fine-tuned AI model integration

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Generate AI-powered business insights from analytics data
 * @param {Object} analyticsData - Raw analytics data
 * @returns {Promise<Object>} AI-generated insights
 */
const generateBusinessInsights = async (analyticsData) => {
  try {
    const prompt = `Analyze this business data and provide actionable insights:

Revenue Trends (last 7 days):
${JSON.stringify(analyticsData.revenueTrends.slice(-7), null, 2)}

Top Products:
${JSON.stringify(analyticsData.topProducts.slice(0, 5), null, 2)}

Category Performance:
${JSON.stringify(analyticsData.categoryPerformance, null, 2)}

Provide insights in JSON format:
{
  "revenueTrend": "increasing/stable/decreasing",
  "trendDescription": "Brief description of revenue trend",
  "topPerformingCategory": "Category name",
  "recommendations": ["Action item 1", "Action item 2", "Action item 3"],
  "alerts": ["Any concerning patterns"],
  "opportunities": ["Growth opportunities identified"]
}

Respond ONLY with valid JSON.`;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: ollamaService.selectedModel || 'deepseek-r1:1.5b', // PHASE 4: Use fine-tuned model
      prompt,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 600
      }
    });

    const aiResponse = response.data.response;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const insights = JSON.parse(jsonMatch[0]);
      return {
        ...insights,
        generatedAt: new Date().toISOString(),
        confidence: 'AI-powered analysis'
      };
    }

    // Fallback insights
    return generateFallbackInsights(analyticsData);

  } catch (error) {
    logger.error('Error generating business insights:', error);
    return generateFallbackInsights(analyticsData);
  }
};

/**
 * Generate fallback insights when AI is unavailable
 * @param {Object} analyticsData - Analytics data
 * @returns {Object} Basic insights
 */
const generateFallbackInsights = (analyticsData) => {
  const insights = {
    revenueTrend: 'stable',
    trendDescription: 'Unable to generate AI insights',
    topPerformingCategory: analyticsData.categoryPerformance[0]?.category || 'N/A',
    recommendations: [
      'Review top-selling products for inventory optimization',
      'Analyze customer segments for targeted marketing',
      'Monitor low-stock items for reordering'
    ],
    alerts: [],
    opportunities: [],
    generatedAt: new Date().toISOString(),
    confidence: 'Basic analysis'
  };

  return insights;
};

/**
 * Predict inventory needs using AI
 * @param {Object} inventoryData - Current inventory data
 * @returns {Promise<Object>} Inventory predictions
 */
const predictInventoryNeeds = async (inventoryData) => {
  try {
    // Get sales data for the last 30 days
    const salesQuery = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.stock,
        COUNT(oi.product_id)::int as times_sold,
        SUM(oi.quantity)::int as total_quantity_sold,
        AVG(oi.quantity)::decimal(10,2) as avg_quantity_per_order
      FROM pc_parts p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= NOW() - INTERVAL '30 days'
        AND o.status != 'cancelled'
      GROUP BY p.id, p.name, p.category, p.stock
      HAVING COUNT(oi.product_id) > 0
      ORDER BY total_quantity_sold DESC
      LIMIT 20
    `;

    const result = await pool.query(salesQuery);
    const salesData = result.rows;

    const prompt = `Analyze these sales patterns and predict inventory needs:

Sales Data (Last 30 Days):
${JSON.stringify(salesData, null, 2)}

Provide inventory recommendations in JSON format:
{
  "criticalItems": [
    {"productId": number, "name": "string", "reason": "why it's critical", "recommendedStock": number}
  ],
  "overstockedItems": [
    {"productId": number, "name": "string", "currentStock": number}
  ],
  "trendingCategories": ["category1", "category2"],
  "restockPriority": ["product name in priority order"]
}

Respond ONLY with valid JSON.`;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: ollamaService.selectedModel || 'deepseek-r1:1.5b', // PHASE 4: Use fine-tuned model
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 700
      }
    });

    const aiResponse = response.data.response;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const predictions = JSON.parse(jsonMatch[0]);
      return {
        ...predictions,
        salesData,
        generatedAt: new Date().toISOString()
      };
    }

    // Fallback predictions
    return {
      criticalItems: salesData
        .filter(item => item.stock < item.avg_quantity_per_order * 7)
        .slice(0, 5)
        .map(item => ({
          productId: item.id,
          name: item.name,
          reason: 'Stock below 7-day average sales',
          recommendedStock: Math.ceil(item.avg_quantity_per_order * 30)
        })),
      overstockedItems: [],
      trendingCategories: [...new Set(salesData.slice(0, 5).map(item => item.category))],
      restockPriority: salesData.slice(0, 10).map(item => item.name),
      salesData,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error predicting inventory needs:', error);
    throw error;
  }
};

/**
 * Analyze customer behavior patterns
 * @returns {Promise<Object>} Customer behavior insights
 */
const analyzeCustomerBehavior = async () => {
  try {
    // Get customer order patterns
    const behaviorQuery = `
      SELECT 
        customer_name,
        COUNT(*)::int as total_orders,
        SUM(total_amount)::decimal(10,2) as total_spent,
        AVG(total_amount)::decimal(10,2) as avg_order_value,
        MIN(created_at) as first_order_date,
        MAX(created_at) as last_order_date,
        ARRAY_AGG(DISTINCT status) as order_statuses
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY customer_name
      HAVING COUNT(*) >= 2
      ORDER BY total_spent DESC
      LIMIT 20
    `;

    const result = await pool.query(behaviorQuery);
    const customerData = result.rows;

    const prompt = `Analyze these customer behavior patterns and provide insights:

Customer Data (Last 90 Days):
${JSON.stringify(customerData.slice(0, 10), null, 2)}

Provide customer insights in JSON format:
{
  "loyalCustomers": ["customer names"],
  "atRiskCustomers": ["customer names who haven't ordered recently"],
  "highValueSegments": "Description of high-value customer characteristics",
  "retentionStrategies": ["Strategy 1", "Strategy 2", "Strategy 3"],
  "avgCustomerLifetimeValue": "estimate"
}

Respond ONLY with valid JSON.`;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: ollamaService.selectedModel || 'deepseek-r1:1.5b', // PHASE 4: Use fine-tuned model
      prompt,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 500
      }
    });

    const aiResponse = response.data.response;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const insights = JSON.parse(jsonMatch[0]);
      return {
        ...insights,
        customerData,
        totalAnalyzed: customerData.length,
        generatedAt: new Date().toISOString()
      };
    }

    // Fallback
    return {
      loyalCustomers: customerData.slice(0, 5).map(c => c.customer_name),
      atRiskCustomers: [],
      highValueSegments: 'Customers with 5+ orders and ₱100K+ lifetime value',
      retentionStrategies: [
        'Implement loyalty rewards program',
        'Send personalized product recommendations',
        'Offer exclusive discounts to repeat customers'
      ],
      avgCustomerLifetimeValue: '₱50,000 - ₱150,000',
      customerData,
      totalAnalyzed: customerData.length,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error analyzing customer behavior:', error);
    throw error;
  }
};

/**
 * Get comprehensive AI analytics for admin
 * @returns {Promise<Object>} Complete AI analytics
 */
const getAdminAIAnalytics = async () => {
  try {
    // Get basic analytics first
    const analyticsService = require('./analyticsService');
    const basicAnalytics = await analyticsService.getAnalyticsSummary();

    // Generate AI insights in parallel
    const [businessInsights, inventoryPredictions, customerBehavior] = await Promise.all([
      generateBusinessInsights(basicAnalytics),
      predictInventoryNeeds({}),
      analyzeCustomerBehavior()
    ]);

    return {
      success: true,
      businessInsights,
      inventoryPredictions,
      customerBehavior,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error getting admin AI analytics:', error);
    throw error;
  }
};

module.exports = {
  generateBusinessInsights,
  predictInventoryNeeds,
  analyzeCustomerBehavior,
  getAdminAIAnalytics
};
