// Test to see ACTUAL Ollama DeepSeek R1 response format
const ollama = require('ollama').Ollama;

const client = new ollama({ host: 'http://localhost:11434' });

async function testOllamaResponse() {
    console.log('Testing DeepSeek R1 response format...\n');
    
    const prompt = `Analyze compatibility for test purposes. Return JSON:
{
  "overall_assessment": "compatible",
  "confidence": 92,
  "compatible_products": [1, 2, 3],
  "scores": { "1": 95, "2": 88, "3": 92 },
  "reasons": { "1": "Perfect match", "2": "Good match", "3": "Compatible" }
}`;

    try {
        const response = await client.generate({
            model: 'deepseek-r1:1.5b',
            prompt: prompt,
            options: {
                max_tokens: 4000,
                temperature: 0.1
            },
            stream: false
        });

        console.log('═══════════ RAW RESPONSE ═══════════');
        console.log(JSON.stringify(response, null, 2));
        console.log('\n═══════════ RESPONSE.RESPONSE (TEXT) ═══════════');
        console.log(response.response);
        console.log('\n═══════════ CLEANED (AFTER STRIPPING <think>) ═══════════');
        const cleaned = response.response
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        console.log(cleaned);
        console.log('\n═══════════ JSON PARSE ATTEMPT ═══════════');
        try {
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('✅ SUCCESSFULLY PARSED:');
                console.log(JSON.stringify(parsed, null, 2));
            } else {
                console.log('❌ NO JSON FOUND');
            }
        } catch (e) {
            console.log('❌ JSON PARSE FAILED:', e.message);
        }
        
    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

testOllamaResponse();
