// Complete Analysis of All Pre-Built Products
// Identifies missing part_ids and finds matching parts

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function analyzeAllPreBuilts() {
  try {
    console.log('🔍 ANALYZING ALL PRE-BUILT PRODUCTS\n');
    console.log('='.repeat(80));
    
    // Get all Pre-Built products
    const query = `
      SELECT id, part_name, price, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built'
        AND status = 'Active'
      ORDER BY 
        CASE 
          WHEN part_name ILIKE '%starter%' THEN 1
          WHEN part_name ILIKE '%mid%' THEN 2
          WHEN part_name ILIKE '%high%' THEN 3
          WHEN part_name ILIKE '%elite%' THEN 4
        END,
        part_name
    `;
    
    const result = await pool.query(query);
    console.log(`\nFound ${result.rows.length} Pre-Built products\n`);
    
    const issues = [];
    const readyProducts = [];
    
    for (const product of result.rows) {
      const components = product.specifications?.components || [];
      const productIssues = [];
      let hasPartIds = 0;
      let missingPartIds = 0;
      
      console.log(`\n📦 ${product.part_name} (ID: ${product.id})`);
      console.log('-'.repeat(80));
      
      if (components.length === 0) {
        console.log('❌ NO COMPONENTS FOUND');
        issues.push({
          product: product.part_name,
          id: product.id,
          issue: 'No components defined'
        });
        continue;
      }
      
      console.log(`Components: ${components.length}\n`);
      
      for (const comp of components) {
        const hasValue = comp.value && comp.value.trim() !== '';
        const hasPartId = comp.part_id && comp.part_id !== null;
        
        if (hasValue && !hasPartId) {
          console.log(`  ❌ ${comp.name}: ${comp.value}`);
          console.log(`     Missing part_id`);
          missingPartIds++;
          productIssues.push({
            component: comp.name,
            value: comp.value,
            issue: 'missing_part_id'
          });
        } else if (hasPartId) {
          console.log(`  ✅ ${comp.name}: part_id=${comp.part_id} (${comp.value})`);
          hasPartIds++;
        } else {
          console.log(`  ⚪ ${comp.name}: (optional/empty)`);
        }
      }
      
      if (productIssues.length > 0) {
        issues.push({
          product: product.part_name,
          id: product.id,
          components: productIssues,
          missingCount: missingPartIds
        });
      } else {
        readyProducts.push({
          product: product.part_name,
          id: product.id,
          componentCount: hasPartIds
        });
      }
      
      console.log(`\nStatus: ${hasPartIds} with part_ids, ${missingPartIds} missing`);
    }
    
    // Summary
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Ready: ${readyProducts.length} products`);
    console.log(`❌ Need Fixes: ${issues.length} products\n`);
    
    if (readyProducts.length > 0) {
      console.log('\n✅ READY PRODUCTS:');
      readyProducts.forEach(p => {
        console.log(`  • ${p.product} (${p.componentCount} components with part_ids)`);
      });
    }
    
    if (issues.length > 0) {
      console.log('\n\n❌ PRODUCTS NEEDING FIXES:');
      issues.forEach(issue => {
        console.log(`\n  ${issue.product} (ID: ${issue.id})`);
        if (issue.components) {
          console.log(`    Missing part_ids: ${issue.missingCount}`);
          issue.components.forEach(comp => {
            console.log(`      - ${comp.component}: ${comp.value}`);
          });
        } else {
          console.log(`    Issue: ${issue.issue}`);
        }
      });
    }
    
    return { readyProducts, issues };
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

analyzeAllPreBuilts();
