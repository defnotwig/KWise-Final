/**
 * Debug test to trace PSU wattage through the validation flow
 */
const compatibilityRules = require('./services/compatibilityRules');

async function debugPsuFlow() {
  try {
    // Load PSU specs from database
    console.log('\n=== Step 1: loadNormalizedSpecs(529) ===');
    const psuSpecs = await compatibilityRules.loadNormalizedSpecs(529);
    console.log('PSU specs:', JSON.stringify(psuSpecs, null, 2));
    console.log('Has wattage?', psuSpecs.wattage);
    console.log('Has psu_wattage?', psuSpecs.psu_wattage);

    // Simulate buildContext creation
    console.log('\n=== Step 2: buildContext creation ===');
    const component = { id: 529, name: '750W MSI MAG A750BN' };
    const buildContextPsu = { ...component, specs: psuSpecs };
    console.log('buildContext.psu:', JSON.stringify(buildContextPsu, null, 2));
    console.log('buildContext.psu.specs.wattage:', buildContextPsu.specs.wattage);

    // Test GPU specs
    console.log('\n=== Step 3: loadNormalizedSpecs(444) - GPU ===');
    const gpuSpecs = await compatibilityRules.loadNormalizedSpecs(444);
    console.log('GPU specs:', JSON.stringify(gpuSpecs, null, 2));
    console.log('Has has_12vhpwr?', gpuSpecs.has_12vhpwr);
    console.log('Has power_connectors?', gpuSpecs.power_connectors);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugPsuFlow();
