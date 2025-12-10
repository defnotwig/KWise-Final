const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function diagnoseImagePaths() {
  console.log('🔍 DIAGNOSTIC: Finding existing product images...\n');
  
  try {
    // 1. Check database for image paths
    const result = await db.query('SELECT id, name, image_url FROM pc_parts WHERE image_url IS NOT NULL LIMIT 10');
    const products = result.rows || result;
    console.log('📊 Sample Database Image Paths:');
    products.forEach(p => {
      console.log(`  ${p.name}: ${p.image_url}`);
    });
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  }
  
  // 2. Search filesystem for image directories
  const possibleDirs = [
    'uploads',
    'uploads/products',
    'uploads/parts',
    'public/uploads',
    'public/assets',
    'public/assets/parts',
    'public/assets/parts/case',
    'backend/uploads',
    'backend/public/uploads',
    'assets/parts'
  ];
  
  console.log('\n📁 Searching filesystem for image directories:');
  possibleDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath).filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f));
      console.log(`  ✅ ${dir} EXISTS - ${files.length} image files`);
      if (files.length > 0) {
        console.log(`     Sample files: ${files.slice(0, 3).join(', ')}`);
      }
    } else {
      console.log(`  ❌ ${dir} NOT FOUND`);
    }
  });
  
  // 3. Find directories with most images
  console.log('\n🔎 Searching for directories with .webp/.jpg/.png files:');
  findImageDirectories(__dirname);
  
  process.exit(0);
}

function findImageDirectories(dir, depth = 0) {
  if (depth > 4) return;
  
  try {
    const items = fs.readdirSync(dir);
    const imageFiles = items.filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f));
    
    if (imageFiles.length > 0) {
      console.log(`  📂 ${dir.replace(__dirname, '.')} - ${imageFiles.length} images`);
    }
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        findImageDirectories(fullPath, depth + 1);
      }
    });
  } catch (err) {
    // Skip inaccessible directories
  }
}

diagnoseImagePaths();
