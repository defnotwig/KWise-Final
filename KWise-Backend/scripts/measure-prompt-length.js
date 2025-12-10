/**
 * Measure Prompt Character Counts
 * Compare OLD vs NEW prompt lengths for Phase 2.1 optimization
 */

const PromptTemplates = require('../services/promptTemplates');

// Test data
const testParts = {
  cpu: { id: 1, name: 'AMD Ryzen 9 7950X', specifications: { tdp: 170, cores: 16, threads: 32, socket: 'AM5' } },
  motherboard: { id: 2, name: 'ASUS ROG X670E', specifications: { socket: 'AM5', chipset: 'X670E' } },
  ram: { id: 3, name: 'G.Skill 32GB DDR5-6000', specifications: { capacity: 32, speed: 6000, type: 'DDR5' } },
  gpu: { id: 4, name: 'NVIDIA RTX 4080', specifications: { tdp: 320, vram: 16 } },
  psu: { id: 5, name: 'Corsair RMx 850W', specifications: { wattage: 850, rating: '80+ Gold' } },
  storage: { id: 6, name: 'Samsung 990 Pro 2TB', specifications: { capacity: 2000, type: 'NVMe' } }
};

const testContext = {
  primary_use: 'gaming and content creation',
  budget: { min: 2000, max: 3000 },
  experience_level: 'intermediate'
};

const testDeterministic = {
  compatible: true,
  percentageScore: 95,
  issues: [
    { severity: 'info', message: 'Consider adding a CPU cooler' }
  ]
};

console.log('📏 PROMPT LENGTH MEASUREMENT - Phase 2.1 Optimization\n');
console.log('='.repeat(70));

// Test NEW generateCompatibilityPrompt method
console.log('\n✅ NEW generateCompatibilityPrompt() Method:');
try {
  const newPrompt = PromptTemplates.generateCompatibilityPrompt(
    testParts,
    testContext,
    testDeterministic
  );
  
  const systemLen = newPrompt.system.length;
  const taskLen = newPrompt.task.length;
  const totalLen = systemLen + taskLen;
  
  console.log(`   System prompt: ${systemLen} chars`);
  console.log(`   Task prompt: ${taskLen} chars`);
  console.log(`   Total: ${totalLen} chars`);
  console.log(`   Target: ~3500 chars (max acceptable)`);
  
  if (totalLen <= 3500) {
    console.log(`   ✅ OPTIMIZED! (${((1 - totalLen/5882) * 100).toFixed(1)}% reduction from 5882 chars)`);
  } else {
    console.log(`   ⚠️ Still ${totalLen - 3500} chars over target`);
  }
  
  console.log('\n   System Prompt Preview:');
  console.log(`   "${newPrompt.system.substring(0, 150)}..."\n`);
  
  console.log('   Task Prompt Preview:');
  console.log(`   "${newPrompt.task.substring(0, 200)}..."\n`);
  
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
}

// Test generateUpgradePrompt method
console.log('\n✅ NEW generateUpgradePrompt() Method:');
try {
  const upgradePrompt = PromptTemplates.generateUpgradePrompt(
    testParts,
    testContext,
    'GPU is bottlenecking at 1440p gaming'
  );
  
  const systemLen = upgradePrompt.system.length;
  const taskLen = upgradePrompt.task.length;
  const totalLen = systemLen + taskLen;
  
  console.log(`   System prompt: ${systemLen} chars`);
  console.log(`   Task prompt: ${taskLen} chars`);
  console.log(`   Total: ${totalLen} chars`);
  console.log(`   Target: ~2000 chars (upgrade prompts should be shorter)`);
  
  if (totalLen <= 2000) {
    console.log(`   ✅ OPTIMIZED!`);
  } else {
    console.log(`   ⚠️ Still ${totalLen - 2000} chars over target`);
  }
  
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
}

// Compare with legacy buildPrompt (if available)
console.log('\n📊 LEGACY buildPrompt() Method (for comparison):');
try {
  const legacyPrompt = PromptTemplates.buildPrompt(
    'compatibility',
    {
      parts: testParts,
      deterministicResult: {
        socket: 'Compatible (AM5)',
        power: 'Adequate (850W > 490W)',
        verdict: 'Compatible'
      },
      userContext: testContext
    }
  );
  
  if (legacyPrompt) {
    console.log(`   Length: ${legacyPrompt.length} chars`);
    console.log(`   Preview: "${legacyPrompt.substring(0, 150)}..."`);
  } else {
    console.log('   ⚠️ Legacy method returned null');
  }
} catch (error) {
  console.log(`   ⚠️ Legacy method not fully compatible: ${error.message}`);
}

console.log('\n' + '='.repeat(70));
console.log('\n📋 SUMMARY:');
console.log('   Target: Reduce from 5882 chars to ~3500 chars (40% reduction)');
console.log('   Status: Check results above\n');

console.log('✅ Measurement complete!\n');
