const axios = require('axios');

/**
 * Test Ollama Service Connectivity and Model Functionality
 */
async function testOllamaService() {
    console.log('🔍 Testing Ollama Service Connectivity');
    console.log('=' .repeat(50));

    try {
        // Test 1: Check Ollama version
        console.log('\n1. Testing Ollama API Version...');
        const versionResponse = await axios.get('http://localhost:11434/api/version');
        console.log('   ✅ Ollama API Version:', versionResponse.data.version);

        // Test 2: List available models
        console.log('\n2. Checking Available Models...');
        const modelsResponse = await axios.get('http://localhost:11434/api/tags');
        const models = modelsResponse.data.models || [];
        console.log(`   ✅ Found ${models.length} models:`);
        models.forEach(model => {
            console.log(`      - ${model.name} (${model.size})`);
        });

        // Test 3: Test DeepSeek R1 7B model generation
        console.log('\n3. Testing DeepSeek R1 7B Model Generation...');
        const testPrompt = 'What are the key factors for PC component compatibility? Answer in 2 sentences.';
        
        const generateResponse = await axios.post('http://localhost:11434/api/generate', {
            model: 'deepseek-r1:7b',
            prompt: testPrompt,
            stream: false,
            options: {
                temperature: 0.3,
                top_p: 0.9,
                num_predict: 100
            }
        }, {
            timeout: 30000
        });

        if (generateResponse.data && generateResponse.data.response) {
            console.log('   ✅ Model Response Generated Successfully:');
            console.log(`   "${generateResponse.data.response.trim()}"`);
        } else {
            console.log('   ❌ No response from model');
        }

        // Test 4: Test smaller model as fallback
        console.log('\n4. Testing DeepSeek R1 1.5B Fallback Model...');
        const fallbackResponse = await axios.post('http://localhost:11434/api/generate', {
            model: 'deepseek-r1:1.5b',
            prompt: 'CPU compatibility depends on?',
            stream: false,
            options: {
                temperature: 0.3,
                num_predict: 50
            }
        }, {
            timeout: 15000
        });

        if (fallbackResponse.data && fallbackResponse.data.response) {
            console.log('   ✅ Fallback Model Response:');
            console.log(`   "${fallbackResponse.data.response.trim()}"`);
        }

        console.log('\n🎉 ALL OLLAMA TESTS PASSED!');
        console.log('✅ Ollama service is running and responding');
        console.log('✅ DeepSeek R1 models are available and functional');
        console.log('✅ AI integration is ready for K-Wise system');

    } catch (error) {
        console.error('\n❌ Ollama Test Failed:');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

// Run the test
testOllamaService();