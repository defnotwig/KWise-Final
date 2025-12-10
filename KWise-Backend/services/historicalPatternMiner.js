/**
 * PHASE 3: HISTORICAL PATTERN MINING SERVICE
 * Analyzes successful builds to extract patterns and improve AI recommendations
 */

const db = require('../config/db');
const logger = require('../utils/logger');

class HistoricalPatternMiner {
  constructor() {
    this.initialized = false;
    logger.info('📊 Historical Pattern Miner initialized');
  }

  /**
   * Mine patterns from compatibility logs
   * Identifies successful component combinations
   */
  async mineCompatibilityPatterns() {
    try {
      logger.info('🔍 Mining compatibility patterns from historical data...');

      // Get successful compatibility combinations
      const patterns = await db.query(`
        WITH successful_builds AS (
          SELECT 
            parts_json,
            ai_verdict,
            user_context,
            outcome_quality,
            created_at
          FROM compatibility_logs
          WHERE outcome_quality = 'success'
            AND user_decision = 'accepted'
            AND created_at > NOW() - INTERVAL '90 days'
        )
        SELECT 
          parts_json->>'current' as current_part,
          COUNT(*) as frequency,
          AVG(CAST(ai_verdict->>'confidence' AS NUMERIC)) as avg_confidence,
          json_agg(DISTINCT user_context->>'persona') as personas,
          MAX(created_at) as last_seen
        FROM successful_builds
        GROUP BY parts_json->>'current'
        HAVING COUNT(*) >= 3
        ORDER BY frequency DESC
        LIMIT 50
      `);

      if (patterns.rows.length > 0) {
        logger.info(`✅ Found ${patterns.rows.length} compatibility patterns`);
        
        // Store patterns in historical_patterns table
        for (const pattern of patterns.rows) {
          await this.storePattern({
            pattern_type: 'compatibility',
            pattern_data: {
              current_part: pattern.current_part,
              frequency: pattern.frequency,
              avg_confidence: pattern.avg_confidence,
              personas: pattern.personas
            },
            frequency: parseInt(pattern.frequency),
            confidence_score: parseFloat(pattern.avg_confidence) || 85,
            last_seen: pattern.last_seen
          });
        }

        return patterns.rows;
      } else {
        logger.info('ℹ️  No patterns found yet (need more compatibility logs)');
        return [];
      }

    } catch (error) {
      logger.error('Error mining compatibility patterns:', error);
      throw error;
    }
  }

