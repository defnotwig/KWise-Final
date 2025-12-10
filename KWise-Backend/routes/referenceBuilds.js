/**
 * REFERENCE BUILDS ROUTES
 * 
 * RESTful API routes for managing the 72 reference PC builds
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const ReferenceBuildsController = require('../controllers/referenceBuildsController');

// ============================================================
// REFERENCE BUILDS ROUTES
// ============================================================

// Get all reference builds (72 total)
router.get('/all', ReferenceBuildsController.getAllBuilds);

// Get active/enabled reference builds only
router.get('/active', ReferenceBuildsController.getActiveBuilds);

// Get new products not yet in builds
router.get('/new-products', ReferenceBuildsController.getNewProducts);

// Get build statistics
router.get('/statistics', ReferenceBuildsController.getBuildStatistics);

// Get regeneration status
router.get('/status', ReferenceBuildsController.getRegenerationStatus);

// Regenerate all builds with current parameters
router.post('/regenerate', ReferenceBuildsController.regenerateBuilds);

// Edit specific build
router.put('/edit/:buildKey', ReferenceBuildsController.editBuild);

module.exports = router;
