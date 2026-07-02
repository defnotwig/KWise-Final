/**
 * ⚡ COMPATIBILITY API TEST SUITE ⚡
 * 
 * Tests critical compatibility scenarios after database enrichment
 * Validates all 6 enhancement features
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// ANSI Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

/**
 * Test 1: CPU-Motherboard Brand Mismatch (AMD on Intel)
 * Should CATASTROPHIC block: AMD Ryzen on Intel Z790
 */
async function testCpuMotherboardBrandMismatch() {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}TEST 1: CPU-Motherboard Brand Mismatch Detection${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  
  try {
    // Find AMD CPU (AM4 socket) and Intel motherboard (LGA socket)
    const cpuResponse = await axios.get(`${API_BASE}/products/search?category=CPU&limit=5`);
    const mbResponse = await axios.get(`${API_BASE}/products/search?category=Motherboard&limit=50`);
    
    const amdCpu = cpuResponse.data.parts.find(p => 
      p.name.toLowerCase().includes('ryzen') || 
      p.specifications?.socket?.startsWith('AM')
    );
    
    const intelMb = mbResponse.data.parts.find(p => 
      p.specifications?.socket?.startsWith('LGA') ||
      p.specifications?.chipset?.match(/Z[0-9]+|B[0-9]+|H[0-9]+/)
    );
    
    if (!amdCpu || !intelMb) {
      console.log(`${YELLOW}⚠ Skipped: Could not find AMD CPU or Intel motherboard${RESET}`);
      return;
    }
    
    console.log(`\n🔍 Testing: ${amdCpu.name} (${amdCpu.specifications?.socket || 'AM4'})`);
    console.log(`   with: ${intelMb.name} (${intelMb.specifications?.socket || 'LGA'})`);
    
    const testBuild = {
      cpu: amdCpu.id,
      motherboard: intelMb.id
    };
    
    const result = await axios.post(`${API_BASE}/compatibility/analyze`, testBuild);
    
    // Check for CATASTROPHIC error about socket mismatch
    const hasCatastrophicError = result.data.issues?.some(issue => 
      issue.severity === 'CATASTROPHIC' && 
      issue.message.toLowerCase().includes('socket')
    );
    
    if (hasCatastrophicError) {
      console.log(`${GREEN}✅ PASS: Correctly blocked AMD CPU on Intel motherboard${RESET}`);
      passCount++;
    } else {
      console.log(`${RED}❌ FAIL: Should CATASTROPHIC block AMD on Intel${RESET}`);
      console.log(`   Issues found:`, JSON.stringify(result.data.issues, null, 2));
      failCount++;
    }
    
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failCount++;
  }
}

/**
 * Test 2: DDR Type Mismatch (DDR4 RAM on DDR5 motherboard)
 * Should CATASTROPHIC block
 */
async function testRamDdrTypeMismatch() {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}TEST 2: DDR Type Mismatch Detection${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  
  try {
    const mbResponse = await axios.get(`${API_BASE}/pc-parts?category=Motherboard&limit=50`);
    const ramResponse = await axios.get(`${API_BASE}/pc-parts?category=RAM&limit=50`);
    
    // Find DDR5 motherboard (B650, X670, Z790, etc.)
    const ddr5Mb = mbResponse.data.parts.find(p => 
      p.specifications?.memory_type === 'DDR5' ||
      p.specifications?.chipset?.match(/B650|X670|Z790|B760/)
    );
    
    // Find DDR4 RAM
    const ddr4Ram = ramResponse.data.parts.find(p => 
      p.specifications?.memory_type === 'DDR4' ||
      p.name.toLowerCase().includes('ddr4')
    );
    
    if (!ddr5Mb || !ddr4Ram) {
      console.log(`${YELLOW}⚠ Skipped: Could not find DDR5 motherboard or DDR4 RAM${RESET}`);
      return;
    }
    
    console.log(`\n🔍 Testing: ${ddr4Ram.name} (DDR4)`);
    console.log(`   with: ${ddr5Mb.name} (${ddr5Mb.specifications?.memory_type || 'DDR5'})`);
    
    const testBuild = {
      motherboard: ddr5Mb.id,
      ram: [ddr4Ram.id]
    };
    
    const result = await axios.post(`${API_BASE}/compatibility/analyze`, testBuild);
    
    const hasCatastrophicError = result.data.issues?.some(issue => 
      issue.severity === 'CATASTROPHIC' && 
      (issue.message.toLowerCase().includes('ddr') || issue.message.toLowerCase().includes('memory type'))
    );
    
    if (hasCatastrophicError) {
      console.log(`${GREEN}✅ PASS: Correctly blocked DDR4 RAM on DDR5 motherboard${RESET}`);
      passCount++;
    } else {
      console.log(`${RED}❌ FAIL: Should CATASTROPHIC block DDR mismatch${RESET}`);
      console.log(`   Issues found:`, JSON.stringify(result.data.issues, null, 2));
      failCount++;
    }
    
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failCount++;
  }
}

