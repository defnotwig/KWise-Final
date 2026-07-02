/**
 * Real-World Data Service for K-Wise
 * PRIORITY 3 IMPLEMENTATION
 * 
 * Collects and integrates real-world user feedback, known issues, and successful builds
 * to improve compatibility checking accuracy beyond theoretical rules
 * 
 * Expected Impact: +0.4 rating (4.3 → 4.7)
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class RealWorldDataService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes (real-world data changes slower)
    
    // Start cache cleanup unless disabled for deterministic tests
    const disableIntervals = process.env.NODE_ENV === 'test' || process.env.DISABLE_INTERVALS_FOR_TESTS === 'true';
    this.cacheCleanupInterval = disableIntervals ? null : setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
    
    logger.info('🌍 Real-World Data Service initialized');
  }

  /**
   * =======================================================================
   * USER FEEDBACK COLLECTION
   * =======================================================================
   */

  /**
   * Submit user feedback on component or build
   * @param {Object} feedbackData - Feedback details
   * @returns {Promise<Object>} Submission result
   */
  async submitUserFeedback(feedbackData) {
    try {
      const {
        user_id,
        build_id,
        component_id,
        component_category,
        issue_type, // 'incompatible', 'works-great', 'performance-issue', 'overheating', 'noise', 'stability-issue'
        severity, // 'critical', 'major', 'minor', 'positive'
        title,
        description,
        rating, // 1-5 stars (for positive feedback)
        build_context // JSONB - what other components were used
      } = feedbackData;

      // Validate required fields
      if (!user_id || !issue_type || !title) {
        throw new Error('Missing required fields: user_id, issue_type, title');
      }

      // Insert feedback
      const result = await query(
        `INSERT INTO feedback_submissions (
          user_id,
          build_id,
          component_id,
          component_category,
          issue_type,
          severity,
          title,
          description,
          rating,
          build_context,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())
        RETURNING id, created_at`,
        [
          user_id,
          build_id || null,
          component_id || null,
          component_category || null,
          issue_type,
          severity || 'minor',
          title,
          description || '',
          rating || null,
          build_context ? JSON.stringify(build_context) : null
        ]
      );

      const feedbackId = result.rows[0].id;

      logger.info(`✅ User feedback submitted: #${feedbackId}`, {
        user_id,
        issue_type,
        severity,
        component_id
      });

      // If critical issue, flag for immediate admin review
      if (severity === 'critical') {
        await this.flagCriticalFeedback(feedbackId, feedbackData);
      }

      // Update component satisfaction score
      if (component_id && rating) {
        await this.updateComponentSatisfactionScore(component_id);
      }

      return {
        success: true,
        feedback_id: feedbackId,
        message: 'Feedback submitted successfully',
        status: 'pending'
      };

    } catch (error) {
      logger.error('❌ Failed to submit user feedback', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Flag critical feedback for admin review
   */
  async flagCriticalFeedback(feedbackId, feedbackData) {
    try {
      // Insert into admin review queue
      await query(
        `INSERT INTO feedback_review_queue (
          feedback_id,
          priority,
          assigned_to,
          flagged_reason,
          created_at
        ) VALUES ($1, 'critical', NULL, $2, NOW())`,
        [
          feedbackId,
          `Critical ${feedbackData.issue_type}: ${feedbackData.title}`
        ]
      );

      logger.warn(`🚨 Critical feedback flagged for review: #${feedbackId}`);
    } catch (error) {
      logger.error('Failed to flag critical feedback', { error: error.message });
    }
  }

  /**
   * Update component satisfaction score based on user ratings
   */
  async updateComponentSatisfactionScore(componentId) {
    try {
      // Calculate new satisfaction score from all feedback
      const stats = await query(
        `SELECT 
          COUNT(*) as total_ratings,
          AVG(rating) as avg_rating,
          SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_issues,
          SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_feedback
        FROM feedback_submissions
        WHERE component_id = $1 AND rating IS NOT NULL`,
        [componentId]
      );

      const { total_ratings, avg_rating, critical_issues, positive_feedback } = stats.rows[0];

      // Calculate satisfaction score (0-100)
      // Formula: (avg_rating/5 * 80) + (positive_feedback/total * 20) - (critical_issues/total * 30)
      const baseScore = (Number.parseFloat(avg_rating || 0) / 5) * 80;
      const positiveBonus = total_ratings > 0 ? (Number.parseInt(positive_feedback || 0, 10) / Number.parseInt(total_ratings, 10)) * 20 : 0;
      const criticalPenalty = total_ratings > 0 ? (Number.parseInt(critical_issues || 0, 10) / Number.parseInt(total_ratings, 10)) * 30 : 0;
      const satisfactionScore = Math.max(0, Math.min(100, baseScore + positiveBonus - criticalPenalty));

      // Update component metadata
      await query(
        `UPDATE pc_parts 
        SET specifications = COALESCE(specifications, '{}'::jsonb) || 
          jsonb_build_object(
            'satisfaction_score', $1::numeric,
            'total_ratings', $2::integer,
            'avg_rating', $3::numeric,
            'last_updated', NOW()
          )
        WHERE id = $4`,
        [satisfactionScore.toFixed(2), Number.parseInt(total_ratings || 0, 10), Number.parseFloat(avg_rating || 0).toFixed(2), componentId]
      );

      logger.info(`📊 Updated satisfaction score for component #${componentId}: ${satisfactionScore.toFixed(2)}`);

    } catch (error) {
      logger.error('Failed to update satisfaction score', { error: error.message });
    }
  }

  /**
   * Get feedback for a specific component
   */
  async getComponentFeedback(componentId, limit = 10) {
    try {
      const cacheKey = `feedback_${componentId}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const result = await query(
        `SELECT 
          fs.*,
          u.username,
          u.role,
          (SELECT COUNT(*) FROM feedback_votes WHERE feedback_id = fs.id AND vote = 'helpful') as helpful_votes,
          (SELECT COUNT(*) FROM feedback_votes WHERE feedback_id = fs.id AND vote = 'not_helpful') as not_helpful_votes
        FROM feedback_submissions fs
        LEFT JOIN users u ON fs.user_id = u.id
        WHERE fs.component_id = $1 AND fs.status != 'rejected'
        ORDER BY 
          CASE fs.status
            WHEN 'verified' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'resolved' THEN 3
          END,
          helpful_votes DESC,
          fs.created_at DESC
        LIMIT $2`,
        [componentId, limit]
      );

      const feedback = result.rows;
      this.setInCache(cacheKey, feedback);

      return feedback;

    } catch (error) {
      logger.error('Failed to get component feedback', { error: error.message });
      return [];
    }
  }

  /**
   * Vote on feedback helpfulness
   */
  async voteFeedback(feedbackId, userId, vote) {
    try {
      // Check if user already voted
      const existing = await query(
        `SELECT id FROM feedback_votes WHERE feedback_id = $1 AND user_id = $2`,
        [feedbackId, userId]
      );

      if (existing.rows.length > 0) {
        // Update vote
        await query(
          `UPDATE feedback_votes SET vote = $1, updated_at = NOW() WHERE feedback_id = $2 AND user_id = $3`,
          [vote, feedbackId, userId]
        );
      } else {
        // Insert new vote
        await query(
          `INSERT INTO feedback_votes (feedback_id, user_id, vote, created_at) VALUES ($1, $2, $3, NOW())`,
          [feedbackId, userId, vote]
        );
      }

      return { success: true, message: 'Vote recorded' };

    } catch (error) {
      logger.error('Failed to vote feedback', { error: error.message });
      throw error;
    }
  }

  /**
   * =======================================================================
   * KNOWN COMPATIBILITY ISSUES TRACKING
   * =======================================================================
   */

  /**
   * Record a known compatibility issue
   * @param {Object} issueData - Issue details
   * @returns {Promise<Object>} Created issue
   */
  async recordKnownIssue(issueData) {
    try {
      const {
        component1_id,
        component1_category,
        component2_id,
        component2_category,
        issue_title,
        issue_description,
        severity, // 'critical', 'major', 'minor', 'info'
        workaround,
        requires_bios_update,
        minimum_bios_version,
        source, // 'user_report', 'admin_verified', 'manufacturer', 'community'
        source_url,
        reported_by
      } = issueData;

      const result = await query(
        `INSERT INTO known_issues (
          component1_id,
          component1_category,
          component2_id,
          component2_category,
          issue_title,
          issue_description,
          severity,
          workaround,
          requires_bios_update,
          minimum_bios_version,
          source,
          source_url,
          reported_by,
          verified,
          verification_count,
          created_at,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, 0, NOW(), 'open')
        RETURNING id, created_at`,
        [
          component1_id,
          component1_category,
          component2_id || null,
          component2_category || null,
          issue_title,
          issue_description,
          severity,
          workaround || null,
          requires_bios_update || false,
          minimum_bios_version || null,
          source,
          source_url || null,
          reported_by
        ]
      );

      const issueId = result.rows[0].id;

      logger.info(`⚠️ Known issue recorded: #${issueId}`, {
        title: issue_title,
        severity,
        components: [component1_id, component2_id].filter(Boolean)
      });

      return {
        success: true,
        issue_id: issueId,
        message: 'Known issue recorded'
      };

    } catch (error) {
      logger.error('❌ Failed to record known issue', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check for known issues between components
   * @param {Array} componentIds - Component IDs to check
   * @returns {Promise<Array>} Known issues
   */
  async checkKnownIssues(componentIds) {
    try {
      if (!componentIds || componentIds.length === 0) return [];

      const cacheKey = `known_issues_${componentIds.sort().join('_')}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Check for issues involving any combination of these components
      const result = await query(
        `SELECT 
          ki.*,
          p1.name as component1_name,
          p2.name as component2_name,
          (SELECT COUNT(*) FROM issue_verifications WHERE issue_id = ki.id) as total_verifications
        FROM known_issues ki
        LEFT JOIN pc_parts p1 ON ki.component1_id = p1.id
        LEFT JOIN pc_parts p2 ON ki.component2_id = p2.id
        WHERE 
          ki.status = 'open' AND
          (
            ki.component1_id = ANY($1::int[]) OR
            ki.component2_id = ANY($1::int[])
          )
        ORDER BY 
          CASE ki.severity
            WHEN 'critical' THEN 1
            WHEN 'major' THEN 2
            WHEN 'minor' THEN 3
            WHEN 'info' THEN 4
          END,
          total_verifications DESC`,
        [componentIds]
      );

      const issues = result.rows;
      this.setInCache(cacheKey, issues);

      if (issues.length > 0) {
        logger.info(`⚠️ Found ${issues.length} known issues for component set`, {
          components: componentIds,
          critical: issues.filter(i => i.severity === 'critical').length,
          major: issues.filter(i => i.severity === 'major').length
        });
      }

      return issues;

    } catch (error) {
      logger.error('Failed to check known issues', { error: error.message });
      return [];
    }
  }

  /**
   * Verify a known issue (increases verification count)
   */
  async verifyKnownIssue(issueId, userId, notes = '') {
    try {
      // Check if already verified by this user
      const existing = await query(
        `SELECT id FROM issue_verifications WHERE issue_id = $1 AND user_id = $2`,
        [issueId, userId]
      );

      if (existing.rows.length > 0) {
        return {
          success: false,
          message: 'You have already verified this issue'
        };
      }

      // Add verification
      await query(
        `INSERT INTO issue_verifications (issue_id, user_id, notes, created_at) 
         VALUES ($1, $2, $3, NOW())`,
        [issueId, userId, notes]
      );

      // Update verification count
      await query(
        `UPDATE known_issues 
         SET verification_count = verification_count + 1,
             verified = CASE WHEN verification_count + 1 >= 3 THEN true ELSE verified END
         WHERE id = $1`,
        [issueId]
      );

      logger.info(`✅ Issue #${issueId} verified by user #${userId}`);

      return {
        success: true,
        message: 'Issue verification recorded'
      };

    } catch (error) {
      logger.error('Failed to verify known issue', { error: error.message });
      throw error;
    }
  }

  /**
   * Resolve a known issue
   */
  async resolveKnownIssue(issueId, resolution, resolvedBy) {
    try {
      await query(
        `UPDATE known_issues 
         SET status = 'resolved',
             resolution = $1,
             resolved_by = $2,
             resolved_at = NOW()
         WHERE id = $3`,
        [resolution, resolvedBy, issueId]
      );

      logger.info(`✅ Known issue #${issueId} resolved`);

      return {
        success: true,
        message: 'Issue marked as resolved'
      };

    } catch (error) {
      logger.error('Failed to resolve known issue', { error: error.message });
      throw error;
    }
  }

  /**
   * =======================================================================
   * SUCCESSFUL BUILDS TRACKING
   * =======================================================================
   */

  /**
   * Record a successful build
   * @param {Object} buildData - Build details
   * @returns {Promise<Object>} Created build record
   */
  async recordSuccessfulBuild(buildData) {
    try {
      const {
        user_id,
        build_name,
        build_type, // 'gaming', 'workstation', 'budget', 'enthusiast', 'creator'
        components, // Object: { cpu_id, gpu_id, motherboard_id, ram_id, storage_id, psu_id, case_id, cooling_id }
        total_price,
        use_case,
        performance_rating, // 1-5 stars
        stability_rating, // 1-5 stars
        satisfaction_rating, // 1-5 stars
        notes,
        specifications // Additional specs like fps, render times, etc.
      } = buildData;

      // Calculate build hash for pattern matching
      const sortedComponents = Object.keys(components)
        .sort()
        .map(key => `${key}:${components[key]}`)
        .join('|');
      const buildHash = require('node:crypto').createHash('md5').update(sortedComponents).digest('hex');

      const result = await query(
        `INSERT INTO successful_builds (
          user_id,
          build_name,
          build_hash,
          build_type,
          cpu_id,
          gpu_id,
          motherboard_id,
          ram_id,
          storage_id,
          psu_id,
          case_id,
          cooling_id,
          components_json,
          total_price,
          use_case,
          performance_rating,
          stability_rating,
          satisfaction_rating,
          notes,
          specifications,
          verified,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, false, NOW())
        RETURNING id, created_at`,
        [
          user_id,
          build_name,
          buildHash,
          build_type,
          components.cpu_id || null,
          components.gpu_id || null,
          components.motherboard_id || null,
          components.ram_id || null,
          components.storage_id || null,
          components.psu_id || null,
          components.case_id || null,
          components.cooling_id || null,
          JSON.stringify(components),
          total_price,
          use_case,
          performance_rating,
          stability_rating,
          satisfaction_rating,
          notes || '',
          specifications ? JSON.stringify(specifications) : null
        ]
      );

      const buildId = result.rows[0].id;

      logger.info(`✅ Successful build recorded: #${buildId}`, {
        user_id,
        build_type,
        total_price,
        avg_rating: ((performance_rating + stability_rating + satisfaction_rating) / 3).toFixed(2)
      });

      // Update build pattern statistics
      await this.updateBuildPatternStats(buildHash, components, buildData);

      return {
        success: true,
        build_id: buildId,
        message: 'Build recorded successfully'
      };

    } catch (error) {
      logger.error('❌ Failed to record successful build', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update build pattern statistics
   */
  async updateBuildPatternStats(buildHash, components, buildData) {
    try {
      // Check if pattern exists
      const existing = await query(
        `SELECT id, build_count, avg_performance, avg_stability, avg_satisfaction
         FROM build_patterns
         WHERE build_hash = $1`,
        [buildHash]
      );

      if (existing.rows.length > 0) {
        // Update existing pattern
        const pattern = existing.rows[0];
        const newCount = Number.parseInt(pattern.build_count, 10) + 1;
        const newAvgPerf = ((Number.parseFloat(pattern.avg_performance) * pattern.build_count) + buildData.performance_rating) / newCount;
        const newAvgStab = ((Number.parseFloat(pattern.avg_stability) * pattern.build_count) + buildData.stability_rating) / newCount;
        const newAvgSat = ((Number.parseFloat(pattern.avg_satisfaction) * pattern.build_count) + buildData.satisfaction_rating) / newCount;

        await query(
          `UPDATE build_patterns
           SET build_count = $1,
               avg_performance = $2,
               avg_stability = $3,
               avg_satisfaction = $4,
               last_seen = NOW()
           WHERE id = $5`,
          [newCount, newAvgPerf, newAvgStab, newAvgSat, pattern.id]
        );

        logger.info(`📊 Updated build pattern stats: ${buildHash} (${newCount} builds, ${newAvgSat.toFixed(2)} satisfaction)`);

      } else {
        // Create new pattern
        await query(
          `INSERT INTO build_patterns (
            build_hash,
            build_type,
            cpu_id,
            gpu_id,
            motherboard_id,
            ram_id,
            storage_id,
            psu_id,
            case_id,
            cooling_id,
            components_json,
            build_count,
            avg_performance,
            avg_stability,
            avg_satisfaction,
            first_seen,
            last_seen
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12, $13, $14, NOW(), NOW())`,
          [
            buildHash,
            buildData.build_type,
            components.cpu_id || null,
            components.gpu_id || null,
            components.motherboard_id || null,
            components.ram_id || null,
            components.storage_id || null,
            components.psu_id || null,
            components.case_id || null,
            components.cooling_id || null,
            JSON.stringify(components),
            buildData.performance_rating,
            buildData.stability_rating,
            buildData.satisfaction_rating
          ]
        );

        logger.info(`🆕 New build pattern created: ${buildHash}`);
      }

    } catch (error) {
      logger.error('Failed to update build pattern stats', { error: error.message });
    }
  }

  /**
   * Get similar successful builds
   * @param {Object} components - Component IDs
   * @param {Number} limit - Max results
   * @returns {Promise<Array>} Similar builds
   */
  async getSimilarSuccessfulBuilds(components, limit = 5) {
    try {
      const cacheKey = `similar_builds_${Object.values(components).filter(Boolean).sort().join('_')}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Find builds with matching components (at least 3 matches)
      // FIX: Use subquery with WHERE instead of HAVING without GROUP BY
      const result = await query(
        `SELECT * FROM (
          SELECT 
            sb.*,
            u.username,
            (
              CASE WHEN sb.cpu_id = $1 THEN 1 ELSE 0 END +
              CASE WHEN sb.gpu_id = $2 THEN 1 ELSE 0 END +
              CASE WHEN sb.motherboard_id = $3 THEN 1 ELSE 0 END +
              CASE WHEN sb.ram_id = $4 THEN 1 ELSE 0 END +
              CASE WHEN sb.storage_id = $5 THEN 1 ELSE 0 END +
              CASE WHEN sb.psu_id = $6 THEN 1 ELSE 0 END +
              CASE WHEN sb.case_id = $7 THEN 1 ELSE 0 END +
              CASE WHEN sb.cooling_id = $8 THEN 1 ELSE 0 END
            ) as match_count,
            (sb.performance_rating + sb.stability_rating + sb.satisfaction_rating) / 3.0 as avg_rating
          FROM successful_builds sb
          LEFT JOIN users u ON sb.user_id = u.id
          WHERE sb.verified = true
        ) AS builds_with_scores
        WHERE match_count >= 3
        ORDER BY match_count DESC, avg_rating DESC, created_at DESC
        LIMIT $9`,
        [
          components.cpu_id || null,
          components.gpu_id || null,
          components.motherboard_id || null,
          components.ram_id || null,
          components.storage_id || null,
          components.psu_id || null,
          components.case_id || null,
          components.cooling_id || null,
          limit
        ]
      );

      const builds = result.rows;
      this.setInCache(cacheKey, builds);

      logger.info(`🔍 Found ${builds.length} similar successful builds`);

      return builds;

    } catch (error) {
      logger.error('Failed to get similar builds', { error: error.message });
      return [];
    }
  }

  /**
   * Get build pattern statistics
   */
  async getBuildPatternStats(components) {
    try {
      // Calculate build hash
      const sortedComponents = Object.keys(components)
        .sort()
        .map(key => `${key}:${components[key]}`)
        .join('|');
      const buildHash = require('node:crypto').createHash('md5').update(sortedComponents).digest('hex');

      const result = await query(
        `SELECT * FROM build_patterns WHERE build_hash = $1`,
        [buildHash]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const pattern = result.rows[0];

      return {
        build_count: Number.parseInt(pattern.build_count, 10),
        avg_performance: Number.parseFloat(pattern.avg_performance),
        avg_stability: Number.parseFloat(pattern.avg_stability),
        avg_satisfaction: Number.parseFloat(pattern.avg_satisfaction),
        first_seen: pattern.first_seen,
        last_seen: pattern.last_seen,
        confidence_score: this.calculateConfidenceScore(pattern)
      };

    } catch (error) {
      logger.error('Failed to get build pattern stats', { error: error.message });
      return null;
    }
  }

  /**
   * Calculate confidence score for build pattern
   * Based on number of builds and recency
   */
  calculateConfidenceScore(pattern) {
    const buildCount = Number.parseInt(pattern.build_count, 10);
    const daysSinceLastSeen = (Date.now() - new Date(pattern.last_seen).getTime()) / (1000 * 60 * 60 * 24);

    // Base score from build count (0-70 points)
    const countScore = Math.min(70, buildCount * 7); // 10 builds = 70 points

    // Recency score (0-30 points)
    const recencyScore = Math.max(0, 30 - daysSinceLastSeen * 0.5); // Lose 0.5 points per day

    return Math.min(100, countScore + recencyScore);
  }

  /**
   * =======================================================================
   * INTEGRATION WITH COMPATIBILITY SERVICE
   * =======================================================================
   */

  /**
   * Get real-world compatibility confidence
   * Combines known issues, user feedback, and successful builds
   * @param {Array} componentIds - Component IDs to check
   * @returns {Promise<Object>} Real-world confidence data
   */
  async getRealWorldCompatibilityConfidence(componentIds) {
    try {
      const [knownIssues, similarBuilds] = await Promise.all([
        this.checkKnownIssues(componentIds),
        this.getSimilarSuccessfulBuilds(
          componentIds.reduce((acc, id, idx) => {
            const types = ['cpu_id', 'gpu_id', 'motherboard_id', 'ram_id', 'storage_id', 'psu_id', 'case_id', 'cooling_id'];
            if (types[idx]) acc[types[idx]] = id;
            return acc;
          }, {})
        )
      ]);

      // Calculate confidence score (0-100)
      let confidence = 50; // Start at neutral

      // Deduct for known issues
      const criticalIssues = knownIssues.filter(i => i.severity === 'critical').length;
      const majorIssues = knownIssues.filter(i => i.severity === 'major').length;
      confidence -= (criticalIssues * 30) + (majorIssues * 15);

      // Add for successful builds
      if (similarBuilds.length > 0) {
        const avgSatisfaction = similarBuilds.reduce((sum, b) => sum + Number.parseFloat(b.avg_rating), 0) / similarBuilds.length;
        confidence += (avgSatisfaction / 5) * 30; // Up to +30 for 5-star builds
        confidence += Math.min(20, similarBuilds.length * 4); // Up to +20 for 5+ similar builds
      }

      confidence = Math.max(0, Math.min(100, confidence));

      return {
        confidence: confidence.toFixed(2),
        known_issues: knownIssues.length,
        critical_issues: criticalIssues,
        major_issues: majorIssues,
        similar_builds: similarBuilds.length,
        avg_build_satisfaction: similarBuilds.length > 0 
          ? (similarBuilds.reduce((sum, b) => sum + Number.parseFloat(b.avg_rating), 0) / similarBuilds.length).toFixed(2)
          : null,
        warnings: knownIssues.filter(i => i.severity === 'critical' || i.severity === 'major'),
        recommendations: similarBuilds.slice(0, 3)
      };

    } catch (error) {
      logger.error('Failed to get real-world compatibility confidence', { error: error.message });
      return {
        confidence: 50,
        known_issues: 0,
        similar_builds: 0,
        error: error.message
      };
    }
  }

  /**
   * =======================================================================
   * CACHE MANAGEMENT
   * =======================================================================
   */

  generateCacheKey(params) {
    return Buffer.from(JSON.stringify(params)).toString('base64').substring(0, 50);
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setInCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Real-world data cache cleaned: ${cleaned} entries removed`);
    }
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`🧹 Real-world data cache cleared: ${size} entries removed`);
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      service: 'RealWorldDataService',
      status: 'operational',
      cache: {
        entries: this.cache.size,
        ttl: `${this.CACHE_TTL / 1000 / 60} minutes`
      },
      features: {
        user_feedback: true,
        known_issues: true,
        successful_builds: true,
        pattern_matching: true,
        confidence_scoring: true
      }
    };
  }
}

// Export singleton instance
module.exports = new RealWorldDataService();

