const Settings = require('../models/Settings');
const logger = require('../utils/logger');

/**
 * Get all settings
 * @route GET /api/settings
 */
exports.getAllSettings = async (req, res, next) => {

    try {
        const settings = await Settings.getAll();

        res.status(200).json({
            status: 'success',
            results: settings.length,
            data: settings
        });
    } catch (error) {
        logger.error('Error getting all settings:', error);
        next(error);
    }
};

/**
 * Get setting by key
 * @route GET /api/settings/:key
 */
exports.getSettingByKey = async (req, res, next) => {
    try {
        const setting = await Settings.getByKey(req.params.key);

        if (!setting) {
            return res.status(404).json({
                status: 'fail',
                message: 'Setting not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: setting
        });
    } catch (error) {
        logger.error('Error getting setting by key:', error);
        next(error);
    }
};

/**
 * Set setting value
 * @route PUT /api/settings/:key
 */
exports.setSetting = async (req, res, next) => {
    try {
        const { value, type, description } = req.body;

        if (value === undefined) {
            return res.status(400).json({
                status: 'fail',
                message: 'Value is required'
            });
        }

        const setting = await Settings.set(
            req.params.key,
            value,
            type || 'string',
            description
        );

        res.status(200).json({
            status: 'success',
            data: setting
        });
    } catch (error) {
        logger.error('Error setting setting value:', error);
        next(error);
    }
};

/**
 * Delete setting
 * @route DELETE /api/settings/:key
 */
exports.deleteSetting = async (req, res, next) => {
    try {
        const result = await Settings.delete(req.params.key);

        if (!result) {
            return res.status(404).json({
                status: 'fail',
                message: 'Setting not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Setting deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting setting:', error);
        next(error);
    }
};

/**
 * Get app settings
 * @route GET /api/settings/app
 */
exports.getAppSettings = async (req, res, next) => {
    try {
        const settings = await Settings.getAppSettings();

        res.status(200).json({
            status: 'success',
            data: settings
        });
    } catch (error) {
        logger.error('Error getting app settings:', error);
        next(error);
    }
};

/**
 * Update app settings
 * @route PUT /api/settings/app
 */
exports.updateAppSettings = async (req, res, next) => {
    try {
        const settings = req.body;

        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Settings must be an object'
            });
        }

        const updatedSettings = await Settings.updateAppSettings(settings);

        res.status(200).json({
            status: 'success',
            data: updatedSettings
        });
    } catch (error) {
        logger.error('Error updating app settings:', error);
        next(error);
    }
};