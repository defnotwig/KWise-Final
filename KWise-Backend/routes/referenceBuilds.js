/**
 * REFERENCE BUILDS ROUTES
 * 
 * RESTful API routes for managing the 72 reference PC builds
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const ReferenceBuildsController = require('../controllers/referenceBuildsController');
const { protect, restrictTo } = require('../middleware/auth');

const requireReferenceBuildAdmin = [protect, restrictTo('admin', 'superadmin', 'developer')];
const requireReferenceBuildWrite = [protect, restrictTo('admin', 'superadmin')];

// ============================================================
// REFERENCE BUILDS ROUTES
// ============================================================

// Get all reference builds (72 total)
router.get('/all', requireReferenceBuildAdmin, ReferenceBuildsController.getAllBuilds);

// Get active/enabled reference builds only
router.get('/active', ReferenceBuildsController.getActiveBuilds);

// Get new products not yet in builds
router.get('/new-products', requireReferenceBuildAdmin, ReferenceBuildsController.getNewProducts);

// Get build statistics
router.get('/statistics', requireReferenceBuildAdmin, ReferenceBuildsController.getBuildStatistics);

// Get regeneration status
router.get('/status', requireReferenceBuildAdmin, ReferenceBuildsController.getRegenerationStatus);

// Regenerate all builds with current parameters
router.post('/regenerate', requireReferenceBuildWrite, ReferenceBuildsController.regenerateBuilds);

// Edit specific build
router.put('/edit/:buildKey', requireReferenceBuildWrite, ReferenceBuildsController.editBuild);

module.exports = router;
