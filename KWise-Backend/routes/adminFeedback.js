/**
 * Admin Feedback Routes
 * Routes for admin review and correction of AI suggestions
 */

const express = require('express');
const router = express.Router();
const adminFeedbackController = require('../controllers/adminFeedbackController');
const { authenticateToken, restrictTo } = require('../middleware/auth');

// All routes require authentication and admin/superadmin role
router.use(authenticateToken);
router.use(restrictTo('superadmin', 'admin'));

/**
 * @route POST /api/admin/ai-corrections
 * @desc Submit a correction for an AI suggestion
 * @access Admin, Superadmin
 */
router.post('/ai-corrections', adminFeedbackController.submitCorrection);

/**
 * @route GET /api/admin/ai-suggestions/pending
 * @desc Get pending AI suggestions for review
 * @access Admin, Superadmin
 * @query status - Filter by status (pending, in_review, corrected, approved)
 * @query priority - Filter by priority (0-3)
 * @query type - Filter by suggestion type
 * @query limit - Results per page (default: 50)
 * @query offset - Pagination offset (default: 0)
 */
router.get('/ai-suggestions/pending', adminFeedbackController.getPendingSuggestions);

/**
 * @route GET /api/admin/ai-stats
 * @desc Get AI feedback statistics and trends
 * @access Admin, Superadmin
 * @query period - Period type (daily, weekly, monthly)
 * @query days - Number of days to include (default: 30)
 */
router.get('/ai-stats', adminFeedbackController.getFeedbackStats);

/**
 * @route GET /api/admin/ai-stats/monthly
 * @desc Get monthly AI statistics
 * @access Admin, Superadmin
 * @query month - Month (1-12)
 * @query year - Year (YYYY)
 */
router.get('/ai-stats/monthly', adminFeedbackController.getMonthlyStats);

/**
 * @route POST /api/admin/ai-suggestions/:id/assign
 * @desc Assign a pending suggestion to an admin
 * @access Admin, Superadmin
 */
router.post('/ai-suggestions/:id/assign', adminFeedbackController.assignSuggestion);

/**
 * @route POST /api/admin/ai-suggestions/:id/approve
 * @desc Approve a suggestion without corrections
 * @access Admin, Superadmin
 */
router.post('/ai-suggestions/:id/approve', adminFeedbackController.approveSuggestion);

module.exports = router;
