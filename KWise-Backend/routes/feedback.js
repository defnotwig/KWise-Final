/**
 * PRIORITY 3: REAL-WORLD DATA API ROUTES
 * User feedback, known issues, and successful builds
 * 
 * Expected Impact: +0.4 rating (4.3 → 4.7)
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const realWorldDataService = require('../services/realWorldDataService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * =======================================================================
 * USER FEEDBACK ENDPOINTS (Public-facing)
 * =======================================================================
 */

/**
 * Submit user feedback
 * POST /api/feedback/submit
 * Body: { user_id, component_id, issue_type, severity, title, description, rating, build_context }
 */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const feedbackData = {
      user_id: req.user.id,
      ...req.body
    };

    const result = await realWorldDataService.submitUserFeedback(feedbackData);

    res.status(201).json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Failed to submit feedback', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
});

/**
 * Get feedback for a component
 * GET /api/feedback/component/:componentId
 */
router.get('/component/:componentId', async (req, res) => {
  try {
    const { componentId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const feedback = await realWorldDataService.getComponentFeedback(componentId, limit);

    res.json({
      success: true,
      count: feedback.length,
      feedback
    });

  } catch (error) {
    logger.error('Failed to get component feedback', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get component feedback',
      error: error.message
    });
  }
});

/**
 * Vote on feedback helpfulness
 * POST /api/feedback/:feedbackId/vote
 * Body: { vote: 'helpful' | 'not_helpful' }
 */
router.post('/:feedbackId/vote', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { vote } = req.body;

    if (!['helpful', 'not_helpful'].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote. Must be "helpful" or "not_helpful"'
      });
    }

    const result = await realWorldDataService.voteFeedback(feedbackId, req.user.id, vote);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Failed to vote feedback', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to vote feedback',
      error: error.message
    });
  }
});

/**
 * =======================================================================
 * KNOWN ISSUES ENDPOINTS
 * =======================================================================
 */

/**
 * Report a known issue
 * POST /api/feedback/known-issue
 * Body: { component1_id, component2_id, issue_title, issue_description, severity, workaround, source_url }
 */
router.post('/known-issue', authenticateToken, async (req, res) => {
  try {
    const issueData = {
      ...req.body,
      reported_by: req.user.id,
      source: 'user_report'
    };

    const result = await realWorldDataService.recordKnownIssue(issueData);

    res.status(201).json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Failed to report known issue', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to report known issue',
      error: error.message
    });
  }
});

/**
 * Check for known issues with components
 * POST /api/feedback/check-issues
 * Body: { component_ids: [1, 2, 3, ...] }
 */
router.post('/check-issues', async (req, res) => {
  try {
    const { component_ids } = req.body;

    if (!Array.isArray(component_ids)) {
      return res.status(400).json({
        success: false,
        message: 'component_ids must be an array'
      });
    }

    const issues = await realWorldDataService.checkKnownIssues(component_ids);

    res.json({
      success: true,
      count: issues.length,
      issues: issues.map(issue => ({
        id: issue.id,
        title: issue.issue_title,
        description: issue.issue_description,
        severity: issue.severity,
        workaround: issue.workaround,
        requires_bios_update: issue.requires_bios_update,
        minimum_bios_version: issue.minimum_bios_version,
        components: {
          component1: {
            id: issue.component1_id,
            name: issue.component1_name,
            category: issue.component1_category
          },
          component2: issue.component2_id ? {
            id: issue.component2_id,
            name: issue.component2_name,
            category: issue.component2_category
          } : null
        },
        verification_count: issue.verification_count,
        verified: issue.verified
      }))
    });

  } catch (error) {
    logger.error('Failed to check known issues', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to check known issues',
      error: error.message
    });
  }
});

/**
 * Verify a known issue
 * POST /api/feedback/known-issue/:issueId/verify
 * Body: { notes: 'Additional context' }
 */
router.post('/known-issue/:issueId/verify', authenticateToken, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { notes } = req.body;

    const result = await realWorldDataService.verifyKnownIssue(issueId, req.user.id, notes || '');

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Failed to verify known issue', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to verify known issue',
      error: error.message
    });
  }
});

/**
 * Resolve a known issue (Admin only)
 * POST /api/feedback/known-issue/:issueId/resolve
 * Body: { resolution: 'How it was resolved' }
 */
router.post('/known-issue/:issueId/resolve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution is required'
      });
    }

    const result = await realWorldDataService.resolveKnownIssue(issueId, resolution, req.user.id);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Failed to resolve known issue', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to resolve known issue',
      error: error.message
    });
  }
});

/**
 * =======================================================================
 * SUCCESSFUL BUILDS ENDPOINTS
 * =======================================================================
 */

/**
 * Submit a successful build
 * POST /api/feedback/successful-build
 * Body: { build_name, build_type, components, total_price, use_case, performance_rating, stability_rating, satisfaction_rating, notes, specifications }
 */
