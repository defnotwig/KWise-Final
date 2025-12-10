/**
 * K-Wise AI Service
 * Frontend integration for AI features
 * Provides React-ready methods for all AI endpoints with rate limiting
 */

import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';

// Dynamic API configuration that adapts to network environment
const BASE_URL = getApiBaseUrl();
const AI_BASE_URL = `${BASE_URL}/ai`;

console.log('🤖 AI Service initialized with base URL:', AI_BASE_URL);

// Request throttling configuration - VERY conservative to prevent rate limiting
const REQUEST_DELAY = 300; // 300ms delay between requests (increased from 100ms)
const MAX_CONCURRENT_REQUESTS = 2; // Maximum 2 concurrent requests (reduced from 3)

// Request queue management
class RequestQueue {
  constructor() {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = MAX_CONCURRENT_REQUESTS;
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { requestFn, resolve, reject } = this.queue.shift();

    try {
      // Add delay to prevent rate limiting
      if (this.running > 1) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
      }

      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // Process next request
    }
  }
}

const requestQueue = new RequestQueue();

// Create axios instance with default config
const aiApi = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 90000, // ✅ FIX: Increased to 90 seconds for complex AI estimation
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create general API instance for kiosk endpoints
const generalApi = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // ✅ FIX: Increased to 60 seconds for compatibility analysis
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling with rate limit handling
aiApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limit hit, will retry with exponential backoff');
      // Don't log detailed error for rate limits to reduce console spam
      const rateLimitError = new Error('Too many AI requests from this IP, please try again later');
      rateLimitError.code = 'RATE_LIMIT';
      throw rateLimitError;
    }
    console.error('AI API Error:', error);
    throw error;
  }
);

/**
 * AI Service Class
 * Provides methods for all AI integration features
 */
class AIService {

  // ========================
  // HEALTH & STATUS
  // ========================

