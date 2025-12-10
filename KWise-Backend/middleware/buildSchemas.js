/**
 * Build Configuration JSON Schemas
 * Validates build configurations across all compatibility endpoints
 * Ensures consistent data structure and prevents invalid requests
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const logger = require('../utils/logger');

const ajv = new Ajv({ allErrors: true, removeAdditional: true });
addFormats(ajv);

/**
 * Component Schema - Base schema for individual PC components
 */
const componentSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer', minimum: 1 },
        name: { type: 'string', minLength: 1, maxLength: 500 },
        category: { 
            type: 'string', 
            minLength: 1,
            maxLength: 100
            // ✅ FIX: Accept any category string to handle database variations
            // (e.g., 'CPU', 'Processor', 'Central Processing Unit', etc.)
        },
        brand: { 
            anyOf: [
                { type: 'string', maxLength: 200 },
                { type: 'null' }
            ]
        },
        price: { 
            anyOf: [
                { type: 'number', minimum: 0, maximum: 1000000 },
                { type: 'string' },  // PostgreSQL numeric returns as string
                { type: 'null' }
            ]
        },
        stock: { 
            anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'string' },  // May come as string from some queries
                { type: 'null' }
            ]
        },
        specifications: { 
            anyOf: [
                { type: 'object' },
                { type: 'string' },
                { type: 'null' }
            ]
        },
        image_url: { 
            anyOf: [
                { type: 'string' },
                { type: 'null' }
            ]
        },
        description: { 
            anyOf: [
                { type: 'string' },
                { type: 'null' }
            ]
        },
        performance_index: { 
            anyOf: [
                { type: 'number', minimum: 0, maximum: 100 },
                { type: 'null' }
            ]
        },
        quantity: { 
            anyOf: [
                { type: 'integer', minimum: 1, maximum: 100 },
                { type: 'null' }
            ]
        }
    },
    required: ['name'],
    additionalProperties: true  // Allow extra database fields like is_active, created_at, etc.
};

/**
 * Partial Component Schema - For upgrade/analysis scenarios where only id + specs are provided
 * Used in currentBuild where full component details (name, category, brand, price) are not needed
 */
const partialComponentSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer', minimum: 1 },
        name: { type: 'string' },
        category: { type: 'string' },
        brand: { type: 'string' },
        price: { 
            anyOf: [
                { type: 'number' },
                { type: 'string' },
                { type: 'null' }
            ]
        },
        specifications: { 
            anyOf: [
                { type: 'object' },
                { type: 'string' },
                { type: 'null' }
            ]
        }
    },
    required: ['id'],  // Only id is required for partial components
    additionalProperties: true
};

/**
 * PC-Parts Build Schema - For cart-based builds (Order Summary)
 */
const pcPartsBuildSchema = {
    type: 'object',
    properties: {
        components: {
            type: 'object',
            properties: {
                cpu: componentSchema,
                gpu: componentSchema,
                motherboard: componentSchema,
                ram: componentSchema,
                storage: componentSchema,
                psu: componentSchema,
                case: componentSchema,
                cooling: componentSchema
            },
            additionalProperties: componentSchema // ✅ FIX: Allow any additional component categories
        }
    },
    required: ['components']
};

/**
 * PC Customized Build Schema - For AI/Manual customization
 */
const customizedBuildSchema = {
    type: 'object',
    properties: {
        selectedParts: {
            type: 'object',
            patternProperties: {
                '^(cpu|gpu|motherboard|ram|storage|psu|case|cooling)$': {
                    anyOf: [
                        { type: 'integer', minimum: 1 },
                        { type: 'null' }
                    ]
                }
            },
            additionalProperties: false
        },
        targetCategory: { 
            type: 'string',
            minLength: 1,
            maxLength: 100
            // ✅ FIX: Accept any category string
        },
        budget: { type: 'number', minimum: 0, maximum: 10000000 },
        useCase: { 
            type: 'string', 
            enum: ['gaming', 'workstation', 'content-creation', 'budget', 'enthusiast', 'general']
        }
    }
};

/**
 * PC Upgrade Build Schema - For upgrade service
 */
const upgradeBuildSchema = {
    type: 'object',
    properties: {
        currentBuild: {
            type: 'object',
            patternProperties: {
                '^(cpu|gpu|motherboard|ram|storage|psu|case|cooling)$': {
                    anyOf: [
                        { type: 'integer', minimum: 1 },
                        { type: 'null' }
                    ]
                }
            },
            additionalProperties: false
        },
        upgradeCategory: { 
            type: 'string',
            minLength: 1,
            maxLength: 100
            // ✅ FIX: Accept any category string
        },
        budget: { type: 'number', minimum: 0, maximum: 10000000 },
        performanceTarget: { 
            type: 'string', 
            enum: ['budget', 'mid-tier', 'high-end', 'enthusiast', 'extreme']
        }
    }
};

/**
 * Filter Request Schema - For /api/kiosk/filter endpoint
 */
