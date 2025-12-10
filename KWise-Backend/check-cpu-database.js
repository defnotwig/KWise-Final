/**
 * Test script to check CPU count directly from database
 */

const { query } = require('./config/db');

async function checkCPUDatabase() {
    try {
        console.log('🔍 Checking CPU data in database...');
        
        // Check total CPUs
        const totalResult = await query(`
            SELECT COUNT(*) as total_cpus
            FROM pc_parts 
            WHERE category = 'CPU'
        `);
        console.log('📊 Total CPUs in database:', totalResult.rows[0].total_cpus);
        
        // Check active CPUs
        const activeResult = await query(`
            SELECT COUNT(*) as active_cpus
            FROM pc_parts 
            WHERE category = 'CPU' AND is_active = true
        `);
        console.log('✅ Active CPUs:', activeResult.rows[0].active_cpus);
        
        // Check kiosk visible CPUs
        const kioskResult = await query(`
            SELECT COUNT(*) as kiosk_cpus
            FROM pc_parts 
            WHERE category = 'CPU' AND is_active = true AND kiosk_visible = true
        `);
        console.log('👁️  Kiosk visible CPUs:', kioskResult.rows[0].kiosk_cpus);
        
        // Check by brand
        const brandResult = await query(`
            SELECT brand, COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'CPU' AND is_active = true AND kiosk_visible = true
            GROUP BY brand
            ORDER BY brand
        `);
        console.log('🏷️  CPUs by brand:');
        brandResult.rows.forEach(row => {
            console.log(`   - ${row.brand}: ${row.count} CPUs`);
        });
        
        // Get all CPU names to see what we have
        const nameResult = await query(`
            SELECT name, brand, price, stock, is_active, kiosk_visible
            FROM pc_parts 
            WHERE category = 'CPU'
            ORDER BY brand, name
        `);
        console.log('\n📋 All CPUs in database:');
        nameResult.rows.forEach((row, index) => {
            const status = row.is_active ? (row.kiosk_visible ? '✅' : '🔒') : '❌';
            console.log(`   ${index + 1}. ${status} ${row.name} - ${row.brand} - ₱${row.price} (Stock: ${row.stock})`);
        });
        
        // Check for null or problematic values
        const problemResult = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_active IS NULL THEN 1 END) as null_active,
                COUNT(CASE WHEN kiosk_visible IS NULL THEN 1 END) as null_kiosk,
                COUNT(CASE WHEN category != 'CPU' THEN 1 END) as wrong_category
            FROM pc_parts 
            WHERE category = 'CPU'
        `);
        console.log('\n🔍 Data quality check:');
        console.log('   - Total rows:', problemResult.rows[0].total);
        console.log('   - NULL is_active:', problemResult.rows[0].null_active);
        console.log('   - NULL kiosk_visible:', problemResult.rows[0].null_kiosk);
        console.log('   - Wrong category:', problemResult.rows[0].wrong_category);
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    }
}

checkCPUDatabase();