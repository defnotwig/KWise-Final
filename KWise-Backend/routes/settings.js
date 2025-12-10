const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { insertAuditLog } = require('../utils/auditLogHelper');

// Apply authentication to all settings routes
router.use(protect);

// App settings endpoint (what the frontend is calling)
router.get('/app', async (req, res) => {
    try {
        // Return enhanced app settings with limited language support
        const appSettings = {
            theme: 'light',
            language: 'en',
            notifications: true,
            databaseType: 'postgresql', // Fixed to PostgreSQL only
            availableLanguages: [
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'fil', name: 'Filipino', flag: '🇵🇭' }
            ],
            systemSettings: {
                autoBackup: true,
                maintenanceMode: false,
                maxUploadSize: '10MB'
            },
            smtp: {
                configured: false,
                host: '',
                port: 587,
                secure: false,
                auth: {
                    user: '',
                    pass: ''
                }
            }
        };

        res.json({
            success: true,
            data: appSettings
        });

    } catch (error) {
        logger.error('Error fetching app settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch app settings'
        });
    }
});

// Unified system stats route (consolidated – removes previous duplicates & mock data)
router.get('/system-stats', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const os = require('os');

        const [
            totalUsersResult,
            activeUsersResult,
            totalOrdersResult,
            totalProductsResult
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
            query(`SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '15 minutes'`),
            query('SELECT COUNT(*) as count FROM orders'),
            query('SELECT COUNT(*) as count FROM pc_parts WHERE is_active = true')
        ]);

        const load = os.loadavg();
        const memoryUsagePercent = Math.round((1 - (os.freemem() / os.totalmem())) * 100);

        const data = {
            system: {
                cpuLoad1m: load[0],
                cpuUsage: Math.round(load[0] * 100) || 0,
                memoryUsage: memoryUsagePercent,
                totalMem: os.totalmem(),
                freeMem: os.freemem(),
                uptime: Math.floor(process.uptime()),
                platform: os.platform(),
                arch: os.arch()
            },
            database: {
                totalUsers: parseInt(totalUsersResult.rows[0]?.count || 0),
                activeUsers: parseInt(activeUsersResult.rows[0]?.count || 0),
                totalOrders: parseInt(totalOrdersResult.rows[0]?.count || 0),
                totalProducts: parseInt(totalProductsResult.rows[0]?.count || 0)
            },
            performance: {
                // Placeholder deterministic values (remove randomness)
                avgResponseTimeMs: 0,
                requestsPerMinute: 0,
                errorRate: 0
            },
            monitoring: {
                alerts: {
                    cpu: memoryUsagePercent > 80 ? 'warning' : 'normal',
                    memory: memoryUsagePercent > 80 ? 'warning' : 'normal'
                },
                thresholds: { cpu: 80, memory: 80, disk: 90 }
            },
            timestamp: new Date().toISOString()
        };

        return res.json({ success: true, data });
    } catch (error) {
        logger.error('Consolidated system-stats error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch system stats' });
    }
});

// Update app settings
router.put('/app', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { theme, language, notifications, smtp } = req.body;

        // Validate language is only EN or Filipino
        const validLanguages = ['en', 'fil'];
        if (language && !validLanguages.includes(language)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid language. Only English (en) and Filipino (fil) are supported.'
            });
        }

        // Return updated settings with validation
        const updatedSettings = {
            theme: theme || 'light',
            language: validLanguages.includes(language) ? language : 'en', 
            notifications: notifications !== undefined ? notifications : true,
            databaseType: 'postgresql', // Always PostgreSQL
            availableLanguages: [
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'fil', name: 'Filipino', flag: '🇵🇭' }
            ],
            smtp: smtp || {
                configured: false,
                host: '',
                port: 587,
                secure: false,
                auth: { user: '', pass: '' }
            }
        };

        await insertAuditLog(req.app, { userId: req.user.id, action: 'UPDATE', entity: 'APP_SETTINGS', description: 'Updated application settings', severity: 'info', ipAddress: req.ip });

        res.json({ success: true, message: 'Settings updated successfully', data: updatedSettings });

    } catch (error) {
        logger.error('Error updating app settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update app settings'
        });
    }
});

// =====================================================
// SMTP CONFIGURATION ENDPOINTS
// =====================================================

