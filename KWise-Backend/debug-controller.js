const express = require('express');
const { query } = require('./config/db');
const logger = require('./utils/logger');

// Create a test endpoint to debug the getBuildComponents issue
const testGetBuildComponents = async (req, res) => {
    try {
        console.log('🔄 DEBUG: Starting getBuildComponents test...');
        
        const result = await query(`
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, description,
                CASE WHEN stock > 0 THEN true ELSE false END as available
            FROM pc_parts 
            WHERE is_active = true 
            AND kiosk_visible = true
            AND stock > 0
            ORDER BY category, price ASC
        `);

        console.log(`🔍 DEBUG: Query returned ${result.rows.length} total rows`);
        
        // Count by category
        const categoryCount = {};
        result.rows.forEach(row => {
            const cat = row.category.toLowerCase();
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        
        console.log('📊 DEBUG: Category counts from raw query:', categoryCount);

        // Group products by category (exact same logic as original)
        const componentsByCategory = {};
        const brandsByCategory = {};

        result.rows.forEach(row => {
            const category = row.category.toLowerCase();

            if (!componentsByCategory[category]) {
                componentsByCategory[category] = [];
                brandsByCategory[category] = new Set();
            }

            const product = {
                id: row.id,
                name: row.name,
                brand: row.brand,
                price: parseFloat(row.price),
                stock: parseInt(row.stock),
                imageUrl: row.image_url,
                specifications: row.specifications,
                description: row.description,
                available: row.available
            };

            componentsByCategory[category].push(product);
            brandsByCategory[category].add(row.brand);
        });

        console.log('📦 DEBUG: After grouping, category sizes:', 
            Object.fromEntries(
                Object.entries(componentsByCategory).map(([cat, products]) => [cat, products.length])
            )
        );

        // Convert to final structure (exact same logic as original)
        const buildComponents = {};
        Object.keys(componentsByCategory).forEach(category => {
            buildComponents[category] = {
                products: componentsByCategory[category],
                brands: Array.from(brandsByCategory[category]).sort()
            };
        });

        console.log('🎯 DEBUG: Final response CPU count:', buildComponents.cpu?.products?.length || 0);

        res.json({
            success: true,
            data: buildComponents,
            debug: {
                totalRows: result.rows.length,
                categoryCounts: Object.fromEntries(
                    Object.entries(buildComponents).map(([cat, data]) => [cat, data.products.length])
                )
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ DEBUG: Error in test endpoint:', error);
        logger.error('Error fetching build components (debug):', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch build components (debug)',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { testGetBuildComponents };