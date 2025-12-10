const { query } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function fixImagePaths() {
    console.log('🔧 === FIXING IMAGE PATHS ===\n');
    
    try {
        // Fix 1: Create default-community-build.jpg if it doesn't exist
        console.log('1️⃣ Creating default Community Build image...');
        const uploadsDir = path.join(__dirname, 'uploads');
        const defaultImagePath = path.join(uploadsDir, 'default-community-build.jpg');
        
        if (!fs.existsSync(defaultImagePath)) {
            // Create a simple SVG-based placeholder image
            const svgContent = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#1a1a2e"/>
  <text x="200" y="180" font-family="Arial" font-size="24" fill="#00d9ff" text-anchor="middle">Community Build</text>
  <text x="200" y="220" font-family="Arial" font-size="48" fill="#ffffff" text-anchor="middle">🖥️</text>
  <text x="200" y="260" font-family="Arial" font-size="16" fill="#888" text-anchor="middle">Custom PC Configuration</text>
</svg>`;
            fs.writeFileSync(defaultImagePath, svgContent);
            console.log('✅ Created default-community-build.jpg');
        } else {
            console.log('ℹ️  default-community-build.jpg already exists');
        }
        
        // Fix 2: Fix malformed path for Case ID 627
        console.log('\n2️⃣ Fixing malformed image path for Case ID 627...');
        const caseResult = await query(`
            SELECT id, name, image_url FROM pc_parts WHERE id = 627
        `);
        
        if (caseResult.rows.length > 0) {
            const item = caseResult.rows[0];
            console.log(`   Current: ${item.image_url}`);
            
            // Extract the filename and move to correct category folder
            const filename = path.basename(item.image_url);
            const correctPath = `/assets/parts/case/${filename}`;
            
            // Check if we need to move the physical file
            const oldFilePath = path.join(__dirname, 'public', item.image_url);
            const newFilePath = path.join(__dirname, 'public/assets/parts/case', filename);
            
            if (fs.existsSync(oldFilePath)) {
                console.log(`   Moving file to correct location...`);
                fs.renameSync(oldFilePath, newFilePath);
                console.log(`   ✅ File moved to: ${newFilePath}`);
            }
            
            // Update database
            await query(`
                UPDATE pc_parts 
                SET image_url = $1, updated_at = NOW() 
                WHERE id = 627
            `, [correctPath]);
            
            console.log(`   ✅ Database updated to: ${correctPath}`);
        } else {
            console.log('   ⚠️  Case ID 627 not found');
        }
        
        // Fix 3: Verify all Community Build images
        console.log('\n3️⃣ Verifying Community Build images...');
        const communityBuilds = await query(`
            SELECT id, name, image_url
            FROM pc_parts
            WHERE category = 'Pre-Built' AND specifications->>'buildSource' = 'community'
        `);
        
        console.log(`   Found ${communityBuilds.rows.length} Community Build items`);
        
        for (const build of communityBuilds.rows) {
            const imagePath = path.join(__dirname, build.image_url.replace(/^\//, ''));
            const exists = fs.existsSync(imagePath);
            console.log(`   ${build.name}: ${exists ? '✅' : '❌'} ${build.image_url}`);
        }
        
        // Fix 4: Check for any other missing images
        console.log('\n4️⃣ Scanning for missing images...');
        const allItems = await query(`
            SELECT id, name, category, image_url,
                   COALESCE(image_url, image_path) as resolved_path
            FROM pc_parts
            WHERE is_active = true
            ORDER BY category, id
        `);
        
        const missing = [];
        for (const item of allItems.rows) {
            if (!item.resolved_path) {
                missing.push(item);
                continue;
            }
            
            // Check if file exists
            const filePath = path.join(__dirname, 'public', item.resolved_path);
            if (!fs.existsSync(filePath)) {
                missing.push({...item, reason: 'file_not_found', attempted_path: filePath});
            }
        }
        
        if (missing.length > 0) {
            console.log(`\n   ⚠️  Found ${missing.length} items with missing images:`);
            for (const item of missing.slice(0, 10)) {
                console.log(`      - [${item.category}] ${item.name} (ID: ${item.id})`);
                if (item.reason === 'file_not_found') {
                    console.log(`        Path: ${item.resolved_path}`);
                    console.log(`        Attempted: ${item.attempted_path}`);
                } else {
                    console.log(`        No image path in database`);
                }
            }
            
            if (missing.length > 10) {
                console.log(`      ... and ${missing.length - 10} more`);
            }
        } else {
            console.log('   ✅ All images verified');
        }
        
        console.log('\n✅ === FIX COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixImagePaths();