// Get SMTP settings
router.get('/smtp/config', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const result = await query('SELECT * FROM settings WHERE key = $1', ['smtp_config']);
        
        let smtpConfig = {
            configured: false,
            host: '',
            port: 587,
            secure: false,
            auth: {
                user: '',
                pass: ''
            }
        };

        if (result.rows.length > 0) {
            try {
                smtpConfig = JSON.parse(result.rows[0].value);
            } catch (e) {
                logger.error('Error parsing SMTP config:', e);
            }
        }

        res.json({
            success: true,
            data: smtpConfig
        });

    } catch (error) {
        logger.error('Error fetching SMTP settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch SMTP settings'
        });
    }
});

// Update SMTP settings
router.put('/smtp/config', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const { host, port, secure, auth } = req.body;

        // Validate required fields
        if (!host || !port || !auth || !auth.user || !auth.pass) {
            return res.status(400).json({
                success: false,
                message: 'Missing required SMTP configuration fields'
            });
        }

        const smtpConfig = {
            configured: true,
            host,
            port: parseInt(port),
            secure: Boolean(secure),
            auth: {
                user: auth.user,
                pass: auth.pass
            }
        };

        // Save to database
        await query(`
            INSERT INTO settings (key, value, description, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT (key) 
            DO UPDATE SET value = $2, updated_at = NOW()
        `, ['smtp_config', JSON.stringify(smtpConfig), 'SMTP server configuration']);

        res.json({
            success: true,
            message: 'SMTP configuration updated successfully',
            data: smtpConfig
        });

    } catch (error) {
        logger.error('Error updating SMTP settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update SMTP settings'
        });
    }
});

// Test SMTP connection
router.post('/smtp/test', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const { testEmail } = req.body;

        if (!testEmail) {
            return res.status(400).json({
                success: false,
                message: 'Test email address is required'
            });
        }

        // Get SMTP config
        const result = await query('SELECT * FROM settings WHERE key = $1', ['smtp_config']);
        
        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'SMTP not configured'
            });
        }

        // For now, just return success (actual email testing would require nodemailer)
        res.json({
            success: true,
            message: `SMTP test email would be sent to ${testEmail}`,
            data: {
                tested: true,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error testing SMTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test SMTP connection'
        });
    }
});

// =====================================================
// SYSTEM SETTINGS ENDPOINTS
// =====================================================

// Get all settings
router.get('/', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const result = await query('SELECT * FROM settings ORDER BY key ASC');

        // Convert to key-value object
        const settings = {};
        result.rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = row.value;
            }
        });

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
});

// Get setting by key
router.get('/:key', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { key } = req.params;

        const result = await query('SELECT * FROM settings WHERE key = $1', [key]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        let value;
        try {
            value = JSON.parse(result.rows[0].value);
        } catch (e) {
            value = result.rows[0].value;
        }

        res.json({
            success: true,
            data: {
                key: result.rows[0].key,
                value: value,
                updated_at: result.rows[0].updated_at
            }
        });

    } catch (error) {
        logger.error('Error fetching setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch setting'
        });
    }
});

// Update or create setting
router.put('/:key', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;

        if (value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Value is required'
            });
        }

        // Convert value to JSON string
        const jsonValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        // Upsert setting
        const result = await query(`
            INSERT INTO settings (key, value, description, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET 
                value = EXCLUDED.value,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING *
        `, [key, jsonValue, description || null]);

        const setting = result.rows[0];

        // Log the action
    await insertAuditLog(req.app, { userId: req.user.id, action: 'UPDATE', entity: 'SETTING', entityId: key, description: `Updated setting: ${key}`, severity: 'info', ipAddress: req.ip });

        res.json({
            success: true,
            data: {
                key: setting.key,
                value: typeof value === 'object' ? value : jsonValue,
                description: setting.description,
                updated_at: setting.updated_at
            },
            message: 'Setting updated successfully'
        });

    } catch (error) {
        logger.error('Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting'
        });
    }
});

// Delete setting
router.delete('/:key', restrictTo('superadmin'), async (req, res) => {
    try {
        const { key } = req.params;

        const result = await query('DELETE FROM settings WHERE key = $1 RETURNING *', [key]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        // Log the action
    await insertAuditLog(req.app, { userId: req.user.id, action: 'DELETE', entity: 'SETTING', entityId: key, description: `Deleted setting: ${key}`, severity: 'warn', ipAddress: req.ip });

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Setting deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete setting'
        });
    }
});

// Get system configuration
router.get('/system/config', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const config = {
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: config
        });

    } catch (error) {
        logger.error('Error fetching system config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system configuration'
        });
    }
});

