/**
 * AI Service for K-Wise Kiosk
 * Provides AI-powered product recommendations using Ollama
 */

const AI_API_URL = 'http://localhost:11434/api/generate';
const AI_MODEL = 'llama3.2'; // Using the same model as FutureUpgrade

class AIService {
    constructor() {
        this.isOllamaAvailable = false;
        this.checkOllamaAvailability();
    }

    /**
     * Check if Ollama is running and available
     */
    async checkOllamaAvailability() {
        try {
            const response = await fetch('http://localhost:11434/api/version', {
                method: 'GET',
                timeout: 2000
            });
            this.isOllamaAvailable = response.ok;
            console.log('🤖 Ollama availability:', this.isOllamaAvailable ? 'Available' : 'Not available');
        } catch (error) {
            this.isOllamaAvailable = false;
            console.log('🤖 Ollama not available:', error.message);
        }
    }

    /**
     * Generate AI-powered Hot Picks recommendations
     */
    async generateHotPicks(products) {
        if (!this.isOllamaAvailable || !products || products.length === 0) {
            return this.getFallbackHotPicks(products);
        }

        try {
            const prompt = this.createHotPicksPrompt(products);
            const aiResponse = await this.callOllama(prompt);

            if (aiResponse && aiResponse.recommendations) {
                const recommendedIds = aiResponse.recommendations;
                return products.filter(p => recommendedIds.includes(p.id)).slice(0, 6);
            }

            return this.getFallbackHotPicks(products);
        } catch (error) {
            console.error('❌ AI Hot Picks error:', error);
            return this.getFallbackHotPicks(products);
        }
    }

    /**
     * Generate AI-powered Value for Money recommendations
     */
    async generateValueForMoney(products) {
        if (!this.isOllamaAvailable || !products || products.length === 0) {
            return this.getFallbackValueForMoney(products);
        }

        try {
            const prompt = this.createValueForMoneyPrompt(products);
            const aiResponse = await this.callOllama(prompt);

            if (aiResponse && aiResponse.recommendations) {
                const recommendedIds = aiResponse.recommendations;
                return products.filter(p => recommendedIds.includes(p.id)).slice(0, 6);
            }

            return this.getFallbackValueForMoney(products);
        } catch (error) {
            console.error('❌ AI Value for Money error:', error);
            return this.getFallbackValueForMoney(products);
        }
    }

    /**
     * Create Hot Picks prompt for AI
     */
    createHotPicksPrompt(products) {
        const productList = products.map(p =>
            `ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Brand: ${p.brand}, Price: ${p.price}, Stock: ${p.stock}, Specs: ${p.specifications || 'N/A'}`
        ).join('\n');

        return `
You are a PC hardware expert for a computer store in the Philippines. Analyze these products and recommend the TOP 6 items as "Hot Picks" - products that are currently trending, popular, or highly demanded by customers.

Products:
${productList}

Consider these factors for Hot Picks:
1. Latest technology and performance
2. Popular brands and models
3. Good balance of performance and price
4. High stock availability (indicates popularity)
5. Gaming and productivity appeal
6. Current market trends (2024-2025)

Respond ONLY with a JSON object in this exact format:
{
  "recommendations": [1, 5, 12, 8, 3, 15]
}

The numbers should be the product IDs from the list above. Select exactly 6 products.
`;
    }

    /**
     * Create Value for Money prompt for AI
     */
    createValueForMoneyPrompt(products) {
        const productList = products.map(p =>
            `ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Brand: ${p.brand}, Price: ${p.price}, Stock: ${p.stock}, Specs: ${p.specifications || 'N/A'}`
        ).join('\n');

        return `
You are a PC hardware expert for a computer store in the Philippines. Analyze these products and recommend the TOP 6 items as "Value for Money" - products that offer the best performance-to-price ratio.

Products:
${productList}

Consider these factors for Value for Money:
1. Performance per peso spent
2. Long-term reliability and durability
3. Good specifications at competitive prices
4. Not necessarily the cheapest, but best value
5. Suitable for budget-conscious customers
6. Good price-to-performance ratio

Respond ONLY with a JSON object in this exact format:
{
  "recommendations": [7, 2, 11, 4, 9, 6]
}

The numbers should be the product IDs from the list above. Select exactly 6 products.
`;
    }

    /**
     * Call Ollama API
     */
    async callOllama(prompt) {
        try {
            const response = await fetch(AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.response) {
                try {
                    // Try to parse JSON response
                    const cleanResponse = data.response.trim();
                    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse AI response:', parseError);
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Ollama API call failed:', error);
            throw error;
        }
    }

    /**
     * Fallback Hot Picks when AI is not available
     */
    getFallbackHotPicks(products) {
        if (!products || products.length === 0) return [];

        console.log('🔄 Using fallback Hot Picks algorithm');

        // Algorithm: Latest products with good performance and stock
        return products
            .filter(p => p.available && p.stock > 5)
            .sort((a, b) => {
                // Prioritize by price (higher = more premium/hot) and stock
                const aScore = (a.price * 0.7) + (a.stock * 0.3);
                const bScore = (b.price * 0.7) + (b.stock * 0.3);
                return bScore - aScore;
            })
            .slice(0, 6);
    }

    /**
     * Fallback Value for Money when AI is not available
     */
    getFallbackValueForMoney(products) {
        if (!products || products.length === 0) return [];

        console.log('🔄 Using fallback Value for Money algorithm');

        // Algorithm: Good performance at reasonable prices
        return products
            .filter(p => p.available && !p.onSale) // Exclude sale items for pure value
            .sort((a, b) => {
                // Lower price but good specs = better value
                // Simple heuristic: lower price with higher stock availability
                const aValue = a.stock / (a.price / 1000); // Stock per thousand pesos
                const bValue = b.stock / (b.price / 1000);
                return bValue - aValue;
            })
            .slice(0, 6);
    }

    /**
     * Get AI status for debugging
     */
    getStatus() {
        return {
            isOllamaAvailable: this.isOllamaAvailable,
            model: AI_MODEL,
            apiUrl: AI_API_URL
        };
    }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;
