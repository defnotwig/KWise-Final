const { query } = require('./config/db');
const path = require('path');
const fs = require('fs');

async function debugImagePaths() {
    console.log('🔍 === DEBUGGING IMAGE PATHS ===\n');
    
    try {
        // Check database image paths
        console.log('📊 Checking database image URLs:\n');
        const result = await query(`
            SELECT id, name, category, image_url, image_path,
                   COALESCE(image_url, image_path) as resolved_path
            FROM pc_parts 
            WHERE category IN ('Case', 'Cooling', 'CPU', 'GPU', 'Community Build')
            ORDER BY category, id
            LIMIT 30
        `);
        
        console.log(`Found ${result.rows.length} items\n`);
        
        const pathIssues = {
            missing: [],
            uploads: [],
            assets: [],
            valid: []
        };
        
        for (const row of result.rows) {
            const resolvedPath = row.resolved_path;
            console.log(`\n[${row.category}] ${row.name} (ID: ${row.id})`);
            console.log(`  image_url: ${row.image_url}`);
            console.log(`  image_path: ${row.image_path}`);
            console.log(`  resolved: ${resolvedPath}`);
            
            if (!resolvedPath) {
                console.log(`  ❌ NO IMAGE PATH`);
                pathIssues.missing.push(row);
                continue;
            }
            
            // Check if path starts with /uploads or /assets
            if (resolvedPath.startsWith('/uploads')) {
                console.log(`  ⚠️ Uses /uploads path`);
                pathIssues.uploads.push(row);
                
                // Check if file exists
                const filePath = path.join(__dirname, 'uploads', resolvedPath.replace('/uploads/', ''));
                const exists = fs.existsSync(filePath);
                console.log(`  File exists: ${exists ? '✅ YES' : '❌ NO'} (${filePath})`);
            } else if (resolvedPath.startsWith('/assets')) {
                console.log(`  ✅ Uses /assets path`);
                pathIssues.assets.push(row);
                
                // Check if file exists
                const filePath = path.join(__dirname, 'public', resolvedPath);
                const exists = fs.existsSync(filePath);
                console.log(`  File exists: ${exists ? '✅ YES' : '❌ NO'} (${filePath})`);
            } else {
                console.log(`  ⚠️ Unexpected path format`);
                pathIssues.valid.push(row);
            }
        }
        
        // Summary
        console.log('\n\n📊 === SUMMARY ===\n');
        console.log(`Total items checked: ${result.rows.length}`);
        console.log(`Missing image paths: ${pathIssues.missing.length}`);
        console.log(`Using /uploads path: ${pathIssues.uploads.length}`);
        console.log(`Using /assets path: ${pathIssues.assets.length}`);
        console.log(`Other: ${pathIssues.valid.length}`);
        
        // Check file system structure
        console.log('\n\n📁 === FILE SYSTEM CHECK ===\n');
        
        const uploadsDir = path.join(__dirname, 'uploads');
        const assetsDir = path.join(__dirname, 'public', 'assets', 'parts');
        
        console.log('Uploads directory:');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir).filter(f => {
                const stat = fs.statSync(path.join(uploadsDir, f));
                return stat.isFile() && !f.includes('profile_');
            });
            console.log(`  ✅ Exists with ${files.length} product images`);
            if (files.length > 0) {
                console.log(`  Sample files: ${files.slice(0, 5).join(', ')}`);
            }
        } else {
            console.log('  ❌ Does not exist');
        }
        
        console.log('\nAssets directory:');
        if (fs.existsSync(assetsDir)) {
            const categories = fs.readdirSync(assetsDir).filter(f => {
                const stat = fs.statSync(path.join(assetsDir, f));
                return stat.isDirectory();
            });
            console.log(`  ✅ Exists with ${categories.length} categories`);
            console.log(`  Categories: ${categories.join(', ')}`);
            
            // Count files in each category
            for (const cat of categories.slice(0, 5)) {
                const catPath = path.join(assetsDir, cat);
                const files = fs.readdirSync(catPath).filter(f => {
                    const stat = fs.statSync(path.join(catPath, f));
                    return stat.isFile();
                });
                console.log(`    ${cat}: ${files.length} files`);
            }
        } else {
            console.log('  ❌ Does not exist');
        }
        
        // Check for Community Build items
        console.log('\n\n🏗️ === COMMUNITY BUILD CHECK ===\n');
        const communityBuilds = await query(`
            SELECT id, name, image_url, image_path, specifications->>'approvalStatus' as approval_status
            FROM pc_parts
            WHERE category = 'Pre-Built' AND specifications->>'buildSource' = 'community'
            ORDER BY id
            LIMIT 10
        `);
        
        console.log(`Found ${communityBuilds.rows.length} Community Build items:`);
        for (const build of communityBuilds.rows) {
            console.log(`\n  ${build.name} (ID: ${build.id})`);
            console.log(`    Status: ${build.approval_status || 'N/A'}`);
            console.log(`    image_url: ${build.image_url}`);
            console.log(`    image_path: ${build.image_path}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugImagePaths();
