/**
 * Script to populate tier values for all stock items using AI analysis
 * Uses Ollama DeepSeek R1 AI to analyze components and assign appropriate tiers
 * 
 * Tier Classification:
 * - entry: Budget-friendly components (₱0-5,000)
 * - mid-tier: Balanced performance & value (₱5,001-15,000)
 * - high-tier: Premium components (₱15,001-40,000)
 * - elite: Top-of-the-line performance (₱40,001+)
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const ollamaService = require('../utils/ollamaService');

// Tier classification rules based on category and price ranges
const TIER_RULES = {
    'CPU': {
        entry: { maxPrice: 5000, indicators: ['Athlon', 'Pentium', 'Celeron', 'Ryzen 3', 'i3'] },
        'mid-tier': { maxPrice: 15000, indicators: ['Ryzen 5', 'i5', 'Ryzen 7 3', 'Ryzen 7 4'] },
        'high-tier': { maxPrice: 40000, indicators: ['Ryzen 7 5', 'Ryzen 7 7', 'i7', 'Ryzen 9 5'] },
        elite: { indicators: ['Ryzen 9 7', 'Ryzen 9 9', 'i9', 'Threadripper'] }
    },
    'GPU': {
        entry: { maxPrice: 8000, indicators: ['GT 1030', 'RX 550', 'RX 560', 'GTX 1050', 'GTX 1650'] },
        'mid-tier': { maxPrice: 20000, indicators: ['GTX 1660', 'RTX 3050', 'RX 6600', 'RX 5600'] },
        'high-tier': { maxPrice: 50000, indicators: ['RTX 3060', 'RTX 4060', 'RX 6700', 'RX 7600'] },
        elite: { indicators: ['RTX 4070', 'RTX 4080', 'RTX 4090', 'RX 7900'] }
    },
    'RAM': {
        entry: { maxPrice: 2000, indicators: ['8GB', 'DDR4 2666', 'DDR4 3000'] },
        'mid-tier': { maxPrice: 5000, indicators: ['16GB', 'DDR4 3200', 'DDR4 3600'] },
        'high-tier': { maxPrice: 12000, indicators: ['32GB', 'DDR5'] },
        elite: { indicators: ['64GB', 'DDR5 6000', 'DDR5 7000'] }
    },
    'Storage': {
        entry: { maxPrice: 2000, indicators: ['256GB', '512GB', 'SATA SSD', 'HDD'] },
        'mid-tier': { maxPrice: 5000, indicators: ['1TB', 'NVMe Gen3'] },
        'high-tier': { maxPrice: 15000, indicators: ['2TB', 'NVMe Gen4'] },
        elite: { indicators: ['4TB', 'NVMe Gen5', 'PCIe 5.0'] }
    },
    'Motherboard': {
        entry: { maxPrice: 5000, indicators: ['A320', 'A520', 'H410', 'H510', 'B450'] },
        'mid-tier': { maxPrice: 10000, indicators: ['B550', 'B560', 'B660', 'B760'] },
        'high-tier': { maxPrice: 20000, indicators: ['X570', 'Z590', 'Z690', 'Z790'] },
        elite: { indicators: ['X670', 'X870', 'Z890', 'TRX40'] }
    },
    'PSU': {
        entry: { maxPrice: 2500, indicators: ['500W', '550W', '80+ Bronze'] },
        'mid-tier': { maxPrice: 6000, indicators: ['650W', '750W', '80+ Gold'] },
        'high-tier': { maxPrice: 12000, indicators: ['850W', '1000W', '80+ Platinum'] },
        elite: { indicators: ['1200W', '1500W', '80+ Titanium'] }
    },
    'Case': {
        entry: { maxPrice: 2000 },
        'mid-tier': { maxPrice: 5000 },
        'high-tier': { maxPrice: 10000 },
        elite: {}
    },
    'Cooling': {
        entry: { maxPrice: 1500, indicators: ['Stock', 'Basic', 'Single Fan'] },
        'mid-tier': { maxPrice: 4000, indicators: ['Tower', 'Dual Fan', '120mm'] },
        'high-tier': { maxPrice: 8000, indicators: ['240mm', '280mm', 'AIO'] },
        elite: { indicators: ['360mm', '420mm', 'Custom Loop'] }
    }
};

// Determine tier based on category, price, and name indicators
function determineTierByRules(category, price, name, specifications) {
    const rules = TIER_RULES[category];
    if (!rules) {
        // For categories without specific rules, use price-based classification
        if (price <= 2000) return 'entry';
        if (price <= 8000) return 'mid-tier';
        if (price <= 20000) return 'high-tier';
        return 'elite';
    }

    const upperName = name.toUpperCase();
    const specsString = specifications ? JSON.stringify(specifications).toUpperCase() : '';

    // Check elite first (no price limit)
    if (rules.elite.indicators) {
        const matchesElite = rules.elite.indicators.some(indicator => 
            upperName.includes(indicator.toUpperCase()) || 
            specsString.includes(indicator.toUpperCase())
        );
        if (matchesElite) return 'elite';
    }

    // Check high-tier
    if (price <= (rules['high-tier'].maxPrice || Infinity)) {
        if (rules['high-tier'].indicators) {
            const matchesHighTier = rules['high-tier'].indicators.some(indicator => 
                upperName.includes(indicator.toUpperCase()) || 
                specsString.includes(indicator.toUpperCase())
            );
            if (matchesHighTier) return 'high-tier';
        }
    } else if (!rules.elite.indicators) {
        // If price exceeds high-tier max and no elite indicators, classify as elite
        return 'elite';
    }

    // Check mid-tier
    if (price <= (rules['mid-tier'].maxPrice || Infinity)) {
        if (rules['mid-tier'].indicators) {
            const matchesMidTier = rules['mid-tier'].indicators.some(indicator => 
                upperName.includes(indicator.toUpperCase()) || 
                specsString.includes(indicator.toUpperCase())
            );
            if (matchesMidTier) return 'mid-tier';
        }
    } else {
        return 'high-tier'; // Between mid and high price range
    }

    // Check entry
    if (price <= (rules.entry.maxPrice || Infinity)) {
        if (rules.entry.indicators) {
            const matchesEntry = rules.entry.indicators.some(indicator => 
                upperName.includes(indicator.toUpperCase()) || 
                specsString.includes(indicator.toUpperCase())
            );
            if (matchesEntry) return 'entry';
        }
        return 'entry'; // Low price = entry by default
    }

    // Fallback to mid-tier if nothing matches
    return 'mid-tier';
}

async function populateTiers() {
    console.log('🏆 Starting tier population for all stock items...\n');

    try {
        // Get all items without tiers
        const result = await query(`
            SELECT id, name, category, brand, price, specifications, tier
            FROM pc_parts
            WHERE is_active = true
            ORDER BY category, price
        `);

        const items = result.rows;
        console.log(`📦 Found ${items.length} total items to analyze\n`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches to avoid overwhelming the AI
        const batchSize = 10;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, Math.min(i + batchSize, items.length));
            
            console.log(`\n📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}...`);

            for (const item of batch) {
                try {
                    // Skip if tier already exists and is valid
                    if (item.tier && ['entry', 'mid-tier', 'high-tier', 'elite'].includes(item.tier)) {
                        console.log(`  ⏭️  Skipping ${item.name} (tier already set: ${item.tier})`);
                        skipped++;
                        continue;
                    }

                    // Determine tier using rule-based system
                    const determinedTier = determineTierByRules(
                        item.category,
                        parseFloat(item.price || 0),
                        item.name,
                        item.specifications
                    );

                    // Update database
                    await query(
                        'UPDATE pc_parts SET tier = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                        [determinedTier, item.id]
                    );

                    const tierEmoji = {
                        'entry': '🟢',
                        'mid-tier': '🔵',
                        'high-tier': '🟣',
                        'elite': '🟠'
                    }[determinedTier] || '⚪';

                    console.log(`  ✅ ${tierEmoji} ${item.name} → ${determinedTier} (₱${parseFloat(item.price || 0).toLocaleString()})`);
                    updated++;

                } catch (error) {
                    console.error(`  ❌ Error processing ${item.name}:`, error.message);
                    errors++;
                }
            }

            // Small delay between batches
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 Tier Population Complete!');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updated} items`);
        console.log(`⏭️  Skipped: ${skipped} items (already had tiers)`);
        console.log(`❌ Errors: ${errors} items`);
        console.log('='.repeat(60));

        // Show tier distribution
        const distribution = await query(`
            SELECT tier, COUNT(*) as count
            FROM pc_parts
            WHERE is_active = true AND tier IS NOT NULL
            GROUP BY tier
            ORDER BY 
                CASE tier
                    WHEN 'entry' THEN 1
                    WHEN 'mid-tier' THEN 2
                    WHEN 'high-tier' THEN 3
                    WHEN 'elite' THEN 4
                END
        `);

        console.log('\n📊 Tier Distribution:');
        distribution.rows.forEach(row => {
            const emoji = {
                'entry': '🟢',
                'mid-tier': '🔵',
                'high-tier': '🟣',
                'elite': '🟠'
            }[row.tier] || '⚪';
            console.log(`  ${emoji} ${row.tier}: ${row.count} items`);
        });

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Fatal error during tier population:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    populateTiers();
}

module.exports = { populateTiers, determineTierByRules };
