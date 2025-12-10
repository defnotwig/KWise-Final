const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function checkDatabaseFields() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check for product_specs table
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%product%' OR table_name LIKE '%spec%')
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);
    console.log('📋 Product/Spec Tables:');
    tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Check if product_specs table exists
    const hasProductSpecs = tablesResult.rows.some(row => row.table_name === 'product_specs');
    
    if (hasProductSpecs) {
      console.log('\n✅ product_specs table found\n');
      
      // Check product_specs schema
      const specsSchemaQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'product_specs' 
        ORDER BY ordinal_position
      `;
      const specsSchemaResult = await pool.query(specsSchemaQuery);
      console.log('📋 product_specs Table Schema:');
      specsSchemaResult.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
      
      // Check if it has normalized_specs JSONB column
      const hasNormalizedSpecs = specsSchemaResult.rows.some(row => row.column_name === 'normalized_specs');
      
      if (hasNormalizedSpecs) {
        console.log('\n✅ normalized_specs JSONB column found\n');
        
        // Check sample data
        const sampleQuery = `
          SELECT 
            ps.product_id,
            ps.normalized_specs
          FROM product_specs ps
          JOIN pc_parts pp ON ps.product_id = pp.id
          WHERE pp.category = 'Motherboard'
          AND ps.normalized_specs IS NOT NULL
          LIMIT 1
        `;
        const sampleResult = await pool.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
          console.log('📊 Sample normalized_specs structure:');
          console.log(JSON.stringify(sampleResult.rows[0].normalized_specs, null, 2));
        }
      } else {
        console.log('\n⚠️ normalized_specs column NOT found in product_specs');
      }
    } else {
      console.log('\n⚠️ product_specs table NOT found - checking pc_parts.specifications...\n');
      
      // Check pc_parts specifications column
      const sampleQuery = `
        SELECT 
          id,
          name,
          specifications
        FROM pc_parts
        WHERE category = 'Motherboard'
        AND specifications IS NOT NULL
        LIMIT 1
      `;
      const sampleResult = await pool.query(sampleQuery);
      
      if (sampleResult.rows.length > 0) {
        console.log('📊 Sample pc_parts.specifications structure:');
        console.log('Product:', sampleResult.rows[0].name);
        console.log(JSON.stringify(sampleResult.rows[0].specifications, null, 2));
      } else {
        console.log('❌ No motherboards found with specifications');
      }
    }
    
    await pool.end();
    console.log('\n✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkDatabaseFields();
