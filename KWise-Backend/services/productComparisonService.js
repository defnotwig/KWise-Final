/**
 * Product Comparison Service
 * Provides AI-powered product comparisons using Ollama DeepSeek R1
 * Max 2 products, same category, with 1-2 sentence AI summary
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class ProductComparisonService {
  constructor() {
    this.ollamaService = null;
    this.maxProducts = 2;
  }

  /**
   * Initialize Ollama service (lazy loading)
   */
  getOllamaService() {
    if (!this.ollamaService) {
      try {
        this.ollamaService = require('../ai/services/ollamaService');
        logger.info('✅ Ollama service initialized for product comparison');
      } catch (error) {
        logger.warn('⚠️  Ollama service not available:', error.message);
        this.ollamaService = null;
      }
    }
    return this.ollamaService;
  }

  /**
   * Compare two products with AI analysis
   * @param {Number} product1Id - First product ID
   * @param {Number} product2Id - Second product ID
   * @param {String} sessionId - Optional session ID for tracking
   * @returns {Promise<Object>} - Comparison result with AI summary
   */
  async compareProducts(product1Id, product2Id, sessionId = null) {
    try {
      logger.info(`🔍 Comparing products: ${product1Id} vs ${product2Id}`);

      // Fetch both products
      const products = await this._fetchProducts([product1Id, product2Id]);

      if (products.length !== 2) {
        throw new Error('Could not fetch both products for comparison');
      }

      const [product1, product2] = products;

      // Validate same category
      if (product1.category !== product2.category) {
        throw new Error('Products must be from the same category for comparison');
      }

      // Get AI comparison summary
      const aiSummary = await this._generateAIComparison(product1, product2);

      // Build detailed comparison
      const comparison = {
        product1: this._formatProduct(product1),
        product2: this._formatProduct(product2),
        category: product1.category,
        aiSummary: aiSummary.summary,
        winner: aiSummary.winner,
        comparisonDetails: {
          priceComparison: this._comparePrices(product1, product2),
          specificationComparison: this._compareSpecifications(product1, product2),
          tierComparison: this._compareTiers(product1, product2),
          valueAnalysis: aiSummary.valueAnalysis
        },
        timestamp: new Date().toISOString()
      };

      // Store comparison in database
      await this._storeComparison(product1, product2, aiSummary, sessionId);

      return comparison;

    } catch (error) {
      logger.error('❌ Error comparing products:', error);
      throw error;
    }
  }

  /**
   * Fetch products from database
   */
  async _fetchProducts(productIds) {
    try {
      const result = await query(`
                SELECT 
                    id,
                    name,
                    category,
                    brand,
                    price,
                    stock,
                    tier,
                    specifications,
                    image_url,
                    description,
                    is_active
                FROM pc_parts
                WHERE id = ANY($1)
                  AND is_active = true
            `, [productIds]);

      return result.rows;
    } catch (error) {
      logger.error('❌ Error fetching products:', error);
      return [];
    }
  }

  /**
   * Format product for response
   */
  _formatProduct(product) {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: parseFloat(product.price),
      tier: product.tier,
      stock: product.stock,
      imageUrl: product.image_url,
      specifications: product.specifications || {},
      description: product.description
    };
  }

  /**
   * Generate AI comparison summary (1-2 sentences)
   */
  async _generateAIComparison(product1, product2) {
    try {
      const ollama = this.getOllamaService();

      if (!ollama) {
        logger.warn('⚠️  AI comparison unavailable, generating fallback');
        return this._generateFallbackComparison(product1, product2);
      }

      // Build prompt for concise comparison
      const prompt = this._buildComparisonPrompt(product1, product2);

      // Call Ollama with timeout
      const aiResponse = await Promise.race([
        ollama.generateResponse(prompt, {
          model: 'deepseek-r1:latest',
          temperature: 0.4,
          max_tokens: 300 // Short response
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout')), 20000)
        )
      ]);

      // Parse AI response
      return this._parseComparisonResponse(aiResponse, product1, product2);

    } catch (error) {
      logger.warn('⚠️  AI comparison failed, using fallback:', error.message);
      return this._generateFallbackComparison(product1, product2);
    }
  }

  /**
   * Build comparison prompt for AI
   */
  _buildComparisonPrompt(product1, product2) {
    return `Compare these two ${product1.category} products. Provide a concise 1-2 sentence summary stating which is better for specifications and value for money.

PRODUCT 1:
- Name: ${product1.name}
- Brand: ${product1.brand}
- Price: ₱${product1.price}
- Tier: ${product1.tier || 'unknown'}
${product1.specifications ? `- Specs: ${JSON.stringify(product1.specifications)}` : ''}

PRODUCT 2:
- Name: ${product2.name}
- Brand: ${product2.brand}
- Price: ₱${product2.price}
- Tier: ${product2.tier || 'unknown'}
${product2.specifications ? `- Specs: ${JSON.stringify(product2.specifications)}` : ''}

Respond with JSON format:
{
  "summary": "<1-2 sentence comparison>",
  "winner": <1 or 2>,
  "valueAnalysis": "<brief value assessment>"
}

Focus on: specifications quality, price-to-performance ratio, and overall value.`;
  }

  /**
   * Parse AI comparison response
   */
  _parseComparisonResponse(aiResponse, product1, product2) {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || `Comparing ${product1.name} vs ${product2.name}`,
        winner: parsed.winner === 1 ? product1.id : (parsed.winner === 2 ? product2.id : null),
        valueAnalysis: parsed.valueAnalysis || 'Both products offer competitive value.'
      };

    } catch (error) {
      logger.warn('⚠️  Failed to parse AI response, using fallback');
      return this._generateFallbackComparison(product1, product2);
    }
  }

  /**
   * Generate fallback comparison (rule-based)
   */
  _generateFallbackComparison(product1, product2) {
    const priceDiff = product1.price - product2.price;
    const tierLevels = { 'entry': 1, 'mid-tier': 2, 'high-tier': 3, 'elite': 4 };
    const tier1 = tierLevels[product1.tier] || 2;
    const tier2 = tierLevels[product2.tier] || 2;

    let summary = '';
    let winner = null;

    if (tier1 > tier2) {
      if (priceDiff < product1.price * 0.3) {
        summary = `${product1.name} offers better performance tier (${product1.tier}) at a reasonable price premium, making it the better value choice.`;
        winner = product1.id;
      } else {
        summary = `${product1.name} has higher tier but ${product2.name} provides better value for money with ${product2.tier} performance at a lower price.`;
        winner = product2.id;
      }
    } else if (tier2 > tier1) {
      if (Math.abs(priceDiff) < product2.price * 0.3) {
        summary = `${product2.name} offers better performance tier (${product2.tier}) at a reasonable price premium, making it the better value choice.`;
        winner = product2.id;
      } else {
        summary = `${product2.name} has higher tier but ${product1.name} provides better value for money with ${product1.tier} performance at a lower price.`;
        winner = product1.id;
      }
    } else {
      // Same tier
      if (priceDiff > 0) {
        summary = `Both are ${product1.tier} tier, but ${product2.name} offers better value at ₱${Math.abs(priceDiff).toFixed(2)} less.`;
        winner = product2.id;
      } else if (priceDiff < 0) {
        summary = `Both are ${product1.tier} tier, but ${product1.name} offers better value at ₱${Math.abs(priceDiff).toFixed(2)} less.`;
        winner = product1.id;
      } else {
        summary = `Both products are ${product1.tier} tier with similar pricing; choose based on brand preference.`;
        winner = null;
      }
    }

    return {
      summary,
      winner,
      valueAnalysis: `Price difference: ₱${Math.abs(priceDiff).toFixed(2)}, Tier comparison: ${product1.tier} vs ${product2.tier}`
    };
  }

  /**
   * Compare prices
   */
  _comparePrices(product1, product2) {
    const diff = product1.price - product2.price;
    const percentDiff = (Math.abs(diff) / Math.max(product1.price, product2.price)) * 100;

    return {
      product1Price: parseFloat(product1.price),
      product2Price: parseFloat(product2.price),
      difference: parseFloat(diff.toFixed(2)),
      percentDifference: parseFloat(percentDiff.toFixed(2)),
      cheaper: diff > 0 ? 'product2' : (diff < 0 ? 'product1' : 'equal')
    };
  }

  /**
   * Compare specifications
   */
  _compareSpecifications(product1, product2) {
    const specs1 = product1.specifications || {};
    const specs2 = product2.specifications || {};

    const allKeys = new Set([...Object.keys(specs1), ...Object.keys(specs2)]);
    const comparison = {};

    allKeys.forEach(key => {
      comparison[key] = {
        product1: specs1[key] || 'N/A',
        product2: specs2[key] || 'N/A'
      };
    });

    return comparison;
  }

  /**
   * Compare tiers
   */
  _compareTiers(product1, product2) {
    const tierLevels = { 'entry': 1, 'mid-tier': 2, 'high-tier': 3, 'elite': 4 };
    const tier1 = tierLevels[product1.tier] || 2;
    const tier2 = tierLevels[product2.tier] || 2;

    return {
      product1Tier: product1.tier || 'unknown',
      product2Tier: product2.tier || 'unknown',
      tierLevel1: tier1,
      tierLevel2: tier2,
      better: tier1 > tier2 ? 'product1' : (tier2 > tier1 ? 'product2' : 'equal')
    };
  }

  /**
   * Store comparison in database
   */
  async _storeComparison(product1, product2, aiResult, sessionId) {
    try {
      await query(`
                INSERT INTO product_comparisons (
                    product1_id,
                    product1_name,
                    product1_category,
                    product1_price,
                    product2_id,
                    product2_name,
                    product2_category,
                    product2_price,
                    ai_summary,
                    winner_id,
                    session_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
        product1.id,
        product1.name,
        product1.category,
        product1.price,
        product2.id,
        product2.name,
        product2.category,
        product2.price,
        aiResult.summary,
        aiResult.winner,
        sessionId
      ]);

      logger.info('✅ Comparison stored in database');
    } catch (error) {
      logger.error('❌ Error storing comparison:', error);
    }
  }

  /**
   * Get comparison history
   * @param {Number} limit - Number of comparisons to retrieve
   * @returns {Promise<Array>} - Array of past comparisons
   */
  async getComparisonHistory(limit = 20) {
    try {
      const result = await query(`
                SELECT *
                FROM product_comparisons
                ORDER BY created_at DESC
                LIMIT $1
            `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('❌ Error fetching comparison history:', error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new ProductComparisonService();
