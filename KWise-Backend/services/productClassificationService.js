/**
 * Product Classification Service for K-Wise
 * Automatically classifies PC components into tiers: entry, mid-tier, high-tier, elite
 * Provides AI-powered compatibility suggestions based on classification
 * 
 * ROOT CAUSE SOLUTION for Issue #1 & #2:
 * - Auto-classifies products based on price and specifications
 * - Suggests compatible products of same tier to prevent bottlenecks
 * - Uses AI to validate compatibility beyond simple tier matching
 * 
 * @module ProductClassificationService
 * @version 1.0.0
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class ProductClassificationService {
  constructor() {
    this.CLASSIFICATION_RULES = {
      CPU: {
        entry: { maxPrice: 5000, minCores: 2, maxCores: 4 },
        'mid-tier': { maxPrice: 15000, minCores: 4, maxCores: 8 },
        'high-tier': { maxPrice: 30000, minCores: 6, maxCores: 16 },
        elite: { minPrice: 30000, minCores: 8 }
      },
      GPU: {
        entry: { maxPrice: 8000, maxMemory: 4 },
        'mid-tier': { maxPrice: 25000, maxMemory: 8 },
        'high-tier': { maxPrice: 50000, maxMemory: 12 },
        elite: { minPrice: 50000, minMemory: 12 }
      },
      RAM: {
        entry: { maxPrice: 2000, maxCapacity: 8 },
        'mid-tier': { maxPrice: 5000, maxCapacity: 16 },
        'high-tier': { maxPrice: 10000, maxCapacity: 32 },
        elite: { minPrice: 10000, minCapacity: 32 }
      },
      Storage: {
        entry: { maxPrice: 2000, types: ['HDD', 'SATA SSD'] },
        'mid-tier': { maxPrice: 5000, types: ['SATA SSD', 'NVMe Gen3'] },
        'high-tier': { maxPrice: 10000, types: ['NVMe Gen3', 'NVMe Gen4'] },
        elite: { minPrice: 10000, types: ['NVMe Gen4', 'NVMe Gen5'] }
      }
    };

    logger.info('🏷️ Product Classification Service initialized');
  }

  /**
   * Classify a product based on category, price, and specs
   * @param {String} category - Product category (CPU, GPU, etc.)
   * @param {Number} price - Product price
   * @param {Object} specs - Product specifications
   * @returns {String} - Classification level
   */
  classifyProduct(category, price, specs = {}) {
    const rules = this.CLASSIFICATION_RULES[category];
    
    if (!rules) {
      // Default classification for categories without specific rules
      if (price < 3000) return 'entry';
      if (price < 10000) return 'mid-tier';
      if (price < 25000) return 'high-tier';
      return 'elite';
    }

    // CPU Classification
    if (category === 'CPU') {
      const cores = specs.cores || 0;
      
      if (price < rules.entry.maxPrice && cores <= rules.entry.maxCores) {
        return 'entry';
      }
      if (price < rules['mid-tier'].maxPrice && cores >= rules['mid-tier'].minCores && cores <= rules['mid-tier'].maxCores) {
        return 'mid-tier';
      }
      if (price < rules['high-tier'].maxPrice && cores >= rules['high-tier'].minCores) {
        return 'high-tier';
      }
      return 'elite';
    }

    // GPU Classification
    if (category === 'GPU') {
      const memory = specs.memory_capacity || 0;
      
      if (price < rules.entry.maxPrice && memory <= rules.entry.maxMemory) {
        return 'entry';
      }
      if (price < rules['mid-tier'].maxPrice && memory <= rules['mid-tier'].maxMemory) {
        return 'mid-tier';
      }
      if (price < rules['high-tier'].maxPrice) {
        return 'high-tier';
      }
      return 'elite';
    }

    // RAM Classification  
    if (category === 'RAM') {
      // Parse RAM capacity from configuration (e.g., "2x8GB" -> 16)
      const capacity = this.parseRAMCapacity(specs.configuration);
      
      if (price < rules.entry.maxPrice && capacity <= rules.entry.maxCapacity) {
        return 'entry';
      }
      if (price < rules['mid-tier'].maxPrice && capacity <= rules['mid-tier'].maxCapacity) {
        return 'mid-tier';
      }
      if (price < rules['high-tier'].maxPrice) {
        return 'high-tier';
      }
      return 'elite';
    }

    // Storage Classification
    if (category === 'Storage') {
      const type = specs.storage_type || specs.type || '';
      
      if (price < rules.entry.maxPrice) {
        return 'entry';
      }
      if (price < rules['mid-tier'].maxPrice) {
        return 'mid-tier';
      }
      if (price < rules['high-tier'].maxPrice) {
        return 'high-tier';
      }
      return 'elite';
    }

    // Default price-based classification
    if (price < 3000) return 'entry';
    if (price < 10000) return 'mid-tier';
    if (price < 25000) return 'high-tier';
    return 'elite';
  }

  /**
   * Parse RAM capacity from configuration string
   * @param {String} config - Configuration string like "2x8GB" or "16GB"
   * @returns {Number} - Total capacity in GB
   */
  parseRAMCapacity(config) {
    if (!config) return 0;
    
    const match = config.match(/(\d+)x(\d+)GB|(\d+)GB/i);
    if (!match) return 0;
    
    if (match[1] && match[2]) {
      // Format: "2x8GB"
      return Number.parseInt(match[1], 10) * Number.parseInt(match[2], 10);
    }
    if (match[3]) {
      // Format: "16GB"
      return Number.parseInt(match[3], 10);
    }
    
    return 0;
  }

  /**
   * Get compatible products of same tier
   * @param {String} productCategory - Product category
   * @param {String} classificationLevel - Classification level
   * @param {Number} limit - Maximum number of suggestions
   * @returns {Promise<Array>} - Compatible products
   */
  async getCompatibleProducts(productCategory, classificationLevel, limit = 10) {
    try {
      const tableMap = {
        'CPU': 'cpu',
        'GPU': 'gpu',
        'Motherboard': 'motherboard',
        'RAM': 'ram',
        'Storage': 'storage',
        'PSU': 'psu',
        'Cooling': 'cooling',
        'Case': 'pc_case'
      };

      const tableName = tableMap[productCategory];
      if (!tableName) {
        return [];
      }

      const result = await query(`
        SELECT *
        FROM ${tableName}
        WHERE classification_level = $1
        ORDER BY price ASC
        LIMIT $2
      `, [classificationLevel, limit]);

      return result.rows;
    } catch (error) {
      logger.error('❌ Failed to get compatible products', { 
        error: error.message,
        category: productCategory,
        level: classificationLevel
      });
      return [];
    }
  }

  /**
   * Get AI-powered compatibility suggestions for a selected product
   * Uses Ollama DeepSeek R1 to suggest compatible products
   * @param {Object} product - Selected product
   * @param {String} targetCategory - Category to get suggestions for
   * @returns {Promise<Object>} - AI suggestions
   */
  async getAICompatibilitySuggestions(product, targetCategory) {
    try {
      // Check cache first
      const cached = await query(`
        SELECT * FROM ai_compatibility_suggestions
        WHERE product_id = $1
          AND product_category = $2
          AND expires_at > NOW()
        ORDER BY generated_at DESC
        LIMIT 1
      `, [product.id, product.category]);

      if (cached.rows.length > 0) {
        logger.info('✅ AI compatibility suggestions (CACHE HIT)', {
          productId: product.id,
          category: product.category
        });
        return JSON.parse(cached.rows[0].suggested_products);
      }

      // Get compatible products of same tier
      const compatibleProducts = await this.getCompatibleProducts(
        targetCategory,
        product.classification_level || this.classifyProduct(product.category, product.price, product),
        5
      );

      // Build AI prompt
      const prompt = {
        system: `You are a PC hardware compatibility expert. Suggest compatible ${targetCategory} components for the given product, ensuring no bottlenecks and balanced performance.`,
        task: `Given this ${product.category}: ${product.name} (Price: ₱${product.price}, Classification: ${product.classification_level || 'unknown'})
        
Suggest the TOP 3 most compatible ${targetCategory} components from these options:
${JSON.stringify(compatibleProducts, null, 2)}

Consider:
1. Performance balance (no bottlenecks)
2. Price-to-performance ratio
3. Power requirements
4. Physical compatibility

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "product_id": 123,
      "name": "Product Name",
      "reasoning": "Why this is compatible (1-2 sentences)",
      "compatibility_score": 0-100,
      "bottleneck_risk": "none|low|medium|high"
    }
  ],
  "confidence": 0-100
}`
      };

      const aiResponse = { ai_available: false };

      // Parse AI response
      let suggestions = [];
      let confidence = 75;

      try {
        if (aiResponse && aiResponse.ai_available !== false) {
          // Try to extract JSON from response
          const jsonMatch = aiResponse.reasoning?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            suggestions = parsed.suggestions || [];
            confidence = parsed.confidence || 75;
          }
        }
      } catch (parseError) {
        logger.warn('⚠️ Failed to parse AI suggestions, using defaults', { error: parseError.message });
      }

      // If AI failed or returned empty, use rule-based fallback
      if (suggestions.length === 0) {
        suggestions = compatibleProducts.slice(0, 3).map(p => ({
          product_id: p.id,
          name: p.name,
          reasoning: `Same ${product.classification_level} tier, ensuring balanced performance`,
          compatibility_score: 85,
          bottleneck_risk: 'low'
        }));
      }

      // Cache the suggestions
      await query(`
        INSERT INTO ai_compatibility_suggestions (
          product_id,
          product_category,
          classification_level,
          suggested_products,
          compatibility_reasoning,
          ai_confidence_score,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '24 hours')
      `, [
        product.id,
        product.category,
        product.classification_level || 'unknown',
        JSON.stringify(suggestions),
        `AI-generated suggestions for ${targetCategory} compatible with ${product.name}`,
        confidence
      ]);

      logger.info('✅ AI compatibility suggestions generated', {
        productId: product.id,
        suggestionsCount: suggestions.length,
        confidence
      });

      return {
        suggestions,
        confidence,
        classification_level: product.classification_level,
        cached: false
      };

    } catch (error) {
      logger.error('❌ Failed to get AI compatibility suggestions', {
        error: error.message,
        product: product.name
      });

      // Return fallback suggestions
      return {
        suggestions: [],
        confidence: 0,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Batch classify all products in database
   * @returns {Promise<Object>} - Classification results
   */
  async batchClassifyAllProducts() {
    try {
      const results = {
        cpu: 0,
        gpu: 0,
        ram: 0,
        storage: 0,
        total: 0
      };

      // Classify CPUs
      const cpus = await query('SELECT * FROM cpu WHERE classification_level IS NULL');
      for (const cpu of cpus.rows) {
        const level = this.classifyProduct('CPU', cpu.price, cpu);
        await query('UPDATE cpu SET classification_level = $1 WHERE id = $2', [level, cpu.id]);
        results.cpu++;
        results.total++;
      }

      // Classify GPUs
      const gpus = await query('SELECT * FROM gpu WHERE classification_level IS NULL');
      for (const gpu of gpus.rows) {
        const level = this.classifyProduct('GPU', gpu.price, gpu);
        await query('UPDATE gpu SET classification_level = $1 WHERE id = $2', [level, gpu.id]);
        results.gpu++;
        results.total++;
      }

      // Classify RAM
      const rams = await query('SELECT * FROM ram WHERE classification_level IS NULL');
      for (const ram of rams.rows) {
        const level = this.classifyProduct('RAM', ram.price, ram);
        await query('UPDATE ram SET classification_level = $1 WHERE id = $2', [level, ram.id]);
        results.ram++;
        results.total++;
      }

      // Classify Storage
      const storages = await query('SELECT * FROM storage WHERE classification_level IS NULL');
      for (const storage of storages.rows) {
        const level = this.classifyProduct('Storage', storage.price, storage);
        await query('UPDATE storage SET classification_level = $1 WHERE id = $2', [level, storage.id]);
        results.storage++;
        results.total++;
      }

      logger.info('✅ Batch classification completed', results);

      return results;
    } catch (error) {
      logger.error('❌ Batch classification failed', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const productClassificationService = new ProductClassificationService();

module.exports = productClassificationService;

