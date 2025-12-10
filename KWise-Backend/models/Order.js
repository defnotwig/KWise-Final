const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 100
    },
    customerPhone: {
        type: String,
        trim: true,
        maxlength: 20
    },
    items: [orderItemSchema],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE_BANKING', 'INSTALLMENT', 'GCASH', 'PAYMAYA'],
        default: 'CASH'
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500
    },
    // Processing timestamps
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: {
        type: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: {
        type: Date
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxlength: 200
    },
    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ completedAt: -1 });
orderSchema.index({ customerName: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'items.productId': 1 });

// Virtual for order duration
orderSchema.virtual('duration').get(function() {
    if (this.completedAt && this.createdAt) {
        return this.completedAt - this.createdAt;
    }
    return null;
});

// Virtual for formatted order number
orderSchema.virtual('formattedOrderNumber').get(function() {
    return this.orderNumber;
});

// Virtual for formatted total amount
orderSchema.virtual('formattedTotalAmount').get(function() {
    return `₱${this.totalAmount.toLocaleString()}`;
});

// Virtual for order age
orderSchema.virtual('age').get(function() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Pre-save middleware to update lastModifiedAt
orderSchema.pre('save', function(next) {
    this.lastModifiedAt = new Date();
    next();
});

// Pre-save middleware to calculate total amount
orderSchema.pre('save', function(next) {
    if (this.items && this.items.length > 0) {
        this.totalAmount = this.items.reduce((sum, item) => sum + item.total, 0);
    }
    next();
});

// Static method to get orders by status
orderSchema.statics.getByStatus = function(status) {
    return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get orders by date range
orderSchema.statics.getByDateRange = function(startDate, endDate, status = null) {
    const query = {
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };
    
    if (status) {
        query.status = status;
    }
    
    return this.find(query).sort({ createdAt: -1 });
};

// Static method to get order statistics
orderSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                processingOrders: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
                completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
            }
        }
    ]);
};

// Static method to get revenue by period
orderSchema.statics.getRevenueByPeriod = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                status: 'completed',
                completedAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
                },
                revenue: { $sum: '$totalAmount' },
                orders: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
};

// Instance method to process order
orderSchema.methods.process = function(userId) {
    if (this.status !== 'pending') {
        throw new Error('Order is not in pending status');
    }
    
    this.status = 'processing';
    this.processedBy = userId;
    this.processedAt = new Date();
    this.lastModifiedBy = userId;
    
    return this.save();
};

// Instance method to complete order
orderSchema.methods.complete = function(userId) {
    if (this.status !== 'processing') {
        throw new Error('Order is not in processing status');
    }
    
    this.status = 'completed';
    this.completedBy = userId;
    this.completedAt = new Date();
    this.lastModifiedBy = userId;
    
    return this.save();
};

// Instance method to cancel order
orderSchema.methods.cancel = function(userId, reason) {
    if (this.status === 'completed') {
        throw new Error('Cannot cancel completed order');
    }
    
    this.status = 'cancelled';
    this.cancelledBy = userId;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.lastModifiedBy = userId;
    
    return this.save();
};

// Instance method to check if order can be modified
orderSchema.methods.canModify = function() {
    return this.status === 'pending' || this.status === 'processing';
};

// Instance method to get order summary
orderSchema.methods.getSummary = function() {
    return {
        orderNumber: this.orderNumber,
        customerName: this.customerName,
        totalAmount: this.totalAmount,
        status: this.status,
        itemCount: this.items.length,
        createdAt: this.createdAt,
        completedAt: this.completedAt
    };
};

module.exports = mongoose.model('Order', orderSchema);