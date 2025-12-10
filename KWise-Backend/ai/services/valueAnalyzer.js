/**
 * Value Analyzer Service for K-Wise AI Integration
 * Handles Hot Picks and Value for Money recommendations
 * Specialized for Philippine PC market analysis
 */

const ollamaService = require('./ollamaService');
const aiConfig = require('../config/aiConfig');
const logger = require('../../utils/logger');
const aiCircuitBreaker = require('../../services/aiCircuitBreaker');

class ValueAnalyzer {
  constructor() {
    this.systemPrompt = `You are an expert PC hardware market analyst for K-Wise, a computer store in the Philippines.

Your expertise includes:
- Philippine PC market trends and preferences
- Price-to-performance analysis in PHP currency
- Gaming and productivity hardware popularity
- Brand preferences in Southeast Asia
- Current technology trends (2024-2025)
- Budget gaming vs professional workstation requirements
- Popular PC builds and configurations

Always provide responses in valid JSON format only. Consider Philippine market conditions, import costs, and local preferences.`;
  }

  /**
   * Generate Hot Picks based on popularity, performance, and trends
   * @param {Array} products - Available products
   * @param {Object} marketData - Market trends and sales data
   * @param {number} limit - Number of hot picks
   * @returns {Promise<Object>} Hot picks recommendations
   */
  async generateHotPicks(products, marketData = {}, limit = 8) {
    if (!aiConfig.service.enabled || !products.length) {
      return this.getFallbackHotPicks(products, limit);
    }

    const prompt = `
Analyze these PC products and select the TOP ${limit} items as "Hot Picks" - currently trending and highly demanded products in the Philippine market.

PRODUCTS TO ANALYZE:
${products.slice(0, 30).map((product, index) => `
${index + 1}. ${product.name}
   Category: ${product.category}
   Brand: ${product.brand}
   Price: ${product.price}
   Stock: ${product.stock || 0}
   Specifications: ${JSON.stringify(product.specifications || {}, null, 2)}
`).join('')}

MARKET DATA:
Sales Trends: ${JSON.stringify(marketData.salesTrends || {}, null, 2)}
Popular Categories: ${marketData.popularCategories ? marketData.popularCategories.join(', ') : 'Gaming, Productivity'}
Price Preferences: ${marketData.priceRange || '₱15,000 - ₱50,000'}

Consider for Hot Picks:
1. Latest technology (DDR5, RTX 40/RX 7000 series, Intel 13th/AMD 7000)
2. Popular gaming components (high refresh rate monitors, mechanical keyboards)
3. Value gaming GPUs and CPUs
4. Trending productivity components
5. Brand popularity in Philippines (ASUS, MSI, Gigabyte, Corsair)
6. High stock availability indicates popularity
7. Sweet spot price-to-performance ratio

Provide response in this EXACT JSON format:
{
  "hotPicks": [
    {
      "componentId": "string",
      "name": "string",
      "category": "string",
      "brand": "string",
      "price": "formatted price",
      "originalPrice": "string",
      "imageUrl": "string",
      "trendingReason": "why it's trending",
      "popularityScore": number (0-100),
      "demandLevel": "high|very_high|extreme",
      "targetAudience": "gamers|creators|professionals|general",
      "keyFeatures": ["feature1", "feature2"],
      "marketPosition": "budget|mid_range|premium|flagship"
    }
  ],
  "analysis": {
    "totalAnalyzed": number,
    "trendingCategories": ["category1", "category2"],
    "averagePrice": "price range",
    "recommendationConfidence": number (0-100)
  }
}`;

    try {
      // Use circuit breaker to prevent overwhelming Ollama with failing requests
      const response = await aiCircuitBreaker.call(
        async () => {
          return await ollamaService.generateResponse(
            prompt,
            this.systemPrompt,
            aiConfig.parameters.recommendations
          );
        },
        {
          fallbackValue: null, // Return null to trigger fallback
          metadata: {
            operation: 'hot-picks-generation',
            productsCount: products.length,
            limit
          }
        }
      );

      if (!response) {
        logger.warn('Circuit breaker returned null, using fallback');
        return this.getFallbackHotPicks(products, limit);
      }

      return this.parseHotPicksResponse(response, products);
    } catch (error) {
      logger.warn('Hot picks generation failed, using fallback', {
        error: error.message,
        productsCount: products.length,
        circuitBreakerState: aiCircuitBreaker.getStatus().state
      });
      return this.getFallbackHotPicks(products, limit);
    }
  }

