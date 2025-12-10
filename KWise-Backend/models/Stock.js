const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: [
            'processor', 'motherboard', 'video-card', 'memory', 
            'storage', 'power-supply', 'case', 'cpu-cooler', 
            'monitor', 'peripherals'
        ],
        index: true
    },
    itemName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function(v) {
                return v >= 0;
            },
            message: 'Price must be non-negative'
        }
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
        validate: {
            validator: function(v) {
                return v >= 0;
            },
            message: 'Quantity must be non-negative'
        }
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        maxlength: 50
    },
    brand: {
        type: String,
        trim: true,
        maxlength: 100
    },
    model: {
        type: String,
        trim: true,
        maxlength: 100
    },
    specifications: {
        type: Map,
        of: String
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
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
stockSchema.index({ category: 1, itemName: 1 });
stockSchema.index({ price: 1 });
stockSchema.index({ quantity: 1 });
stockSchema.index({ 'specifications': 1 });
stockSchema.index({ createdAt: -1 });
stockSchema.index({ lastModifiedAt: -1 });

// Virtual for total value
stockSchema.virtual('totalValue').get(function() {
    return this.price * this.quantity;
});

// Virtual for stock status
stockSchema.virtual('stockStatus').get(function() {
    if (this.quantity === 0) return 'out-of-stock';
    if (this.quantity <= 10) return 'low-stock';
    return 'in-stock';
});

// Virtual for formatted price
stockSchema.virtual('formattedPrice').get(function() {
    return `₱${this.price.toLocaleString()}`;
});

// Virtual for formatted total value
stockSchema.virtual('formattedTotalValue').get(function() {
    return `₱${this.totalValue.toLocaleString()}`;
});

// Pre-save middleware to update lastModifiedAt
stockSchema.pre('save', function(next) {
    this.lastModifiedAt = new Date();
    next();
});

// Static method to get categories with counts
stockSchema.statics.getCategoriesWithCounts = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
                lowStockCount: {
                    $sum: { $cond: [{ $lte: ['$quantity', 10] }, 1, 0] }
                },
                outOfStockCount: {
                    $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                category: '$_id',
                count: 1,
                totalValue: 1,
                lowStockCount: 1,
                outOfStockCount: 1,
                _id: 0
            }
        },
        { $sort: { category: 1 } }
    ]);
};

// Static method to get low stock items
stockSchema.statics.getLowStockItems = function(threshold = 10) {
    return this.find({
        quantity: { $lte: threshold, $gt: 0 },
        isActive: true
    }).sort({ quantity: 1 });
};

// Static method to get out of stock items
stockSchema.statics.getOutOfStockItems = function() {
    return this.find({
        quantity: 0,
        isActive: true
    }).sort({ itemName: 1 });
};

// Static method to search items
stockSchema.statics.searchItems = function(searchTerm, options = {}) {
    const { category, limit = 50, page = 1 } = options;
    
    const query = {
        $or: [
            { itemName: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { brand: { $regex: searchTerm, $options: 'i' } },
            { model: { $regex: searchTerm, $options: 'i' } }
        ],
        isActive: true
    };

    if (category) {
        query.category = category;
    }

    return this.find(query)
        .sort({ itemName: 1 })
        .limit(limit)
        .skip((page - 1) * limit);
};

// Static method to get stock overview statistics
stockSchema.statics.getStockOverview = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalItems: { $sum: 1 },
                totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
                totalQuantity: { $sum: '$quantity' },
                averagePrice: { $avg: '$price' },
                lowStockItems: {
                    $sum: { $cond: [{ $lte: ['$quantity', 10] }, 1, 0] }
                },
                outOfStockItems: {
                    $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
                }
            }
        }
    ]);
};

// Instance method to adjust quantity
stockSchema.methods.adjustQuantity = function(change) {
    const newQuantity = this.quantity + change;
    if (newQuantity < 0) {
        throw new Error('Insufficient stock for this operation');
    }
    this.quantity = newQuantity;
    return this.save();
};

// Instance method to check if item is available
stockSchema.methods.isAvailable = function(requiredQuantity = 1) {
    return this.isActive && this.quantity >= requiredQuantity;
};

// Instance method to reserve stock
stockSchema.methods.reserveStock = function(quantity) {
    if (!this.isAvailable(quantity)) {
        throw new Error('Insufficient stock to reserve');
    }
    this.quantity -= quantity;
    return this.save();
};

// Instance method to release reserved stock
stockSchema.methods.releaseStock = function(quantity) {
    this.quantity += quantity;
    return this.save();
};

module.exports = mongoose.model('Stock', stockSchema);