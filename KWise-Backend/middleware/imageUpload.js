const multer = require('multer');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const productImagesDir = path.join(imagesDir, 'products');

// Ensure directories exist
[uploadsDir, imagesDir, productImagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Organize by category subdirectories
        const category = req.body.category || 'general';
        const categoryDir = path.join(productImagesDir, category.toLowerCase());
        
        // Create category directory if it doesn't exist
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }
        
        cb(null, categoryDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + '-' + originalName);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: fileFilter
});

// Helper function to delete old image file
const deleteImageFile = (imagePath) => {
    if (imagePath && fs.existsSync(imagePath)) {
        try {
            fs.unlinkSync(imagePath);
            return true;
        } catch (error) {
            logger.error('Error deleting image file:', error);
            return false;
        }
    }
    return false;
};

// Helper function to get image URL for frontend
const getImageUrl = (imageFilename, category) => {
    if (!imageFilename) return null;
    return `/api/images/products/${category}/${imageFilename}`;
};

// Helper function to get full image path
const getImagePath = (imageFilename, category) => {
    if (!imageFilename) return null;
    return path.join(productImagesDir, category.toLowerCase(), imageFilename);
};

module.exports = {
    upload,
    deleteImageFile,
    getImageUrl,
    getImagePath,
    productImagesDir
};
