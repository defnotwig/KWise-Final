/**
 * AI Smart Search Service
 * TASK 14 - PHASE 3: AI-Powered Product Browsing
 * Intelligent search with natural language understanding
 * PHASE 4: Integrated with Hybrid RAG Pipeline (Vector + BM25 → RRF fusion)
 */

const axios = require('axios');
const pool = require('../config/db');
const logger = require('../utils/logger');
const ollamaService = require('../ai/services/ollamaService'); // PHASE 4: Fine-tuned AI model integration

// PHASE 4: RAG Pipeline for hybrid search
let ragPipeline;
try {
  ragPipeline = require('./ragPipeline');
} catch (e) {
  logger.warn('⚠️ RAG Pipeline not available for smart search', {
    error: e.message
  });
  ragPipeline = null;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Parse natural language query into structured search parameters
 * @param {string} query - Natural language search query
 * @returns {Promise<Object>} Structured search parameters
 */
const parseSearchQuery = async (query) => {
  try {
    const prompt = `Analyze this product search query and extract structured information:
Query: "${query}"

Extract the following information in JSON format:
{
  "intent": "search purpose (e.g., gaming, office work, video editing)",
  "category": "specific category if mentioned (CPU, GPU, RAM, etc.) or null",
  "priceRange": {"min": number or null, "max": number or null},
  "tier": "entry, mid-tier, high-tier, enthusiast, or null",
  "keywords": ["relevant", "keywords"],
  "features": ["specific features mentioned"]
}

Respond ONLY with valid JSON, no explanations.`;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: ollamaService.selectedModel || 'deepseek-r1:1.5b', // PHASE 4: Use fine-tuned model
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 500
      }
    });

    // Extract JSON from response
    const aiResponse = response.data.response;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        originalQuery: query
      };
    }

    // Fallback to basic parsing
    return {
      intent: null,
      category: null,
      priceRange: { min: null, max: null },
      tier: null,
      keywords: query.toLowerCase().split(' ').filter(w => w.length > 2),
      features: [],
      originalQuery: query
    };

  } catch (error) {
    logger.error('Error parsing search query:', error);
    // Return basic keyword search
    return {
      intent: null,
      category: null,
      priceRange: { min: null, max: null },
      tier: null,
      keywords: query.toLowerCase().split(' ').filter(w => w.length > 2),
      features: [],
      originalQuery: query
    };
  }
};

/**
 * Search products using AI-enhanced parameters
 * @param {Object} searchParams - Parsed search parameters
 * @returns {Promise<Array>} Matching products
 */
const smartSearch = async (searchParams) => {
  try {
    let conditions = ["status = 'active'"];
    let params = [];
    let paramIndex = 1;

    // Category filter
    if (searchParams.category) {
      conditions.push(`category ILIKE $${paramIndex}`);
      params.push(`%${searchParams.category}%`);
      paramIndex++;
    }

    // Price range filter
    if (searchParams.priceRange.min !== null) {
      conditions.push(`price >= $${paramIndex}`);
      params.push(searchParams.priceRange.min);
      paramIndex++;
    }
    if (searchParams.priceRange.max !== null) {
      conditions.push(`price <= $${paramIndex}`);
      params.push(searchParams.priceRange.max);
      paramIndex++;
    }

    // Tier filter
    if (searchParams.tier) {
      conditions.push(`tier = $${paramIndex}`);
      params.push(searchParams.tier);
      paramIndex++;
    }

    // Keyword search (name, description, specifications)
    if (searchParams.keywords && searchParams.keywords.length > 0) {
      const keywordConditions = searchParams.keywords.map((keyword) => {
        const condition = `(
          name ILIKE $${paramIndex} OR 
          description ILIKE $${paramIndex} OR 
          specifications::text ILIKE $${paramIndex}
        )`;
        params.push(`%${keyword}%`);
        paramIndex++;
        return condition;
      });
      conditions.push(`(${keywordConditions.join(' OR ')})`);
    }

    const query = `
      SELECT 
        id, name, category, tier, price, stock, image_url,
        description, specifications
      FROM pc_parts
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN stock > 0 THEN 0
          ELSE 1
        END,
        price ASC
      LIMIT 50
    `;

    const result = await pool.query(query, params);
    return result.rows;

  } catch (error) {
    logger.error('Error performing smart search:', error);
    throw error;
  }
};

