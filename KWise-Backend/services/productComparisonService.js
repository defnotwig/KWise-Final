/**
 * Product Comparison Service
 * Provides deterministic local product comparisons.
 * Max 2 products, same category, with a legacy aiSummary field for frontend compatibility.
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class ProductComparisonService {
  constructor() {
    this.maxProducts = 2;
  }

  /**
   * Compare two products with AI analysis
   * @param {Number} product1Id - First product ID
   * @param {Number} product2Id - Second product ID
   * @param {String} sessionId - Optional session ID for tracking
   * @returns {Promise<Object>} - Comparison result with legacy summary fields
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

      const aiSummary = await this._generateAIComparison(product1, product2);

      // Build detailed comparison
      const comparison = {
        product1: this._formatProduct(product1),
        product2: this._formatProduct(product2),
        category: product1.category,
        source: 'deterministic',
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
      price: Number.parseFloat(product.price),
      tier: product.tier,
      stock: product.stock,
      imageUrl: product.image_url,
      specifications: product.specifications || {},
      description: product.description
    };
  }

  /**
   * Generate deterministic comparison summary.
   */
  async _generateAIComparison(product1, product2) {
    return this._generateFallbackComparison(product1, product2);
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
      product1Price: Number.parseFloat(product1.price),
      product2Price: Number.parseFloat(product2.price),
      difference: Number.parseFloat(diff.toFixed(2)),
      percentDifference: Number.parseFloat(percentDiff.toFixed(2)),
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
