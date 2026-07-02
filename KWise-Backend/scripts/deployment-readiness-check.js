const fs = require('node:fs');
const path = require('node:path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('DEPLOYMENT READINESS CHECK');
console.log('═══════════════════════════════════════════════════════════════\n');

let allChecks = true;

// Check 1: Backend files modified
console.log('📁 CHECK 1: Backend Files\n');
const backendFiles = [
    'controllers/stockController.js',
    'controllers/kioskController.js',
];

backendFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (file.includes('stockController')) {
            if (content.includes("category === 'Pre-Built'") && content.includes('Skipping specification conversion')) {
                console.log(`  ✅ ${file} - Pre-Built check present`);
            } else {
                console.log(`  ❌ ${file} - Pre-Built check MISSING!`);
                allChecks = false;
            }
        }
        
        if (file.includes('kioskController')) {
            if (content.includes('purposesArray') && content.includes('componentsArray')) {
                console.log(`  ✅ ${file} - Safe parsing present`);
            } else {
                console.log(`  ❌ ${file} - Safe parsing MISSING!`);
                allChecks = false;
            }
        }
    } else {
        console.log(`  ❌ ${file} - FILE NOT FOUND!`);
        allChecks = false;
    }
});

// Check 2: Frontend files modified
console.log('\n\n📁 CHECK 2: Frontend Files\n');
const frontendPath = path.join(__dirname, '..', '..', 'K-Wise', 'src', 'kiosk');

const frontendFiles = [
    'PreBuiltDisplay.js',
    'PreBuiltDisplay.css',
    'ProductList.js',
    'ProductList.css'
];

frontendFiles.forEach(file => {
    const filePath = path.join(frontendPath, file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (file === 'PreBuiltDisplay.js') {
            if (content.includes('imageError') && content.includes('imageLoaded') && content.includes('handleImageLoad')) {
                console.log(`  ✅ ${file} - Image states present`);
            } else {
                console.log(`  ❌ ${file} - Image states MISSING!`);
                allChecks = false;
            }
        }
        
        if (file === 'PreBuiltDisplay.css') {
            if (content.includes('prebuilt-image-container') && content.includes('prebuilt-image-loading')) {
                console.log(`  ✅ ${file} - Loading styles present`);
            } else {
                console.log(`  ❌ ${file} - Loading styles MISSING!`);
                allChecks = false;
            }
        }
        
        if (file === 'ProductList.js') {
            if (content.includes('onLoad') && content.includes('opacity')) {
                console.log(`  ✅ ${file} - Image transitions present`);
            } else {
                console.log(`  ❌ ${file} - Image transitions MISSING!`);
                allChecks = false;
            }
        }
        
        if (file === 'ProductList.css') {
            if (content.includes('image-placeholder')) {
                console.log(`  ✅ ${file} - Placeholder styles present`);
            } else {
                console.log(`  ❌ ${file} - Placeholder styles MISSING!`);
                allChecks = false;
            }
        }
    } else {
        console.log(`  ❌ ${file} - FILE NOT FOUND!`);
        allChecks = false;
    }
});

// Check 3: Script files
console.log('\n\n📁 CHECK 3: Validation Scripts\n');
const scripts = [
    'comprehensive-prebuilt-fix.js',
    'final-validation-test.js',
    'check-elite-corruption.js'
];

scripts.forEach(script => {
    const filePath = path.join(__dirname, script);
    if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${script} - Present`);
    } else {
        console.log(`  ❌ ${script} - MISSING!`);
        allChecks = false;
    }
});

// Check 4: Image folders
console.log('\n\n📁 CHECK 4: Image Folders\n');
const imageFolders = [
    path.join(__dirname, '..', 'uploads', 'prebuilt'),
    path.join(__dirname, '..', 'public', 'assets', 'prebuilt')
];

imageFolders.forEach(folder => {
    if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);
        const imageFiles = files.filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'));
        
        if (folder.includes('uploads')) {
            console.log(`  ✅ uploads/prebuilt/ - Present (${imageFiles.length} images)`);
            if (imageFiles.length < 13) {
                console.log(`     ⚠️  Expected 13 images, found ${imageFiles.length}`);
            }
        } else {
            console.log(`  ✅ public/assets/prebuilt/ - Present`);
        }
    } else {
        console.log(`  ❌ ${folder} - MISSING!`);
        allChecks = false;
    }
});

// Check 5: Documentation
console.log('\n\n📁 CHECK 5: Documentation\n');
const docs = [
    path.join(__dirname, '..', '..', 'PHASE_7_COMPREHENSIVE_FIX_SUCCESS_REPORT.md'),
    path.join(__dirname, '..', '..', 'QUICK_FIX_GUIDE.md')
];

docs.forEach(doc => {
    if (fs.existsSync(doc)) {
        console.log(`  ✅ ${path.basename(doc)} - Present`);
    } else {
        console.log(`  ❌ ${path.basename(doc)} - MISSING!`);
        allChecks = false;
    }
});

// Final summary
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('FINAL RESULT');
console.log('═══════════════════════════════════════════════════════════════');

if (allChecks) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('\n🚀 System is ready for deployment!');
    console.log('\nNext steps:');
    console.log('  1. Run: node scripts/final-validation-test.js');
    console.log('  2. Test Elite tier in browser');
    console.log('  3. Test admin Pre-Built updates');
    console.log('  4. Deploy to production');
} else {
    console.log('❌ SOME CHECKS FAILED!');
    console.log('\n⚠️  Please review errors above and ensure all fixes are applied.');
    console.log('\nIf files are missing, re-apply the fixes from:');
    console.log('  - PHASE_7_COMPREHENSIVE_FIX_SUCCESS_REPORT.md');
}

console.log('═══════════════════════════════════════════════════════════════\n');
