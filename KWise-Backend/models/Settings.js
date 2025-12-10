const db = require('../config/db');
const logger = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/encryption');
const config = require('../config/config');

/**
 * Settings model
 */
class Settings {
    /**
   * Get all settings
   * @returns {Promise<Array>} - Array of setting objects
   */
static async getAll() {
    try {
        const result = await db.query(
        'SELECT id, key, value, type, description, created_at, updated_at FROM settings ORDER BY key ASC'
        );
    
      // Convert values based on type
    return result.rows.map(setting => {
        let value = setting.value;
        
        // Decrypt sensitive values if encryption is enabled
        if (config.encryption.enabled && (
            setting.key.includes('password') ||
            setting.key.includes('secret') ||
            setting.key.includes('key')
        )) {
            try {
            value = decrypt(value);
        } catch (err) {
            logger.warn(`Failed to decrypt setting ${setting.key}:`, err);
        }
        }
        
        // Convert value based on type
        if (setting.type === 'boolean') {
            value = value === 'true';
        } else if (setting.type === 'number') {
            value = value !== null ? parseFloat(value) : null;
        } else if (setting.type === 'json') {
            try {
            value = value !== null ? JSON.parse(value) : null;
            } catch (err) {
            logger.warn(`Failed to parse JSON for setting ${setting.key}:`, err);
            }
        }
        
        return { ...setting, value };
        });
    } catch (error) {
        logger.error('Error getting all settings:', error);
        throw error;
    }
}
/**
   * Get setting by key
   * @param {string} key - Setting key
   * @returns {Promise<Object|null>} - Setting object or null if not found
   */
static async getByKey(key) {
    try {
        const result = await db.query(
        'SELECT id, key, value, type, description, created_at, updated_at FROM settings WHERE key = $1',
        [key]
    );
    if (!result.rows.length) {
        return null;
    }
    const setting = result.rows[0];
    let value = setting.value;
      // Decrypt sensitive values if encryption is enabled
    if (config.encryption.enabled && (
        setting.key.includes('password') ||
        setting.key.includes('secret') ||
        setting.key.includes('key')
    )) {
        try {
            value = decrypt(value);
        } catch (err) {
            logger.warn(`Failed to decrypt setting ${setting.key}:`, err);
        }
    }
      // Convert value based on type
        if (setting.type === 'boolean') {
        value = value === 'true';
        } else if (setting.type === 'number') {
        value = value !== null ? parseFloat(value) : null;
        } else if (setting.type === 'json') {
        try {
            value = value !== null ? JSON.parse(value) : null;
        } catch (err) {
            logger.warn(`Failed to parse JSON for setting ${setting.key}:`, err);
        }
    }
        return { ...setting, value };
    } catch (error) {
        logger.error('Error getting setting by key:', error);
        throw error;
    }
}
/**
   * Get setting value by key
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if setting not found
   * @returns {Promise<*>} - Setting value or default value if not found
   */
static async getValue(key, defaultValue = null) {
    try {
        const setting = await Settings.getByKey(key);
        return setting ? setting.value : defaultValue;
    } catch (error) {
        logger.error('Error getting setting value:', error);
        return defaultValue;
    }
}
/**
   * Set setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @param {string} type - Setting type (string, number, boolean, json)
   * @param {string} description - Setting description
   * @returns {Promise<Object>} - Updated setting object
   */
static async set(key, value, type = 'string', description = null) {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

      // Prepare value based on type
    let preparedValue = value;
        if (value === null) {
        preparedValue = null;
        } else if (type === 'boolean') {
        preparedValue = value ? 'true' : 'false';
        } else if (type === 'number') {
        preparedValue = value.toString();
        } else if (type === 'json') {
        preparedValue = JSON.stringify(value);
        } else {
        preparedValue = String(value);
        }
      // Encrypt sensitive values if encryption is enabled
        if (config.encryption.enabled && preparedValue !== null && (
        key.includes('password') ||
        key.includes('secret') ||
        key.includes('key')
        )) {
        preparedValue = encrypt(preparedValue);
        }
      // Check if setting exists
        const existingResult = await client.query(
        'SELECT id FROM settings WHERE key = $1',
        [key]
    );
        let result;
        if (existingResult.rows.length) {
        // Update existing setting
        result = await client.query(
            `UPDATE settings 
            SET value = $1, type = $2, description = $3, updated_at = NOW()
            WHERE key = $4
            RETURNING id, key, value, type, description, created_at, updated_at`,
            [preparedValue, type, description, key]
        );
        } else {
        // Insert new setting
        result = await client.query(
            `INSERT INTO settings (key, value, type, description)
            VALUES ($1, $2, $3, $4)
            RETURNING id, key, value, type, description, created_at, updated_at`,
            [key, preparedValue, type, description]
        );
        }
        await client.query('COMMIT');
      // Return setting with original value (not prepared or encrypted)
        const setting = result.rows[0];
        return { ...setting, value };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error setting setting value:', error);
        throw error;
    } finally {
        client.release();
    }
}
/**
   * Delete setting
   * @param {string} key - Setting key
   * @returns {Promise<boolean>} - Success status
   */
