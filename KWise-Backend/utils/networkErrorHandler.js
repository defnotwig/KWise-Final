/**
 * 🌐 Network Error Handler
 * Centralized handling for network connection errors across all services
 * 
 * Created: Phase 3.1 - Error Fixes
 * Purpose: DRY principle for ECONNREFUSED, ETIMEDOUT, ECONNABORTED errors
 */

const logger = require('./logger');

class NetworkErrorHandler {
  /**
   * Check if error is a network connection error
   * @param {Error} error - The error object to check
   * @returns {boolean} True if network error
   */
  static isNetworkError(error) {
    return error && (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ENETUNREACH'
    );
  }

  /**
   * Check if error is specifically connection refused
   * @param {Error} error - The error object to check
   * @returns {boolean} True if ECONNREFUSED
   */
  static isConnectionRefused(error) {
    return error && error.code === 'ECONNREFUSED';
  }

  /**
   * Check if error is a timeout
   * @param {Error} error - The error object to check
   * @returns {boolean} True if timeout error
   */
  static isTimeout(error) {
    return error && (
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNABORTED'
    );
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The error object
   * @param {string} serviceName - Name of the service (e.g., 'Ollama', 'Database')
   * @returns {string} User-friendly message
   */
  static getErrorMessage(error, serviceName = 'Service') {
    if (!error) return `${serviceName} error occurred`;

    if (error.code === 'ECONNREFUSED') {
      return `${serviceName} is not running or not accessible`;
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return `${serviceName} request timed out`;
    }
    
    if (error.code === 'ENOTFOUND') {
      return `${serviceName} host not found`;
    }
    
    if (error.code === 'ENETUNREACH') {
      return `${serviceName} network unreachable`;
    }

    return error.message || `${serviceName} error occurred`;
  }

  /**
   * Log network error with context
   * @param {Error} error - The error object
   * @param {string} serviceName - Name of the service
   * @param {Object} context - Additional context
   */
  static logNetworkError(error, serviceName = 'Service', context = {}) {
    if (!error) return;

    const errorInfo = {
      service: serviceName,
      errorCode: error.code,
      errorMessage: error.message,
      ...context
    };

    if (this.isConnectionRefused(error)) {
      logger.warn(`${serviceName} connection refused`, errorInfo);
    } else if (this.isTimeout(error)) {
      logger.warn(`${serviceName} request timeout`, errorInfo);
    } else if (this.isNetworkError(error)) {
      logger.warn(`${serviceName} network error`, errorInfo);
    } else {
      logger.error(`${serviceName} unexpected error`, errorInfo);
    }
  }

  /**
   * Create standardized error response
   * @param {Error} error - The error object
   * @param {string} serviceName - Name of the service
   * @returns {Object} Standardized error response
   */
  static createErrorResponse(error, serviceName = 'Service') {
    return {
      success: false,
      error: this.getErrorMessage(error, serviceName),
      code: error.code || 'UNKNOWN_ERROR',
      service: serviceName,
      timestamp: new Date().toISOString(),
      isNetworkError: this.isNetworkError(error)
    };
  }

  /**
   * Handle network error with fallback
   * @param {Error} error - The error object
   * @param {string} serviceName - Name of the service
   * @param {Function} fallbackFn - Fallback function to call
   * @returns {*} Result from fallback function
   */
  static async handleWithFallback(error, serviceName, fallbackFn) {
    this.logNetworkError(error, serviceName);
    
    if (typeof fallbackFn === 'function') {
      try {
        return await fallbackFn(error);
      } catch (fallbackError) {
        logger.error(`${serviceName} fallback failed`, {
          originalError: error.message,
          fallbackError: fallbackError.message
        });
        throw fallbackError;
      }
    }

    return this.createErrorResponse(error, serviceName);
  }
}

module.exports = NetworkErrorHandler;