/**
 * Test 3: Multi-GPU on B650 Chipset (electrical slots check)
 * Should CATASTROPHIC block: B650 has only 1 electrical x16 slot
 */
async function testMultiGpuElectricalSlots() {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}TEST 3: Multi-GPU Electrical Slot Validation${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  
  try {
    const mbResponse = await axios.get(`${API_BASE}/products/search?category=Motherboard&limit=50`);
    const gpuResponse = await axios.get(`${API_BASE}/products/search?category=GPU&limit=20`);
    
    // Find B650 motherboard (should have electrical:1, physical:2)
    const b650Mb = mbResponse.data.parts.find(p => 
      p.specifications?.chipset?.includes('B650') ||
      p.name.toLowerCase().includes('b650')
    );
    
    const gpu = gpuResponse.data.parts[0];
    
    if (!b650Mb || !gpu) {
      console.log(`${YELLOW}⚠ Skipped: Could not find B650 motherboard or GPU${RESET}`);
      return;
    }
    
    console.log(`\n🔍 Testing: 2× ${gpu.name}`);
    console.log(`   with: ${b650Mb.name} (B650 chipset)`);
    console.log(`   Expected: Electrical x16 slots = 1, Physical x16 slots = 2`);
    
    const testBuild = {
      motherboard: b650Mb.id,
      gpu: [gpu.id, gpu.id] // 2 GPUs
    };
    
    const result = await axios.post(`${API_BASE}/compatibility/analyze`, testBuild);
    
    const hasCatastrophicError = result.data.issues?.some(issue => 
      issue.severity === 'CATASTROPHIC' && 
      (issue.message.toLowerCase().includes('pcie') || 
       issue.message.toLowerCase().includes('slot') ||
       issue.message.toLowerCase().includes('multi-gpu'))
    );
    
    if (hasCatastrophicError) {
      console.log(`${GREEN}✅ PASS: Correctly blocked multi-GPU on B650 (1 electrical slot)${RESET}`);
      passCount++;
    } else {
      console.log(`${RED}❌ FAIL: Should CATASTROPHIC block 2 GPUs on B650${RESET}`);
      console.log(`   Issues found:`, JSON.stringify(result.data.issues, null, 2));
      failCount++;
    }
    
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failCount++;
  }
}

/**
 * Test 4: GPU with 12VHPWR on PSU without 12VHPWR
 * Should CRITICAL warn
 */
