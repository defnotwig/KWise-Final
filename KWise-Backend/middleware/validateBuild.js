/**
 * Build Configuration Validation Middleware
 * 
 * Validates incoming requests against standardized schemas
 * Prevents 500 errors by catching invalid data before processing
 * 
 * Author: K-Wise Development Team
 * Version: 1.0.0
 */

const {
  validateBuildConfiguration,
  validateFilterRequest,
  validateUpgradeRequest,
  validateCompatibilityRequest,
  formatValidationError,
} = require('../schemas/buildSchemas');

const logger = require('../utils/logger');

/**
 * Middleware: Validate Build Configuration
 * For endpoints that accept buildConfiguration or components
 */
const validateBuild = (req, res, next) => {
  const { buildConfiguration, components } = req.body;
  const dataToValidate = buildConfiguration || components;

  if (!dataToValidate) {
    return res.status(400).json({
      success: false,
      error: 'Build configuration required',
      message: 'Request must include either "buildConfiguration" or "components" object',
      example: {
        buildConfiguration: {
          cpu: { name: 'Intel Core i5-12400F', category: 'CPU' },
          motherboard: { name: 'ASUS B660M', category: 'Motherboard' },
        },
      },
    });
  }

  const { error, value } = validateBuildConfiguration(dataToValidate);

  if (error) {
    const formattedError = formatValidationError(error);
    logger.warn('Build validation failed', {
      endpoint: req.path,
      errors: formattedError.errors,
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid build configuration',
      details: formattedError.errors,
      message: formattedError.summary,
    });
  }

  // Attach validated data to request
  req.validatedBuild = value;
  next();
};

/**
 * Middleware: Validate Filter Request
 * For /api/kiosk/filter endpoint
 */
const validateFilter = (req, res, next) => {
  const { error, value } = validateFilterRequest(req.body);

  if (error) {
    const formattedError = formatValidationError(error);
    logger.warn('Filter validation failed', {
      endpoint: req.path,
      errors: formattedError.errors,
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid filter request',
      details: formattedError.errors,
      message: formattedError.summary,
      example: {
        currentCategory: 'Motherboard',
        cart: [
          { id: 1, name: 'Intel Core i5-12400F', category: 'CPU' },
        ],
      },
    });
  }

  req.validatedFilter = value;
  next();
};

/**
 * Middleware: Validate Upgrade Request
 * For upgrade endpoints (future-upgrade-stock, ollama-external-upgrade)
 */
const validateUpgrade = (req, res, next) => {
  const { error, value } = validateUpgradeRequest(req.body);

  if (error) {
    const formattedError = formatValidationError(error);
    logger.warn('Upgrade validation failed', {
      endpoint: req.path,
      errors: formattedError.errors,
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid upgrade request',
      details: formattedError.errors,
      message: formattedError.summary,
      example: {
        buildConfiguration: {
          cpu: { name: 'Intel Core i5-12400F', category: 'CPU' },
          motherboard: { name: 'ASUS B660M', category: 'Motherboard' },
        },
        budget: 50000,
        targetCategory: 'GPU',
      },
    });
  }

  req.validatedUpgrade = value;
  next();
};

/**
 * Middleware: Validate Compatibility Request
 * For /api/compatibility/analyze and /api/compatibility/analyze-enhanced
 */
const validateCompatibility = (req, res, next) => {
  const { error, value } = validateCompatibilityRequest(req.body);

  if (error) {
    const formattedError = formatValidationError(error);
    logger.warn('Compatibility validation failed', {
      endpoint: req.path,
      errors: formattedError.errors,
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid compatibility request',
      details: formattedError.errors,
      message: formattedError.summary,
      example: {
        buildConfiguration: {
          cpu: {
            name: 'Intel Core i5-12400F',
            category: 'CPU',
            specifications: { socket: 'LGA1700', tdp: 65 },
          },
          motherboard: {
            name: 'ASUS B660M',
            category: 'Motherboard',
            specifications: { socket: 'LGA1700', chipset: 'B660' },
          },
        },
      },
    });
  }

  req.validatedCompatibility = value;
  next();
};

/**
 * Optional: Soft Validation (warns but doesn't block)
 * Useful for gradual migration to validation
 */
const softValidateBuild = (req, res, next) => {
  const { buildConfiguration, components } = req.body;
  const dataToValidate = buildConfiguration || components;

  if (dataToValidate) {
    const { error } = validateBuildConfiguration(dataToValidate);
    if (error) {
      const formattedError = formatValidationError(error);
      logger.warn('Build validation warning (soft mode)', {
        endpoint: req.path,
        errors: formattedError.errors,
      });
      // Don't block request, just log warning
    }
  }

  next();
};

module.exports = {
  validateBuild,
  validateFilter,
  validateUpgrade,
  validateCompatibility,
  softValidateBuild,
};