const filterRequestSchema = {
    type: 'object',
    properties: {
        currentCategory: { 
            type: 'string',
            minLength: 1,
            maxLength: 100
            // ✅ FIX: Accept any category string
        },
        cart: {
            type: 'array',
            items: componentSchema,
            maxItems: 50
        },
        currentProduct: componentSchema
    },
    required: ['currentCategory']
};

/**
 * Compatibility Analysis Request Schema - For /api/compatibility/analyze
 * FIX: Allow both integer IDs and full object specifications
 */
const compatibilityAnalysisSchema = {
    type: 'object',
    properties: {
        currentProduct: componentSchema,
        selectedParts: {
            anyOf: [
                // Support ARRAY format (from frontend kioskAPI.js)
                {
                    type: 'array',
                    items: componentSchema
                },
                // Support OBJECT format (legacy/backward compatibility)
                {
                    type: 'object',
                    patternProperties: {
                        '^[a-zA-Z_]+$': {
                            anyOf: [
                                { type: 'integer', minimum: 1 },
                                componentSchema,  // Allow full objects
                                { type: 'null' }
                            ]
                        }
                    }
                }
            ]
        },
        currentBuild: {
            type: 'object',
            patternProperties: {
                '^[a-zA-Z_]+$': {
                    anyOf: [
                        { type: 'integer', minimum: 1 },
                        partialComponentSchema,  // Allow partial objects (id + specs)
                        { type: 'null' }
                    ]
                }
            }
        },
        targetCategory: { type: 'string' },
        upgradeCategory: { type: 'string' },
        excludeCategories: {
            type: 'array',
            items: { type: 'string' }
        },
        skipCache: { type: 'boolean' }
    }
};

/**
 * Advanced Full Build Analysis Schema - For /api/compatibility/advanced/full-build
 * ✅ MULTI-SLOT FIX: RAM and Storage accept both single objects OR arrays for multi-component builds
 */
const fullBuildAnalysisSchema = {
    type: 'object',
    properties: {
        components: {
            type: 'object',
            properties: {
                cpu: componentSchema,
                gpu: componentSchema,
                motherboard: componentSchema,
                // ✅ RAM: Accept single object OR array (for 2-4 RAM kits)
                ram: {
                    anyOf: [
                        componentSchema,  // Single RAM kit
                        {
                            type: 'array',
                            items: componentSchema,
                            minItems: 1,
                            maxItems: 8  // Support up to 8 RAM sticks (4 dual-channel kits)
                        }
                    ]
                },
                // ✅ Storage: Accept single object OR array (for multiple drives)
                storage: {
                    anyOf: [
                        componentSchema,  // Single storage drive
                        {
                            type: 'array',
                            items: componentSchema,
                            minItems: 1,
                            maxItems: 10  // Support up to 10 storage drives
                        }
                    ]
                },
                psu: componentSchema,
                case: componentSchema,
                cooling: componentSchema
            },
            additionalProperties: componentSchema, // ✅ FIX: Allow any additional component categories
            minProperties: 1
        },
        pageName: {
            type: 'string'
        },
        comprehensive: {
            type: 'boolean'
        }
    },
    required: ['components'],
    additionalProperties: true // ✅ FIX: Allow pageName and comprehensive fields
};

// Compile schemas
const validators = {
    pcPartsBuild: ajv.compile(pcPartsBuildSchema),
    customizedBuild: ajv.compile(customizedBuildSchema),
    upgradeBuild: ajv.compile(upgradeBuildSchema),
    filterRequest: ajv.compile(filterRequestSchema),
    compatibilityAnalysis: ajv.compile(compatibilityAnalysisSchema),
    fullBuildAnalysis: ajv.compile(fullBuildAnalysisSchema)
};

/**
 * Format AJV errors into user-friendly messages
 */
function formatValidationErrors(errors) {
    if (!errors || errors.length === 0) {
        return 'Invalid request format';
    }

    const formattedErrors = errors.map(error => {
        const path = error.instancePath || error.dataPath || 'root';
        const message = error.message || 'validation failed';
        const params = error.params ? ` (${JSON.stringify(error.params)})` : '';
        
        return `${path}: ${message}${params}`;
    });

    return formattedErrors.join('; ');
}

/**
 * Middleware: Validate PC-Parts Build (Order Summary)
 */
const validatePCPartsBuild = (req, res, next) => {
    const valid = validators.pcPartsBuild(req.body);
    
    if (!valid) {
        logger.warn('PC-Parts build validation failed:', validators.pcPartsBuild.errors);
        return res.status(400).json({
            success: false,
            message: 'Invalid PC-Parts build configuration',
            errors: formatValidationErrors(validators.pcPartsBuild.errors),
            hint: 'Expected format: { components: { cpu: {...}, gpu: {...}, ... } }'
        });
    }
    
    next();
};

/**
 * Middleware: Validate Customized Build
 */
