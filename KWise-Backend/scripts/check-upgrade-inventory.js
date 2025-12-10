#!/usr/bin/env node
/**
 * Check upgrade inventory for testing
 * This script checks what products are available for upgrade recommendations
 */

require('dotenv').config();
const db = require('../config/db');

async function checkInventory() {
  console.log('\n🔍 Checking Upgrade Inventory...\n');
  
  try {
    // Check test component (AMD RYZEN 7 9800X3D)
    console.log('📊 Test Component: AMD RYZEN 7 9800X3D');
    const testCPU = await db.query(`
      SELECT id, name, price, stock 
      FROM pc_parts 
      WHERE name LIKE '%9800X3D%'
    `);
    console.log('Current component:', testCPU.rows[0] || 'Not found');
    
    // Check available CPU upgrades in each tier
    const budgetTier = await db.query(`
      SELECT name, price, stock
      FROM pc_parts
      WHERE category = 'CPU'
        AND stock > 0
        AND price >= 5000 AND price <= 15000
      ORDER BY price DESC
      LIMIT 5
    `);
    
    const midTier = await db.query(`
      SELECT name, price, stock
      FROM pc_parts
      WHERE category = 'CPU'
        AND stock > 0
        AND price >= 15000 AND price <= 35000
      ORDER BY price DESC
      LIMIT 5
    `);
    
    const highTier = await db.query(`
      SELECT name, price, stock
      FROM pc_parts
      WHERE category = 'CPU'
        AND stock > 0
        AND price >= 35000 AND price <= 100000
      ORDER BY price DESC
      LIMIT 5
    `);
    
    console.log('\n💰 Budget Tier (₱5,000-₱15,000):');
    console.log(`   Found: ${budgetTier.rows.length} CPUs`);
    budgetTier.rows.forEach(cpu => {
      console.log(`   - ${cpu.name} (₱${cpu.price.toLocaleString()}, Stock: ${cpu.stock})`);
    });
    
    console.log('\n💎 Mid-Range Tier (₱15,000-₱35,000):');
    console.log(`   Found: ${midTier.rows.length} CPUs`);
    midTier.rows.forEach(cpu => {
      console.log(`   - ${cpu.name} (₱${cpu.price.toLocaleString()}, Stock: ${cpu.stock})`);
    });
    
    console.log('\n👑 High-End Tier (₱35,000-₱100,000):');
    console.log(`   Found: ${highTier.rows.length} CPUs`);
    highTier.rows.forEach(cpu => {
      console.log(`   - ${cpu.name} (₱${cpu.price.toLocaleString()}, Stock: ${cpu.stock})`);
    });
    
    // Check GPU inventory too
    console.log('\n\n🎮 GPU Upgrade Inventory:');
    const testGPU = await db.query(`
      SELECT id, name, price, stock 
      FROM pc_parts 
      WHERE name LIKE '%RTX4060%' AND name LIKE '%MSI%'
    `);
    console.log('Test component:', testGPU.rows[0] || 'Not found');
    
    const gpuBudget = await db.query(`
      SELECT COUNT(*) as count
      FROM pc_parts
      WHERE category = 'GPU'
        AND stock > 0
        AND price >= 5000 AND price <= 15000
    `);
    
    const gpuMid = await db.query(`
      SELECT COUNT(*) as count
      FROM pc_parts
      WHERE category = 'GPU'
        AND stock > 0
        AND price >= 15000 AND price <= 35000
    `);
    
    const gpuHigh = await db.query(`
      SELECT COUNT(*) as count
      FROM pc_parts
      WHERE category = 'GPU'
        AND stock > 0
        AND price >= 35000 AND price <= 100000
    `);
    
    console.log(`   Budget Tier: ${gpuBudget.rows[0].count} GPUs`);
    console.log(`   Mid Tier: ${gpuMid.rows[0].count} GPUs`);
    console.log(`   High Tier: ${gpuHigh.rows[0].count} GPUs`);
    
    // ROOT CAUSE ANALYSIS
    console.log('\n\n🔍 ROOT CAUSE ANALYSIS:\n');
    
    const currentCPUPrice = testCPU.rows[0]?.price || 35000;
    console.log(`Current Component Price: ₱${currentCPUPrice.toLocaleString()}`);
    console.log(`Problem: Test component (9800X3D) is likely HIGH-END (₱35,000+)`);
    console.log(`Issue: No CPUs exist ABOVE this price in budget/mid tiers`);
    console.log(`Solution: Test with mid-range components OR check high-tier inventory\n`);
    
    // Check all CPUs above test price
    const upgradeCandidates = await db.query(`
      SELECT name, price, stock
      FROM pc_parts
      WHERE category = 'CPU'
        AND stock > 0
        AND price > $1
      ORDER BY price ASC
      LIMIT 10
    `, [currentCPUPrice]);
    
    console.log(`\n💡 Potential Upgrades (above ₱${currentCPUPrice.toLocaleString()}):`);
    if (upgradeCandidates.rows.length === 0) {
      console.log('   ❌ NO CPUS FOUND - This is why 0 suggestions!');
      console.log('   Root Cause: Test component is already top-tier');
      console.log('   Fix: Use mid-range test component (e.g., Ryzen 5 5600)');
    } else {
      upgradeCandidates.rows.forEach(cpu => {
        console.log(`   ✅ ${cpu.name} (₱${cpu.price.toLocaleString()})`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkInventory();
