// Comprehensive Frontend Test - Verify PreBuiltDisplay Features
// Run this in browser console after opening a Pre-Built product

async function testPreBuiltFeatures(productId = 12010) {
  console.log('🧪 COMPREHENSIVE PRE-BUILT FRONTEND TEST\n');
  console.log('='.repeat(80));
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  // Test 1: API Endpoint
  console.log('\n📌 Test 1: API Endpoint Response');
  try {
    const response = await fetch(`http://localhost:5000/api/kiosk/prebuilt/${productId}`);
    const data = await response.json();
    
    if (data.success && data.data) {
      console.log('✅ API responds correctly');
      results.passed.push('API Endpoint');
      
      // Check components
      if (data.data.components && data.data.components.length > 0) {
        console.log(`✅ Found ${data.data.components.length} components`);
        
        let storageFound = false;
        let gpuEmpty = false;
        
        data.data.components.forEach(comp => {
          if (comp.name === 'Storage' && comp.part_id) {
            console.log(`   ✅ Storage has part_id=${comp.part_id}`);
            storageFound = true;
          }
          if (comp.name === 'GPU' && (!comp.value || comp.value.trim() === '')) {
            console.log(`   ✅ GPU is empty (Add button will show)`);
            gpuEmpty = true;
          }
        });
        
        if (storageFound) results.passed.push('Storage part_id present');
        if (gpuEmpty) results.passed.push('GPU empty for Add button');
        
      } else {
        console.log('❌ No components in response');
        results.failed.push('Components missing in API response');
      }
    } else {
      console.log('❌ API error:', data.message);
      results.failed.push('API Error');
    }
  } catch (error) {
    console.log('❌ API request failed:', error.message);
    results.failed.push('API Request Failed');
  }
  
  // Test 2: Component Rendering
  console.log('\n📌 Test 2: Component Rendering');
  const componentRows = document.querySelectorAll('.component-row');
  if (componentRows.length > 0) {
    console.log(`✅ Found ${componentRows.length} component rows`);
    results.passed.push('Components rendered');
    
    // Check for customizable components
    const customizableRows = document.querySelectorAll('.component-row.customizable');
    console.log(`   ${customizableRows.length} customizable components found`);
    
  } else {
    console.log('❌ No component rows found');
    results.failed.push('Components not rendered');
  }
  
  // Test 3: GPU Add Button
  console.log('\n📌 Test 3: GPU "Add" Button');
  const gpuAddButtons = Array.from(document.querySelectorAll('.component-option-btn.add-btn'))
    .filter(btn => btn.textContent.includes('GPU'));
  
  if (gpuAddButtons.length > 0) {
    console.log(`✅ GPU "Add" button found (${gpuAddButtons.length})`);
    results.passed.push('GPU Add Button present');
  } else {
    console.log('⚠️  GPU "Add" button not found (may already have GPU)');
    results.warnings.push('GPU Add Button not visible');
  }
  
  // Test 4: Cooling Add Button
  console.log('\n📌 Test 4: Cooling "Add" Button');
  const coolingAddButtons = Array.from(document.querySelectorAll('.component-option-btn.add-btn'))
    .filter(btn => btn.textContent.includes('Cooling'));
  
  if (coolingAddButtons.length > 0) {
    console.log(`✅ Cooling "Add" button found (${coolingAddButtons.length})`);
    results.passed.push('Cooling Add Button present');
  } else {
    console.log('⚠️  Cooling "Add" button not found (may already have cooling)');
    results.warnings.push('Cooling Add Button not visible');
  }
  
  // Test 5: Scrolling
  console.log('\n📌 Test 5: Vertical Scrolling');
  const componentsList = document.querySelector('.prebuilt-components-list');
  if (componentsList) {
    const computedStyle = window.getComputedStyle(componentsList);
    const maxHeight = computedStyle.maxHeight;
    const overflowY = computedStyle.overflowY;
    
    console.log(`   Max height: ${maxHeight}`);
    console.log(`   Overflow-Y: ${overflowY}`);
    
    if (maxHeight === '700px' && overflowY === 'auto') {
      console.log('✅ Scrolling configured correctly');
      results.passed.push('Vertical scrolling');
    } else {
      console.log('❌ Scrolling not configured correctly');
      results.failed.push('Vertical scrolling');
    }
  } else {
    console.log('❌ Components list not found');
    results.failed.push('Components list not found');
  }
  
  // Test 6: Add to Cart Button
  console.log('\n📌 Test 6: Add to Cart Button');
  const addToCartBtn = document.querySelector('.prebuilt-display-add-button');
  if (addToCartBtn) {
    console.log('✅ Add to Cart button found');
    results.passed.push('Add to Cart button present');
  } else {
    console.log('❌ Add to Cart button not found');
    results.failed.push('Add to Cart button missing');
  }
  
  // Test 7: Console Errors
  console.log('\n📌 Test 7: Console Errors Check');
  // This is informational - user should check console for errors
  console.log('ℹ️  Check console above for any React/JavaScript errors');
  console.log('   No errors visible = test passes');
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}\n`);
  
  if (results.passed.length > 0) {
    console.log('✅ PASSED TESTS:');
    results.passed.forEach(test => console.log(`   • ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(test => console.log(`   • ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach(test => console.log(`   • ${test}`));
  }
  
  // Test Customization Modal
  console.log('\n\n📌 Optional: Test Customization Modal');
  console.log('Click on a component (like Storage) to test:');
  console.log('1. Modal opens');
  console.log('2. Compatible options load');
  console.log('3. Can select different option');
  console.log('4. Price updates');
  console.log('5. Compatibility score updates');
  
  return results;
}

// Auto-run test
console.log('💡 Running comprehensive Pre-Built test...\n');
console.log('If page is not loaded yet, run: testPreBuiltFeatures(12010)\n');

// Run test after slight delay to ensure page is loaded
setTimeout(() => {
  if (document.querySelector('.prebuilt-display-container')) {
    testPreBuiltFeatures(12010);
  } else {
    console.log('⚠️  PreBuiltDisplay component not found on this page');
    console.log('Navigate to a Pre-Built product and run: testPreBuiltFeatures(12010)');
  }
}, 1000);
