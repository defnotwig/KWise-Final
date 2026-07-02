#!/usr/bin/env node
/**
 * Script to sync all profile images from assets directories to uploads directory
 * This ensures all profile images are accessible via the /uploads route
 */

const fs = require('node:fs');
const path = require('node:path');

const assetsDir = path.join(__dirname, '../public/assets/users');
const uploadsDir = path.join(__dirname, '../uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

function syncProfileImages() {
    console.log('🔄 Syncing profile images from assets to uploads...');
    
    const roles = ['admin', 'superadmin', 'developer', 'user'];
    let syncedCount = 0;
    let errorCount = 0;
    
    roles.forEach(role => {
        const roleDir = path.join(assetsDir, role);
        
        if (fs.existsSync(roleDir)) {
            const files = fs.readdirSync(roleDir);
            
            files.forEach(file => {
                if (file.startsWith('profile_')) {
                    const sourcePath = path.join(roleDir, file);
                    const targetPath = path.join(uploadsDir, file);
                    
                    try {
                        // Only copy if target doesn't exist or source is newer
                        if (!fs.existsSync(targetPath) || 
                            fs.statSync(sourcePath).mtime > fs.statSync(targetPath).mtime) {
                            fs.copyFileSync(sourcePath, targetPath);
                            console.log(`✅ Synced: ${file} (from ${role})`);
                            syncedCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Error syncing ${file}:`, error.message);
                        errorCount++;
                    }
                }
            });
        }
    });
    
    console.log(`\n📊 Sync Summary:`);
    console.log(`   ✅ Synced: ${syncedCount} files`);
    console.log(`   ❌ Errors: ${errorCount} files`);
    console.log(`   📁 Target: ${uploadsDir}`);
    
    return { syncedCount, errorCount };
}

// Run sync
if (require.main === module) {
    syncProfileImages();
} else {
    module.exports = syncProfileImages;
}
