const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Enhanced Image Upload Controller for K-Wise Stock Management
 * Implements per-category folder structure and sanitized filename handling
 * 
 * CRITICAL PATHS:
 * - Physical storage: KWise-Backend/public/assets/parts/{category}/
 * - Database storage: /assets/parts/{category}/filename.webp
 * - Frontend access: http://localhost:5000/assets/parts/{category}/filename.webp
 */

// Create per-category directory structure
const createCategoryDirs = () => {
    const categories = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling', 'monitor', 'mouse', 'keyboard', 'speakers', 'headphones', 'webcam'];
    const baseDir = path.join(__dirname, '..', 'public', 'assets', 'parts');
    
    console.log('📁 Creating category directories in:', baseDir);
    
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
        console.log('✅ Created base parts directory');
    }
    
    categories.forEach(category => {
        const categoryDir = path.join(baseDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
            console.log(`✅ Created category directory: ${category}`);
        }
    });
    
    console.log('✅ All category directories ready');
};

// Initialize directory structure
createCategoryDirs();

// Sanitize filename while preserving friendly name
const sanitizeFilename = (filename) => {
    // Remove unsafe characters but keep readable format
    return filename
        .replace(/[^\w\s.-]/g, '') // Remove special chars except word chars, spaces, dots, dashes
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .toLowerCase();
};

// Enhanced multer configuration with per-category folders
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // Get category from request body or query params
            const category = (req.body.category || req.query.category || 'other').toLowerCase();
            const categoryDir = path.join(__dirname, '..', 'public', 'assets', 'parts', category);
            
            // Ensure category directory exists
            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
            }
            
            cb(null, categoryDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        try {
            // Extract file extension
            const ext = path.extname(file.originalname).toLowerCase();
            
            // Create sanitized friendly filename
            const originalName = path.basename(file.originalname, ext);
            const sanitizedName = sanitizeFilename(originalName);
            
            // Add timestamp to avoid conflicts
            const timestamp = Date.now();
            const finalName = `${sanitizedName}-${timestamp}${ext}`;
            
            cb(null, finalName);
        } catch (error) {
            cb(error);
        }
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// POST /api/stock/upload - Upload image for stock item
const uploadStockImage = async (req, res) => {
    try {
        console.log('📸 Image upload request received');
        console.log('   Body:', req.body);
        console.log('   File:', req.file ? req.file.filename : 'No file');
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const { id, category } = req.body;
        
        if (!id) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        // Build relative path for database storage
        // This MUST match what frontend expects and what server.js serves
        const relativePath = `/assets/parts/${category}/${req.file.filename}`;
        
        console.log('💾 Saving image to database:');
        console.log(`   Physical path: ${req.file.path}`);
        console.log(`   Database path: ${relativePath}`);
        console.log(`   Product ID: ${id}`);
        
        // Verify file was actually saved
        if (!fs.existsSync(req.file.path)) {
            console.error('❌ FILE NOT FOUND after upload:', req.file.path);
            return res.status(500).json({
                success: false,
                message: 'File upload verification failed'
            });
        }
        
        console.log('✅ File exists on disk, updating database...');
        
        // Update database with image path
        const result = await query(`
            UPDATE pc_parts 
            SET image_url = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING id, name, category, image_url
        `, [relativePath, id]);

        if (result.rows.length === 0) {
            // Clean up uploaded file since product wasn't found
            fs.unlinkSync(req.file.path);
            console.error('❌ Product not found in database:', id);
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const product = result.rows[0];
        
        logger.info(`✅ Image uploaded successfully for product ${id}`, {
            productId: id,
            productName: product.name,
            imagePath: relativePath,
            originalName: req.file.originalname,
            filename: req.file.filename,
            fileSize: req.file.size
        });
        
        // Verify image is accessible via server
        const serverUrl = `http://localhost:5000${relativePath}`;
        console.log(`🌐 Image should be accessible at: ${serverUrl}`);

        res.json({
            success: true,
            data: {
                product: product,
                image: {
                    path: relativePath,
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    url: relativePath // Return the path that frontend should use
                }
            },
            message: 'Image uploaded successfully'
        });

    } catch (error) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log('🧹 Cleaned up file after error');
        }
        
        logger.error('❌ Error uploading stock image:', error);
        console.error('❌ Upload error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
};

// GET /api/stock/image/:id - Get image info for product
const getImageInfo = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(`
            SELECT id, name, category, image_path 
            FROM pc_parts 
            WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const product = result.rows[0];
        
        if (!product.image_path) {
            return res.json({
                success: true,
                data: {
                    hasImage: false,
                    product: product
                }
            });
        }
        
        // Check if file exists on disk
        const fullPath = path.join(__dirname, '..', 'public', product.image_path);
        const exists = fs.existsSync(fullPath);
        
        res.json({
            success: true,
            data: {
                hasImage: exists,
                imagePath: product.image_path,
                product: product
            }
        });
        
    } catch (error) {
        logger.error('Error getting image info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get image information'
        });
    }
};

module.exports = {
    upload,
    uploadStockImage,
    getImageInfo,
    single: upload.single('image'), // For use in routes
    createCategoryDirs
};
