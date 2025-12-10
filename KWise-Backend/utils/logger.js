const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Create logs directory if it doesn't exist
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    defaultMeta: { service: 'pc-wise-admin' },
    transports: [
    // Write logs to file
    new winston.transports.File({ 
        filename: config.logging.file,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
    // Write error logs to separate file
    new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    })
],
exceptionHandlers: [
    new winston.transports.File({ 
        filename: path.join(logDir, 'exceptions.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    })
],
rejectionHandlers: [
    new winston.transports.File({ 
        filename: path.join(logDir, 'rejections.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    })
]
});

// Add console transport in development environment
if (config.server.env !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(info => {
                const { timestamp, level, message, service, ...args } = info;
                const ts = timestamp.slice(0, 19).replace('T', ' ');
                
                // Clean formatting that avoids object serialization issues
                let formattedMessage = message;
                
                // If there are additional arguments, handle them properly
                if (Object.keys(args).length > 0) {
                    // Only show service if it's not the default
                    if (service && service !== 'pc-wise-admin') {
                        formattedMessage += ` [${service}]`;
                    }
                }
                
                return `${ts} [${level}]: ${formattedMessage}`;
            })
        )
    }));
}

module.exports = logger;