const { query } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function diagnoseImages() {
    try {
        console.log('=== IMAGE DIAGNOSIS REPORT ===\n');
        
        // Query database for image paths
        const result = await query(`
            SELECT id, name, category, image_url, image_path 
            FROM pc_parts 
            WHERE (image_url IS NOT NULL OR image_path IS NOT NULL)
            AND category IN ('Case', 'CPU', 'GPU', 'Cooling', 'Community Build')
            ORDER BY category, id
            LIMIT 100
        `);
        
        console.log(`Found ${result.rows.length} items with image references\n`);
        
        const issues = [];
        const stats = {
            total: result.rows.length,
            missingFiles: 0,
            invalidPaths: 0,
            byCategory: {}
        };
        
        for (const row of result.rows) {
            const imagePath = row.image_url || row.image_path;
            
            if (!stats.byCategory[row.category]) {
                stats.byCategory[row.category] = { total: 0, missing: 0 };
            }
            stats.byCategory[row.category].total++;
            
            if (!imagePath) continue;
            
            // Determine file path
            let filePath;
            if (imagePath.startsWith('/uploads/')) {
                filePath = path.join(__dirname, imagePath);
            } else if (imagePath.startsWith('/assets/')) {
                filePath = path.join(__dirname, 'public', imagePath);
            } else {
                // Assume it's just a filename
                const category = row.category.toLowerCase().replace(/\s+/g, '');
                filePath = path.join(__dirname, 'public', 'assets', 'parts', category, imagePath);
            }
            
            // Check if file exists
            const exists = fs.existsSync(filePath);
            
            if (!exists) {
                stats.missingFiles++;
                stats.byCategory[row.category].missing++;
                issues.push({
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    dbPath: imagePath,
                    expectedPath: filePath
                });
            }
        }
        
        console.log('STATISTICS:');
        console.log(`Total items: ${stats.total}`);
        console.log(`Missing files: ${stats.missingFiles}`);
        console.log(`\nBy Category:`);
        Object.entries(stats.byCategory).forEach(([cat, data]) => {
            console.log(`  ${cat}: ${data.total} items, ${data.missing} missing`);
        });
        
        if (issues.length > 0) {
            console.log(`\n=== MISSING FILES (${issues.length}) ===`);
            issues.forEach(issue => {
                console.log(`\nID: ${issue.id}`);
                console.log(`  Name: ${issue.name}`);
                console.log(`  Category: ${issue.category}`);
                console.log(`  DB Path: ${issue.dbPath}`);
                console.log(`  Expected: ${issue.expectedPath}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

diagnoseImages();
