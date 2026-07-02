// Load environment variables
require('dotenv').config();

// Validate required secrets at startup
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}

module.exports = {
  // Server configuration
  server: {
    port: Number.parseInt(process.env.PORT, 10) || 5000,
    env: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:5000/api',
    appName: process.env.APP_NAME || 'K-WISE'
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    cookieExpires: Number.parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 1,
    issuer: process.env.JWT_ISSUER || 'K-WISE',
    audience: process.env.JWT_AUDIENCE || 'k-wise-api',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Encryption configuration
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    enabled: process.env.ENCRYPTION_ENABLED !== 'false',
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc'
  },
  
  // Security configuration
  security: {
    bcryptSaltRounds: Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
    rateLimit: {
      window: Number.parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
      max: Number.parseInt(process.env.RATE_LIMIT_MAX, 10) || 100 // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-KWise-Idempotency-Key']
    },
    csrfProtection: process.env.CSRF_PROTECTION !== 'false', // Enabled by default
    helmet: {
      contentSecurityPolicy: process.env.NODE_ENV === 'production', // Enable in production
      xssFilter: true,
      noSniff: true,
      frameguard: true
    }
  },

  // Pagination defaults
  pagination: {
    defaultLimit: Number.parseInt(process.env.PAGINATION_DEFAULT_LIMIT, 10) || 10,
    maxLimit: Number.parseInt(process.env.PAGINATION_MAX_LIMIT, 10) || 100
  },
  
  // Email configuration
  email: {
    from: process.env.EMAIL_FROM || 'no-reply@kwise.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@kwise.com',
    smtp: {
      host: process.env.EMAIL_HOST,
      port: Number.parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    }
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/server.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: Number.parseInt(process.env.LOG_MAX_FILES, 10) || 5,
    console: process.env.LOG_TO_CONSOLE !== 'false' // Log to console by default
  },
  
  // File upload configuration
  uploads: {
    basePath: process.env.UPLOAD_PATH || 'uploads',
    maxSize: Number.parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',')
  }
};
