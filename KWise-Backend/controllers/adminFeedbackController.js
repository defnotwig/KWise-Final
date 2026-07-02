/**
 * Admin Feedback Controller
 * Handles admin review and correction of AI suggestions
 */

const pool = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * Submit a correction for an AI suggestion
 * @route POST /api/admin/ai-corrections
 */
exports.submitCorrection = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      suggestion_id,
      suggestion_type,
      original_suggestion,
      corrected_suggestion,
      correction_reason,
      confidence_score
    } = req.body;

    // Validation
    if (!suggestion_id || !suggestion_type || !original_suggestion || !corrected_suggestion) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (confidence_score && (confidence_score < 1 || confidence_score > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Confidence score must be between 1 and 5'
      });
    }

    const admin_user_id = req.user.id;

    await client.query('BEGIN');

    // Insert correction
    const correctionResult = await client.query(
      `INSERT INTO ai_corrections 
       (suggestion_id, suggestion_type, admin_user_id, original_suggestion, 
        corrected_suggestion, correction_reason, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        suggestion_id,
        suggestion_type,
        admin_user_id,
        JSON.stringify(original_suggestion),
        JSON.stringify(corrected_suggestion),
        correction_reason,
        confidence_score || 3
      ]
    );

    // Update pending review status if exists
    await client.query(
      `UPDATE ai_pending_reviews 
       SET status = 'corrected', reviewed_at = NOW()
       WHERE suggestion_id = $1`,
      [suggestion_id]
    );

    // Update learning patterns
    await updateLearningPattern(client, suggestion_type, corrected_suggestion, true);

    await client.query('COMMIT');

    logger.info({
      action: 'ai_correction_submitted',
      admin_user_id,
      suggestion_id,
      suggestion_type,
      confidence_score: confidence_score || 3
    });

    res.status(201).json({
      success: true,
      message: 'Correction submitted successfully',
      data: correctionResult.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error submitting AI correction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit correction',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get pending AI suggestions for review
 * @route GET /api/admin/ai-suggestions/pending
 */
exports.getPendingSuggestions = async (req, res) => {
  try {
    const { 
      status = 'pending',
      priority,
      type,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        p.*,
        u.username as assigned_to_username,
        (SELECT COUNT(*) FROM ai_corrections c WHERE c.suggestion_id = p.suggestion_id) as correction_count
      FROM ai_pending_reviews p
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE p.status = $1
    `;
    const params = [status];
    let paramIndex = 2;

    if (priority) {
      query += ` AND p.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (type) {
      query += ` AND p.suggestion_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY p.priority DESC, p.created_at ASC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM ai_pending_reviews WHERE status = $1`;
    if (priority) countQuery += ` AND priority = $2`;
    if (type) countQuery += ` AND suggestion_type = $${priority ? 3 : 2}`;
    
    let countParams;
    if (priority && type) {
      countParams = [status, priority, type];
    } else if (priority) {
      countParams = [status, priority];
    } else if (type) {
      countParams = [status, type];
    } else {
      countParams = [status];
    }

    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: Number.parseInt(countResult.rows[0].count, 10),
        limit: Number.parseInt(limit, 10),
        offset: Number.parseInt(offset, 10),
        hasMore: Number.parseInt(offset, 10) + result.rows.length < Number.parseInt(countResult.rows[0].count, 10)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching pending suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending suggestions',
      error: error.message
    });
  }
};

/**
 * Get AI feedback statistics
 * @route GET /api/admin/ai-stats
 */
exports.getFeedbackStats = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const safeDays = Number.parseInt(days, 10) || 30;

    // Get dashboard quick stats
    const dashboardStats = await pool.query(
      'SELECT * FROM ai_admin_dashboard_stats'
    );

    // Get accuracy trends
    const accuracyTrends = await pool.query(
      `SELECT 
        period,
        accuracy_score,
        consistency_score,
        total_corrections,
        improvement_percentage,
        corrections_by_type
       FROM ai_feedback_stats
       WHERE period >= CURRENT_DATE - $1 * INTERVAL '1 day'
       ORDER BY period DESC`,
      [safeDays]
    );

    // Get correction distribution by type
    const correctionsByType = await pool.query(
      `SELECT 
        suggestion_type,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
       FROM ai_corrections
       WHERE created_at >= NOW() - $1 * INTERVAL '1 day'
       GROUP BY suggestion_type
       ORDER BY count DESC`,
      [safeDays]
    );

    // Get top correctors
    const topCorrectors = await pool.query(
      `SELECT 
        u.username,
        u.full_name,
        COUNT(c.id) as correction_count,
        AVG(c.confidence_score) as avg_confidence
       FROM ai_corrections c
       JOIN users u ON c.admin_user_id = u.id
       WHERE c.created_at >= NOW() - $1 * INTERVAL '1 day'
       GROUP BY u.id, u.username, u.full_name
       ORDER BY correction_count DESC
       LIMIT 10`,
      [safeDays]
    );

    // Calculate overall accuracy
    const overallAccuracy = await pool.query(
      `SELECT calculate_ai_accuracy(
        CURRENT_DATE - $1 * INTERVAL '1 day',
        CURRENT_DATE
      )`,
      [safeDays]
    );

    res.status(200).json({
      success: true,
      data: {
        dashboard: dashboardStats.rows[0] || {},
        accuracy_trends: accuracyTrends.rows,
        corrections_by_type: correctionsByType.rows,
        top_correctors: topCorrectors.rows,
        overall_accuracy: overallAccuracy.rows[0] || {},
        period: {
          type: period,
          days: Number.parseInt(days, 10),
          start_date: new Date(Date.now() - Number.parseInt(days, 10) * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching AI stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI statistics',
      error: error.message
    });
  }
};

/**
 * Get monthly AI statistics
 * @route GET /api/admin/ai-stats/monthly
 */
exports.getMonthlyStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const monthlyStats = await pool.query(
      `SELECT 
        DATE_TRUNC('week', period) as week,
        AVG(accuracy_score) as avg_accuracy,
        SUM(total_corrections) as total_corrections,
        AVG(consistency_score) as avg_consistency,
        jsonb_object_agg(
          jsonb_each.key, 
          jsonb_each.value
        ) as aggregated_corrections_by_type
       FROM ai_feedback_stats,
       LATERAL jsonb_each(corrections_by_type)
       WHERE EXTRACT(MONTH FROM period) = $1
         AND EXTRACT(YEAR FROM period) = $2
       GROUP BY week
       ORDER BY week DESC`,
      [targetMonth, targetYear]
    );

    res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        weekly_stats: monthlyStats.rows
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching monthly stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly statistics',
      error: error.message
    });
  }
};

/**
 * Assign a pending suggestion to an admin
 * @route POST /api/admin/ai-suggestions/:id/assign
 */
exports.assignSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    const result = await pool.query(
      `UPDATE ai_pending_reviews
       SET assigned_to = $1, status = 'in_review', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [assigned_to, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    logger.info({
      action: 'suggestion_assigned',
      suggestion_id: id,
      assigned_to,
      assigned_by: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Suggestion assigned successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error assigning suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign suggestion',
      error: error.message
    });
  }
};

/**
 * Approve a suggestion without corrections
 * @route POST /api/admin/ai-suggestions/:id/approve
 */
exports.approveSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(
      `UPDATE ai_pending_reviews
       SET status = 'approved', reviewed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    // Update learning pattern as successful
    const suggestion = result.rows[0];
    const client = await pool.connect();
    try {
      await updateLearningPattern(
        client,
        suggestion.suggestion_type,
        suggestion.suggestion_data,
        true
      );
    } finally {
      client.release();
    }

    logger.info({
      action: 'suggestion_approved',
      suggestion_id: id,
      approved_by: req.user.id,
      notes
    });

    res.status(200).json({
      success: true,
      message: 'Suggestion approved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error approving suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve suggestion',
      error: error.message
    });
  }
};

/**
 * Helper function to update learning patterns
 */
async function updateLearningPattern(client, type, data, isSuccess) {
  try {
    // Extract key patterns from the data
    const patternData = extractPatterns(type, data);
    
    // Upsert learning pattern
    await client.query(
      `INSERT INTO ai_learning_patterns (pattern_type, pattern_data, success_count, failure_count, last_used_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (pattern_type, pattern_data) 
       DO UPDATE SET 
         success_count = ai_learning_patterns.success_count + $3,
         failure_count = ai_learning_patterns.failure_count + $4,
         last_used_at = NOW(),
         confidence_score = 
           CASE 
             WHEN (ai_learning_patterns.success_count + $3 + ai_learning_patterns.failure_count + $4) > 0
             THEN ((ai_learning_patterns.success_count + $3)::decimal / 
                   (ai_learning_patterns.success_count + $3 + ai_learning_patterns.failure_count + $4) * 100)
             ELSE 50
           END`,
      [type, JSON.stringify(patternData), isSuccess ? 1 : 0, isSuccess ? 0 : 1]
    );
  } catch (error) {
    logger.error('Error updating learning pattern:', error);
    // Don't throw - this is a background operation
  }
}

/**
 * Extract patterns from data based on type
 */
function extractPatterns(type, data) {
  switch (type) {
    case 'compatibility':
      return {
        components: data.selectedComponents || [],
        compatible: data.compatible,
        warnings: data.warnings || []
      };
    case 'upgrade':
      return {
        current: data.currentBuild || {},
        recommended: data.recommendations || {},
        budget: data.userBudget
      };
    case 'build_optimization':
      return {
        usage: data.usage,
        budget_range: data.budgetRange,
        optimizations: data.optimizations || []
      };
    default:
      return data;
  }
}

module.exports = exports;
