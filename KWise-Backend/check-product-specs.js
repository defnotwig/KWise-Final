const { pool } = require('./config/db');

async function checkProductSpecs() {
  try {
    console.log('🔍 Checking product specifications in database...\n');
    
    // Check POWERLOGIC SLIM case
    const caseQuery = await pool.query(`
      SELECT id, name, category, price, dimensions, specifications
      FROM pc_parts 
      WHERE name ILIKE '%POWERLOGIC%SLIM%'
    `);
    
    if (caseQuery.rows.length > 0) {
      console.log('=== POWERLOGIC SLIM CASE ===');
      caseQuery.rows.forEach(row => {
        console.log('ID:', row.id);
        console.log('Name:', row.name);
        console.log('Category:', row.category);
        console.log('Price:', row.price);
        console.log('\nDimensions JSONB:');
        console.log(JSON.stringify(row.dimensions, null, 2));
        console.log('\nSpecifications JSONB:');
        console.log(JSON.stringify(row.specifications, null, 2));
      });
    } else {
      console.log('⚠️  POWERLOGIC SLIM case not found');
    }
    
    // Check ARC B580 GPU
    console.log('\n\n=== ARC B580 GPU ===');
    const gpuQuery = await pool.query(`
      SELECT id, name, category, price, dimensions, specifications
      FROM pc_parts 
      WHERE name ILIKE '%ARC B580%'
    `);
    
    if (gpuQuery.rows.length > 0) {
      gpuQuery.rows.forEach(row => {
        console.log('ID:', row.id);
        console.log('Name:', row.name);
        console.log('Category:', row.category);
        console.log('Price:', row.price);
        console.log('\nDimensions JSONB:');
        console.log(JSON.stringify(row.dimensions, null, 2));
        console.log('\nSpecifications JSONB:');
        console.log(JSON.stringify(row.specifications, null, 2));
      });
    } else {
      console.log('⚠️  ARC B580 GPU not found');
    }
    
    // Check AORUS ELITE B550M motherboard
    console.log('\n\n=== AORUS ELITE B550M AX MOTHERBOARD ===');
    const mbQuery = await pool.query(`
      SELECT id, name, category, price, dimensions, specifications
      FROM pc_parts 
      WHERE name ILIKE '%AORUS%B550M%'
    `);
    
    if (mbQuery.rows.length > 0) {
      mbQuery.rows.forEach(row => {
        console.log('ID:', row.id);
        console.log('Name:', row.name);
        console.log('Category:', row.category);
        console.log('Price:', row.price);
        console.log('\nDimensions JSONB:');
        console.log(JSON.stringify(row.dimensions, null, 2));
        console.log('\nSpecifications JSONB:');
        console.log(JSON.stringify(row.specifications, null, 2));
      });
    } else {
      console.log('⚠️  AORUS ELITE B550M AX motherboard not found');
    }
    
    // Check product_specs table structure
    console.log('\n\n=== PRODUCT_SPECS TABLE STRUCTURE ===');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'product_specs' 
      ORDER BY ordinal_position
    `);
    
    console.table(tableStructure.rows);
    
    // Check if product_specs table has data
    console.log('\n=== PRODUCT_SPECS TABLE SAMPLE DATA ===');
    const specsData = await pool.query(`
      SELECT * FROM product_specs LIMIT 3
    `);
    
    if (specsData.rows.length > 0) {
      specsData.rows.forEach((row, idx) => {
        console.log(`\n--- Row ${idx + 1} ---`);
        console.log(JSON.stringify(row, null, 2));
      });
    } else {
      console.log('⚠️  product_specs table is empty');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

checkProductSpecs();
