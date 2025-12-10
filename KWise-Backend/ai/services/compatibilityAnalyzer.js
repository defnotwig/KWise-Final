/**
 * Compatibility Analyzer Service
 * Handles PC component compatibility analysis and alternative suggestions
 * Specialized for K-Wise product compatibility logic
 */

const ollamaService = require('./ollamaService');
const aiConfig = require('../config/aiConfig');
const logger = require('../../utils/logger');
const PromptTemplates = require('../prompts/specializedPrompts');
const JSONExtractor = require('../utils/jsonExtractor');

class CompatibilityAnalyzer {
  constructor() {
    this.systemPrompt = `You are an expert PC hardware compatibility analyzer for K-Wise, a computer store in the Philippines. 

Your expertise includes:
- CPU socket compatibility (Intel LGA, AMD AM4/AM5)
- RAM compatibility (DDR4/DDR5, speed, capacity)
- Motherboard chipset features and limitations
- Power supply requirements and efficiency
- GPU clearance and power requirements
- Storage interface compatibility (SATA, NVMe, M.2)
- Case form factor and component sizing
- Cooling requirements and thermal considerations

Always provide responses in valid JSON format only. Consider Philippine market preferences and pricing.`;
  }

  /**
   * Analyze compatibility between target component and existing build
   * @param {Object} targetComponent - Component to analyze
   * @param {Array} existingComponents - Current build components
   * @returns {Promise<Object>} Compatibility analysis
   */
  async analyzeCompatibility(targetComponent, existingComponents = []) {
    if (!aiConfig.service.enabled) {
      return this.getFallbackCompatibilityResponse();
    }

    try {
      // Transform components to the format expected by specialized prompt
      const buildContext = this.transformToPromptContext(targetComponent, existingComponents);
      
      // Get specialized compatibility analysis prompt
      const promptTemplate = PromptTemplates.deepCompatibilityAnalysis(buildContext);
      
      // Generate response using specialized prompt
      const response = await ollamaService.generateResponse(
        promptTemplate.instruction,
        promptTemplate.systemPrompt,
        promptTemplate.parameters
      );

      return this.parseCompatibilityResponse(response);
    } catch (error) {
      logger.warn('Compatibility analysis failed, using fallback', {
        error: error.message,
        targetComponent: targetComponent.name
      });
      return this.getFallbackCompatibilityResponse();
    }
  }

  /**
   * Transform components to specialized prompt context format
   * @param {Object} targetComponent - Component to analyze
   * @param {Array} existingComponents - Existing build components
   * @returns {Object} Context for specialized prompt
   */
  transformToPromptContext(targetComponent, existingComponents) {
    const context = {};
    
    // Add target component
    const category = targetComponent.category?.toLowerCase();
    if (category) {
      context[category] = this.extractComponentSpecs(targetComponent);
    }
    
    // Add existing components
    existingComponents.forEach(comp => {
      const cat = comp.category?.toLowerCase();
      if (cat) {
        context[cat] = this.extractComponentSpecs(comp);
      }
    });
    
    return context;
  }

  /**
   * Extract relevant specifications from component
   * @param {Object} component - Component object
   * @returns {Object} Extracted specs
   */
  extractComponentSpecs(component) {
    const specs = {
      name: component.name,
      brand: component.brand || 'Unknown',
      price: component.price || 0,
      ...component.specifications
    };
    
    // Add common fields
    if (component.socket) specs.socket = component.socket;
    if (component.memory_type) specs.memory_type = component.memory_type;
    if (component.form_factor) specs.form_factor = component.form_factor;
    if (component.tdp) specs.tdp = component.tdp;
    if (component.wattage) specs.wattage = component.wattage;
    
    return specs;
  }

