const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        enum: ['superadmin', 'admin', 'developer'],
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            // User actions
            'login',
            'logout',
            'password_change',
            'profile_update',
            'account_created',
            'account_updated',
            'account_deleted',
            
            // Stock actions
            'stock_added',
            'stock_updated',
            'stock_deleted',
            'stock_quantity_updated',
            'low_stock_alert',
            
            // Order actions
            'order_created',
            'order_updated',
            'order_cancelled',
            'order_completed',
            'order_processed',
            
            // Settings actions
            'settings_updated',
            'backup_created',
            'backup_restored',
            'system_maintenance',
            
            // System actions
            'system_startup',
            'system_shutdown',
            'database_optimization',
            'maintenance_mode',
            'error_occurred',
            
            // Access control
            'access_denied',
            'permission_granted',
            'permission_revoked',
            'role_changed'
        ]
    },
    description: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['success', 'error', 'warning', 'info'],
        default: 'success'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    module: {
        type: String,
        enum: [
            'auth',
            'users',
            'stock',
            'orders',
            'settings',
            'dashboard',
            'logs',
            'system'
        ],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    sessionId: {
        type: String,
        default: ''
    },
    requestId: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for better query performance
logSchema.index({ userId: 1, timestamp: -1 });
logSchema.index({ action: 1, timestamp: -1 });
logSchema.index({ status: 1, timestamp: -1 });
logSchema.index({ userRole: 1, timestamp: -1 });
logSchema.index({ module: 1, timestamp: -1 });
logSchema.index({ severity: 1, timestamp: -1 });

// Compound indexes for common queries
logSchema.index({ userId: 1, action: 1, timestamp: -1 });
logSchema.index({ userRole: 1, status: 1, timestamp: -1 });
logSchema.index({ module: 1, action: 1, timestamp: -1 });

// Virtual for formatted timestamp
logSchema.virtual('formattedTimestamp').get(function() {
    return this.timestamp.toLocaleString();
});

// Virtual for time ago
logSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const diff = now - this.timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
});

// Static method to create log entry
logSchema.statics.createLog = async function(logData) {
    try {
        const log = new this(logData);
        await log.save();
        return log;
    } catch (error) {
        console.error('Error creating log entry:', error);
        throw error;
    }
};

// Static method to get logs with pagination
logSchema.statics.getLogsWithPagination = async function(filter = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
        this.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email'),
        this.countDocuments(filter)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Static method to get logs by date range
logSchema.statics.getLogsByDateRange = async function(startDate, endDate, filter = {}) {
    const dateFilter = {
        timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        },
        ...filter
    };

    return this.find(dateFilter)
        .sort({ timestamp: -1 })
        .populate('userId', 'name email');
};

// Static method to get system statistics
logSchema.statics.getSystemStats = async function() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayLogs, weekLogs, monthLogs, totalLogs, errorLogs] = await Promise.all([
        this.countDocuments({ timestamp: { $gte: startOfDay } }),
        this.countDocuments({ timestamp: { $gte: startOfWeek } }),
        this.countDocuments({ timestamp: { $gte: startOfMonth } }),
        this.countDocuments(),
        this.countDocuments({ status: 'error' })
    ]);

    return {
        today: todayLogs,
        week: weekLogs,
        month: monthLogs,
        total: totalLogs,
        errors: errorLogs
    };
};

// Static method to get action statistics
logSchema.statics.getActionStats = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Static method to get user activity statistics
logSchema.statics.getUserActivityStats = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$userId',
                userName: { $first: '$userName' },
                userRole: { $first: '$userRole' },
                totalActions: { $sum: 1 },
                lastActivity: { $max: '$timestamp' }
            }
        },
        { $sort: { totalActions: -1 } }
    ]);
};

// Instance method to get related logs
logSchema.methods.getRelatedLogs = async function(limit = 10) {
    return this.constructor.find({
        userId: this.userId,
        _id: { $ne: this._id }
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Pre-save middleware to ensure required fields
logSchema.pre('save', function(next) {
    if (!this.userName && this.userId) {
        // This would typically be populated from the user document
        // For now, we'll use a placeholder
        this.userName = 'Unknown User';
    }
    next();
});

// Method to format log for display
logSchema.methods.formatForDisplay = function() {
    return {
        id: this._id,
        user: this.userName,
        role: this.userRole,
        action: this.action,
        description: this.description,
        status: this.status,
        timestamp: this.formattedTimestamp,
        timeAgo: this.timeAgo,
        module: this.module,
        severity: this.severity,
        ipAddress: this.ipAddress
    };
};

module.exports = mongoose.model('Log', logSchema);
