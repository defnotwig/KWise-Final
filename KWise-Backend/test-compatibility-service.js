const { CompatibilityService } = require('./services/compatibilityService');

console.log('🔍 Testing improved Ollama error messages...');

async function testCompatibilityService() {
    const service = new (class extends CompatibilityService {
        constructor() {
            super();
        }
    })();
    
    console.log('✅ CompatibilityService instantiated');
    console.log('Service available:', service.isAvailable);
    
    // Wait a moment for the availability check to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('After delay - Service available:', service.isAvailable);
}

testCompatibilityService().catch(console.error);