  /**
   * Find alternative compatible components
   * @param {Object} component - Current component
   * @param {Object} constraints - Budget and preference constraints
   * @param {Array} availableComponents - Available components from database
   * @returns {Promise<Object>} Alternative suggestions
   */
  async findAlternatives(component, constraints = {}, availableComponents = []) {
    if (!aiConfig.service.enabled || availableComponents.length === 0) {
      return this.getFallbackAlternativesResponse();
    }

    try {
      // Get specialized alternative components prompt
      const promptTemplate = PromptTemplates.alternativeComponents({
        currentComponent: this.extractComponentSpecs(component),
        alternatives: availableComponents.slice(0, 10).map(alt => this.extractComponentSpecs(alt)),
        budget: {
          min: constraints.minPrice || 0,
          max: constraints.maxPrice || 999999,
          target: component.price || 0
        },
        requirements: {
          useCase: constraints.useCase || 'General purpose',
          preferredBrands: constraints.preferredBrands || [],
          mustHaveFeatures: constraints.mustHaveFeatures || []
        }
      });

      // Generate response using specialized prompt
      const response = await ollamaService.generateResponse(
        promptTemplate.instruction,
        promptTemplate.systemPrompt,
        promptTemplate.parameters
      );

      return this.parseAlternativesResponse(response);
    } catch (error) {
      logger.warn('Alternatives analysis failed, using fallback', {
        error: error.message,
        component: component.name
      });
      return this.getFallbackAlternativesResponse();
    }
  }

