const Order = require('../models/Order');
const Log = require('../models/Log');
const logger = require('../utils/logger');
const { query } = require('../config/db'); // PostgreSQL for stock management

// Get all orders with pagination and filtering
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const orders = await Order.find(query)
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('items.productId', 'name price')
            .lean();

        const total = await Order.countDocuments(query);

        // Log the access
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'VIEW_ORDERS',
            description: `Viewed orders list (${orders.length} orders)`,
            module: 'Orders',
            severity: 'INFO'
        });

        res.json({
            orders,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

// Get order by ID
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate('items.productId', 'name price description')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        logger.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
};

// Create new order
const createOrder = async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, items, paymentMethod, totalAmount, notes } = req.body;

        // Generate order number
        const orderNumber = await generateOrderNumber();

        const newOrder = new Order({
            orderNumber,
            customerName,
            customerEmail,
            customerPhone,
            items,
            paymentMethod,
            totalAmount,
            notes,
            status: 'pending',
            createdBy: req.user.id
        });

        await newOrder.save();

        // Log the action
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'CREATE_ORDER',
            description: `Created order ${orderNumber} for ${customerName}`,
            module: 'Orders',
            severity: 'INFO'
        });

        res.status(201).json(newOrder);
    } catch (error) {
        logger.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

// Update order
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Store old values for logging
        const oldStatus = order.status;
        const oldTotal = order.totalAmount;

        Object.assign(order, updateData);
        order.lastModifiedBy = req.user.id;
        order.lastModifiedAt = new Date();

        await order.save();

        // Log the action
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'UPDATE_ORDER',
            description: `Updated order ${order.orderNumber}. Status: ${oldStatus} → ${order.status}, Total: ₱${oldTotal} → ₱${order.totalAmount}`,
            module: 'Orders',
            severity: 'INFO'
        });

        res.json(order);
    } catch (error) {
        logger.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
};

// Delete order
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderNumber = order.orderNumber;
        await Order.findByIdAndDelete(id);

        // Log the action
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'DELETE_ORDER',
            description: `Deleted order ${orderNumber}`,
            module: 'Orders',
            severity: 'WARNING'
        });

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        logger.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const oldStatus = order.status;
        order.status = status;
        if (notes) order.notes = notes;
        order.lastModifiedBy = req.user.id;
        order.lastModifiedAt = new Date();

        await order.save();

        // Log the action
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'UPDATE_ORDER_STATUS',
            description: `Updated order ${order.orderNumber} status: ${oldStatus} → ${status}`,
            module: 'Orders',
            severity: 'INFO'
        });

        res.json(order);
    } catch (error) {
        logger.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

// Process order
const processOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Order is not in pending status' });
        }

        order.status = 'processing';
        order.processedBy = req.user.id;
        order.processedAt = new Date();
        order.lastModifiedBy = req.user.id;
        order.lastModifiedAt = new Date();

        await order.save();

        // Log the action
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'PROCESS_ORDER',
            description: `Started processing order ${order.orderNumber}`,
            module: 'Orders',
            severity: 'INFO'
        });

        res.json(order);
    } catch (error) {
        logger.error('Error processing order:', error);
        res.status(500).json({ error: 'Failed to process order' });
    }
};

// Complete order
const completeOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'processing') {
            return res.status(400).json({ error: 'Order is not in processing status' });
        }

        // 🔒 STOCK DEDUCTION: Deduct stock from pc_parts table when order is completed
        logger.info(`⏳ Deducting stock for order ${order.orderNumber}...`);
        const stockDeductionErrors = [];
        
        for (const item of order.items) {
            try {
                // Get product info from MongoDB reference
                const productId = item.productId;
                const quantity = item.quantity;
                
                if (!productId || !quantity) {
                    logger.warn(`⚠️ Skipping item with missing productId or quantity`);
                    continue;
                }

                // Deduct stock from PostgreSQL pc_parts table
                const deductResult = await query(
                    `UPDATE pc_parts 
                     SET stock = GREATEST(stock - $1, 0), 
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $2 
                     RETURNING id, name, stock`,
                    [quantity, productId]
                );

                if (deductResult.rows.length === 0) {
                    stockDeductionErrors.push(`Product ID ${productId} not found in stock`);
                    logger.error(`❌ Product ID ${productId} not found in pc_parts table`);
                } else {
                    const updatedProduct = deductResult.rows[0];
                    logger.info(`✅ Stock deducted: ${updatedProduct.name} - Quantity: ${quantity}, Remaining: ${updatedProduct.stock}`);
                }
            } catch (stockError) {
                stockDeductionErrors.push(`Failed to deduct stock for item: ${stockError.message}`);
                logger.error(`❌ Stock deduction error for item:`, stockError);
            }
        }

        // Mark order as completed
        order.status = 'completed';
        order.completedBy = req.user.id;
        order.completedAt = new Date();
        order.lastModifiedBy = req.user.id;
        order.lastModifiedAt = new Date();

        await order.save();

        // Log the action
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'COMPLETE_ORDER',
            description: `Completed order ${order.orderNumber}${stockDeductionErrors.length > 0 ? ` (Stock deduction warnings: ${stockDeductionErrors.join(', ')})` : ' and deducted stock successfully'}`,
            module: 'Orders',
            severity: stockDeductionErrors.length > 0 ? 'WARNING' : 'INFO'
        });

        // Return success with stock deduction status
        res.json({
            success: true,
            order,
            stockDeduction: {
                success: stockDeductionErrors.length === 0,
                errors: stockDeductionErrors
            }
        });
    } catch (error) {
        logger.error('Error completing order:', error);
        res.status(500).json({ error: 'Failed to complete order' });
    }
};