  /**
   * Mine successful build configurations
   * Identifies high-performing component combinations
   */
  async mineSuccessfulBuilds() {
    try {
      logger.info('🔍 Mining successful build configurations...');

      // Get builds from orders that were completed successfully
      const builds = await db.query(`
        SELECT 
          o.id as order_id,
          o.order_data->>'buildConfiguration' as build_config,
          o.total_amount,
          o.status,
          o.created_at,
          COUNT(DISTINCT o.id) OVER (PARTITION BY o.order_data->>'buildConfiguration') as config_frequency
        FROM orders o
        WHERE o.status IN ('completed', 'delivered')
          AND o.order_data->>'buildConfiguration' IS NOT NULL
          AND o.created_at > NOW() - INTERVAL '90 days'
        ORDER BY config_frequency DESC, o.created_at DESC
        LIMIT 100
      `);

      if (builds.rows.length > 0) {
        logger.info(`✅ Found ${builds.rows.length} successful build configurations`);
        
        // Group by configuration and store patterns
        const configMap = new Map();
        
        for (const build of builds.rows) {
          const configKey = build.build_config;
          if (!configMap.has(configKey)) {
            configMap.set(configKey, {
              config: configKey,
              frequency: 0,
              total_revenue: 0,
              last_order: build.created_at
            });
          }
          
          const config = configMap.get(configKey);
          config.frequency++;
          config.total_revenue += parseFloat(build.total_amount) || 0;
          if (new Date(build.created_at) > new Date(config.last_order)) {
            config.last_order = build.created_at;
          }
        }

        // Store top patterns
        const topConfigs = Array.from(configMap.values())
          .filter(c => c.frequency >= 2)
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 20);

        for (const config of topConfigs) {
          await this.storePattern({
            pattern_type: 'successful_build',
            pattern_data: {
              configuration: config.config,
              revenue: config.total_revenue
            },
            frequency: config.frequency,
            confidence_score: Math.min(95, 70 + (config.frequency * 5)),
            last_seen: config.last_order
          });
        }

        logger.info(`✅ Stored ${topConfigs.length} successful build patterns`);
        return topConfigs;
      } else {
        logger.info('ℹ️  No successful builds found yet');
        return [];
      }

    } catch (error) {
      logger.error('Error mining successful builds:', error);
      throw error;
    }
  }

  /**
   * Store pattern in historical_patterns table
   */
  async storePattern(patternData) {
    try {
      const { pattern_type, pattern_data, frequency, confidence_score, last_seen } = patternData;

      await db.query(`
        INSERT INTO historical_patterns (
          pattern_type, pattern_data, frequency, confidence_score, last_seen, created_at, updated_at
        ) VALUES ($1, $2::jsonb, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (pattern_type, pattern_data)
        DO UPDATE SET
          frequency = historical_patterns.frequency + EXCLUDED.frequency,
          confidence_score = (historical_patterns.confidence_score + EXCLUDED.confidence_score) / 2,
          last_seen = EXCLUDED.last_seen,
          updated_at = NOW()
      `, [
        pattern_type,
        JSON.stringify(pattern_data),
        frequency,
        confidence_score,
        last_seen || new Date()
      ]);

    } catch (error) {
      // Log but don't throw - individual pattern storage failures shouldn't stop the process
      logger.warn(`Failed to store pattern: ${error.message}`);
    }
  }

  /**
   * Get patterns by type for AI enrichment
   */
  async getPatterns(patternType, limit = 10) {
    try {
      const result = await db.query(`
        SELECT 
          pattern_type,
          pattern_data,
          frequency,
          confidence_score,
          last_seen
        FROM historical_patterns
        WHERE pattern_type = $1
          AND is_active = true
        ORDER BY frequency DESC, confidence_score DESC
        LIMIT $2
      `, [patternType, limit]);

      return result.rows;
    } catch (error) {
      logger.error(`Error getting patterns for type ${patternType}:`, error);
      return [];
    }
  }

  /**
   * Get top compatibility patterns for prompt enrichment
   */
  async getTopCompatibilityPatterns(limit = 5) {
    return this.getPatterns('compatibility', limit);
  }

  /**
   * Get successful build patterns for recommendations
   */
  async getSuccessfulBuildPatterns(limit = 10) {
    return this.getPatterns('successful_build', limit);
  }

  /**
   * Periodic pattern mining (should be run as cron job)
   */
  async runPeriodicMining() {
    try {
      logger.info('\n🔄 Starting periodic pattern mining...');
      
      const [compatibilityPatterns, buildPatterns] = await Promise.all([
        this.mineCompatibilityPatterns(),
        this.mineSuccessfulBuilds()
      ]);

      logger.info(`\n✅ Periodic mining complete:`);
      logger.info(`   - Compatibility patterns: ${compatibilityPatterns.length}`);
      logger.info(`   - Build patterns: ${buildPatterns.length}`);

      return {
        success: true,
        compatibility_patterns: compatibilityPatterns.length,
        build_patterns: buildPatterns.length
      };

    } catch (error) {
      logger.error('Periodic pattern mining failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pattern statistics for dashboard
   */
  async getPatternStatistics() {
    try {
      const stats = await db.query(`
        SELECT 
          pattern_type,
          COUNT(*) as total_patterns,
          SUM(frequency) as total_frequency,
          AVG(confidence_score) as avg_confidence,
          MAX(last_seen) as most_recent
        FROM historical_patterns
        WHERE is_active = true
        GROUP BY pattern_type
      `);

      return stats.rows;
    } catch (error) {
      logger.error('Error getting pattern statistics:', error);
      return [];
    }
  }
}

module.exports = new HistoricalPatternMiner();

