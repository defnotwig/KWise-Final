/**
 * COMPREHENSIVE REFERENCE BUILDS COMPATIBILITY AUDIT
 * Stress tests ALL 72 reference builds for:
 * 1. CPU vs Motherboard socket match
 * 2. RAM type vs Motherboard support (DDR4 vs DDR5)
 * 3. GPU power requirements vs PSU wattage
 * 4. Case form factor vs Motherboard form factor
 * 5. CPU cooler socket support
 */

const referenceBuilds = require('./ai/utils/referenceBuilds.js');

// Get all builds
const BUILDS = referenceBuilds.REFERENCE_BUILDS || referenceBuilds;

const issues = [];
let buildCount = 0;
let compatibleCount = 0;
let incompatibleCount = 0;

console.log('═══════════════════════════════════════════════════════════════');
console.log('     COMPREHENSIVE REFERENCE BUILDS COMPATIBILITY AUDIT');
console.log('═══════════════════════════════════════════════════════════════\n');

// Socket compatibility mappings
const socketDDRMapping = {
  'AM5': 'DDR5',
  'AM4': 'DDR4',
  'LGA1700': 'DDR4/DDR5', // Supports both
  'LGA1851': 'DDR5',
  'LGA1200': 'DDR4',
  'LGA1151': 'DDR4'
};

// Check each build
for (const [buildKey, build] of Object.entries(BUILDS)) {
  buildCount++;
  const buildIssues = [];
  const components = build.components;
  
  if (!components) {
    issues.push({ build: buildKey, issue: 'No components defined' });
    incompatibleCount++;
    continue;
  }

  const cpu = components.CPU;
  const motherboard = components.Motherboard;
  const ram = components.RAM;
  const gpu = components.GPU;
  const psu = components.PSU;
  const cooling = components.Cooling;
  const caseComp = components.Case;

  // 1. CPU vs Motherboard Socket Check
  if (cpu && motherboard) {
    const cpuSocket = cpu.specs?.socket;
    const moboSocket = motherboard.specs?.socket;
    
    if (cpuSocket && moboSocket && cpuSocket !== moboSocket) {
      buildIssues.push({
        type: 'SOCKET_MISMATCH',
        severity: 'CRITICAL',
        message: `CPU socket (${cpuSocket}) ≠ Motherboard socket (${moboSocket})`,
        cpu: cpu.name,
        motherboard: motherboard.name
      });
    }
  }

  // 2. RAM Type vs Motherboard Memory Type Check
  if (ram && motherboard) {
    const ramType = ram.specs?.memory_type || ram.specs?.type;
    const moboMemType = motherboard.specs?.memory_type;
    
    if (ramType && moboMemType) {
      const ramDDR = ramType.toUpperCase().includes('DDR5') ? 'DDR5' : 
                     ramType.toUpperCase().includes('DDR4') ? 'DDR4' : ramType;
      const moboDDR = moboMemType.toUpperCase().includes('DDR5') ? 'DDR5' : 
                      moboMemType.toUpperCase().includes('DDR4') ? 'DDR4' : moboMemType;
      
      if (ramDDR !== moboDDR) {
        buildIssues.push({
          type: 'RAM_TYPE_MISMATCH',
          severity: 'CRITICAL',
          message: `RAM type (${ramDDR}) ≠ Motherboard memory type (${moboDDR})`,
          ram: ram.name,
          motherboard: motherboard.name
        });
      }
    }
  }

  // 3. GPU Power vs PSU Wattage Check
  if (gpu && psu) {
    const gpuTDP = gpu.specs?.tdp || 0;
    const psuWattage = psu.specs?.wattage || 0;
    
    // GPU typically needs PSU with at least 150W + GPU TDP headroom
    const recommendedWattage = gpuTDP + 250; // Base system + headroom
    
    if (psuWattage && gpuTDP && psuWattage < recommendedWattage) {
      buildIssues.push({
        type: 'PSU_UNDERPOWERED',
        severity: 'WARNING',
        message: `PSU (${psuWattage}W) may be insufficient for GPU TDP (${gpuTDP}W). Recommended: ${recommendedWattage}W+`,
        gpu: gpu.name,
        psu: psu.name
      });
    }
  }

  // 4. Case Form Factor vs Motherboard Form Factor Check
  if (caseComp && motherboard) {
    const moboFormFactor = motherboard.specs?.form_factor;
    const caseCategory = caseComp.specs?.category || caseComp.specs?.case_category || '';
    
    if (moboFormFactor && caseCategory) {
      const moboFF = moboFormFactor.toUpperCase().replace('-', '');
      const caseSupport = caseCategory.toUpperCase();
      
      // ATX cases support all, Micro-ATX supports Micro and Mini, Mini-ITX only Mini
      const atx = moboFF.includes('ATX') && !moboFF.includes('MICRO') && !moboFF.includes('MINI');
      
      if (atx && !caseSupport.includes('ATX')) {
        buildIssues.push({
          type: 'FORM_FACTOR_MISMATCH',
          severity: 'CRITICAL',
          message: `ATX motherboard may not fit in case (${caseCategory})`,
          motherboard: motherboard.name,
          case: caseComp.name
        });
      }
    }
  }

  // 5. CPU Cooler Socket Check
  if (cooling && cpu) {
    const cpuSocket = cpu.specs?.socket;
    const coolerSockets = cooling.specs?.supported_sockets || cooling.specs?.socket_support || '';
    
    // Only check if cooler has socket info and it's a dedicated cooler (not case fan)
    if (coolerSockets && typeof coolerSockets === 'string' && cpuSocket) {
      const socketList = coolerSockets.toUpperCase();
      const cpuSocketUpper = cpuSocket.toUpperCase();
      
      if (!socketList.includes(cpuSocketUpper) && !cooling.name.toLowerCase().includes('fan')) {
        buildIssues.push({
          type: 'COOLER_SOCKET_MISMATCH',
          severity: 'WARNING',
          message: `CPU cooler may not support ${cpuSocket} socket`,
          cooler: cooling.name,
          cpu: cpu.name
        });
      }
    }
  }

  // Record results
  if (buildIssues.length > 0) {
    incompatibleCount++;
    issues.push({
      build: buildKey,
      usage: build.usage,
      yearRange: build.yearRange,
      budgetRange: build.budgetRange,
      issues: buildIssues
    });
    
    console.log(`❌ ${buildKey}`);
    buildIssues.forEach(issue => {
      const icon = issue.severity === 'CRITICAL' ? '🔴' : '🟡';
      console.log(`   ${icon} ${issue.type}: ${issue.message}`);
    });
    console.log('');
  } else {
    compatibleCount++;
  }
}

// Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('                          SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`Total Builds Analyzed: ${buildCount}`);
console.log(`✅ Fully Compatible:   ${compatibleCount} (${(compatibleCount/buildCount*100).toFixed(1)}%)`);
console.log(`❌ Has Issues:         ${incompatibleCount} (${(incompatibleCount/buildCount*100).toFixed(1)}%)`);

// Group issues by type
const issuesByType = {};
issues.forEach(build => {
  (build.issues || []).forEach(issue => {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push({ build: build.build, ...issue });
  });
});

console.log('\n--- Issues by Type ---');
Object.entries(issuesByType).forEach(([type, typeIssues]) => {
  console.log(`\n${type}: ${typeIssues.length} occurrences`);
});

// Output detailed issues for fixing
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('              DETAILED ISSUES FOR FIXING');
console.log('═══════════════════════════════════════════════════════════════\n');

// Focus on CRITICAL issues that MUST be fixed
const criticalIssues = issues.filter(b => 
  b.issues?.some(i => i.severity === 'CRITICAL')
);

console.log(`CRITICAL ISSUES TO FIX: ${criticalIssues.length} builds\n`);

criticalIssues.forEach(build => {
  console.log(`Build: ${build.build}`);
  build.issues.filter(i => i.severity === 'CRITICAL').forEach(issue => {
    console.log(`  - ${issue.type}: ${issue.message}`);
  });
  console.log('');
});

// Export results for further processing
module.exports = { issues, criticalIssues, summary: { buildCount, compatibleCount, incompatibleCount } };