  /**
   * Generate Value for Money recommendations
   * @param {Array} products - Available products
   * @param {Object} marketData - Market trends and pricing data
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Object>} Value for money recommendations
   */
  async generateValueForMoney(products, marketData = {}, limit = 8) {
    if (!aiConfig.service.enabled || !products.length) {
      return this.getFallbackValueForMoney(products, limit);
    }

    const prompt = `
Analyze these PC products and select the TOP ${limit} items offering the BEST VALUE FOR MONEY in the Philippine market.

PRODUCTS TO ANALYZE:
${products.slice(0, 30).map((product, index) => `
${index + 1}. ${product.name}
   Category: ${product.category}
   Brand: ${product.brand}
   Price: ${product.price}
   Stock: ${product.stock || 0}
   Specifications: ${JSON.stringify(product.specifications || {}, null, 2)}
`).join('')}

MARKET CONTEXT:
Average Pricing: ${JSON.stringify(marketData.averagePricing || {}, null, 2)}
Competitor Prices: ${JSON.stringify(marketData.competitorPrices || {}, null, 2)}
Price Trends: ${marketData.priceTrends || 'Stable to slightly increasing'}

Consider for Value for Money:
1. Price-to-performance ratio (performance per peso)
2. Long-term value and future-proofing
3. Reliability and warranty support in Philippines
4. Power efficiency (important for electricity costs)
5. Upgrade path and compatibility
6. Brand reputation for after-sales service
7. Features vs price comparison
8. Total cost of ownership

Provide response in this EXACT JSON format:
{
  "valueForMoney": [
    {
      "componentId": "string",
      "name": "string",
      "category": "string", 
      "brand": "string",
      "price": "formatted price",
      "originalPrice": "string",
      "imageUrl": "string",
      "valueScore": number (0-100),
      "pricePerformanceRatio": number,
      "valueReason": "why it offers great value",
      "keyBenefits": ["benefit1", "benefit2"],
      "costSavings": "how much saved vs alternatives",
      "targetBudget": "budget|mid_range|premium",
      "recommendationLevel": "highly_recommended|recommended|good_option"
    }
  ],
  "analysis": {
    "totalAnalyzed": number,
    "bestValueCategories": ["category1", "category2"],
    "averageValueScore": number,
    "priceRange": "price range covered"
  }
}`;

    try {
      // Use circuit breaker for value for money analysis
      const response = await aiCircuitBreaker.call(
        async () => {
          return await ollamaService.generateResponse(
            prompt,
            this.systemPrompt,
            aiConfig.parameters.recommendations
          );
        },
        {
          fallbackValue: null,
          metadata: {
            operation: 'value-for-money-generation',
            productsCount: products.length,
            limit
          }
        }
      );

      if (!response) {
        logger.warn('Circuit breaker returned null, using fallback');
        return this.getFallbackValueForMoney(products, limit);
      }

      return this.parseValueForMoneyResponse(response, products);
    } catch (error) {
      logger.warn('Value for money analysis failed, using fallback', {
        error: error.message,
        productsCount: products.length,
        circuitBreakerState: aiCircuitBreaker.getStatus().state
      });
      return this.getFallbackValueForMoney(products, limit);
    }
  }