router.post('/successful-build', authenticateToken, async (req, res) => {
  try {
    const buildData = {
      user_id: req.user.id,
      ...req.body
    };

    // Validate required fields
    if (!buildData.build_name || !buildData.build_type || !buildData.components) {
      return res.status(400).json({
        success: false,
        message: 'build_name, build_type, and components are required'
      });
    }

    // Validate ratings
    const ratings = ['performance_rating', 'stability_rating', 'satisfaction_rating'];
    for (const rating of ratings) {
      if (buildData[rating] && (buildData[rating] < 1 || buildData[rating] > 5)) {
        return res.status(400).json({
          success: false,
          message: `${rating} must be between 1 and 5`
        });
      }
    }

    const result = await realWorldDataService.recordSuccessfulBuild(buildData);

    res.status(201).json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Failed to submit successful build', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to submit successful build',
      error: error.message
    });
  }
});

/**
 * Get similar successful builds
 * POST /api/feedback/similar-builds
 * Body: { components: { cpu_id, gpu_id, ... }, limit: 5 }
 */
router.post('/similar-builds', async (req, res) => {
  try {
    const { components, limit } = req.body;

    if (!components || typeof components !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'components object is required'
      });
    }

    const similarBuilds = await realWorldDataService.getSimilarSuccessfulBuilds(
      components,
      limit || 5
    );

    res.json({
      success: true,
      count: similarBuilds.length,
      builds: similarBuilds.map(build => ({
        id: build.id,
        build_name: build.build_name,
        build_type: build.build_type,
        user: build.username,
        components: JSON.parse(build.components_json),
        total_price: parseFloat(build.total_price),
        ratings: {
          performance: parseFloat(build.performance_rating),
          stability: parseFloat(build.stability_rating),
          satisfaction: parseFloat(build.satisfaction_rating),
          average: parseFloat(build.avg_rating)
        },
        match_count: parseInt(build.match_count),
        use_case: build.use_case,
        notes: build.notes,
        created_at: build.created_at
      }))
    });

  } catch (error) {
    logger.error('Failed to get similar builds', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get similar builds',
      error: error.message
    });
  }
});

/**
 * Get build pattern statistics
 * POST /api/feedback/build-pattern-stats
 * Body: { components: { cpu_id, gpu_id, ... } }
 */
router.post('/build-pattern-stats', async (req, res) => {
  try {
    const { components } = req.body;

    if (!components || typeof components !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'components object is required'
      });
    }

    const stats = await realWorldDataService.getBuildPatternStats(components);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Failed to get build pattern stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get build pattern stats',
      error: error.message
    });
  }
});

/**
 * =======================================================================
 * COMPATIBILITY CONFIDENCE ENDPOINT
 * =======================================================================
 */

/**
 * Get real-world compatibility confidence
 * POST /api/feedback/compatibility-confidence
 * Body: { component_ids: [1, 2, 3, ...] }
 */
router.post('/compatibility-confidence', async (req, res) => {
  try {
    const { component_ids } = req.body;

    if (!Array.isArray(component_ids)) {
      return res.status(400).json({
        success: false,
        message: 'component_ids must be an array'
      });
    }

    const confidence = await realWorldDataService.getRealWorldCompatibilityConfidence(component_ids);

    res.json({
      success: true,
      ...confidence
    });

  } catch (error) {
    logger.error('Failed to get compatibility confidence', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get compatibility confidence',
      error: error.message
    });
  }
});

/**
 * =======================================================================
 * ADMIN ENDPOINTS
 * =======================================================================
 */

/**
 * Get pending feedback for admin review
 * GET /api/feedback/admin/pending
 */
router.get('/admin/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await query(
      `SELECT 
        fs.*,
        u.username,
        p.name as component_name,
        p.category as component_category,
        (SELECT COUNT(*) FROM feedback_votes WHERE feedback_id = fs.id AND vote = 'helpful') as helpful_votes
      FROM feedback_submissions fs
      LEFT JOIN users u ON fs.user_id = u.id
      LEFT JOIN pc_parts p ON fs.component_id = p.id
      WHERE fs.status = 'pending'
      ORDER BY 
        CASE fs.severity
          WHEN 'critical' THEN 1
          WHEN 'major' THEN 2
          WHEN 'minor' THEN 3
          WHEN 'positive' THEN 4
        END,
        helpful_votes DESC,
        fs.created_at ASC
      LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      count: result.rows.length,
      feedback: result.rows
    });

  } catch (error) {
    logger.error('Failed to get pending feedback', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get pending feedback',
      error: error.message
    });
  }
});

/**
 * Review feedback (Admin only)
 * POST /api/feedback/admin/:feedbackId/review
 * Body: { status: 'verified' | 'rejected', admin_notes: 'Reason' }
 */
router.post('/admin/:feedbackId/review', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status, admin_notes } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "verified" or "rejected"'
      });
    }

    const db = require('../config/db');

    await query(
      `UPDATE feedback_submissions
       SET status = $1,
           admin_notes = $2,
           reviewed_by = $3,
           reviewed_at = NOW()
       WHERE id = $4`,
      [status, admin_notes || '', req.user.id, feedbackId]
    );

    logger.info(`Admin reviewed feedback #${feedbackId}: ${status}`);

    res.json({
      success: true,
      message: `Feedback ${status}`
    });

  } catch (error) {
    logger.error('Failed to review feedback', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to review feedback',
      error: error.message
    });
  }
});

/**
 * Get service health status
 * GET /api/feedback/health
 */
router.get('/health', (req, res) => {
  try {
    const health = realWorldDataService.getHealthStatus();

    res.json({
      success: true,
      ...health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Service health check failed',
      error: error.message
    });
  }
});

module.exports = router;



