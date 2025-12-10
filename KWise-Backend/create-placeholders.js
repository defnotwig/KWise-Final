const { query } = require('./config/db');
const fs = require('fs');
const path = require('path');

// Category emoji map
const categoryEmojis = {
    'CPU': '⚙️',
    'GPU': '🎮',
    'Motherboard': '🔌',
    'RAM': '💾',
    'Storage': '💿',
    'PSU': '⚡',
    'Case': '🖥️',
    'Cooling': '❄️',
    'Monitor': '🖥️',
    'Keyboard': '⌨️',
    'Mouse': '🖱️',
    'Headphones': '🎧',
    'Speakers': '🔊',
    'Webcam': '📷',
    'Pre-Built': '🖥️'
};

function createPlaceholderSVG(category, productName) {
    const emoji = categoryEmojis[category] || '📦';
    const shortName = productName.length > 30 ? productName.substring(0, 27) + '...' : productName;
    
    return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#grad1)"/>
  <text x="200" y="150" font-family="Arial, sans-serif" font-size="20" fill="#888" text-anchor="middle">${category}</text>
  <text x="200" y="200" font-family="Arial, sans-serif" font-size="64" fill="#00d9ff" text-anchor="middle">${emoji}</text>
  <text x="200" y="260" font-family="Arial, sans-serif" font-size="14" fill="#ffffff" text-anchor="middle" font-weight="bold">${shortName}</text>
  <text x="200" y="290" font-family="Arial, sans-serif" font-size="12" fill="#666" text-anchor="middle">No Image Available</text>
</svg>`;
}

async function createMissingPlaceholders() {
    console.log('🎨 === CREATING PLACEHOLDER IMAGES ===\n');
    
    try {
        // Get all items with missing images
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
                missing.push({...item, reason: 'no_path'});
                continue;
            }
            
            // Skip /uploads paths (Community Builds) - we already handled those
            if (item.resolved_path.startsWith('/uploads')) {
                continue;
            }
            
            // Check if file exists
            const filePath = path.join(__dirname, 'public', item.resolved_path);
            if (!fs.existsSync(filePath)) {
                missing.push({...item, reason: 'file_not_found', file_path: filePath});
            }
        }
        
        console.log(`Found ${missing.length} items with missing images\n`);
        
        let created = 0;
        for (const item of missing) {
            if (item.reason === 'no_path') {
                console.log(`⏭️  Skipping ${item.name} (no path in database)`);
                continue;
            }
            
            // Create placeholder SVG
            const svg = createPlaceholderSVG(item.category, item.name);
            
            // Ensure directory exists
            const dir = path.dirname(item.file_path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Write SVG file
            fs.writeFileSync(item.file_path, svg);
            console.log(`✅ Created placeholder for: [${item.category}] ${item.name}`);
            created++;
        }
        
        console.log(`\n✅ Created ${created} placeholder images`);
        console.log('\n✅ === COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createMissingPlaceholders();
