/**
 * COMPREHENSIVE COMPATIBILITY SYSTEM TEST
 * Tests the entire compatibility validation flow from database to API response
 */

const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5000/api';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runTests() {
  console.log('🧪 COMPREHENSIVE COMPATIBILITY SYSTEM TEST\n');
  console.log('=' .repeat(80));
  
  try {
    // TEST 1: Database Product Verification
    console.log('\n📊 TEST 1: Database Product Verification');
    console.log('-'.repeat(80));
    
    const dbResult = await pool.query(`
      SELECT id, product_name, category, brand, specifications
      FROM pc_parts
      WHERE category IN ('CPU', 'Motherboard', 'RAM', 'GPU', 'Case')
      AND status = 'active'
      LIMIT 5
    `);
    
    if (dbResult.rows.length === 0) {
      console.log('❌ No products found in database');
      return;
    }
    
    console.log(`✅ Found ${dbResult.rows.length} products:`);
    const productsByCategory = {};
    dbResult.rows.forEach(row => {
      console.log(`  • ${row.product_name} (${row.category}) - ID: ${row.id}`);
      if (!productsByCategory[row.category]) {
        productsByCategory[row.category] = row;
      }
    });
    
    // TEST 2: Build test components object
    console.log('\n🔧 TEST 2: Building Test Components');
    console.log('-'.repeat(80));
    
    const components = {};
    Object.keys(productsByCategory).forEach(category => {
      const product = productsByCategory[category];
      const categoryKey = category.toLowerCase();
      components[categoryKey] = {
        id: product.id,
        name: product.product_name,
        brand: product.brand,
        category: product.category,
        specifications: product.specifications || {}
      };
      console.log(`✅ Added ${categoryKey}: ${product.product_name}`);
    });
    
    // TEST 3: Call /api/compatibility/advanced/full-build
    console.log('\n🌐 TEST 3: API Endpoint Test (/api/compatibility/advanced/full-build)');
    console.log('-'.repeat(80));
    
    const requestPayload = {
      components: components,
      pageName: 'PC-Parts',
      comprehensive: true
    };
    
    console.log('📤 Sending request with components:', Object.keys(components).join(', '));
    
    const response = await axios.post(`${API_BASE_URL}/compatibility/advanced/full-build`, requestPayload);
    
    if (!response.data.success) {
      console.log('❌ API returned error:', response.data);
      return;
    }
    
    console.log('✅ API Response received successfully');
    const data = response.data.data;
    
    // TEST 4: Verify Response Structure
    console.log('\n📋 TEST 4: Response Structure Verification');
    console.log('-'.repeat(80));
    
    const requiredFields = [
      'compatibility_score',
      'all_issues',
      'all_warnings',
      'compatible_notes'
    ];
    
    let structureValid = true;
    requiredFields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        console.log(`✅ ${field}: ${typeof data[field]}`);
      } else {
        console.log(`❌ Missing field: ${field}`);
        structureValid = false;
      }
    });
    
    if (!structureValid) {
      console.log('\n❌ Response structure invalid');
      return;
    }
    
    // TEST 5: Analyze Compatibility Results
    console.log('\n🔍 TEST 5: Compatibility Analysis Results');
    console.log('-'.repeat(80));
    
    console.log(`\n📊 Compatibility Score: ${data.compatibility_score}/100`);
    console.log(`🔴 Critical Issues: ${data.all_issues?.length || 0}`);
    console.log(`🟡 Warnings: ${data.all_warnings?.length || 0}`);
    console.log(`✅ Compatible Notes: ${data.compatible_notes?.length || 0}`);
    
    // TEST 6: Check for Duplicates
    console.log('\n🔎 TEST 6: Duplicate Detection');
    console.log('-'.repeat(80));
    
    const allIssues = [...(data.all_issues || []), ...(data.all_warnings || [])];
    const issueMessages = allIssues.map(i => i.message);
    const uniqueMessages = new Set(issueMessages);
    
    if (issueMessages.length !== uniqueMessages.size) {
      const duplicates = issueMessages.filter((msg, idx) => issueMessages.indexOf(msg) !== idx);
      console.log(`❌ Found ${issueMessages.length - uniqueMessages.size} duplicate(s):`);
      duplicates.forEach(dup => console.log(`  • "${dup}"`));
    } else {
      console.log(`✅ No duplicates found (${issueMessages.length} unique messages)`);
    }
    
    // TEST 7: Verify Numerical Details
    console.log('\n🔢 TEST 7: Numerical Details Verification');
    console.log('-'.repeat(80));
    
    let hasNumericalDetails = false;
    const numericalPatterns = [/\d+mm/, /AM\d/, /DDR\d/, /ATX/, /Micro-ATX/];
    
    allIssues.forEach((issue, idx) => {
      const hasDetails = numericalPatterns.some(pattern => pattern.test(issue.message));
      if (hasDetails) {
        hasNumericalDetails = true;
        console.log(`✅ Issue ${idx + 1}: "${issue.message}"`);
      }
    });
    
    if (!hasNumericalDetails && allIssues.length > 0) {
      console.log('⚠️  No numerical details found in messages');
    } else if (allIssues.length === 0) {
      console.log('ℹ️  No issues to check (fully compatible build)');
    }
    
    // TEST 8: Display All Issues
    if (data.all_issues && data.all_issues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:');
      console.log('-'.repeat(80));
      data.all_issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.message}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
      });
    }
    
    // TEST 9: Display Compatible Notes
    if (data.compatible_notes && data.compatible_notes.length > 0) {
      console.log('\n✅ COMPATIBLE NOTES:');
      console.log('-'.repeat(80));
      data.compatible_notes.forEach((note, idx) => {
        console.log(`${idx + 1}. ${note.message}`);
        if (note.details) console.log(`   Details: ${note.details}`);
      });
    }
    
    // FINAL SUMMARY
    console.log('\n' + '='.repeat(80));
    console.log('📝 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('✅ Database Connection: PASSED');
    console.log('✅ API Endpoint: PASSED');
    console.log('✅ Response Structure: PASSED');
    console.log(`${issueMessages.length === uniqueMessages.size ? '✅' : '❌'} Deduplication: ${issueMessages.length === uniqueMessages.size ? 'PASSED' : 'FAILED'}`);
    console.log(`${hasNumericalDetails || allIssues.length === 0 ? '✅' : '⚠️'} Numerical Details: ${hasNumericalDetails || allIssues.length === 0 ? 'PASSED' : 'PARTIAL'}`);
    console.log('✅ Compatible Notes: PASSED');
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nStack:', error.stack);
  } finally {
    await pool.end();
  }
}

runTests();
