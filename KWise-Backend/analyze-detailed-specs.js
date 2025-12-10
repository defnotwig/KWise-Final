/**
 * Analyze Detailed Specifications
 * Check motherboard, PSU, Case, and GPU specifications in detail
 */

const { pool } = require('./config/db');

async function analyzeSpecs() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('📋 MOTHERBOARD SPECIFICATIONS');
        console.log('='.repeat(80));
        
        const motherboards = await pool.query(`
            SELECT product_name, specifications
            FROM pc_parts
            WHERE category = 'Motherboard' AND stock > 0
            LIMIT 5
        `);
        
        motherboards.rows.forEach(row => {
            console.log(`\n${row.product_name}:`);
            console.log(JSON.stringify(row.specifications, null, 2));
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('⚡ PSU SPECIFICATIONS');
        console.log('='.repeat(80));
        
        const psus = await pool.query(`
            SELECT product_name, specifications
            FROM pc_parts
            WHERE category = 'PSU' AND stock > 0
            LIMIT 5
        `);
        
        psus.rows.forEach(row => {
            console.log(`\n${row.product_name}:`);
            console.log(JSON.stringify(row.specifications, null, 2));
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('📦 CASE SPECIFICATIONS');
        console.log('='.repeat(80));
        
        const cases = await pool.query(`
            SELECT product_name, specifications
            FROM pc_parts
            WHERE category = 'Case' AND stock > 0
            LIMIT 5
        `);
        
        cases.rows.forEach(row => {
            console.log(`\n${row.product_name}:`);
            console.log(JSON.stringify(row.specifications, null, 2));
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('🎮 GPU SPECIFICATIONS');
        console.log('='.repeat(80));
        
        const gpus = await pool.query(`
            SELECT product_name, specifications
            FROM pc_parts
            WHERE category = 'GPU' AND stock > 0
            LIMIT 5
        `);
        
        gpus.rows.forEach(row => {
            console.log(`\n${row.product_name}:`);
            console.log(JSON.stringify(row.specifications, null, 2));
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

analyzeSpecs();
