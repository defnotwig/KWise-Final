/**
 * Frontend Logger Utility
 * Simple console wrapper for consistent logging across the app
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  info: (...args) => {
    if (isDevelopment) {
      console.log('ℹ️', ...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('⚠️', ...args);
    }
  },
  
  error: (...args) => {
    console.error('❌', ...args);
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug('🔍', ...args);
    }
  }
};

export default logger;
