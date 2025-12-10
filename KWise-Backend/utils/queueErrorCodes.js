/**
 * ⚡ QUEUE MANAGEMENT ERROR CODES
 * Standardized error codes for queue operations
 * Used for user-friendly error messages and API responses
 * 
 * Author: GitHub Copilot (Claude Sonnet 4.5)
 * Date: 2025-11-14
 */

const QUEUE_ERROR_CODES = {
    // Status validation errors
    QUEUE_STATUS_INVALID: {
        code: 'QUEUE_STATUS_INVALID',
        httpStatus: 400,
        message: 'Invalid queue status provided',
        userMessage: 'The queue status you provided is not valid. Valid statuses are: processing, ready, completed, cancelled.',
        category: 'VALIDATION'
    },
    
    QUEUE_STATUS_CONSTRAINT: {
        code: 'QUEUE_STATUS_CONSTRAINT',
        httpStatus: 400,
        message: 'Queue status violates database constraint',
        userMessage: 'This queue status is not allowed. Please try again or contact support if the issue persists.',
        category: 'CONSTRAINT'
    },
    
    // Availability errors
    QUEUE_OUT_OF_RANGE: {
        code: 'QUEUE_OUT_OF_RANGE',
        httpStatus: 503,
        message: 'All queue numbers (1-99) have been assigned',
        userMessage: 'All queue numbers are currently in use. Please wait for the next daily reset or contact an administrator.',
        category: 'AVAILABILITY'
    },
    
    QUEUE_RESET_REQUIRED: {
        code: 'QUEUE_RESET_REQUIRED',
        httpStatus: 503,
        message: 'All queue numbers exhausted - manual reset required',
        userMessage: 'All 99 queue numbers have been used today. An administrator must manually reset the queue system.',
        category: 'AVAILABILITY'
    },
    
    // Not found errors
    QUEUE_NOT_FOUND: {
        code: 'QUEUE_NOT_FOUND',
        httpStatus: 404,
        message: 'Queue number not found',
        userMessage: 'The queue number you requested does not exist.',
        category: 'NOT_FOUND'
    },
    
    // Customer name validation
    QUEUE_CUSTOMER_NAME_REQUIRED: {
        code: 'QUEUE_CUSTOMER_NAME_REQUIRED',
        httpStatus: 400,
        message: 'Customer name must be updated before completing/cancelling',
        userMessage: 'Please update the customer name before completing or cancelling this order.',
        category: 'VALIDATION'
    },
    
    // Concurrency errors
    QUEUE_UPDATE_CONFLICT: {
        code: 'QUEUE_UPDATE_CONFLICT',
        httpStatus: 409,
        message: 'Queue was modified by another user',
        userMessage: 'This queue was just modified by another user. Please refresh and try again.',
        category: 'CONCURRENCY'
    },
    
    QUEUE_ALREADY_CANCELLED: {
        code: 'QUEUE_ALREADY_CANCELLED',
        httpStatus: 409,
        message: 'Queue has already been cancelled',
        userMessage: 'This queue has already been cancelled.',
        category: 'STATE'
    },
    
    QUEUE_ALREADY_COMPLETED: {
        code: 'QUEUE_ALREADY_COMPLETED',
        httpStatus: 409,
        message: 'Queue has already been completed',
        userMessage: 'This queue has already been completed.',
        category: 'STATE'
    },
    
    // Internal errors
    QUEUE_INTERNAL_ERROR: {
        code: 'QUEUE_INTERNAL_ERROR',
        httpStatus: 500,
        message: 'Internal server error during queue operation',
        userMessage: 'An unexpected error occurred. Please try again or contact support.',
        category: 'INTERNAL'
    },
    
    QUEUE_TRANSACTION_FAILED: {
        code: 'QUEUE_TRANSACTION_FAILED',
        httpStatus: 500,
        message: 'Database transaction failed',
        userMessage: 'The operation could not be completed due to a database error. Please try again.',
        category: 'INTERNAL'
    },
    
    // Cache errors (non-critical)
    QUEUE_CACHE_INVALIDATION_FAILED: {
        code: 'QUEUE_CACHE_INVALIDATION_FAILED',
        httpStatus: 200, // Non-critical, operation succeeded
        message: 'Cache invalidation failed but operation succeeded',
        userMessage: 'The operation completed successfully, but cached data may take a moment to refresh.',
        category: 'WARNING'
    }
};

/**
 * Create standardized error response
 * @param {string} errorCodeKey - Key from QUEUE_ERROR_CODES
 * @param {Object} additionalData - Additional context (optional)
 * @returns {Object} Formatted error response
 */
function createQueueError(errorCodeKey, additionalData = {}) {
    const errorDef = QUEUE_ERROR_CODES[errorCodeKey];
    
    if (!errorDef) {
        return QUEUE_ERROR_CODES.QUEUE_INTERNAL_ERROR;
    }
    
    return {
        success: false,
        code: errorDef.code,
        message: errorDef.userMessage,
        details: process.env.NODE_ENV === 'development' ? {
            internalMessage: errorDef.message,
            category: errorDef.category,
            ...additionalData
        } : undefined,
        timestamp: new Date().toISOString()
    };
}

/**
 * Map PostgreSQL error to queue error code
 * @param {Error} pgError - PostgreSQL error object
 * @returns {string} QUEUE_ERROR_CODES key
 */
function mapPgErrorToQueueError(pgError) {
    // Constraint violations
    if (pgError.code === '23514') { // check_violation
        if (pgError.constraint?.includes('status_check')) {
            return 'QUEUE_STATUS_CONSTRAINT';
        }
        return 'QUEUE_INTERNAL_ERROR';
    }
    
    // Foreign key violations
    if (pgError.code === '23503') { // foreign_key_violation
        return 'QUEUE_INTERNAL_ERROR';
    }
    
    // Unique violations
    if (pgError.code === '23505') { // unique_violation
        return 'QUEUE_UPDATE_CONFLICT';
    }
    
    // Deadlocks
    if (pgError.code === '40P01') { // deadlock_detected
        return 'QUEUE_UPDATE_CONFLICT';
    }
    
    // Serialization failures
    if (pgError.code === '40001') { // serialization_failure
        return 'QUEUE_UPDATE_CONFLICT';
    }
    
    // Default to internal error
    return 'QUEUE_INTERNAL_ERROR';
}

/**
 * Enhanced error response for API routes
 * @param {Error} error - Original error
 * @param {Object} context - Additional context
 * @returns {Object} API response object
 */
function formatQueueErrorResponse(error, context = {}) {
    let errorCodeKey;
    
    // Check if error already has a queue error code
    if (error.code && QUEUE_ERROR_CODES[error.code]) {
        errorCodeKey = error.code;
    } else if (error.code) {
        // Map PostgreSQL error
        errorCodeKey = mapPgErrorToQueueError(error);
    } else {
        // Default internal error
        errorCodeKey = 'QUEUE_INTERNAL_ERROR';
    }
    
    const errorResponse = createQueueError(errorCodeKey, {
        originalError: error.message,
        pgCode: error.code,
        constraint: error.constraint,
        detail: error.detail,
        ...context
    });
    
    return {
        httpStatus: QUEUE_ERROR_CODES[errorCodeKey].httpStatus,
        body: errorResponse
    };
}

module.exports = {
    QUEUE_ERROR_CODES,
    createQueueError,
    mapPgErrorToQueueError,
    formatQueueErrorResponse
};