  /**
   * Analyze overall market value and trends
   * @param {Array} allProducts - All available products
   * @param {Object} salesData - Sales and trend data
   * @returns {Promise<Object>} Market analysis
   */
  async analyzeMarketTrends(allProducts, salesData = {}) {
    if (!aiConfig.service.enabled || !allProducts.length) {
      return this.getFallbackMarketAnalysis();
    }

    const categoryStats = this.calculateCategoryStatistics(allProducts);

    const prompt = `
Analyze the current PC hardware market trends for K-Wise Philippines:

PRODUCT STATISTICS:
${Object.entries(categoryStats).map(([category, stats]) => `
${category}:
- Total Products: ${stats.count}
- Price Range: ${stats.minPrice} - ${stats.maxPrice}
- Average Price: ${stats.avgPrice}
- Popular Brands: ${stats.topBrands.join(', ')}
`).join('')}

SALES DATA:
Recent Sales: ${JSON.stringify(salesData.recentSales || {}, null, 2)}
Top Categories: ${salesData.topCategories ? salesData.topCategories.join(', ') : 'Unknown'}
Seasonal Trends: ${salesData.seasonalTrends || 'Holiday season approaching'}

Provide comprehensive market analysis in this EXACT JSON format:
{
  "marketTrends": {
    "hotCategories": ["category1", "category2"],
    "growingSegments": ["segment1", "segment2"],
    "priceInflation": {
      "affected": ["category"],
      "impact": "low|medium|high"
    },
    "seasonalFactors": ["factor1", "factor2"],
    "consumerPreferences": ["preference1", "preference2"]
  },
  "recommendations": {
    "stockUp": ["category to increase stock"],
    "promote": ["category to push sales"],
    "watchList": ["items to monitor"]
  },
  "insights": [
    "key insight 1",
    "key insight 2",
    "key insight 3"
  ]
}`;

    try {
      // Use circuit breaker for market trends analysis
      const response = await aiCircuitBreaker.call(
        async () => {
          return await ollamaService.generateResponse(
            prompt,
            this.systemPrompt,
            aiConfig.parameters.recommendations
          );
        },
        {
          fallbackValue: null,
          metadata: {
            operation: 'market-trends-analysis',
            productsCount: allProducts.length
          }
        }
      );

      if (!response) {
        logger.warn('Circuit breaker returned null for market analysis, using fallback');
        return this.getFallbackMarketAnalysis();
      }

      return this.parseMarketAnalysisResponse(response);
    } catch (error) {
      logger.warn('Market trends analysis failed, using fallback', {
        error: error.message,
        productsCount: allProducts.length,
        circuitBreakerState: aiCircuitBreaker.getStatus().state
      });
      return this.getFallbackMarketAnalysis();
    }
  }

  /**
   * Calculate category statistics for analysis
   * @param {Array} products - All products
   * @returns {Object} Category statistics
```
        error: error.message
      });
      return this.getFallbackMarketAnalysis();
    }
  }

  /**
   * Calculate category statistics for analysis
   * @param {Array} products - All products
   * @returns {Object} Category statistics
   */
  calculateCategoryStatistics(products) {
    const stats = {};

    products.forEach(product => {
      const category = product.category;
      const price = parseFloat(product.price?.toString().replace(/[₱,]/g, '')) || 0;

      if (!stats[category]) {
        stats[category] = {
          count: 0,
          prices: [],
          brands: {}
        };
      }

      stats[category].count++;
      if (price > 0) stats[category].prices.push(price);
      if (product.brand) {
        stats[category].brands[product.brand] = (stats[category].brands[product.brand] || 0) + 1;
      }
    });

    // Calculate derived statistics
    Object.keys(stats).forEach(category => {
      const categoryData = stats[category];
      const prices = categoryData.prices;

      if (prices.length > 0) {
        categoryData.minPrice = `₱${Math.min(...prices).toLocaleString()}`;
        categoryData.maxPrice = `₱${Math.max(...prices).toLocaleString()}`;
        categoryData.avgPrice = `₱${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}`;
      } else {
        categoryData.minPrice = '₱0';
        categoryData.maxPrice = '₱0';
        categoryData.avgPrice = '₱0';
      }

      categoryData.topBrands = Object.entries(categoryData.brands)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([brand]) => brand);
    });

