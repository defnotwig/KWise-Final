/**
 * Build Configuration Validation Schemas
 * 
 * Standardizes build configuration format across all compatibility endpoints.
 * Prevents 500 errors by validating input before processing.
 * 
 * Author: K-Wise Development Team
 * Version: 1.0.0
 */

const Joi = require('joi');

/**
 * Component Specifications Schema
 * Flexible schema that accepts all possible component specifications
 */
const specificationsSchema = Joi.object({
  // CPU & Motherboard
  socket: Joi.string().optional(),
  chipset: Joi.string().optional(),
  
  // Power & Thermal
  tdp: Joi.number().min(0).optional(),
  wattage: Joi.number().min(0).optional(),
  max_tdp: Joi.number().min(0).optional(),
  
  // Physical Dimensions
  length: Joi.number().min(0).optional(),
  height: Joi.number().min(0).optional(),
  width: Joi.number().min(0).optional(),
  max_gpu_length: Joi.number().min(0).optional(),
  max_cpu_cooler_height: Joi.number().min(0).optional(),
  max_psu_length: Joi.number().min(0).optional(),
  
  // Memory
  type: Joi.string().optional(), // DDR4, DDR5, etc.
  speed: Joi.number().min(0).optional(),
  capacity: Joi.number().min(0).optional(),
  cas_latency: Joi.string().optional(),
  
  // Storage
  interface: Joi.string().optional(), // SATA, NVMe, etc.
  form_factor: Joi.string().optional(),
  
  // PSU
  efficiency: Joi.string().optional(), // 80+ Bronze, Gold, etc.
  modular: Joi.boolean().optional(),
  
  // GPU
  boost_clock: Joi.number().optional(),
  memory_size: Joi.number().optional(),
  
  // Cooling
  fan_size: Joi.number().optional(),
  rpm: Joi.number().optional(),
  
  // Performance
  performance_tier: Joi.string().optional(),
  
  // Compatibility flags
  rgb: Joi.boolean().optional(),
  wifi: Joi.boolean().optional(),
  bluetooth: Joi.boolean().optional(),
  
  // Allow any additional specifications
}).unknown(true);

/**
 * Single Component Schema
 * Each component must have name, category, and optional specifications
 */
const componentSchema = Joi.object({
  id: Joi.number().integer().optional(),
  name: Joi.string().min(1).max(255).required(),
  category: Joi.string().min(1).max(100).required(), // ✅ FIX: Accept any category string
  brand: Joi.string().max(100).optional(),
  price: Joi.number().min(0).optional(),
  image: Joi.string().optional(),
  image_path: Joi.string().optional(),
  specifications: specificationsSchema.optional(),
  stock_quantity: Joi.number().integer().min(0).optional(),
  is_featured: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
}).unknown(true); // Allow additional fields for flexibility

/**
 * Build Configuration Schema
 * Accepts various component configurations
 * At least one component is required
 */
const buildConfigurationSchema = Joi.object({
  cpu: componentSchema.optional(),
  motherboard: componentSchema.optional(),
  gpu: componentSchema.optional(),
  ram: componentSchema.optional(),
  storage: componentSchema.optional(),
  psu: componentSchema.optional(),
  case: componentSchema.optional(),
  cooler: componentSchema.optional(),
  cooling: componentSchema.optional(), // Alternative naming
  monitor: componentSchema.optional(),
  keyboard: componentSchema.optional(),
  mouse: componentSchema.optional(),
  headphones: componentSchema.optional(),
  speakers: componentSchema.optional(),
  webcam: componentSchema.optional(),
}).min(1).messages({
  'object.min': 'At least one component is required in the build configuration'
});

/**
 * Cart Item Schema (for filter endpoint)
 * Simplified version for shopping cart items
 */
const cartItemSchema = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().required(),
  category: Joi.string().required(),
  price: Joi.number().min(0).optional(),
  specifications: specificationsSchema.optional(),
}).unknown(true);

/**
 * Filter Request Schema
 * For /api/kiosk/filter endpoint
 */
