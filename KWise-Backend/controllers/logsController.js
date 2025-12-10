const Log = require('../models/LogPG');
const User = require('../models/User');
const logger = require('../utils/logger');

// Get all logs with pagination and filtering
const getAllLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { search, role, action, status, startDate, endDate } = req.query;

        // Build filter object
        const filter = {};
        
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { action: { $regex: search, $options: 'i' } }
            ];
        }

        if (role && role !== 'all') {
            filter.userRole = role;
        }

        if (action && action !== 'all') {
            filter.action = action;
        }

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email'),
            Log.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting all logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving logs'
        });
    }
};

// Get logs by user
const getLogsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            Log.find({ userId })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email'),
            Log.countDocuments({ userId })
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting logs by user:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving user logs'
        });
    }
};

// Get logs by action
const getLogsByAction = async (req, res) => {
    try {
        const { action } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            Log.find({ action })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email'),
            Log.countDocuments({ action })
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting logs by action:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving action logs'
        });
    }
};

// Get logs by date range
const getLogsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {
            timestamp: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email'),
            Log.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting logs by date range:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving date range logs'
        });
    }
};

// Get system logs
const getSystemLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {
            $or: [
                { action: 'system_startup' },
                { action: 'system_shutdown' },
                { action: 'backup_created' },
                { action: 'maintenance_mode' },
                { action: 'database_optimization' }
            ]
        };

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email'),
            Log.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting system logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving system logs'
        });
    }
};

// Get error logs
const getErrorLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { status: 'error' };

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email'),
            Log.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting error logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving error logs'
        });
    }
};

// Export logs
const exportLogs = async (req, res) => {
    try {
        const { format = 'csv' } = req.query;
        const { search, role, action, status, startDate, endDate } = req.query;

        // Build filter object (same as getAllLogs)
        const filter = {};
        
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { action: { $regex: search, $options: 'i' } }
            ];
        }

        if (role && role !== 'all') {
            filter.userRole = role;
        }

        if (action && action !== 'all') {
            filter.action = action;
        }

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const logs = await Log.find(filter)
            .sort({ timestamp: -1 })
            .populate('userId', 'name email');

        if (format === 'csv') {
            const csvData = logs.map(log => ({
                ID: log._id,
                User: log.userName,
                Role: log.userRole,
                Action: log.action,
                Description: log.description,
                IP_Address: log.ipAddress,
                Timestamp: log.timestamp,
                Status: log.status
            }));

            const csv = convertToCSV(csvData);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=logs_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data: logs
            });
        }
    } catch (error) {
        logger.error('Error exporting logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting logs'
        });
    }
};

// Clear old logs
const clearOldLogs = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await Log.deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        logger.info(`Cleared ${result.deletedCount} old logs (older than ${days} days)`);

        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} old logs`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logger.error('Error clearing old logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing old logs'
        });
    }
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

module.exports = {
    getAllLogs,
    getLogsByUser,
    getLogsByAction,
    getLogsByDateRange,
    getSystemLogs,
    getErrorLogs,
    exportLogs,
    clearOldLogs
};