/**
 * Get AI-powered product recommendations based on search intent
 * @param {string} query - Natural language query
 * @returns {Promise<Object>} Search results with AI insights
 */
const aiProductSearch = async (query) => {
  try {
    logger.info(`AI Product Search: "${query}"`);

    // Step 1: Parse natural language query
    const searchParams = await parseSearchQuery(query);
    logger.info('Parsed search parameters:', searchParams);

    // Step 2: Execute smart search
    const products = await smartSearch(searchParams);

    // Step 3: Get AI recommendations if products found
    let aiInsights = null;
    if (products.length > 0) {
      aiInsights = await generateSearchInsights(query, products.slice(0, 10), searchParams);
    }

    return {
      success: true,
      query: query,
      searchParams,
      products,
      totalResults: products.length,
      aiInsights,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in AI product search:', error);
    throw error;
  }
};

/**
 * Generate AI insights about search results
 * @param {string} query - Original query
 * @param {Array} products - Top products
 * @param {Object} searchParams - Search parameters
 * @returns {Promise<Object>} AI insights
 */
const generateSearchInsights = async (query, products, searchParams) => {
  try {
    const productSummary = products.map(p => 
      `${p.name} (${p.category}, ${p.tier}, ₱${p.price})`
    ).join('\n');

    const prompt = `Based on this search query and results, provide helpful insights:

Query: "${query}"
Intent: ${searchParams.intent || 'General search'}

Top Results:
${productSummary}

Provide a brief, helpful summary in JSON format:
{
  "summary": "Brief explanation of results",
  "bestMatch": "Product name that best fits the query",
  "alternatives": "Suggestion for alternative searches if results are limited",
  "priceRange": "Typical price range for this search"
}

Respond ONLY with valid JSON.`;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: ollamaService.selectedModel || 'deepseek-r1:1.5b', // PHASE 4: Use fine-tuned model
      prompt,
      stream: false,
      options: {
        temperature: 0.5,
        num_predict: 300
      }
    });

    const aiResponse = response.data.response;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      summary: `Found ${products.length} products matching "${query}"`,
      bestMatch: products[0]?.name || 'N/A',
      alternatives: 'Try refining your search with specific categories or price range',
      priceRange: 'Varies'
    };

  } catch (error) {
    logger.error('Error generating search insights:', error);
    return {
      summary: `Found ${products.length} products`,
      bestMatch: products[0]?.name || 'N/A',
      alternatives: null,
      priceRange: null
    };
  }
};

/**
 * Hybrid RAG-powered product search
 * Uses Vector + BM25 with RRF fusion for superior relevance
 * Falls back to legacy smartSearch if RAG pipeline unavailable
 * @param {string} query - Natural language query
 * @param {Object} filters - Optional filters (category, minPrice, maxPrice, tier)
 * @returns {Promise<Object>} Search results with AI insights
 */
const ragProductSearch = async (query, filters = {}) => {
  try {
    // Try RAG pipeline first
    if (ragPipeline) {
      logger.info(`🔗 RAG Product Search: "${query}"`);
      const result = await ragPipeline.productSearch(query, filters, true);
      if (result.success && result.products.length > 0) {
        return {
          success: true,
          query,
          searchMode: 'hybrid_rag',
          products: result.products,
          totalResults: result.totalResults,
          aiInsights: result.aiSummary ? { summary: result.aiSummary } : null,
          retrievalStats: result.retrievalStats,
          timestamp: new Date().toISOString(),
          latencyMs: result.latencyMs
        };
      }
      logger.info('⚠️ RAG search returned no results, falling back to legacy search');
    }

    // Fallback to legacy AI search
    return await aiProductSearch(query);
  } catch (error) {
    logger.error('Error in RAG product search, falling back:', error.message);
    return await aiProductSearch(query);
  }
};

module.exports = {
  parseSearchQuery,
  smartSearch,
  aiProductSearch,
  ragProductSearch,
  generateSearchInsights
};
