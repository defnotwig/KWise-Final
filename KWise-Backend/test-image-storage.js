const fs = require('fs');
const path = require('path');

/**
 * Test Script for Category-Based Image Storage
 * Validates that the directory structure is properly created
 */

console.log('🧪 Testing Category-Based Image Storage Implementation...\n');

// Test directory structure
const baseDir = path.join(__dirname, 'public', 'assets', 'parts');
const categories = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling', 'monitor', 'mouse', 'keyboard', 'speakers', 'headphones', 'webcam'];

console.log('📁 Checking directory structure:');
console.log(`Base directory: ${baseDir}`);

// Check if base directory exists
if (fs.existsSync(baseDir)) {
    console.log('✅ Base parts directory exists');
} else {
    console.log('❌ Base parts directory does not exist');
}

// Check category directories
categories.forEach(category => {
    const categoryDir = path.join(baseDir, category);
    if (fs.existsSync(categoryDir)) {
        console.log(`✅ ${category} directory exists`);
    } else {
        console.log(`❌ ${category} directory missing`);
    }
});

// Test filename sanitization
console.log('\n📄 Testing filename sanitization:');

const testFilenames = [
    'AMD Ryzen 7 5800X.jpg',
    'NVIDIA GeForce RTX 4080 (Special Edition).png',
    'Corsair DDR4-3200 32GB Kit.webp',
    'Samsung 980 Pro 2TB SSD.jpg',
    'Test File with Spaces & Special@Chars!.png'
];

const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
};

testFilenames.forEach(filename => {
    const ext = path.extname(filename);
    const originalName = path.basename(filename, ext);
    const sanitized = sanitizeFilename(originalName);
    const finalName = `${sanitized}-${Date.now()}${ext}`;
    
    console.log(`Original: ${filename}`);
    console.log(`Sanitized: ${finalName}`);
    console.log('---');
});

// Test category mapping
console.log('\n🗂️ Testing category mapping:');

const getCategoryFolderName = (category) => {
    const mapping = {
        'CPU': 'cpu',
        'Motherboard': 'motherboard', 
        'RAM': 'ram',
        'Storage': 'storage',
        'GPU': 'gpu',
        'PSU': 'psu',
        'Case': 'case',
        'Cooling': 'cooling',
        'Monitor': 'monitor',
        'Headphones': 'headphones',
        'Keyboard': 'keyboard',
        'Mouse': 'mouse',
        'Speakers': 'speakers',
        'Webcam': 'webcam'
    };
    return mapping[category] || 'other';
};

const testCategories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'InvalidCategory'];

testCategories.forEach(category => {
    const folderName = getCategoryFolderName(category);
    console.log(`${category} → ${folderName}`);
});

// Test URL generation
console.log('\n🔗 Testing URL generation:');

const testImageUploads = [
    { category: 'CPU', filename: 'amd-ryzen-7-5800x-1234567890.jpg' },
    { category: 'GPU', filename: 'nvidia-geforce-rtx-4080-special-edition-1234567891.png' },
    { category: 'RAM', filename: 'corsair-ddr4-3200-32gb-kit-1234567892.webp' }
];

testImageUploads.forEach(({ category, filename }) => {
    const folderName = getCategoryFolderName(category);
    const imageUrl = `/assets/parts/${folderName}/${filename}`;
    console.log(`Category: ${category} → URL: ${imageUrl}`);
});

console.log('\n✅ Category-based image storage test completed!');
console.log('\n📋 Summary of improvements:');
console.log('   • Images are now organized by category folders');
console.log('   • Filenames preserve original names while being sanitized');
console.log('   • Automatic directory creation for all categories');
console.log('   • Timestamps prevent filename conflicts');
console.log('   • Migration utility for existing images');
console.log('   • Proper error handling and cleanup');