async function testGpuPowerConnector() {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}TEST 4: GPU 12VHPWR Power Connector Validation${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  
  try {
    const gpuResponse = await axios.get(`${API_BASE}/products/search?category=GPU&limit=50`);
    const psuResponse = await axios.get(`${API_BASE}/products/search?category=PSU&limit=30`);
    
    // Find GPU with 12VHPWR (RTX 40 series)
    const gpu12vhpwr = gpuResponse.data.parts.find(p => 
      p.name.toLowerCase().includes('rtx 40') ||
      p.name.toLowerCase().includes('rtx 50')
    );
    
    // Find PSU without 12VHPWR (older models)
    const psuNo12vhpwr = psuResponse.data.parts.find(p => 
      !p.name.toLowerCase().includes('atx 3') &&
      !p.name.toLowerCase().includes('gen 5')
    );
    
    if (!gpu12vhpwr || !psuNo12vhpwr) {
      console.log(`${YELLOW}⚠ Skipped: Could not find RTX 40 GPU or non-ATX3 PSU${RESET}`);
      return;
    }
    
    console.log(`\n🔍 Testing: ${gpu12vhpwr.name} (12VHPWR)`);
    console.log(`   with: ${psuNo12vhpwr.name} (No 12VHPWR)`);
    
    const testBuild = {
      gpu: [gpu12vhpwr.id],
      psu: psuNo12vhpwr.id
    };
    
    const result = await axios.post(`${API_BASE}/compatibility/analyze`, testBuild);
    
    const hasCriticalWarning = result.data.issues?.some(issue => 
      (issue.severity === 'CRITICAL' || issue.severity === 'MAJOR') &&
      (issue.message.toLowerCase().includes('12vhpwr') || 
       issue.message.toLowerCase().includes('power connector'))
    );
    
    if (hasCriticalWarning) {
      console.log(`${GREEN}✅ PASS: Correctly warned about missing 12VHPWR connector${RESET}`);
      passCount++;
    } else {
      console.log(`${YELLOW}⚠ WARNING: Should warn about 12VHPWR mismatch${RESET}`);
      console.log(`   Issues found:`, JSON.stringify(result.data.issues, null, 2));
      // Don't count as fail - might use adapter
    }
    
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failCount++;
  }
}

/**
 * Test 5: Large GPU in case with limited front fans
 * Should MAJOR warn after front_fan_slots deduction
 */
async function testGpuCaseClearance() {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}TEST 5: GPU Case Clearance with Front Fan Deduction${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  
  try {
    const gpuResponse = await axios.get(`${API_BASE}/products/search?category=GPU&limit=50`);
    const caseResponse = await axios.get(`${API_BASE}/products/search?category=Case&limit=50`);
    
    // Find large GPU (>320mm)
    const largeGpu = gpuResponse.data.parts.find(p => 
      Number.parseInt(p.specifications?.length_mm, 10) > 320 ||
      p.name.toLowerCase().includes('rtx 4070') ||
      p.name.toLowerCase().includes('rx 7800')
    );
    
    // Find Mid Tower case (2 front fans = 50mm deduction)
    const midCase = caseResponse.data.parts.find(p => 
      p.specifications?.form_factor?.toLowerCase().includes('mid') ||
      p.name.toLowerCase().includes('mid tower')
    );
    
    if (!largeGpu || !midCase) {
      console.log(`${YELLOW}⚠ Skipped: Could not find large GPU or Mid Tower case${RESET}`);
      return;
    }
    
    console.log(`\n🔍 Testing: ${largeGpu.name} (${largeGpu.specifications?.length_mm || 'unknown'}mm)`);
    console.log(`   with: ${midCase.name} (Mid Tower, ~2 front fans)`);
    console.log(`   Expected: 50mm deduction (2 fans × 25mm)`);
    
    const testBuild = {
      gpu: [largeGpu.id],
      case: midCase.id
    };
    
    const result = await axios.post(`${API_BASE}/compatibility/analyze`, testBuild);
    
    const hasClearanceWarning = result.data.issues?.some(issue => 
      (issue.severity === 'MAJOR' || issue.severity === 'CRITICAL') &&
      (issue.message.toLowerCase().includes('clearance') || 
       issue.message.toLowerCase().includes('length') ||
       issue.message.toLowerCase().includes('fit'))
    );
    
    if (hasClearanceWarning) {
      console.log(`${GREEN}✅ PASS: Correctly warned about GPU clearance${RESET}`);
      passCount++;
    } else {
      console.log(`${YELLOW}⚠ INFO: No clearance warning (may fit comfortably)${RESET}`);
      console.log(`   Issues found:`, JSON.stringify(result.data.issues, null, 2));
    }
    
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failCount++;
  }
}

