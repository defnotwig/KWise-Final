const axios = require('axios');
const logger = require('./utils/logger');

console.log('🔍 Testing Ollama error logging...');

async function testOllamaError() {
    try {
        console.log('🔧 Making request to Ollama...');
        const response = await axios.get('http://localhost:11434/api/version', {
            timeout: 3000
        });
        console.log('✅ Ollama is available:', response.status);
    } catch (error) {
        console.log('\n🔍 Raw error object:');
        console.log('Error constructor:', error.constructor.name);
        console.log('Error message:', error.message);
        console.log('Error code:', error.code);
        console.log('Error properties:', Object.getOwnPropertyNames(error));
        console.log('Error enumerable properties:', Object.keys(error));
        
        console.log('\n🔍 Stringifying error:');
        console.log('JSON.stringify(error):', JSON.stringify(error));
        console.log('error.toString():', error.toString());
        console.log('error.message:', error.message);
        
        console.log('\n🔍 Testing logger output:');
        const errorMessage = error.message || error.toString() || 'Unknown error';
        console.log('Final error message:', errorMessage);
        
        console.log('\n🔧 Using logger.warn:');
        logger.warn(`🤖 Ollama not available: ${errorMessage}`);
        
        console.log('\n🔧 Testing problematic logger pattern:');
        logger.warn('🤖 Ollama not available:', errorMessage);
    }
}

testOllamaError().catch(console.error);