  /**
   * Get compatible components for product page "Compatible With" section
   * @param {Object} product - Current product
   * @param {Array} allComponents - All available components
   * @param {number} limit - Number of suggestions
   * @returns {Promise<Object>} Compatible components
   */
  async getCompatibleComponents(product, allComponents = [], limit = 6) {
    if (!aiConfig.service.enabled || allComponents.length === 0) {
      return this.getFallbackCompatibleComponents(allComponents, limit);
    }

    // Filter components by category (exclude same category)
    const otherComponents = allComponents.filter(comp => 
      comp.category !== product.category && comp.stock > 0
    );

    const prompt = `
Find components compatible with this product:

MAIN PRODUCT:
Name: ${product.name}
Category: ${product.category}
Brand: ${product.brand}
Price: ${product.price}
Specifications: ${JSON.stringify(product.specifications || {}, null, 2)}

AVAILABLE COMPONENTS (sample):
${otherComponents.slice(0, 20).map((comp, index) => `
${index + 1}. ${comp.name} (${comp.category})
   Brand: ${comp.brand}
   Price: ${comp.price}
   Stock: ${comp.stock}
`).join('')}

Select ${limit} most compatible components considering:
1. Technical compatibility (sockets, interfaces, power)
2. Performance balance (no major bottlenecks)
3. Popular combinations in Philippine market
4. Price tier compatibility

Provide response in EXACT JSON format:
{
  "compatibleComponents": [
    {
      "componentId": "string",
      "name": "string",
      "category": "string",
      "brand": "string",
      "price": "formatted price",
      "imageUrl": "string",
      "compatibilityReason": "why it's compatible",
      "popularityScore": number (0-100),
      "recommendationLevel": "high|medium|low"
    }
  ],
  "totalCompatible": number,
  "categories": ["category1", "category2"]
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.compatibility
      );

      return this.parseCompatibleComponentsResponse(response);
    } catch (error) {
      logger.warn('Compatible components analysis failed, using fallback', {
        error: error.message,
        product: product.name
      });
      return this.getFallbackCompatibleComponents(otherComponents, limit);
    }
  }

  /**
   * Parse compatibility analysis response
   * @param {string} response - AI response
   * @returns {Object} Parsed compatibility data
   */
  parseCompatibilityResponse(response) {
    try {
      // Use robust JSON extractor to handle DeepSeek R1 thinking tags
      const parsed = JSONExtractor.extractJSON(response);
      
      if (!parsed) {
        logger.warn('Failed to extract JSON from compatibility response', { 
          responsePreview: response?.substring(0, 200) 
        });
        return this.getFallbackCompatibilityResponse();
      }

      return {
        compatible: Boolean(parsed.compatible),
        compatibilityScore: Math.max(0, Math.min(100, parsed.compatibilityScore || 75)),
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        powerRequirement: parsed.powerRequirement || { estimated: 0, recommended: 0, sufficient: true },
        bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks : []
      };
    } catch (error) {
      logger.warn('Failed to parse compatibility response', { error: error.message });
      return this.getFallbackCompatibilityResponse();
    }
  }

  /**
   * Parse alternatives response
   * @param {string} response - AI response
   * @returns {Object} Parsed alternatives data
   */
  parseAlternativesResponse(response) {
    try {
      // Use robust JSON extractor
      const parsed = JSONExtractor.extractJSON(response);
      
      if (!parsed) {
        logger.warn('Failed to extract JSON from alternatives response', { 
          responsePreview: response?.substring(0, 200) 
        });
        return this.getFallbackAlternativesResponse();
      }

      return {
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
        summary: parsed.summary || {
          bestBudget: null,
          bestPerformance: null,
          bestValue: null,
          totalOptions: 0
        }
      };
    } catch (error) {
      logger.warn('Failed to parse alternatives response', { error: error.message });
      return this.getFallbackAlternativesResponse();
    }
  }

  /**
   * Parse compatible components response
   * @param {string} response - AI response
   * @returns {Object} Parsed compatible components data
   */
  parseCompatibleComponentsResponse(response) {
    try {
      // Use robust JSON extractor
      const parsed = JSONExtractor.extractJSON(response);
      
      if (!parsed) {
        logger.warn('Failed to extract JSON from compatible components response', { 
          responsePreview: response?.substring(0, 200) 
        });
        return this.getFallbackCompatibleComponents([], 6);
      }

      return {
        compatibleComponents: Array.isArray(parsed.compatibleComponents) ? parsed.compatibleComponents : [],
        totalCompatible: parsed.totalCompatible || 0,
        categories: Array.isArray(parsed.categories) ? parsed.categories : []
      };
    } catch (error) {
      logger.warn('Failed to parse compatible components response', { error: error.message });
      return this.getFallbackCompatibleComponents([], 6);
    }
  }

  /**
   * Fallback compatibility response
   * @returns {Object} Default compatibility response
   */
  getFallbackCompatibilityResponse() {
    return {
      compatible: true,
      compatibilityScore: 85,
      issues: [],
      recommendations: [{
        type: 'info',
        description: 'AI compatibility analysis temporarily unavailable. Manual verification recommended.',
        component: 'System',
        reason: 'Service unavailable'
      }],
      powerRequirement: { estimated: 0, recommended: 0, sufficient: true },
      bottlenecks: []
    };
  }

  /**
   * Fallback alternatives response
   * @returns {Object} Default alternatives response
   */
  getFallbackAlternativesResponse() {
    return {
      alternatives: [],
      summary: {
        bestBudget: null,
        bestPerformance: null,
        bestValue: null,
        totalOptions: 0
      }
    };
  }

  /**
   * Fallback compatible components
   * @param {Array} components - Available components
   * @param {number} limit - Number to return
   * @returns {Object} Fallback compatible components
   */
  getFallbackCompatibleComponents(components, limit) {
    // Simple random selection as fallback
    const shuffled = components.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit).map(comp => ({
      componentId: comp.id || comp.component_id,
      name: comp.name,
      category: comp.category,
      brand: comp.brand,
      price: comp.price,
      imageUrl: comp.imageUrl || comp.image_url,
      compatibilityReason: 'Compatible based on category matching',
      popularityScore: 75,
      recommendationLevel: 'medium'
    }));

    return {
      compatibleComponents: selected,
      totalCompatible: selected.length,
      categories: [...new Set(selected.map(c => c.category))]
    };
  }
}

module.exports = new CompatibilityAnalyzer();