const filterRequestSchema = Joi.object({
  currentCategory: Joi.string().required().messages({
    'any.required': 'currentCategory is required (e.g., "Motherboard", "GPU")'
  }),
  cart: Joi.array().items(cartItemSchema).default([]),
  currentProduct: componentSchema.optional(),
});

/**
 * Upgrade Request Schema
 * For /api/kiosk/future-upgrade-stock and /api/kiosk/ollama-external-upgrade
 * Supports both old format (currentItem, currentPrice, category) and new format (buildConfiguration)
 */
const upgradeRequestSchema = Joi.object({
  // New format
  buildConfiguration: buildConfigurationSchema.optional(),
  components: buildConfigurationSchema.optional(), // Alternative naming
  budget: Joi.number().min(0).optional(),
  targetCategory: Joi.string().optional(),
  upgradeGoal: Joi.string().optional(),
  currentPart: componentSchema.optional(),
  
  // Old format (backward compatibility)
  currentItem: Joi.object().optional(),
  currentPrice: Joi.number().min(0).optional(),
  category: Joi.string().optional(),
  minUpgradeThreshold: Joi.number().min(1).optional(),
  analysisType: Joi.string().optional(),
  marketRegion: Joi.string().optional(),
  performanceTarget: Joi.string().optional(),
}).or('buildConfiguration', 'components', 'currentItem').messages({
  'object.missing': 'Either buildConfiguration, components, or currentItem is required'
});

/**
 * Compatibility Analysis Request Schema
 * For /api/compatibility/analyze and /api/compatibility/analyze-enhanced
 */
const compatibilityRequestSchema = Joi.object({
  buildConfiguration: buildConfigurationSchema.optional(),
  components: buildConfigurationSchema.optional(), // Alternative naming
  options: Joi.object({
    checkThermal: Joi.boolean().optional(),
    checkPower: Joi.boolean().optional(),
    checkPhysical: Joi.boolean().optional(),
    checkPerformance: Joi.boolean().optional(),
    detailLevel: Joi.string().valid('basic', 'detailed', 'comprehensive').optional(),
  }).optional(),
}).or('buildConfiguration', 'components').messages({
  'object.missing': 'Either buildConfiguration or components is required'
});

/**
 * Validation Helper Functions
 */

/**
 * Validate build configuration
 * @param {Object} data - Data to validate
 * @returns {Object} { error, value }
 */
function validateBuildConfiguration(data) {
  return buildConfigurationSchema.validate(data, {
    abortEarly: false, // Return all errors, not just first
    stripUnknown: false, // Keep unknown properties (flexible)
  });
}

/**
 * Validate filter request
 * @param {Object} data - Data to validate
 * @returns {Object} { error, value }
 */
function validateFilterRequest(data) {
  return filterRequestSchema.validate(data, {
    abortEarly: false,
  });
}

/**
 * Validate upgrade request
 * @param {Object} data - Data to validate
 * @returns {Object} { error, value }
 */
function validateUpgradeRequest(data) {
  return upgradeRequestSchema.validate(data, {
    abortEarly: false,
  });
}

/**
 * Validate compatibility request
 * @param {Object} data - Data to validate
 * @returns {Object} { error, value }
 */
function validateCompatibilityRequest(data) {
  return compatibilityRequestSchema.validate(data, {
    abortEarly: false,
  });
}

/**
 * Format Joi validation errors into user-friendly format
 * @param {Object} error - Joi validation error
 * @returns {Object} Formatted error response
 */
function formatValidationError(error) {
  if (!error) return null;

  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type,
  }));

  return {
    message: 'Validation failed',
    errors,
    summary: errors.map(e => `${e.field}: ${e.message}`).join('; '),
  };
}

module.exports = {
  // Schemas
  componentSchema,
  specificationsSchema,
  buildConfigurationSchema,
  cartItemSchema,
  filterRequestSchema,
  upgradeRequestSchema,
  compatibilityRequestSchema,

  // Validation functions
  validateBuildConfiguration,
  validateFilterRequest,
  validateUpgradeRequest,
  validateCompatibilityRequest,
  formatValidationError,
};