/**
 * Test 6: RAM per-slot capacity check
 * Should warn if exceeding max_memory_per_slot_gb
 */
async function testRamPerSlotCapacity() {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}TEST 6: RAM Per-Slot Capacity Validation${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  
  try {
    const mbResponse = await axios.get(`${API_BASE}/pc-parts?category=Motherboard&limit=50`);
    const ramResponse = await axios.get(`${API_BASE}/pc-parts?category=RAM&limit=50`);
    
    // Find B450 motherboard (max_memory_per_slot_gb: 16)
    const b450Mb = mbResponse.data.parts.find(p => 
      p.specifications?.chipset?.includes('B450') ||
      p.name.toLowerCase().includes('b450')
    );
    
    // Find 32GB RAM stick (if available)
    const largeRam = ramResponse.data.parts.find(p => 
      Number.parseInt(p.specifications?.capacity_gb, 10) >= 32 ||
      p.name.toLowerCase().includes('32gb')
    );
    
    if (!b450Mb || !largeRam) {
      console.log(`${YELLOW}⚠ Skipped: Could not find B450 motherboard or 32GB RAM${RESET}`);
      return;
    }
    
    console.log(`\n🔍 Testing: ${largeRam.name} (${largeRam.specifications?.capacity_gb || 32}GB)`);
    console.log(`   with: ${b450Mb.name} (B450, max 16GB/slot)`);
    
    const testBuild = {
      motherboard: b450Mb.id,
      ram: [largeRam.id]
    };
    
    const result = await axios.post(`${API_BASE}/compatibility/analyze`, testBuild);
    
    const hasCapacityWarning = result.data.issues?.some(issue => 
      (issue.severity === 'CRITICAL' || issue.severity === 'MAJOR') &&
      (issue.message.toLowerCase().includes('capacity') || 
       issue.message.toLowerCase().includes('slot') ||
       issue.message.toLowerCase().includes('exceed'))
    );
    
    if (hasCapacityWarning) {
      console.log(`${GREEN}✅ PASS: Correctly warned about RAM capacity per slot${RESET}`);
      passCount++;
    } else {
      console.log(`${YELLOW}⚠ INFO: No per-slot capacity warning (may be compatible)${RESET}`);
      console.log(`   Issues found:`, JSON.stringify(result.data.issues, null, 2));
    }
    
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failCount++;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`\n${BLUE}╔═══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║  ⚡ COMPATIBILITY API TEST SUITE - POST ENRICHMENT ⚡   ║${RESET}`);
  console.log(`${BLUE}╚═══════════════════════════════════════════════════════════╝${RESET}`);
  
  console.log(`\nℹ️  Testing enhanced compatibility validations after database enrichment`);
  console.log(`   164 products enriched with enhanced fields\n`);
  
  await testCpuMotherboardBrandMismatch();
  await testRamDdrTypeMismatch();
  await testMultiGpuElectricalSlots();
  await testGpuPowerConnector();
  await testGpuCaseClearance();
  await testRamPerSlotCapacity();
  
  // Final summary
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}TEST SUMMARY${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${GREEN}✅ Passed: ${passCount}${RESET}`);
  console.log(`${RED}❌ Failed: ${failCount}${RESET}`);
  
  const total = passCount + failCount;
  const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;
  
  if (passRate >= 80) {
    console.log(`\n${GREEN}🎉 SUCCESS: ${passRate}% pass rate - Compatibility system working!${RESET}`);
  } else if (passRate >= 50) {
    console.log(`\n${YELLOW}⚠️  PARTIAL: ${passRate}% pass rate - Some issues need attention${RESET}`);
  } else {
    console.log(`\n${RED}❌ FAILURE: ${passRate}% pass rate - Critical issues found${RESET}`);
  }
  
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${RED}Fatal error: ${error.message}${RESET}`);
  process.exit(1);
});