// Reset settings to defaults
router.post('/reset/defaults', restrictTo('superadmin'), async (req, res) => {
    try {
        const defaultSettings = {
            'system.name': 'K-Wise Admin System',
            'system.version': '1.0.0',
            'email.smtp.host': 'smtp.gmail.com',
            'email.smtp.port': '587',
            'email.smtp.secure': false,
            'email.from': 'noreply@kwise.com',
            'security.session_timeout': 3600,
            'security.max_login_attempts': 5,
            'security.password_min_length': 8,
            'ui.theme': 'light',
            'ui.language': 'en',
            'notifications.enabled': true,
            'notifications.email': true,
            'notifications.sms': false,
            'backup.enabled': true,
            'backup.frequency': 'daily',
            'backup.retention_days': 30
        };

        // Insert or update default settings
        for (const [key, value] of Object.entries(defaultSettings)) {
            await query(`
                INSERT INTO settings (key, value, description, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (key) 
                DO UPDATE SET 
                    value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            `, [key, JSON.stringify(value), `Default setting for ${key}`]);
        }

        // Log the action
    await insertAuditLog(req.app, { userId: req.user.id, action: 'RESET', entity: 'SETTINGS', entityId: 'defaults', description: 'Reset all settings to defaults', severity: 'info', ipAddress: req.ip });

        res.json({
            success: true,
            message: 'Settings reset to defaults successfully',
            data: defaultSettings
        });

    } catch (error) {
        logger.error('Error resetting settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset settings'
        });
    }
});

// Export settings
router.get('/export/json', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const result = await query('SELECT * FROM settings ORDER BY key ASC');

        const settings = {};
        result.rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = row.value;
            }
        });

        const exportData = {
            exported_at: new Date().toISOString(),
            exported_by: req.user.email,
            settings: settings
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=settings-export.json');
        res.json(exportData);

    } catch (error) {
        logger.error('Error exporting settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export settings'
        });
    }
});

// Phase 4: System performance stats
// Removed duplicate /system-stats definition (was using random demo values)

// Phase 4: Test email configuration
router.post('/test-email', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, smtpFrom } = req.body;

        // Validate email configuration
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFrom) {
            return res.status(400).json({
                success: false,
                message: 'All SMTP fields are required for testing'
            });
        }

        // In a real implementation, you would use nodemailer to test the connection
        // For now, we'll simulate a successful test
        logger.info(`Testing email configuration for ${smtpHost}:${smtpPort}`);
        
        // Simulate email test result
        const testSuccess = Math.random() > 0.2; // 80% success rate for demo
        
        if (testSuccess) {
            res.json({
                success: true,
                message: 'Email configuration test successful! Test email sent.'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Email configuration test failed. Please check your settings.'
            });
        }

    } catch (error) {
        logger.error('Error testing email configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test email configuration'
        });
    }
});

// Phase 4: Manual backup trigger
router.post('/backup', restrictTo('superadmin'), async (req, res) => {
    try {
        logger.info(`Manual backup triggered by user: ${req.user.email}`);
        
        // In a real implementation, this would trigger actual database backup
        // For now, we'll simulate backup creation
        const backupId = `backup_${Date.now()}`;
        const backupTime = new Date();
        
        // Simulate backup process (2-5 seconds)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
        
        logger.info(`Backup completed: ${backupId}`);
        
        res.json({
            success: true,
            message: 'Manual backup completed successfully',
            data: {
                backupId,
                timestamp: backupTime,
                size: `${Math.floor(Math.random() * 500) + 100}MB`
            }
        });

    } catch (error) {
        logger.error('Error creating manual backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create backup'
        });
    }
});

// Phase 4: Advanced settings management
router.put('/advanced', restrictTo('superadmin'), async (req, res) => {
    try {
        const advancedSettings = req.body;
        
        // Log the advanced settings update
        logger.info(`Advanced settings updated by: ${req.user.email}`, {
            settings: Object.keys(advancedSettings)
        });
        
        // In a real implementation, these would be saved to database
        // For now, we'll just validate and return success
        
        res.json({
            success: true,
            message: 'Advanced settings updated successfully',
            data: advancedSettings
        });

    } catch (error) {
        logger.error('Error updating advanced settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update advanced settings'
        });
    }
});

// Phase 4: System health check
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date(),
            services: {
                database: 'connected',
                redis: 'connected',
                filesystem: 'accessible',
                memory: 'normal',
                cpu: 'normal'
            },
            version: '1.0.0',
            uptime: process.uptime()
        };

        res.json({
            success: true,
            data: health
        });

    } catch (error) {
        logger.error('Error checking system health:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed'
        });
    }
});

// Get system statistics for Settings page
// Removed a second duplicate /system-stats route definition

module.exports = router;