static async delete(key) {
    try {
        const result = await db.query(
        'DELETE FROM settings WHERE key = $1 RETURNING id',
        [key]
);

    return result.rowCount > 0;
    } catch (error) {
        logger.error('Error deleting setting:', error);
        throw error;
    }
}
/**
   * Get app settings
   * @returns {Promise<Object>} - App settings object
   */
static async getAppSettings() {
    try {
        const allSettings = await Settings.getAll();
      // Convert to key-value object
        return allSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
        }, {});
    } catch (error) {
        logger.error('Error getting app settings:', error);
        throw error;
    }
}
/**
   * Update app settings
   * @param {Object} settings - Settings object
   * @returns {Promise<Object>} - Updated settings object
   */
static async updateAppSettings(settings) {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        for (const [key, value] of Object.entries(settings)) {
        // Get current setting to determine type
        const currentSetting = await client.query(
            'SELECT type, description FROM settings WHERE key = $1',
            [key]
        );
        
        let type = 'string';
        let description = null;
        
        if (currentSetting.rows.length) {
            type = currentSetting.rows[0].type;
            description = currentSetting.rows[0].description;
        } else {
          // Determine type if new setting
            if (typeof value === 'boolean') {
            type = 'boolean';
            } else if (typeof value === 'number') {
            type = 'number';
            } else if (typeof value === 'object') {
            type = 'json';
            }
        }
        
        // Prepare value based on type
        let preparedValue = value;
        
        if (value === null) {
            preparedValue = null;
        } else if (type === 'boolean') {
            preparedValue = value ? 'true' : 'false';
        } else if (type === 'number') {
            preparedValue = value.toString();
        } else if (type === 'json') {
            preparedValue = JSON.stringify(value);
        } else {
            preparedValue = String(value);
        }
        
        // Encrypt sensitive values if encryption is enabled
        if (config.encryption.enabled && preparedValue !== null && (
            key.includes('password') ||
            key.includes('secret') ||
            key.includes('key')
        )) {
            preparedValue = encrypt(preparedValue);
        }
        
        if (currentSetting.rows.length) {
          // Update existing setting
            await client.query(
            `UPDATE settings 
                SET value = $1, updated_at = NOW()
                WHERE key = $2`,
            [preparedValue, key]
            );
        } else {
          // Insert new setting
            await client.query(
            `INSERT INTO settings (key, value, type, description)
                VALUES ($1, $2, $3, $4)`,
            [key, preparedValue, type, description]
            );
        }
    }
        await client.query('COMMIT');
      // Return updated settings
        return await Settings.getAppSettings();
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error updating app settings:', error);
        throw error;
    } finally {
        client.release();
    }
}
}

module.exports = Settings;