// Cancel order
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status === 'completed') {
            return res.status(400).json({ error: 'Cannot cancel completed order' });
        }

        order.status = 'cancelled';
        order.cancelledBy = req.user.id;
        order.cancelledAt = new Date();
        order.cancellationReason = reason;
        order.lastModifiedBy = req.user.id;
        order.lastModifiedAt = new Date();

        await order.save();

        // Log the action
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'CANCEL_ORDER',
            description: `Cancelled order ${order.orderNumber}. Reason: ${reason}`,
            module: 'Orders',
            severity: 'WARNING'
        });

        res.json(order);
    } catch (error) {
        logger.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
};

// Get current queue
const getCurrentQueue = async (req, res) => {
    try {
        const orders = await Order.find({ status: { $in: ['pending', 'processing'] } })
            .sort({ createdAt: 1 })
            .populate('items.productId', 'name price')
            .lean();

        res.json(orders);
    } catch (error) {
        logger.error('Error fetching current queue:', error);
        res.status(500).json({ error: 'Failed to fetch current queue' });
    }
};

// Get pending orders
const getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'pending' })
            .sort({ createdAt: 1 })
            .populate('items.productId', 'name price')
            .lean();

        res.json(orders);
    } catch (error) {
        logger.error('Error fetching pending orders:', error);
        res.status(500).json({ error: 'Failed to fetch pending orders' });
    }
};

// Get completed orders
const getCompletedOrders = async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const orders = await Order.find({ status: 'completed' })
            .sort({ completedAt: -1 })
            .limit(parseInt(limit))
            .populate('items.productId', 'name price')
            .lean();

        res.json(orders);
    } catch (error) {
        logger.error('Error fetching completed orders:', error);
        res.status(500).json({ error: 'Failed to fetch completed orders' });
    }
};

// Get order statistics
const getOrderStats = async (req, res) => {
    try {
        const stats = await Order.aggregate([
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

        res.json(stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            processingOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0
        });
    } catch (error) {
        logger.error('Error fetching order stats:', error);
        res.status(500).json({ error: 'Failed to fetch order stats' });
    }
};

// Get revenue statistics (superadmin only)
const getRevenueStats = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const stats = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    completedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 },
                    averageOrderValue: { $avg: '$totalAmount' }
                }
            }
        ]);

        res.json(stats[0] || {
            totalRevenue: 0,
            orderCount: 0,
            averageOrderValue: 0
        });
    } catch (error) {
        logger.error('Error fetching revenue stats:', error);
        res.status(500).json({ error: 'Failed to fetch revenue stats' });
    }
};

// Get daily statistics
const getDailyStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const stats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json(stats);
    } catch (error) {
        logger.error('Error fetching daily stats:', error);
        res.status(500).json({ error: 'Failed to fetch daily stats' });
    }
};

// Get orders by date range
const getOrdersByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;

        const query = {};
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        if (status && status !== 'all') {
            query.status = status;
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('items.productId', 'name price')
            .lean();

        res.json(orders);
    } catch (error) {
        logger.error('Error fetching orders by date range:', error);
        res.status(500).json({ error: 'Failed to fetch orders by date range' });
    }
};

// Export orders to CSV
const exportOrdersCSV = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;

        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('items.productId', 'name price')
            .lean();

        // Convert to CSV format
        const csvHeader = 'Order Number,Customer Name,Customer Email,Total Amount,Status,Payment Method,Created Date,Completed Date\n';
        const csvRows = orders.map(order => 
            `"${order.orderNumber}","${order.customerName}","${order.customerEmail}",${order.totalAmount},"${order.status}","${order.paymentMethod}","${order.createdAt}","${order.completedAt || ''}"`
        ).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);

        // Log the export
        await Log.create({
            userId: req.user.id,
            userName: req.user.username,
            userRole: req.user.role,
            action: 'EXPORT_ORDERS',
            description: `Exported ${orders.length} orders to CSV`,
            module: 'Orders',
            severity: 'INFO'
        });
    } catch (error) {
        logger.error('Error exporting orders:', error);
        res.status(500).json({ error: 'Failed to export orders' });
    }
};

// Export orders to PDF
const exportOrdersPDF = async (req, res) => {
    try {
        // PDF export implementation would go here
        res.status(501).json({ error: 'PDF export not implemented yet' });
    } catch (error) {
        logger.error('Error exporting orders to PDF:', error);
        res.status(500).json({ error: 'Failed to export orders to PDF' });
    }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;

        const query = { status: { $in: ['completed', 'cancelled'] } };
        
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const transactions = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('orderNumber customerName customerEmail totalAmount status paymentMethod createdAt completedAt')
            .lean();

        const total = await Order.countDocuments(query);

        // Transform to transaction format
        const formattedTransactions = transactions.map(order => ({
            id: order._id,
            orderId: order.orderNumber,
            customer: order.customerName,
            amount: order.totalAmount,
            status: order.status,
            date: order.completedAt || order.createdAt,
            paymentMethod: order.paymentMethod
        }));

        res.json({
            transactions: formattedTransactions,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching transaction history:', error);
        res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
};

// Helper function to generate order number
const generateOrderNumber = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `ORD-${year}${month}${day}`;
    
    // Get the count of orders for today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const count = await Order.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const sequence = String(count + 1).padStart(3, '0');
    return `${prefix}-${sequence}`;
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    processOrder,
    completeOrder,
    cancelOrder,
    getCurrentQueue,
    getPendingOrders,
    getCompletedOrders,
    getOrderStats,
    getRevenueStats,
    getDailyStats,
    getOrdersByDateRange,
    exportOrdersCSV,
    exportOrdersPDF,
    getTransactionHistory
};
