const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/servicesController');

/**
 * Services Routes - Public API endpoints for services (cleaning, checkup, upgrade)
 * All routes are public (no authentication required) for kiosk access
 */

// GET /api/services/cleaning - Get all cleaning service tiers
router.get('/cleaning', servicesController.getCleaningServices);

// GET /api/services/checkup - Get checkup service options  
router.get('/checkup', servicesController.getCheckupOptions);

// GET /api/services/diagnostic-issues - Get diagnostic issue categories
// Query params: ?category=hardware|software|performance|connectivity
router.get('/diagnostic-issues', servicesController.getDiagnosticIssues);

// GET /api/services/all - Get all services across all categories
router.get('/all', servicesController.getAllServices);

// GET /api/services/featured - Get featured services
router.get('/featured', servicesController.getFeaturedServices);

module.exports = router;