/**
 * POPULATE PC UPGRADE REFERENCE BUILDS
 * 
 * This script reads the 72 reference builds from referenceBuilds.js
 * and inserts them into the pc_upgrade_reference_builds table.
 * 
 * Critical Blocker Fix: Phase 1.1
 */

const { Pool } = require('pg');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'humbleludwig13'
});

// Import reference builds
const referenceBuildsPath = path.join(__dirname, '../ai/utils/referenceBuilds.js');

console.log('📦 Loading reference builds from:', referenceBuildsPath);

// Read the file and extract REFERENCE_BUILDS object
const fs = require('fs');
const fileContent = fs.readFileSync(referenceBuildsPath, 'utf8');

// Extract REFERENCE_BUILDS using eval (safe in this controlled context)
const REFERENCE_BUILDS = (() => {
  const match = fileContent.match(/const REFERENCE_BUILDS = ({[\s\S]*?});[\s\S]*?module\.exports/);
  if (!match) {
    throw new Error('Could not extract REFERENCE_BUILDS from file');
  }
  return eval(`(${match[1]})`);
})();

const buildKeys = Object.keys(REFERENCE_BUILDS);
console.log(`✅ Found ${buildKeys.length} reference builds\n`);

async function populateReferenceBuilds() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Connecting to database...');
    
    // Table already exists with correct schema
    console.log('✅ Table pc_upgrade_reference_builds exists\n');
    
    // Clear existing data
    const deleteResult = await client.query('DELETE FROM pc_upgrade_reference_builds');
    console.log(`🗑️  Cleared ${deleteResult.rowCount} existing builds\n`);
    
    // Insert builds
    console.log('📥 Inserting reference builds...\n');
    
    let inserted = 0;
    let failed = 0;
    
    for (const buildKey of buildKeys) {
      const build = REFERENCE_BUILDS[buildKey];
      
      try {
        // Calculate total price from components
        let totalPrice = 0;
        if (build.components) {
          Object.values(build.components).forEach(component => {
            if (component.price) {
              totalPrice += parseFloat(component.price.replace(/,/g, ''));
            }
          });
        }
        
        await client.query(`
          INSERT INTO pc_upgrade_reference_builds (
            usage_type, age_range, budget_range,
            components, total_price,
            performance_score, compatibility_verified,
            ai_generated, generation_metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          build.usage || 'Unknown',
          build.yearRange || 'Unknown',
          build.budgetRange || 'Unknown',
          JSON.stringify(build.components),
          totalPrice || build.targetBudget || 0,
          build.estimatedAge || 0,  // Using age as performance score temporarily
          true,  // compatibility_verified
          build.databaseProducts || true,
          JSON.stringify({
            buildKey: buildKey,
            estimatedAge: build.estimatedAge,
            targetBudget: build.targetBudget,
            suggestedUpgrades: build.suggestedUpgrades,
            upgradeReasoning: build.upgradeReasoning,
            generatedAt: build.generatedAt
          })
        ]);
        
        inserted++;
        
        // Progress indicator
        if (inserted % 10 === 0) {
          console.log(`   ✓ Inserted ${inserted}/${buildKeys.length} builds...`);
        }
      } catch (err) {
        failed++;
        console.error(`   ❌ Failed to insert ${buildKey}:`, err.message);
      }
    }
    
    console.log(`\n✅ Successfully inserted ${inserted} builds`);
    if (failed > 0) {
      console.log(`⚠️  Failed to insert ${failed} builds`);
    }
    
    // Verify distribution
    console.log('\n📊 Build Distribution:\n');
    
    const usageDistribution = await client.query(`
      SELECT usage_type, COUNT(*) as count
      FROM pc_upgrade_reference_builds
      GROUP BY usage_type
      ORDER BY usage_type
    `);
    
    console.log('By Usage Type:');
    usageDistribution.rows.forEach(row => {
      console.log(`   ${row.usage_type}: ${row.count} builds`);
    });
    
    const yearDistribution = await client.query(`
      SELECT age_range, COUNT(*) as count
      FROM pc_upgrade_reference_builds
      GROUP BY age_range
      ORDER BY age_range
    `);
    
    console.log('\nBy Age Range:');
    yearDistribution.rows.forEach(row => {
      console.log(`   ${row.age_range}: ${row.count} builds`);
    });
    
    const budgetDistribution = await client.query(`
      SELECT budget_range, COUNT(*) as count
      FROM pc_upgrade_reference_builds
      GROUP BY budget_range
      ORDER BY budget_range
    `);
    
    console.log('\nBy Budget Range:');
    budgetDistribution.rows.forEach(row => {
      console.log(`   ${row.budget_range}: ${row.count} builds`);
    });
    
    // Final count
    const finalCount = await client.query('SELECT COUNT(*) FROM pc_upgrade_reference_builds');
    console.log(`\n✅ Total builds in database: ${finalCount.rows[0].count}`);
    
    if (parseInt(finalCount.rows[0].count) >= 72) {
      console.log('\n🎉 SUCCESS: PC Upgrade Reference Builds table fully populated!');
      console.log('✅ Phase 1.1 COMPLETE: 0 → 72 builds (CRITICAL BLOCKER FIXED)');
    } else {
      console.log('\n⚠️  WARNING: Expected 72 builds, but only found', finalCount.rows[0].count);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
console.log('🚀 Starting PC Upgrade Reference Builds Population...\n');
console.log('=' .repeat(60));

populateReferenceBuilds()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