const validateCustomizedBuild = (req, res, next) => {
    const valid = validators.customizedBuild(req.body);
    
    if (!valid) {
        logger.warn('Customized build validation failed:', validators.customizedBuild.errors);
        return res.status(400).json({
            success: false,
            message: 'Invalid customized build configuration',
            errors: formatValidationErrors(validators.customizedBuild.errors),
            hint: 'Expected format: { selectedParts: { cpu: 123, gpu: 456 }, targetCategory: "RAM" }'
        });
    }
    
    next();
};

/**
 * Middleware: Validate Upgrade Build
 */
const validateUpgradeBuild = (req, res, next) => {
    const valid = validators.upgradeBuild(req.body);
    
    if (!valid) {
        logger.warn('Upgrade build validation failed:', validators.upgradeBuild.errors);
        return res.status(400).json({
            success: false,
            message: 'Invalid upgrade build configuration',
            errors: formatValidationErrors(validators.upgradeBuild.errors),
            hint: 'Expected format: { currentBuild: { cpu: 123 }, upgradeCategory: "GPU", budget: 50000 }'
        });
    }
    
    next();
};

/**
 * Middleware: Validate Filter Request
 */
const validateFilterRequest = (req, res, next) => {
    const valid = validators.filterRequest(req.body);
    
    if (!valid) {
        logger.warn('Filter request validation failed:', validators.filterRequest.errors);
        return res.status(400).json({
            success: false,
            message: 'Invalid filter request',
            errors: formatValidationErrors(validators.filterRequest.errors),
            hint: 'Expected format: { currentCategory: "CPU", cart: [{...}] }'
        });
    }
    
    next();
};

/**
 * Middleware: Validate Compatibility Analysis Request
 */
const validateCompatibilityAnalysis = (req, res, next) => {
    const valid = validators.compatibilityAnalysis(req.body);
    
    if (!valid) {
        logger.error('❌ Compatibility analysis validation failed:');
        logger.error('Request body:', JSON.stringify(req.body, null, 2));
        logger.error('Validation errors:', JSON.stringify(validators.compatibilityAnalysis.errors, null, 2));
        
        return res.status(400).json({
            success: false,
            message: 'Invalid compatibility analysis request',
            errors: formatValidationErrors(validators.compatibilityAnalysis.errors),
            validationDetails: validators.compatibilityAnalysis.errors,
            hint: 'Expected: { currentProduct: {...} } OR { selectedParts: {...} } OR { currentBuild: {...} }'
        });
    }
    
    next();
};

/**
 * Middleware: Validate Full Build Analysis
 */
const validateFullBuildAnalysis = (req, res, next) => {
    const valid = validators.fullBuildAnalysis(req.body);
    
    if (!valid) {
        logger.error('❌ Full build analysis validation failed');
        logger.error('📦 Request body:', JSON.stringify(req.body, null, 2));
        logger.error('🔍 Validation errors:', JSON.stringify(validators.fullBuildAnalysis.errors, null, 2));
        
        // ✅ ENHANCED: Detailed debugging for empty components object
        if (req.body.components) {
            const componentKeys = Object.keys(req.body.components);
            logger.error(`🔍 Components object has ${componentKeys.length} keys: ${componentKeys.join(', ')}`);
            
            if (componentKeys.length === 0) {
                logger.error('⚠️ CRITICAL: Frontend sent EMPTY components object!');
                logger.error('💡 This usually means cart items are missing category/ID fields on frontend');
                logger.error('💡 Or frontend category normalization failed to match any items');
            }
            
            // Log each component's category for debugging
            componentKeys.forEach(key => {
                const comp = req.body.components[key];
                logger.error(`   ${key}: category="${comp?.category}" (type: ${typeof comp?.category}), id=${comp?.id}`);
            });
        } else {
            logger.error('❌ CRITICAL: Request body missing "components" field entirely!');
        }
        
        logger.warn('Full build analysis validation failed:', validators.fullBuildAnalysis.errors);
        return res.status(400).json({
            success: false,
            message: 'Invalid full build analysis request',
            errors: formatValidationErrors(validators.fullBuildAnalysis.errors),
            validationDetails: validators.fullBuildAnalysis.errors,
            hint: req.body.components && Object.keys(req.body.components).length === 0
                ? 'Components object is empty. Ensure cart items have valid category and ID fields on frontend.'
                : 'Expected format: { components: { cpu: {...}, motherboard: {...}, ... } }',
            debug: {
                receivedKeys: req.body.components ? Object.keys(req.body.components) : [],
                componentCount: req.body.components ? Object.keys(req.body.components).length : 0,
                hasComponents: !!req.body.components
            }
        });
    }
    
    next();
};

module.exports = {
    // Validators
    validators,
    
    // Middleware functions
    validatePCPartsBuild,
    validateCustomizedBuild,
    validateUpgradeBuild,
    validateFilterRequest,
    validateCompatibilityAnalysis,
    validateFullBuildAnalysis,
    
    // Utility
    formatValidationErrors
};
