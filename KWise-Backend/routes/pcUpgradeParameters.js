/**
 * PC UPGRADE PARAMETERS ROUTES
 * 
 * RESTful API routes for managing PC upgrade parameters
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const PCUpgradeParametersController = require('../controllers/pcUpgradeParametersController');

// ============================================================
// USAGE TYPES ROUTES
// ============================================================

// Get all usage types
router.get('/usage-types', PCUpgradeParametersController.getUsageTypes);

// Create new usage type
router.post('/usage-types', PCUpgradeParametersController.createUsageType);

// Update usage type
router.put('/usage-types/:id', PCUpgradeParametersController.updateUsageType);

// Delete usage type
router.delete('/usage-types/:id', PCUpgradeParametersController.deleteUsageType);

// ============================================================
// YEAR RANGES ROUTES
// ============================================================

// Get all year ranges
router.get('/year-ranges', PCUpgradeParametersController.getYearRanges);

// Create new year range
router.post('/year-ranges', PCUpgradeParametersController.createYearRange);

// Update year range
router.put('/year-ranges/:id', PCUpgradeParametersController.updateYearRange);

// Delete year range
router.delete('/year-ranges/:id', PCUpgradeParametersController.deleteYearRange);

// ============================================================
// BUDGET RANGES ROUTES
// ============================================================

// Get all budget ranges
router.get('/budget-ranges', PCUpgradeParametersController.getBudgetRanges);

// Create new budget range
router.post('/budget-ranges', PCUpgradeParametersController.createBudgetRange);

// Update budget range
router.put('/budget-ranges/:id', PCUpgradeParametersController.updateBudgetRange);

// Delete budget range
router.delete('/budget-ranges/:id', PCUpgradeParametersController.deleteBudgetRange);

// ============================================================
// SUMMARY ROUTES
// ============================================================

// Get parameters summary
router.get('/summary', PCUpgradeParametersController.getParametersSummary);

// Get all parameters at once (for frontend)
router.get('/all', PCUpgradeParametersController.getAllParameters);

module.exports = router;
