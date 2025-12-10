/**
 * AI API Service for K-Wise Frontend
 * Handles all AI-related API requests from React components
 * Provides clean interface for AI features integration
 */

import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Create axios instance for AI requests
const aiAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/ai`,
  timeout: 60000, // 60 seconds timeout for AI operations
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
aiAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
aiAPI.interceptors.response.use(
  (response) => response.data, // Return only data part
  (error) => {
    console.error('AI API Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 503) {
      // Service unavailable
      console.warn('AI service temporarily unavailable');
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      console.warn('AI service rate limit exceeded');
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

/**
 * AI Service Class
 */
class AIService {
  // ====================
  // VALUE ANALYZER SERVICES
  // ====================

  /**
   * Get Hot Picks recommendations for PC Parts homepage
   * @param {Array} products - Available products
   * @param {Object} marketData - Market trend data
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Object>} Hot picks data
   */
  async getHotPicks(products, marketData = {}, limit = 8) {
    try {
      const response = await aiAPI.post('/hot-picks', {
        products,
        marketData,
        limit
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get hot picks:', error);
      return {
        hotPicks: [],
        analysis: {
          totalAnalyzed: 0,
          trendingCategories: [],
          averagePrice: '₱0',
          recommendationConfidence: 0
        }
      };
    }
  }

  /**
   * Get Value for Money recommendations
   * @param {Array} products - Available products
   * @param {Object} marketData - Market pricing data
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Object>} Value for money data
   */
  async getValueForMoney(products, marketData = {}, limit = 8) {
    try {
      const response = await aiAPI.post('/value-for-money', {
        products,
        marketData,
        limit
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get value for money:', error);
      return {
        valueForMoney: [],
        analysis: {
          totalAnalyzed: 0,
          bestValueCategories: [],
          averageValueScore: 0,
          priceRange: '₱0 - ₱0'
        }
      };
    }
  }

  /**
   * Analyze market trends (Admin only)
   * @param {Array} allProducts - All products for analysis
   * @param {Object} salesData - Sales and trend data
   * @returns {Promise<Object>} Market trends analysis
   */
  async analyzeMarketTrends(allProducts, salesData = {}) {
    try {
      const response = await aiAPI.post('/market-trends', {
        allProducts,
        salesData
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze market trends:', error);
      return {
        marketTrends: {},
        recommendations: {},
        insights: []
      };
    }
  }

  // ====================
  // COMPATIBILITY ANALYZER SERVICES
  // ====================

  /**
   * Analyze component compatibility for Product Page
   * @param {Object} targetComponent - Component to analyze
   * @param {Array} existingComponents - User's existing components
   * @param {Object} compatibilityContext - Additional context
   * @returns {Promise<Object>} Compatibility analysis
   */
  async analyzeCompatibility(targetComponent, existingComponents = [], compatibilityContext = {}) {
    try {
      const response = await aiAPI.post('/compatibility/analyze', {
        targetComponent,
        existingComponents,
        compatibilityContext
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze compatibility:', error);
      return {
        compatibility: {
          status: 'unknown',
          score: 50,
          summary: 'Compatibility analysis unavailable'
        },
        compatibleComponents: [],
        alternatives: []
      };
    }
  }

  /**
   * Find compatible components for a base component
   * @param {Object} baseComponent - Base component to match
   * @param {Array} availableComponents - Available components pool
   * @param {string} compatibilityType - Type of compatibility check
   * @returns {Promise<Object>} Compatible components
   */
  async findCompatibleComponents(baseComponent, availableComponents, compatibilityType = 'general') {
    try {
      const response = await aiAPI.post('/compatibility/find', {
        baseComponent,
        availableComponents,
        compatibilityType
      });
      return response.data;
    } catch (error) {
      console.error('Failed to find compatible components:', error);
      return {
        compatible: [],
        analysis: {
          totalChecked: 0,
          compatibleCount: 0,
          compatibility: 'unknown'
        }
      };
    }
  }

  // ====================
  // BUILD OPTIMIZER SERVICES
  // ====================

  /**
   * Optimize PC build configuration
   * @param {Object} buildConfig - Current build components
   * @param {Object} requirements - User requirements
   * @param {Array} availableComponents - Available component options
   * @returns {Promise<Object>} Build optimization results
   */
  async optimizeBuild(buildConfig, requirements, availableComponents = []) {
    try {
      const response = await aiAPI.post('/build/optimize', {
        buildConfig,
        requirements,
        availableComponents
      });
      return response.data;
    } catch (error) {
      console.error('Failed to optimize build:', error);
      return {
        optimizedBuild: buildConfig,
        buildAnalysis: {},
        alternatives: [],
        warnings: ['Build optimization unavailable'],
        recommendations: ['Manual review recommended']
      };
    }
  }

  /**
   * Validate build compatibility
   * @param {Object} buildComponents - All build components
   * @returns {Promise<Object>} Compatibility validation
   */
  async validateBuildCompatibility(buildComponents) {
    try {
      const response = await aiAPI.post('/build/validate-compatibility', {
        buildComponents
      });
      return response.data;
    } catch (error) {
      console.error('Failed to validate build compatibility:', error);
      return {
        compatibilityStatus: 'unknown',
        compatibilityScore: 75,
        issues: [],
        warnings: [{ type: 'service_unavailable', message: 'Compatibility validation unavailable' }],
        powerAnalysis: {},
        thermalAnalysis: {},
        summary: 'Manual validation required'
      };
    }
  }

  /**
   * Get pre-built PC recommendations
   * @param {Object} requirements - Customer requirements
   * @param {Array} availableBuilds - Available pre-built systems
   * @returns {Promise<Object>} Pre-built recommendations
   */
  async recommendPreBuilds(requirements, availableBuilds) {
    try {
      const response = await aiAPI.post('/build/recommend-prebuilt', {
        requirements,
        availableBuilds
      });
      return response.data;
    } catch (error) {
      console.error('Failed to recommend pre-builds:', error);
      return {
        topRecommendations: [],
        alternativeOptions: [],
        customizationSuggestions: [],
        analysis: {}
      };
    }
  }

  /**
   * Optimize build for specific budget
   * @param {Object} buildConfig - Current build configuration
   * @param {number} targetBudget - Target budget in PHP
   * @param {Array} componentOptions - Alternative component options
   * @returns {Promise<Object>} Budget optimization results
   */
  async optimizeForBudget(buildConfig, targetBudget, componentOptions = []) {
    try {
      const response = await aiAPI.post('/build/optimize-budget', {
        buildConfig,
        targetBudget,
        componentOptions
      });
      return response.data;
    } catch (error) {
      console.error('Failed to optimize for budget:', error);
      return {
        budgetOptimization: {
          feasible: false,
          targetBudget: `₱${targetBudget.toLocaleString()}`,
          optimizedCost: '₱0',
          savings: '₱0',
          performanceImpact: 'unknown'
        },
        componentChanges: [],
        performanceComparison: {},
        upgradeStrategy: [],
        alternatives: []
      };
    }
  }

  // ====================
  // DIAGNOSTIC ANALYZER SERVICES
  // ====================

  /**
   * Perform PC checkup and diagnostics
   * @param {Object} systemSpecs - System specifications
   * @param {Object} performanceData - Performance metrics
   * @param {Array} availableServices - Available diagnostic services
   * @returns {Promise<Object>} Diagnostic results
   */
  async performPCCheckup(systemSpecs, performanceData, availableServices = []) {
    try {
      const response = await aiAPI.post('/diagnostics/pc-checkup', {
        systemSpecs,
        performanceData,
        availableServices
      });
      return response.data;
    } catch (error) {
      console.error('Failed to perform PC checkup:', error);
      return {
        diagnosticSummary: {
          overallHealth: 'unknown',
          healthScore: 75,
          primaryIssues: ['Analysis unavailable'],
          systemAge: 'Unknown',
          performanceLevel: 'Manual assessment required'
        },
        componentAnalysis: {},
        performanceOptimization: {},
        recommendedServices: [],
        maintenanceSchedule: [],
        summary: 'Manual diagnostic recommended'
      };
    }
  }

  /**
   * Analyze upgrade opportunities
   * @param {Object} currentSystem - Current system specs
   * @param {Object} upgradeGoals - Upgrade objectives
   * @param {Array} availableComponents - Available upgrade components
   * @returns {Promise<Object>} Upgrade analysis
   */
  async analyzeUpgradeOptions(currentSystem, upgradeGoals, availableComponents = []) {
    try {
      const response = await aiAPI.post('/diagnostics/upgrade-analysis', {
        currentSystem,
        upgradeGoals,
        availableComponents
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze upgrade options:', error);
      return {
        upgradeAssessment: {
          overallRating: 'unknown',
          upgradeWorth: 'conditional',
          expectedImprovement: 'TBD',
          costEffectiveness: 'unknown'
        },
        prioritizedUpgrades: [],
        upgradePathways: [],
        costBenefitAnalysis: [],
        compatibilityConsiderations: [],
        budgetOptimizations: [],
        alternatives: [],
        recommendations: ['Manual assessment recommended']
      };
    }
  }

  /**
   * Recommend PC services based on analysis
   * @param {Object} systemAnalysis - System diagnostic results
   * @param {Array} availableServices - Available services
   * @param {Object} customerProfile - Customer preferences
   * @returns {Promise<Object>} Service recommendations
   */
  async recommendServices(systemAnalysis, availableServices, customerProfile = {}) {
    try {
      const response = await aiAPI.post('/diagnostics/recommend-services', {
        systemAnalysis,
        availableServices,
        customerProfile
      });
      return response.data;
    } catch (error) {
      console.error('Failed to recommend services:', error);
      return {
        recommendedServices: [],
        servicePackages: [],
        maintenancePlan: {},
        budgetOptions: [],
        diyAlternatives: [],
        summary: 'Manual service consultation recommended'
      };
    }
  }

  /**
   * Analyze system bottlenecks
   * @param {Object} performanceData - Performance metrics
   * @param {Object} userWorkloads - User's typical workloads
   * @returns {Promise<Object>} Bottleneck analysis
   */
  async analyzeBottlenecks(performanceData, userWorkloads = {}) {
    try {
      const response = await aiAPI.post('/diagnostics/analyze-bottlenecks', {
        performanceData,
        userWorkloads
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze bottlenecks:', error);
      return {
        bottleneckAnalysis: {
          primaryBottleneck: 'Manual analysis required',
          severity: 'unknown',
          impactAreas: [],
          confidenceLevel: 0
        },
        detectedBottlenecks: [],
        workloadSpecificIssues: {},
        optimizationPriority: []
      };
    }
  }

  // ====================
  /**
   * Analyze PC diagnostics and provide upgrade recommendations
   * @param {Object} systemSpecs - Current system specifications
   * @param {Object} userGoals - User's goals and requirements
   * @param {Array} availableComponents - Available upgrade components
   * @returns {Promise<Object>} Diagnostic analysis with upgrade suggestions
   */
  async analyzeDiagnostics(systemSpecs, userGoals, availableComponents = []) {
    try {
      const response = await aiAPI.post('/diagnostics/analyze', {
        systemSpecs,
        userGoals,
        availableComponents
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze diagnostics:', error);
      return {
        upgradeRecommendations: [],
        performanceAnalysis: {},
        bottleneckIdentification: [],
        costAnalysis: {},
        futureProofing: {},
        confidenceScore: 0,
        error: 'Diagnostic analysis unavailable'
      };
    }
  }

  // UTILITY SERVICES
  // ====================

  /**
   * Check AI service health status
   * @returns {Promise<Object>} Health status
   */
  async checkHealthStatus() {
    try {
      const response = await aiAPI.get('/health');
      return response.data;
    } catch (error) {
      console.error('Failed to check AI health:', error);
      return {
        status: 'unhealthy',
        message: 'AI service unavailable',
        config: {
          enabled: false,
          model: 'unknown',
          baseURL: 'unknown'
        }
      };
    }
  }

  /**
   * Generic AI request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} API response
   */
  async makeAIRequest(endpoint, data) {
    try {
      const response = await aiAPI.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`AI request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Batch AI requests with error handling
   * @param {Array} requests - Array of request objects {endpoint, data}
   * @returns {Promise<Array>} Array of responses
   */
  async batchAIRequests(requests) {
    const results = await Promise.allSettled(
      requests.map(({ endpoint, data }) => this.makeAIRequest(endpoint, data))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value };
      } else {
        console.error(`Batch request ${index} failed:`, result.reason);
        return { success: false, error: result.reason };
      }
    });
  }
}

// Export singleton instance
export default new AIService();