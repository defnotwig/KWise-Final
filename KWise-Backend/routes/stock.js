const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { kioskGeneralLimit, kioskSearchLimit, kioskBrowseLimit } = require('../middleware/kioskRateLimit');
const stockController = require('../controllers/stockController');

// =====================================================
// ENHANCED PC PARTS STOCK MANAGEMENT ROUTES
// =====================================================

// Public routes (no auth required for basic data) - Rate limited for kiosk protection

// GET /api/stock - List all parts with filtering and pagination
router.get('/', kioskBrowseLimit, stockController.list);

// GET /api/stock/all-items - Get all stock items for admin (no pagination)
router.get('/all-items', protect, restrictTo('admin', 'superadmin'), stockController.getAllStockItems);

// GET /api/stock/categories - Get list of categories
router.get('/categories', kioskBrowseLimit, stockController.getCategories);

// GET /api/stock/brands - Get list of unique brands  
router.get('/brands', kioskBrowseLimit, stockController.getBrands);

// GET /api/stock/brand-suggestions/:category - Get brand suggestions for autocomplete (NEW)
router.get('/brand-suggestions/:category', kioskGeneralLimit, stockController.getBrandSuggestions);

// GET /api/stock/brands/counts - Get brands with their item counts for a category
router.get('/brands/counts', kioskBrowseLimit, stockController.getBrandsWithCounts);

// GET /api/stock/price-range - Get min/max price for a category
router.get('/price-range', kioskGeneralLimit, stockController.getPriceRange);

// GET /api/stock/stats - Get inventory statistics
router.get('/stats', kioskGeneralLimit, stockController.getStats);

// GET /api/stock/search - Search for parts (more restrictive)
router.get('/search', kioskSearchLimit, stockController.search);

// GET /api/stock/low-stock - Get low stock items
router.get('/low-stock', kioskGeneralLimit, stockController.getLowStock);

// GET /api/stock/meta/:category - Get specification fields for category
router.get('/meta/:category', kioskGeneralLimit, stockController.getPartSpecFields);

// GET /api/stock/spec-values/:category - Get distinct specification values for a field
router.get('/spec-values/:category', kioskGeneralLimit, stockController.getSpecificationValues);

// GET /api/stock/spec-range/:category - Get min/max values for numeric specification fields
router.get('/spec-range/:category', kioskGeneralLimit, stockController.getSpecificationRange);

// GET /api/stock/items/:category - Get items by category (for component picker)
router.get('/items/:category', protect, restrictTo('admin', 'superadmin'), stockController.getItemsByCategory);

// GET /api/stock/:id - Get single part with specifications
router.get('/:id', kioskBrowseLimit, stockController.get);

// Protected routes (admin access required)

// POST /api/stock - Create new part
router.post('/', protect, restrictTo('admin', 'superadmin'), stockController.upload.single('image'), stockController.create);

// POST /api/stock/:id/image - Upload part image
router.post('/:id/image', protect, restrictTo('admin', 'superadmin'), stockController.uploadImage);

// POST /api/stock/migrate-images - Migrate existing images to category folders
router.post('/migrate-images', protect, restrictTo('superadmin'), stockController.migrateExistingImages);

// POST /api/stock/remove-backgrounds - Remove backgrounds from all product images (NEW)
router.post('/remove-backgrounds', protect, restrictTo('superadmin'), stockController.removeBackgrounds);

// POST /api/stock/:id/remove-background - Remove background from single product image (NEW)
router.post('/:id/remove-background', protect, restrictTo('admin', 'superadmin'), stockController.removeSingleBackground);

// PUT /api/stock/:id/sale - Make product on sale (NEW)
router.put('/:id/sale', protect, restrictTo('admin', 'superadmin'), stockController.makeOnSale);

// DELETE /api/stock/:id/sale - Remove product from sale (NEW)
router.delete('/:id/sale', protect, restrictTo('admin', 'superadmin'), stockController.removeFromSale);

// POST /api/stock/approve-community-build/:id - Approve pending community build (NEW)
router.post('/approve-community-build/:id', protect, restrictTo('admin', 'superadmin'), stockController.approveCommunityBuild);

// POST /api/stock/reject-community-build/:id - Reject pending community build (NEW)
router.post('/reject-community-build/:id', protect, restrictTo('admin', 'superadmin'), stockController.rejectCommunityBuild);

// PATCH /api/stock/:id - Update part
router.patch('/:id', protect, restrictTo('admin', 'superadmin'), stockController.upload.single('image'), stockController.update);

// DELETE /api/stock/:id - Soft delete part
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), stockController.delete);

module.exports = router;
