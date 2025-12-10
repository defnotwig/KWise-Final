/**
 * PC CUSTOMIZED AI REFERENCE BUILDS ROUTES
 * 
 * Routes for managing PC Customized AI reference builds and parameters
 */

const express = require('express');
const router = express.Router();
const PCCustomizedAIBuildsController = require('../controllers/pcCustomizedAIBuildsController');
const PCCustomizedAIParametersController = require('../controllers/pcCustomizedAIParametersController');

// ============================================
// BUILDS MANAGEMENT ROUTES
// ============================================

// Get all PC Customized AI builds
router.get('/all', PCCustomizedAIBuildsController.getAllBuilds);

// Get statistics about builds
router.get('/statistics', PCCustomizedAIBuildsController.getStatistics);

// Get new products not in builds
router.get('/new-products', PCCustomizedAIBuildsController.getNewProducts);

// Get regeneration status
router.get('/status', PCCustomizedAIBuildsController.getStatus);

// Regenerate all builds
router.post('/regenerate', PCCustomizedAIBuildsController.regenerateBuilds);

// ============================================
// PARAMETERS MANAGEMENT ROUTES
// ============================================

// Get all parameters
router.get('/parameters/all', PCCustomizedAIParametersController.getAllParameters);

// Usage Types
router.post('/parameters/usage-types', PCCustomizedAIParametersController.createUsageType);
router.put('/parameters/usage-types/:id', PCCustomizedAIParametersController.updateUsageType);
router.delete('/parameters/usage-types/:id', PCCustomizedAIParametersController.deleteUsageType);

// Budget Ranges
router.post('/parameters/budget-ranges', PCCustomizedAIParametersController.createBudgetRange);
router.put('/parameters/budget-ranges/:id', PCCustomizedAIParametersController.updateBudgetRange);
router.delete('/parameters/budget-ranges/:id', PCCustomizedAIParametersController.deleteBudgetRange);

// Performance Preferences
router.post('/parameters/performance-preferences', PCCustomizedAIParametersController.createPerformancePref);
router.put('/parameters/performance-preferences/:id', PCCustomizedAIParametersController.updatePerformancePref);
router.delete('/parameters/performance-preferences/:id', PCCustomizedAIParametersController.deletePerformancePref);

// Gaming Preferences
router.post('/parameters/gaming-preferences', PCCustomizedAIParametersController.createGamingPref);
router.put('/parameters/gaming-preferences/:id', PCCustomizedAIParametersController.updateGamingPref);
router.delete('/parameters/gaming-preferences/:id', PCCustomizedAIParametersController.deleteGamingPref);

module.exports = router;

