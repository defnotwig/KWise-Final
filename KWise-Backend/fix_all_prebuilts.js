// Fix All Pre-Built Products - Map part_ids from componentLinks
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function fixAllPreBuilts() {
  try {
    console.log('🔧 FIXING ALL PRE-BUILT PRODUCTS\n');
    console.log('='.repeat(80));
    
    // Get all Pre-Built products
    const query = `
      SELECT id, name, price, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built'
        AND is_active = true
      ORDER BY 
        CASE 
          WHEN name ILIKE '%starter%' THEN 1
          WHEN name ILIKE '%mid%' THEN 2
          WHEN name ILIKE '%high%' THEN 3
          WHEN name ILIKE '%elite%' THEN 4
        END,
        name
    `;
    
    const result = await pool.query(query);
    console.log(`\nFound ${result.rows.length} Pre-Built products\n`);
    
    const fixed = [];
    const skipped = [];
    
    for (const product of result.rows) {
      console.log(`\n📦 Processing: ${product.name} (ID: ${product.id})`);
      console.log('-'.repeat(80));
      
      const specifications = product.specifications || {};
      const components = specifications.components || [];
      const componentLinks = specifications.componentLinks || [];
      
      if (components.length === 0) {
        console.log('⚠️  No components found, skipping');
        skipped.push({ product: product.name, reason: 'No components' });
        continue;
      }
      
      let updated = false;
      const updatedComponents = [];
      
      // Match components with componentLinks
      for (const comp of components) {
        const link = componentLinks.find(l => l.componentType === comp.name);
        
        if (link && link.linkedStockIds && link.linkedStockIds.length > 0) {
          const stockId = link.linkedStockIds[0];
          
          // Get price from pc_parts
          const priceQuery = await pool.query(
            'SELECT price FROM pc_parts WHERE id = $1',
            [stockId]
          );
          
          const partPrice = priceQuery.rows[0]?.price || 0;
          
          if (comp.part_id !== stockId || comp.part_price !== parseFloat(partPrice)) {
            console.log(`  ✅ ${comp.name}: Updating part_id=${stockId}, price=${partPrice}`);
            updatedComponents.push({
              ...comp,
              part_id: stockId,
              part_price: parseFloat(partPrice),
              price: parseFloat(partPrice)
            });
            updated = true;
          } else {
            console.log(`  ✓  ${comp.name}: Already correct (part_id=${stockId})`);
            updatedComponents.push(comp);
          }
        } else {
          // No link found (optional component like GPU, Cooling)
          if (comp.value && comp.value.trim() !== '') {
            console.log(`  ⚠️  ${comp.name}: No link found for "${comp.value}"`);
          } else {
            console.log(`  ⚪ ${comp.name}: Optional (empty)`);
          }
          updatedComponents.push({
            ...comp,
            part_id: null,
            part_price: 0,
            price: 0
          });
        }
      }
      
      if (updated) {
        // Update database
        const updateQuery = `
          UPDATE pc_parts
          SET 
            specifications = jsonb_set(
              specifications,
              '{components}',
              $1::jsonb
            ),
            updated_at = NOW()
          WHERE id = $2
          RETURNING name
        `;
        
        await pool.query(updateQuery, [
          JSON.stringify(updatedComponents),
          product.id
        ]);
        
        console.log(`  💾 Database updated`);
        fixed.push(product.name);
      } else {
        console.log(`  ℹ️  No updates needed`);
        skipped.push({ product: product.name, reason: 'Already correct' });
      }
    }
    
    // Summary
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Fixed: ${fixed.length} products`);
    console.log(`ℹ️  Skipped: ${skipped.length} products\n`);
    
    if (fixed.length > 0) {
      console.log('✅ FIXED PRODUCTS:');
      fixed.forEach(name => console.log(`  • ${name}`));
    }
    
    if (skipped.length > 0) {
      console.log('\nℹ️  SKIPPED PRODUCTS:');
      skipped.forEach(item => console.log(`  • ${item.product} (${item.reason})`));
    }
    
    console.log('\n✅ ALL PRE-BUILT PRODUCTS UPDATED!\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixAllPreBuilts();
