/**
 * K-Wise Kiosk Static Data Analysis Script
 * Identifies remaining static data usage in kiosk components
 */

const fs = require('fs');
const path = require('path');

// Kiosk directory path
const kioskDir = path.join(__dirname, '..', 'K-Wise', 'src', 'kiosk');

console.log('🔍 ANALYZING KIOSK COMPONENTS FOR STATIC DATA USAGE');
console.log('==================================================\n');

// File analysis results
const analysisResults = {
  fullyDynamic: [],
  partiallyStatic: [],
  fullyStatic: [],
  backupFiles: [],
  errors: []
};

// Static data patterns to look for
const staticPatterns = [
  /const\s+\w*(?:tiers|services|issues|problems|categories|products|configurations)\s*=\s*\[/gi,
  /const\s+\w*(?:Items|List|Data|Options)\s*=\s*\[/gi,
  /\[\s*{[^}]*name\s*:/gi, // Array of objects with name property
  /price\s*:\s*["']₱\d+/gi, // Hardcoded prices
  /completion\s*:\s*["']/gi, // Hardcoded completion times
];

// Dynamic patterns to look for
const dynamicPatterns = [
  /kioskAPI\./gi,
  /api\./gi,
  /useState.*\[\]/gi,
  /useEffect.*loadComponents/gi,
  /async.*load/gi
];

function analyzeFile(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let staticCount = 0;
    let dynamicCount = 0;
    let staticLines = [];
    let dynamicLines = [];
    
    // Check for static patterns
    staticPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        staticCount += matches.length;
        // Find line numbers
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            staticLines.push(`Line ${index + 1}: ${line.trim()}`);
          }
        });
      }
    });
    
    // Check for dynamic patterns
    dynamicPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        dynamicCount += matches.length;
        // Find line numbers for key dynamic patterns
        if (pattern.toString().includes('kioskAPI') || pattern.toString().includes('api')) {
          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              dynamicLines.push(`Line ${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    });
    
    // Classification logic
    if (fileName.includes('BACKUP') || fileName.includes('backup') || 
        fileName.includes('Original') || fileName.includes('-Enhanced') ||
        fileName.includes('-Fixed') || fileName.includes('-Modern')) {
      analysisResults.backupFiles.push({
        file: fileName,
        staticCount,
        dynamicCount
      });
    } else if (dynamicCount > 0 && staticCount === 0) {
      analysisResults.fullyDynamic.push({
        file: fileName,
        dynamicCount,
        dynamicLines: dynamicLines.slice(0, 3) // Show first 3 examples
      });
    } else if (dynamicCount > 0 && staticCount > 0) {
      analysisResults.partiallyStatic.push({
        file: fileName,
        staticCount,
        dynamicCount,
        staticLines: staticLines.slice(0, 3), // Show first 3 examples
        dynamicLines: dynamicLines.slice(0, 2)
      });
    } else if (staticCount > 0) {
      analysisResults.fullyStatic.push({
        file: fileName,
        staticCount,
        staticLines: staticLines.slice(0, 5) // Show first 5 examples
      });
    }
    
  } catch (error) {
    analysisResults.errors.push({
      file: fileName,
      error: error.message
    });
  }
}

// Analyze all JS files in kiosk directory
if (fs.existsSync(kioskDir)) {
  const files = fs.readdirSync(kioskDir).filter(file => file.endsWith('.js'));
  
  files.forEach(fileName => {
    const filePath = path.join(kioskDir, fileName);
    analyzeFile(filePath, fileName);
  });
} else {
  console.error('❌ Kiosk directory not found:', kioskDir);
  process.exit(1);
}

// Generate report
console.log('📊 ANALYSIS RESULTS');
console.log('==================\n');

console.log(`✅ FULLY DYNAMIC COMPONENTS (${analysisResults.fullyDynamic.length})`);
console.log('-'.repeat(40));
analysisResults.fullyDynamic.forEach(item => {
  console.log(`📱 ${item.file}`);
  console.log(`   Dynamic calls: ${item.dynamicCount}`);
  if (item.dynamicLines.length > 0) {
    console.log('   Examples:');
    item.dynamicLines.forEach(line => console.log(`     • ${line}`));
  }
  console.log();
});

console.log(`⚠️  PARTIALLY STATIC COMPONENTS (${analysisResults.partiallyStatic.length})`);
console.log('-'.repeat(40));
analysisResults.partiallyStatic.forEach(item => {
  console.log(`🔄 ${item.file}`);
  console.log(`   Static data: ${item.staticCount} | Dynamic calls: ${item.dynamicCount}`);
  if (item.staticLines.length > 0) {
    console.log('   Static examples:');
    item.staticLines.forEach(line => console.log(`     ❌ ${line}`));
  }
  if (item.dynamicLines.length > 0) {
    console.log('   Dynamic examples:');
    item.dynamicLines.forEach(line => console.log(`     ✅ ${line}`));
  }
  console.log();
});

console.log(`❌ FULLY STATIC COMPONENTS (${analysisResults.fullyStatic.length})`);
console.log('-'.repeat(40));
analysisResults.fullyStatic.forEach(item => {
  console.log(`🔴 ${item.file}`);
  console.log(`   Static data patterns: ${item.staticCount}`);
  if (item.staticLines.length > 0) {
    console.log('   Static examples:');
    item.staticLines.forEach(line => console.log(`     ❌ ${line}`));
  }
  console.log();
});

console.log(`🗂️  BACKUP FILES (${analysisResults.backupFiles.length})`);
console.log('-'.repeat(40));
analysisResults.backupFiles.forEach(item => {
  console.log(`📂 ${item.file} (Static: ${item.staticCount}, Dynamic: ${item.dynamicCount})`);
});

if (analysisResults.errors.length > 0) {
  console.log(`\n❌ ANALYSIS ERRORS (${analysisResults.errors.length})`);
  console.log('-'.repeat(40));
  analysisResults.errors.forEach(item => {
    console.log(`🔴 ${item.file}: ${item.error}`);
  });
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📋 TRANSFORMATION SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Ready for production: ${analysisResults.fullyDynamic.length} components`);
console.log(`🔄 Need migration: ${analysisResults.partiallyStatic.length} components`);  
console.log(`❌ Fully static: ${analysisResults.fullyStatic.length} components`);
console.log(`📂 Backup files: ${analysisResults.backupFiles.length} files (can be removed)`);

const totalComponentsToMigrate = analysisResults.partiallyStatic.length + analysisResults.fullyStatic.length;
const totalReady = analysisResults.fullyDynamic.length;

console.log(`\n🎯 MIGRATION PROGRESS: ${totalReady}/${totalReady + totalComponentsToMigrate} components completed`);
console.log(`   Progress: ${Math.round((totalReady / (totalReady + totalComponentsToMigrate)) * 100)}%`);

// Priority recommendations
console.log('\n🚀 PRIORITY RECOMMENDATIONS');
console.log('-'.repeat(30));

const priorityComponents = [
  ...analysisResults.fullyStatic.filter(item => 
    item.file.includes('PCCleaning') || 
    item.file.includes('PreBuilt') || 
    item.file.includes('PCCheckup')
  ),
  ...analysisResults.partiallyStatic.filter(item => 
    item.file.includes('PCCleaning') || 
    item.file.includes('PreBuilt') || 
    item.file.includes('PCCheckup')
  )
];

if (priorityComponents.length > 0) {
  console.log('High priority components for next implementation:');
  priorityComponents.forEach((item, index) => {
    console.log(`${index + 1}. ${item.file} (${item.staticCount} static patterns)`);
  });
} else {
  console.log('✅ All priority components already migrated!');
}

console.log('\n✅ Analysis completed successfully!');

// Export results for further processing
const resultsPath = path.join(__dirname, 'kiosk_static_analysis_results.json');
fs.writeFileSync(resultsPath, JSON.stringify(analysisResults, null, 2));
console.log(`📄 Detailed results saved to: ${resultsPath}`);