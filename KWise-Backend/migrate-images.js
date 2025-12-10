const fs = require('fs');
const path = require('path');
const { query } = require('./config/db');

/**
 * Image Migration Script for K-Wise
 * 
 * This script:
 * 1. Copies all images from ./assets/parts/ to ./public/assets/parts/
 * 2. Updates database paths from /assets/parts/ format
 * 3. Verifies all images are accessible
 * 
 * Safe to run multiple times - won't duplicate files
 */

const OLD_DIR = path.join(__dirname, 'assets', 'parts');
const NEW_DIR = path.join(__dirname, 'public', 'assets', 'parts');

const migrateImages = async () => {
    console.log('🚀 Starting image migration...\n');
    
    // Step 1: Check if old directory exists
    if (!fs.existsSync(OLD_DIR)) {
        console.log('⚠️  Old assets directory not found:', OLD_DIR);
        console.log('   This is normal if you\'ve already migrated or have a clean install.');
        console.log('   Checking if public/assets already has images...\n');
    } else {
        console.log('✅ Found old assets directory:', OLD_DIR);
        
        // Step 2: Create new directory structure
        console.log('📁 Creating new directory structure...');
        if (!fs.existsSync(NEW_DIR)) {
            fs.mkdirSync(NEW_DIR, { recursive: true });
            console.log('✅ Created:', NEW_DIR);
        }
        
        // Step 3: Copy images by category
        const categories = fs.readdirSync(OLD_DIR).filter(item => {
            const fullPath = path.join(OLD_DIR, item);
            return fs.statSync(fullPath).isDirectory();
        });
        
        console.log(`\n📦 Found ${categories.length} categories to migrate:\n`);
        
        let totalCopied = 0;
        let totalSkipped = 0;
        
        for (const category of categories) {
            const oldCategoryDir = path.join(OLD_DIR, category);
            const newCategoryDir = path.join(NEW_DIR, category);
            
            // Create category directory in new location
            if (!fs.existsSync(newCategoryDir)) {
                fs.mkdirSync(newCategoryDir, { recursive: true });
            }
            
            // Get all image files
            const files = fs.readdirSync(oldCategoryDir).filter(file => {
                return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
            });
            
            console.log(`  📂 ${category}: ${files.length} images`);
            
            let categoryCopied = 0;
            let categorySkipped = 0;
            
            for (const file of files) {
                const oldPath = path.join(oldCategoryDir, file);
                const newPath = path.join(newCategoryDir, file);
                
                // Only copy if doesn't exist in new location
                if (!fs.existsSync(newPath)) {
                    fs.copyFileSync(oldPath, newPath);
                    categoryCopied++;
                } else {
                    categorySkipped++;
                }
            }
            
            console.log(`     ✅ Copied: ${categoryCopied}, Skipped (already exists): ${categorySkipped}`);
            
            totalCopied += categoryCopied;
            totalSkipped += categorySkipped;
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`   Total images copied: ${totalCopied}`);
        console.log(`   Total skipped (already exist): ${totalSkipped}`);
    }
    
    // Step 4: Verify database paths
    console.log('\n🔍 Verifying database image paths...\n');
    
    try {
        const result = await query(`
            SELECT id, name, category, image_url, image_path 
            FROM pc_parts 
            WHERE image_url IS NOT NULL OR image_path IS NOT NULL
            ORDER BY category, name
        `);
        
        console.log(`📊 Found ${result.rows.length} products with images in database`);
        
        let pathsOk = 0;
        let pathsMissing = 0;
        let pathsWrong = 0;
        
        for (const product of result.rows) {
            const imagePath = product.image_url || product.image_path;
            
            if (!imagePath) continue;
            
            // Check if path starts with /assets/
            if (!imagePath.startsWith('/assets/')) {
                console.log(`   ⚠️  Wrong path format: ${product.name}`);
                console.log(`      Current: ${imagePath}`);
                console.log(`      Should start with: /assets/parts/{category}/`);
                pathsWrong++;
                continue;
            }
            
            // Check if file exists
            const filePath = path.join(__dirname, 'public', imagePath);
            if (fs.existsSync(filePath)) {
                pathsOk++;
            } else {
                console.log(`   ❌ Missing file: ${product.name}`);
                console.log(`      Expected: ${filePath}`);
                console.log(`      DB path: ${imagePath}`);
                pathsMissing++;
            }
        }
        
        console.log(`\n✅ Database Verification Complete:`);
        console.log(`   Valid paths with files: ${pathsOk}`);
        console.log(`   Missing files: ${pathsMissing}`);
        console.log(`   Wrong path format: ${pathsWrong}`);
        
        // Step 5: Check for orphaned images
        console.log('\n🔍 Checking for orphaned images in public/assets/parts...\n');
        
        if (fs.existsSync(NEW_DIR)) {
            const newCategories = fs.readdirSync(NEW_DIR).filter(item => {
                const fullPath = path.join(NEW_DIR, item);
                return fs.statSync(fullPath).isDirectory();
            });
            
            for (const category of newCategories) {
                const categoryDir = path.join(NEW_DIR, category);
                const files = fs.readdirSync(categoryDir).filter(file => {
                    return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
                });
                
                console.log(`   📂 ${category}: ${files.length} images`);
            }
        }
        
    } catch (error) {
        console.error('❌ Database verification failed:', error.message);
    }
    
    console.log('\n✅ Migration complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Test image upload via admin panel');
    console.log('   3. Verify images display in Stock Categories and Kiosk');
    console.log('   4. After confirming everything works, you can safely delete ./assets/parts/');
    
    process.exit(0);
};

// Run migration
migrateImages().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
