/**
 * PC UPGRADE PARAMETERS ROUTES
 * 
 * RESTful API routes for managing PC upgrade parameters
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const PCUpgradeParametersController = require('../controllers/pcUpgradeParametersController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
const requireParameterRead = restrictTo('admin', 'superadmin', 'developer');
const requireParameterWrite = restrictTo('admin', 'superadmin');

// ============================================================
// USAGE TYPES ROUTES
// ============================================================

// Get all usage types
router.get('/usage-types', requireParameterRead, PCUpgradeParametersController.getUsageTypes);

// Create new usage type
router.post('/usage-types', requireParameterWrite, PCUpgradeParametersController.createUsageType);

// Update usage type
router.put('/usage-types/:id', requireParameterWrite, PCUpgradeParametersController.updateUsageType);

// Delete usage type
router.delete('/usage-types/:id', requireParameterWrite, PCUpgradeParametersController.deleteUsageType);

// ============================================================
// YEAR RANGES ROUTES
// ============================================================

// Get all year ranges
router.get('/year-ranges', requireParameterRead, PCUpgradeParametersController.getYearRanges);

// Create new year range
router.post('/year-ranges', requireParameterWrite, PCUpgradeParametersController.createYearRange);

// Update year range
router.put('/year-ranges/:id', requireParameterWrite, PCUpgradeParametersController.updateYearRange);

// Delete year range
router.delete('/year-ranges/:id', requireParameterWrite, PCUpgradeParametersController.deleteYearRange);

// ============================================================
// BUDGET RANGES ROUTES
// ============================================================

// Get all budget ranges
router.get('/budget-ranges', requireParameterRead, PCUpgradeParametersController.getBudgetRanges);

// Create new budget range
router.post('/budget-ranges', requireParameterWrite, PCUpgradeParametersController.createBudgetRange);

// Update budget range
router.put('/budget-ranges/:id', requireParameterWrite, PCUpgradeParametersController.updateBudgetRange);

// Delete budget range
router.delete('/budget-ranges/:id', requireParameterWrite, PCUpgradeParametersController.deleteBudgetRange);

// ============================================================
// SUMMARY ROUTES
// ============================================================

// Get parameters summary
router.get('/summary', requireParameterRead, PCUpgradeParametersController.getParametersSummary);

// Get all parameters at once (for frontend)
router.get('/all', requireParameterRead, PCUpgradeParametersController.getAllParameters);

module.exports = router;