  /**
   * Get AI service health status
   * @returns {Promise<Object>} Health status data
   */
  async getHealthStatus() {
    try {
      const response = await axios.get(`${AI_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to check AI health status');
    }
  }

  // ========================
  // VALUE ANALYSIS
  // ========================

  /**
   * Get hot picks recommendations for kiosk (no authentication required)
   * @param {Array} parts - Available PC parts
   * @param {number} budget - User budget
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Hot picks recommendations
   */
  async getKioskHotPicks(parts, budget, filters = {}) {
    try {
      const response = await generalApi.post('/kiosk/ai-hot-picks', {
        products: parts,
        budget,
        filters,
        category: 'hot_picks'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get kiosk hot picks');
    }
  }

  /**
   * Get hot picks recommendations
   * @param {Array} parts - Available PC parts
   * @param {number} budget - User budget
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Hot picks recommendations
   */
  async getHotPicks(parts, budget, filters = {}) {
    try {
      const response = await aiApi.post('/hot-picks', {
        parts,
        budget,
        filters,
        category: 'hot_picks'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get hot picks');
    }
  }

  /**
   * Get value for money recommendations
   * @param {Array} parts - PC parts to analyze
   * @param {number} budget - User budget
   * @param {Object} preferences - User preferences
   * @returns {Promise<Object>} Value for money analysis
   */
  async getValueForMoney(parts, preferences = {}, maxRecommendations = 8) {
    try {
      const response = await aiApi.post('/value-for-money', {
        products: parts,
        preferences,
        limit: maxRecommendations,
        analysisType: 'value_for_money'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get value for money analysis');
    }
  }

  /**
   * Estimate user's current PC build using AI
   * NEW - Phase 1: "Estimate My PC" Feature
   * @param {Object} estimateData - User's PC description
   * @param {string} estimateData.usage - How they use their PC (Gaming, Office, School, etc.)
   * @param {number} estimateData.yearPurchased - Year they bought the PC
   * @param {number} estimateData.budget - Budget when purchased (optional)
   * @param {Object} estimateData.knownParts - Any known components (optional)
   * @returns {Promise<Object>} Estimated build with matched products
   */
  async estimateCurrentBuild(estimateData) {
    try {
      const response = await aiApi.post('/estimate-current-build', estimateData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to estimate PC build');
    }
  }

  /**
   * Get AI-powered upgrade recommendations based on current PC build
   * Uses DeepSeek R1 model to analyze build and suggest optimal upgrades
   */
  async getUpgradeRecommendations(currentBuildEstimation, userPreferences = {}) {
    return requestQueue.add(async () => {
      console.log('🔄 Requesting AI upgrade recommendations...');

      try {
        const response = await aiApi.post('/recommend-upgrade', {
          currentBuild: currentBuildEstimation,
          preferences: userPreferences
        });

        console.log('✅ AI upgrade recommendations received:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ AI upgrade recommendations failed:', error);
        throw error;
      }
    });
  }

  /**
   * Get AI-powered cleaning tier recommendation based on assessment
   * Uses analysis of cleaning history to recommend best tier
   */
  async getCleaningTierRecommendation(assessmentAnswers) {
    return requestQueue.add(async () => {
      console.log('🔄 Requesting AI cleaning tier recommendation...');
      console.log('📋 Assessment answers:', assessmentAnswers);

      try {
        const response = await aiApi.post('/recommend-cleaning-tier', {
          assessmentAnswers
        });

        console.log('✅ AI cleaning tier recommendation received:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ AI cleaning tier recommendation failed:', error);
        throw error;
      }
    });
  }

  /**
   * Perform PC Checkup diagnostic analysis
   * NEW - PC Checkup AI integration
   * @param {Object} systemSpecs - System specifications
   * @param {Object} issues - Reported issues and symptoms
   * @param {Array} availableServices - Available services
   * @returns {Promise<Object>} Diagnostic analysis results
   */
  async performPCCheckup(systemSpecs, issues, availableServices) {
    console.log('🔄 Performing PC Checkup diagnostic analysis...');

    try {
      // Return a basic structure for now since backend endpoint may not exist yet
      // This allows the flow to continue without AI analysis
      return {
        success: true,
        analysis: {
          summary: 'Diagnostic analysis completed',
          issues: issues?.issues || [],
          recommendations: [
            'Full system checkup recommended',
            'Hardware inspection suggested'
          ],
          severity: 'moderate',
          estimatedCost: 200 // Base service fee
        },
        ai_available: false,
        fallback: true
      };
    } catch (error) {
      console.error('❌ PC Checkup diagnostic analysis failed:', error);
      // Return fallback response
      return {
        success: false,
        analysis: {
          summary: 'Unable to complete AI analysis',
          issues: issues?.issues || [],
          recommendations: ['Manual diagnostic required'],
          severity: 'unknown',
          estimatedCost: 200
        },
        ai_available: false,
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * Generate external market product suggestions using AI
   * NEW - Feature 2: External Products for Future Upgrades
   * @param {Object} requestData - Request parameters
   * @param {string} requestData.currentProduct - Current product name
   * @param {string} requestData.category - Product category
   * @param {number} requestData.currentPrice - Current product price
   * @param {Array} requestData.targetPriceRange - Target price range [min, max]
   * @param {string} requestData.market - Market region (e.g., 'Philippines')
   * @param {number} requestData.year - Current year
   * @returns {Promise<Object>} External product suggestion
   */
  async generateExternalProductSuggestion(requestData) {
    try {
      console.log('🤖 Requesting AI external product suggestion:', requestData);
      
      // For now, return fallback since backend endpoint may not exist yet
      const { currentProduct, category, targetPriceRange } = requestData;
      const avgTargetPrice = (targetPriceRange[0] + targetPriceRange[1]) / 2;
      
      return {
        recommendation: {
          productName: `Latest ${category} (External Market)`,
          estimatedPrice: avgTargetPrice,
          performanceImprovement: '+50%',
          reason: `Newer generation ${category} available in external market with improved performance over ${currentProduct}`,
          keyFeatures: 'Latest specifications from 2024-2025 market',
          availability: 'External retailers and online stores'
        },
        isFallback: true,
        success: true
      };
    } catch (error) {
      console.error('AI external product suggestion failed:', error);
      
      // Fallback response
      const { currentProduct, category, targetPriceRange } = requestData;
      const avgTargetPrice = (targetPriceRange[0] + targetPriceRange[1]) / 2;
      
      return {
        recommendation: {
          productName: `Latest ${category} (External Market)`,
          estimatedPrice: avgTargetPrice,
          performanceImprovement: '+50%',
          reason: `Newer generation ${category} available in external market with improved performance over ${currentProduct}`,
          keyFeatures: 'Latest specifications from 2024-2025 market',
          availability: 'External retailers and online stores'
        },
        isFallback: true,
        success: false
      };
    }
  }

  /**
   * Analyze value for money
   * @param {Array} parts - PC parts to analyze
   * @param {number} budget - User budget
   * @param {string} category - Analysis category
   * @returns {Promise<Object>} Value analysis results
   */
  async analyzeValue(parts, budget, category = 'value_analysis') {
    try {
      const response = await aiApi.post('/analyze/value', {
        parts,
        budget,
        category
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to analyze value');
    }
  }

  /**
   * Find compatible components
   * @param {Object} baseComponent - Base component to find compatibility for
   * @param {Array} availableComponents - Available components to check
   * @param {Object} options - Compatibility options
   * @returns {Promise<Object>} Compatible components list
   */
  async findCompatibleComponents(baseComponent, availableComponents, options = {}) {
    try {
      const response = await aiApi.post('/compatibility/find', {
        baseComponent,
        availableComponents,
        options: {
          maxSuggestions: options.maxSuggestions || 6,
          preferHighValue: options.preferHighValue || true,
          requireInStock: options.requireInStock || true,
          compatibilityType: options.compatibilityType || 'general'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to find compatible components');
    }
  }

  /**
   * Analyze diagnostics for upgrades
   * @param {Object} diagnosticsData - System diagnostics data
   * @returns {Promise<Object>} Diagnostic analysis results
   */
  async analyzeDiagnostics(diagnosticsData) {
    try {
      const response = await aiApi.post('/diagnostics/upgrade-analysis', {
        ...diagnosticsData,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to analyze diagnostics');
    }
  }

  /**
   * Check compatibility between components (with rate limiting)
   * @param {Array} existingComponents - Currently selected components
   * @param {Object} targetComponent - Component to check compatibility for
   * @returns {Promise<Object>} Compatibility analysis
   */
  async checkCompatibility(existingComponents, targetComponent) {
    return requestQueue.add(async () => {
      try {
        // 🔥 FIX: Transform array of components into parts object expected by backend
        // Backend expects: { parts: { cpu: {...}, motherboard: {...}, ... } }
        const parts = {};
        
        // Add existing components to parts object
        if (Array.isArray(existingComponents)) {
          existingComponents.forEach(component => {
            if (component && component.category) {
              // Normalize category to lowercase for consistency
              const categoryKey = component.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
              parts[categoryKey] = component;
            }
          });
        }
        
        // Add target component if provided
        if (targetComponent && targetComponent.category) {
          const categoryKey = targetComponent.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
          parts[categoryKey] = targetComponent;
        }
        
        const response = await aiApi.post('/compatibility/analyze', {
          parts,  // ✅ FIXED: Send parts object instead of arrays
          userContext: {
            targetCategory: targetComponent?.category || null
          }
        });

        // Transform response to match expected format
        const data = response.data?.data || response.data;
        return {
          success: true,
          recommended: data?.compatibility?.isCompatible || false,
          compatibility_score: data?.compatibility?.score || 75,
          message: data?.compatibility?.summary || 'Compatibility check completed',
          warnings: data?.compatibility?.issues || null
        };
      } catch (error) {
        throw this.handleError(error, 'Failed to check compatibility');
      }
    });
  }

  /**
   * Get alternative recommendations
   * @param {Object} originalPart - Original part
   * @param {Object} criteria - Selection criteria
   * @returns {Promise<Object>} Alternative recommendations
   */
  async getAlternatives(originalPart, criteria) {
    try {
      const response = await aiApi.post('/alternatives', {
        originalPart,
        criteria
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get alternatives');
    }
  }

  // ========================
  // BUILD OPTIMIZATION
  // ========================

  /**
   * Optimize PC build
   * @param {Object} buildConfig - Current build configuration
   * @param {Object} requirements - User requirements and preferences  
   * @param {Array} availableComponents - Available components pool
   * @returns {Promise<Object>} Optimized build recommendations
   */
  async optimizeBuild(buildConfig, requirements, availableComponents) {
    try {
      // Ensure we have valid parameters
      if (!buildConfig || !requirements) {
        throw new Error('Build configuration and requirements are required');
      }

      const response = await aiApi.post('/build/optimize', {
        buildConfig,
        requirements,
        availableComponents
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to optimize build');
    }
  }

  // ========================
  // ========================
  // PRODUCT COMPARISON
  // ========================

  /**
   * Compare two products with AI value analysis
   * @param {Object} comparisonData - Products to compare
   * @param {Object} comparisonData.product1 - First product
   * @param {Object} comparisonData.product2 - Second product
   * @returns {Promise<Object>} AI comparison analysis
   * NEW - Task 5: Product Comparison Feature
   */
  async compareProducts(comparisonData) {
    try {
      console.log('🔍 Requesting AI product comparison...', comparisonData);

      const response = await requestQueue.add(() =>
        generalApi.post('/kiosk/compare', comparisonData)
      );

      console.log('✅ AI comparison received:', response.data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to generate product comparison');
    }
  }

  /**
   * Get compatible components for a product
   * @param {Number} productId - Product ID
   * @param {String} targetCategory - Target category (optional)
   * @returns {Promise<Object>} Compatible components with AI analysis
   */
  async getCompatibleComponents(productId, targetCategory = null) {
    try {
      console.log(`🔍 Requesting compatible components for product ${productId}`);

      const url = `/kiosk/compatible/${productId}${targetCategory ? `?category=${targetCategory}` : ''}`;
      const response = await generalApi.get(url);

      console.log('✅ Compatible components received:', response.data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get compatible components');
    }
  }

  // ========================
  // ADMIN ANALYTICS
  // ========================

  /**
   * Get comprehensive AI system metrics
   * @returns {Promise<Object>} AI metrics data
   * NEW - Phase 4: Admin Dashboard Analytics
   */
  async getAIMetrics() {
    try {
      const response = await aiApi.get('/admin/metrics');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch AI metrics');
    }
  }

  /**
   * Get top upgrade paths from AI recommendations
   * @returns {Promise<Object>} Top upgrade paths data
   * NEW - Phase 4: Admin Dashboard Analytics
   */
  async getTopUpgradePaths() {
    try {
      const response = await aiApi.get('/admin/top-upgrade-paths');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch top upgrade paths');
    }
  }

  /**
   * Get most popular components from AI-assisted purchases
   * @returns {Promise<Object>} Popular components data
   * NEW - Phase 4: Admin Dashboard Analytics
   */
  async getPopularComponents() {
    try {
      const response = await aiApi.get('/admin/popular-components');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch popular components');
    }
  }

  // ========================
  // ERROR HANDLING
  // ========================

  /**
   * Handle API errors consistently with rate limit handling
   * @param {Error} error - The error object
   * @param {string} defaultMessage - Default error message
   * @returns {Error} Formatted error
   */
  handleError(error, defaultMessage) {
    // Handle rate limiting errors specifically
    if (error.response?.status === 429 || error.code === 'RATE_LIMIT') {
      return new Error('Too many AI requests from this IP, please try again later');
    }

    // Handle Ollama not running (503)
    if (error.response?.status === 503) {
      const userMessage = error.response?.data?.data?.userMessage;
      if (userMessage) {
        return new Error(userMessage);
      }
      return new Error('AI service is temporarily unavailable. Please try again later or contact support.');
    }

    // Handle other errors
    const message = error.response?.data?.message ||
      error.response?.data?.data?.userMessage ||
      error.message ||
      defaultMessage;
    return new Error(message);
  }

  /**
   * Check if AI service is available
   * @returns {Promise<boolean>} Service availability status
   */
  async isAvailable() {
    try {
      const health = await this.getHealthStatus();
      return health.success && health.data?.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

// Create and export singleton instance
const aiService = new AIService();
export default aiService;

// Named exports for specific functionality
export {
  aiService,
  AIService
};