    return stats;
  }

  /**
   * Parse hot picks response
   * @param {string} response - AI response
   * @returns {Object} Parsed hot picks
   */
  /**
   * Parse hot picks response with robust JSON extraction
   * @param {string} response - AI response
   * @returns {Object} Parsed hot picks
   */
  parseHotPicksResponse(response, products = []) {
    try {
      // ROOT CAUSE FIX: Handle null/undefined responses
      if (!response || typeof response !== 'string') {
        logger.warn('Hot picks response is null or invalid type', { 
          responseType: typeof response,
          response: response 
        });
        return this.getFallbackHotPicks(products, 8);
      }
      
      // ROOT CAUSE FIX: Handle empty string responses
      if (response.trim() === '') {
        logger.warn('Hot picks response is empty string');
        return this.getFallbackHotPicks(products, 8);
      }
      
      // Use JSON extractor for robust parsing (handles <think> tags, markdown, etc.)
      const JSONExtractor = require('../utils/jsonExtractor');
      const parsed = JSONExtractor.extractJSON(response);
      
      // ROOT CAUSE FIX: Validate parsed structure
      if (!parsed || typeof parsed !== 'object') {
        logger.warn('Parsed hot picks response is not an object - AI returned non-JSON', { 
          parsed,
          responsePreview: response.substring(0, 500)
        });
        return this.getFallbackHotPicks(products, 8);
      }
      
      // ✅ FIX: Enrich AI recommendations with full product data (description, specifications)
      const enrichedHotPicks = Array.isArray(parsed.hotPicks) 
        ? parsed.hotPicks.map(pick => {
            // Find matching product from original products array
            const matchingProduct = products.find(p => 
              p.id === pick.componentId || 
              p.id === pick.id ||
              p.name === pick.name
            );
            
            // Merge AI analysis with full product data
            return {
              ...pick,
              id: pick.componentId || pick.id,  // ✅ Ensure id field exists
              description: matchingProduct?.description || pick.description,  // ✅ FIX: Include description
              specifications: matchingProduct?.specifications || pick.specifications,  // ✅ FIX: Include specifications
              stock: matchingProduct?.stock,
              // Keep AI-generated fields
              trendingReason: pick.trendingReason,
              popularityScore: pick.popularityScore,
              demandLevel: pick.demandLevel,
              targetAudience: pick.targetAudience,
              keyFeatures: pick.keyFeatures,
              marketPosition: pick.marketPosition
            };
          })
        : [];
      
      return {
        hotPicks: enrichedHotPicks,
        analysis: parsed.analysis || {
          totalAnalyzed: 0,
          trendingCategories: [],
          averagePrice: '₱0',
          recommendationConfidence: 75
        }
      };
    } catch (error) {
      logger.warn('Failed to parse hot picks response', { 
        error: error.message,
        response: response ? response.substring(0, 200) : 'null'
      });
      return this.getFallbackHotPicks(products, 8);
    }
  }

  /**
   * Parse value for money response with robust JSON extraction
   * @param {string} response - AI response
   * @returns {Object} Parsed value recommendations
   */
  parseValueForMoneyResponse(response, products = []) {
    try {
      // ROOT CAUSE FIX: Handle null/undefined responses
      if (!response || typeof response !== 'string') {
        logger.warn('Value for money response is null or invalid type', { 
          responseType: typeof response,
          response: response 
        });
        return this.getFallbackValueForMoney(products, 8);
      }
      
      // ROOT CAUSE FIX: Handle empty string responses
      if (response.trim() === '') {
        logger.warn('Value for money response is empty string');
        return this.getFallbackValueForMoney(products, 8);
      }
      
      // Use JSON extractor for robust parsing (handles <think> tags, markdown, etc.)
      const JSONExtractor = require('../utils/jsonExtractor');
      const parsed = JSONExtractor.extractJSON(response);
      
      // ROOT CAUSE FIX: Validate parsed structure
      if (!parsed || typeof parsed !== 'object') {
        logger.warn('Parsed value for money response is not an object - AI returned non-JSON', { 
          parsed,
          responsePreview: response.substring(0, 500)
        });
        return this.getFallbackValueForMoney(products, 8);
      }
      
      // ✅ FIX: Enrich AI recommendations with full product data (description, specifications)
      const enrichedValuePicks = Array.isArray(parsed.valueForMoney) 
        ? parsed.valueForMoney.map(pick => {
            // Find matching product from original products array
            const matchingProduct = products.find(p => 
              p.id === pick.componentId || 
              p.id === pick.id ||
              p.name === pick.name
            );
            
            // Merge AI analysis with full product data
            return {
              ...pick,
              id: pick.componentId || pick.id,  // ✅ Ensure id field exists
              description: matchingProduct?.description || pick.description,  // ✅ FIX: Include description
              specifications: matchingProduct?.specifications || pick.specifications,  // ✅ FIX: Include specifications
              stock: matchingProduct?.stock,
              // Keep AI-generated fields
              valueScore: pick.valueScore,
              pricePerformanceRatio: pick.pricePerformanceRatio,
              valueReason: pick.valueReason,
              keyBenefits: pick.keyBenefits,
              costSavings: pick.costSavings,
              targetBudget: pick.targetBudget,
              recommendationLevel: pick.recommendationLevel
            };
          })
        : [];
      
      return {
        valueForMoney: enrichedValuePicks,
        analysis: parsed.analysis || {
          totalAnalyzed: 0,
          bestValueCategories: [],
          averageValueScore: 75,
          priceRange: '₱0 - ₱0'
        }
      };
    } catch (error) {
      logger.warn('Failed to parse value for money response', { 
        error: error.message,
        response: response ? response.substring(0, 200) : 'null'
      });
      return this.getFallbackValueForMoney(products, 8);
    }
  }

  /**
   * Parse market analysis response
   * @param {string} response - AI response
   * @returns {Object} Parsed market analysis
   */
  parseMarketAnalysisResponse(response) {
    try {
      // FIX: Handle undefined/null responses before parsing
      if (!response) {
        logger.warn('Empty AI response received, using fallback');
        return this.getFallbackMarketAnalysis();
      }
      
      const parsed = JSON.parse(response);
      
      // FIX: Add null checks before accessing properties
      if (!parsed || typeof parsed !== 'object') {
        logger.warn('Invalid AI response structure, using fallback');
        return this.getFallbackMarketAnalysis();
      }
      
      return {
        marketTrends: parsed.marketTrends || {},
        recommendations: parsed.recommendations || {},
        insights: Array.isArray(parsed.insights) ? parsed.insights : []
      };
    } catch (error) {
      logger.warn('Failed to parse market analysis response', { error: error.message });
      return this.getFallbackMarketAnalysis();
    }
  }

  /**
   * Fallback hot picks (simple selection)
   * @param {Array} products - Available products
   * @param {number} limit - Number to select
   * @returns {Object} Fallback hot picks
   */
  /**
   * Fallback hot picks based on most purchased items from orders
   * @param {Array} products - Available products
   * @param {number} limit - Number to select
   * @returns {Object} Hot picks based on actual purchase data
   */
  async getFallbackHotPicks(products, limit) {
    try {
      // Ensure products array exists and has items
      if (!products || products.length === 0) {
        logger.warn('No products provided to getFallbackHotPicks');
        return this.getEmptyHotPicksResponse();
      }

      // Query most purchased items from database
      const db = require('../../config/database');
      const query = `
        SELECT 
          p.id,
          p.name,
          p.category,
          p.brand,
          p.price,
          p.stock,
          p.image_url,
          p.description,
          p.specifications,
          COUNT(oi.id) as purchase_count,
          AVG(oi.price) as avg_purchase_price
        FROM pc_parts p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE p.is_active = true
          AND o.status != 'cancelled'
          AND o.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY p.id, p.name, p.category, p.brand, p.price, p.stock, p.image_url, p.description, p.specifications
        ORDER BY purchase_count DESC, avg_purchase_price DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      
      if (result.rows && result.rows.length > 0) {
        const selected = result.rows.map(product => ({
          componentId: product.id,
          id: product.id,  // ✅ FIX: Add id field for frontend compatibility
          name: product.name,
          category: product.category,
          brand: product.brand,
          price: product.price,
          originalPrice: product.price,
          imageUrl: product.image_url,
          description: product.description,  // ✅ FIX: Include description from database
          specifications: product.specifications,  // ✅ FIX: Include specifications from database
          stock: product.stock || 0,  // 🔥 CRITICAL FIX: Include stock field from database
          trendingReason: `${product.purchase_count} purchases in last 90 days`,
          popularityScore: Math.min(100, Math.round((product.purchase_count / result.rows[0].purchase_count) * 100)),
          demandLevel: product.purchase_count > 10 ? 'extreme' : product.purchase_count > 5 ? 'very_high' : 'high',
          targetAudience: 'general',
          keyFeatures: ['Most purchased item', 'Proven popularity'],
          marketPosition: 'mid_range',
          purchaseCount: product.purchase_count
        }));

        logger.info('✅ Hot picks based on purchase data', {
          itemsFound: selected.length,
          totalPurchases: selected.reduce((sum, p) => sum + p.purchaseCount, 0)
        });

        return {
          hotPicks: selected,
          analysis: {
            totalAnalyzed: products.length,
            trendingCategories: [...new Set(selected.map(p => p.category))],
            averagePrice: 'Based on actual purchases',
            recommendationConfidence: 95,
            dataSource: 'Most purchased items (90 days)'
          }
        };
      } else {
        logger.warn('⚠️ No purchase data found in last 90 days, using product-based fallback');
      }
    } catch (error) {
      logger.warn('❌ Failed to query most purchased items, using product-based fallback', {
        error: error.message,
        stack: error.stack
      });
    }

    // If database query fails or returns no results, use products array as fallback
    if (!products || products.length === 0) {
      logger.error('❌ No products available for fallback hot picks');
      return this.getEmptyHotPicksResponse();
    }

    logger.info('📦 Using product-based fallback for hot picks', { productsAvailable: products.length, limit });
    
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit).map(product => ({
      componentId: product.id || product.component_id,
      id: product.id || product.component_id,  // ✅ FIX: Add id field
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      originalPrice: product.price,
      imageUrl: product.imageUrl || product.image_url,
      description: product.description,  // ✅ FIX: Include description
      specifications: product.specifications,  // ✅ FIX: Include specifications
      stock: product.stock || 0,  // 🔥 CRITICAL FIX: Include stock field
      trendingReason: 'Popular selection in category',
      popularityScore: 75,
      demandLevel: 'high',
      targetAudience: 'general',
      keyFeatures: ['Quality component', 'Good value'],
      marketPosition: 'mid_range'
    }));

    return {
      hotPicks: selected,
      analysis: {
        totalAnalyzed: products.length,
        trendingCategories: [...new Set(selected.map(p => p.category))],
        averagePrice: 'Varied',
        recommendationConfidence: 60,
        dataSource: 'Random selection (fallback)'
      }
    };
  }

  /**
   * Fallback value for money
   * @param {Array} products - Available products  
   * @param {number} limit - Number to select
   * @returns {Object} Fallback value recommendations
   */
  getEmptyHotPicksResponse() {
    return {
      hotPicks: [],
      analysis: {
        totalAnalyzed: 0,
        trendingCategories: [],
        averagePrice: 'N/A',
        recommendationConfidence: 0,
        dataSource: 'No data available'
      }
    };
  }

  getFallbackValueForMoney(products, limit) {
    // Ensure products array exists
    if (!products || products.length === 0) {
      logger.warn('No products provided to getFallbackValueForMoney');
      return {
        valueForMoney: [],
        analysis: {
          totalAnalyzed: 0,
          trendingCategories: [],
          averagePrice: 'N/A',
          recommendationConfidence: 0,
          dataSource: 'No data available'
        }
      };
    }

    logger.info('📦 Using price-based fallback for value picks', { productsAvailable: products.length, limit });

    // Sort by price (ascending) for value picks
    const sortedByPrice = [...products].sort((a, b) => {
      const priceA = parseFloat(a.price?.toString().replace(/[₱,]/g, '')) || 0;
      const priceB = parseFloat(b.price?.toString().replace(/[₱,]/g, '')) || 0;
      return priceA - priceB;
    });

    const selected = sortedByPrice.slice(0, limit).map(product => ({
      componentId: product.id || product.component_id,
      id: product.id || product.component_id,  // ✅ FIX: Add id field
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      originalPrice: product.price,
      imageUrl: product.imageUrl || product.image_url,
      description: product.description,  // ✅ FIX: Include description
      specifications: product.specifications,  // ✅ FIX: Include specifications
      stock: product.stock || 0,  // 🔥 CRITICAL FIX: Include stock field
      valueScore: 80,
      pricePerformanceRatio: 1.2,
      valueReason: 'Competitive pricing in category',
      keyBenefits: ['Affordable price', 'Reliable performance'],
      costSavings: 'Good market value',
      targetBudget: 'budget',
      recommendationLevel: 'recommended'
    }));

    return {
      valueForMoney: selected,
      analysis: {
        totalAnalyzed: products.length,
        bestValueCategories: [...new Set(selected.map(p => p.category))],
        averageValueScore: 80,
        priceRange: 'Varied'
      }
    };
  }

  /**
   * Fallback market analysis
   * @returns {Object} Default market analysis
   */
  getFallbackMarketAnalysis() {
    return {
      marketTrends: {
        hotCategories: ['GPU', 'CPU', 'RAM'],
        growingSegments: ['Gaming', 'Content Creation'],
        priceInflation: { affected: [], impact: 'low' },
        seasonalFactors: ['Holiday season'],
        consumerPreferences: ['Value for money', 'Gaming performance']
      },
      recommendations: {
        stockUp: ['Popular categories'],
        promote: ['High margin items'],
        watchList: ['Trending components']
      },
      insights: [
        'AI analysis temporarily unavailable',
        'Using market data fallback',
        'Manual analysis recommended'
      ]
    };
  }

  /**
   * Generate AI-powered upgrade recommendations for future upgrade analysis
   * @param {Array} currentComponents - Current PC components
   * @param {number} budget - Upgrade budget
   * @param {string} marketTrends - Current market trends context
   * @returns {Promise<Array>} Upgrade recommendations
   */
  async generateUpgradeRecommendations(currentComponents, budget = 50000, marketTrends = '') {
    if (!aiConfig.service.enabled || !currentComponents.length) {
      return this.getFallbackUpgradeRecommendations(currentComponents);
    }

    const prompt = `
Analyze these current PC components and provide intelligent upgrade recommendations for 2024-2025:

CURRENT COMPONENTS:
${currentComponents.map((comp, index) => `
${index + 1}. ${comp.name || 'Unknown Component'}
   Category: ${comp.category || 'Unknown'}
   Current Price: ${comp.price || 'Unknown'}
   Specifications: ${JSON.stringify(comp.specifications || {}, null, 2)}
`).join('')}

UPGRADE CONTEXT:
Budget Range: ₱${budget.toLocaleString()} (total for all upgrades)
Market Trends: ${marketTrends || '2024-2025 Philippine PC market - Gaming, productivity, content creation focus'}
Timeline: 1-2 years future-proofing
Use Case: Gaming, productivity, content creation, streaming

UPGRADE ANALYSIS CRITERIA:
1. Performance per peso value
2. Future-proofing for 2-3 years
3. Compatibility with current generation technology
4. Power efficiency and thermal management
5. Philippine market availability and pricing
6. Gaming performance enhancement
7. Content creation capability improvement
8. Overall system balance and bottleneck elimination

Generate ONE optimal upgrade recommendation per component. Focus on realistic, market-available upgrades that provide excellent value.

Provide response in this EXACT JSON format:
{
  "upgradeRecommendations": [
    {
      "category": "string",
      "currentComponent": "string",
      "recommendedUpgrade": "string",
      "priceEstimate": number,
      "performanceGain": "string",
      "compatibilityLevel": "excellent|good|fair",
      "futureProofing": "string",
      "upgradeReason": "string",
      "marketAvailability": "high|medium|low",
      "valueRating": number (0-100),
      "targetUseCase": "string"
    }
  ],
  "totalUpgradeCost": number,
  "overallPerformanceGain": "string",
  "priorityOrder": ["category1", "category2"],
  "marketInsights": ["insight1", "insight2"]
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.recommendations
      );

      const parsed = JSON.parse(response);
      return parsed.upgradeRecommendations || [];
    } catch (error) {
      logger.warn('AI upgrade recommendations failed, using fallback', {
        error: error.message,
        componentsCount: currentComponents.length
      });
      return this.getFallbackUpgradeRecommendations(currentComponents);
    }
  }

  /**
   * Fallback upgrade recommendations when AI is unavailable
   * @param {Array} currentComponents - Current components
   * @returns {Array} Fallback upgrade recommendations
   */
  getFallbackUpgradeRecommendations(currentComponents) {
    return currentComponents.map(component => {
      const componentPrice = parseFloat((component.price || '0').toString().replace(/[^\d.]/g, '')) || 0;
      const upgradePrice = componentPrice * 1.8; // 80% price increase for significant upgrade

      return {
        category: component.category || 'Component',
        currentComponent: component.name || 'Current Component',
        recommendedUpgrade: this.generateUpgradeItem(component.name, component.category),
        priceEstimate: upgradePrice,
        performanceGain: '75-85% performance improvement',
        compatibilityLevel: 'excellent',
        futureProofing: '2-3 years future-ready technology',
        upgradeReason: `Next-generation ${component.category || 'component'} with enhanced performance, efficiency, and future-proofing features.`,
        marketAvailability: 'high',
        valueRating: 85,
        targetUseCase: 'Gaming, productivity, content creation'
      };
    });
  }

  /**
   * Generate realistic upgrade item names
   * @param {string} currentName - Current component name
   * @param {string} category - Component category
   * @returns {string} Upgrade item name
   */
  generateUpgradeItem(currentName, category) {
    const futureUpgrades = {
      'Mouse': ['Logitech G Pro X Superlight 2', 'Razer Viper V3 Pro', 'SteelSeries Aerox 9 Wireless'],
      'Motherboard': ['ASUS ROG Maximus Z790 Hero', 'MSI MPG Z790 Carbon WiFi', 'Gigabyte Z790 Aorus Master'],
      'Cooler': ['NZXT Kraken Elite 360', 'Corsair H150i Elite LCD', 'Arctic Liquid Freezer III 360'],
      'CPU': ['Intel Core i7-14700K', 'AMD Ryzen 7 7800X3D', 'Intel Core i9-14900K'],
      'GPU': ['NVIDIA RTX 4070 Super', 'AMD RX 7800 XT', 'NVIDIA RTX 4080'],
      'RAM': ['G.Skill Trident Z5 RGB 32GB DDR5-6000', 'Corsair Dominator Platinum RGB 32GB DDR5', 'Kingston Fury Beast 32GB DDR5'],
      'Storage': ['Samsung 990 Pro 2TB PCIe 4.0', 'WD Black SN850X 2TB', 'Crucial T700 2TB PCIe 5.0'],
      'PSU': ['Corsair RM1000x 80+ Gold', 'Seasonic Focus GX-850 80+ Gold', 'MSI MPG A850GF 80+ Gold'],
      'Case': ['Lian Li O11 Dynamic EVO', 'Corsair iCUE 5000X RGB', 'NZXT H7 Flow']
    };

    const categoryUpgrades = futureUpgrades[category] || [`Next-Gen ${category}`, `Premium ${category} 2024`, `High-Performance ${category}`];
    return categoryUpgrades[Math.floor(Math.random() * categoryUpgrades.length)];
  }
}

module.exports = new ValueAnalyzer();