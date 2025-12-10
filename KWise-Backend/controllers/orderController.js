/**
 * @deprecated This controller is deprecated and will be removed in future versions.
 * Use ordersController.js instead for enhanced order management.
 * 
 * This controller provides basic order functionality, but ordersController.js
 * offers enhanced features and better PostgreSQL integration.
 */

const Order = require('../models/Order');
const logger = require('../utils/logger');

/**
 * Get all orders
 * @route GET /api/orders
 */
exports.getAllOrders = async (req, res, next) => {
    try {
        // Parse query parameters
        const status = req.query.status;
        const limit = parseInt(req.query.limit, 10) || 10;
        const page = parseInt(req.query.page, 10) || 1;
        const offset = (page - 1) * limit;
        const orderBy = req.query.orderBy || 'created_at';
        const order = req.query.order || 'DESC';

        // Get orders
        const orders = await Order.getAll({ status, limit, offset, orderBy, order });

        // Get order counts
        const counts = await Order.countOrders({ status });

        res.status(200).json({
            status: 'success',
            results: orders.length,
            counts,
            pagination: {
                page,
                limit,
                total: counts.total
            },
            data: orders
        });
    } catch (error) {
        logger.error('Error getting all orders:', error);
        next(error);
    }
};

/**
 * Get order by ID
 * @route GET /api/orders/:id
 */
exports.getOrderById = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const order = await Order.getById(orderId);

        if (!order) {
            return res.status(404).json({
                status: 'fail',
                message: 'Order not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: order
        });
    } catch (error) {
        logger.error('Error getting order by ID:', error);
        next(error);
    }
};

/**
 * Get order by order number
 * @route GET /api/orders/number/:orderNumber
 */
exports.getOrderByNumber = async (req, res, next) => {
    try {
        const order = await Order.getByOrderNumber(req.params.orderNumber);

        if (!order) {
            return res.status(404).json({
                status: 'fail',
                message: 'Order not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: order
        });
    } catch (error) {
        logger.error('Error getting order by number:', error);
        next(error);
    }
};

/**
 * Create new order
 * @route POST /api/orders
 */
exports.createOrder = async (req, res, next) => {
    try {
        const {
            customerName, customerEmail, customerPhone,
            status, totalAmount, paymentMethod, paymentStatus,
            notes, items
        } = req.body;

        // Validate required fields
        if (!customerName || !totalAmount || !paymentMethod || !items || !items.length) {
            return res.status(400).json({
                status: 'fail',
                message: 'Customer name, total amount, payment method, and items are required'
            });
        }

        // Validate total amount
        if (isNaN(totalAmount) || parseFloat(totalAmount) <= 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Total amount must be a positive number'
            });
        }

        // Validate items
        for (const item of items) {
            if (!item.componentName || !item.itemName || !item.price || !item.quantity) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Each item must have component name, item name, price, and quantity'
                });
            }
            if (isNaN(item.price) || parseFloat(item.price) < 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Item price must be a non-negative number'
                });
            }
            if (isNaN(item.quantity) || parseInt(item.quantity) <= 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Item quantity must be a positive integer'
                });
            }
            if (!item.amount) {
                // Calculate amount if not provided
                item.amount = parseFloat(item.price) * parseInt(item.quantity);
            }
        }

        // Create order
        const newOrder = await Order.create({
            customerName,
            customerEmail,
            customerPhone,
            status,
            totalAmount: parseFloat(totalAmount),
            paymentMethod,
            paymentStatus,
            notes,
            items,
            createdBy: req.user.id
        });

        res.status(201).json({
            status: 'success',
            data: newOrder
        });
    } catch (error) {
        logger.error('Error creating order:', error);
        next(error);
    }
};

/**
 * Update order status
 * @route PATCH /api/orders/:id/status
 */
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                status: 'fail',
                message: 'Status is required'
            });
        }

        try {
            const updatedOrder = await Order.updateStatus(orderId, status);
            res.status(200).json({
                status: 'success',
                data: updatedOrder
            });
        } catch (error) {
            if (error.message === 'Order not found') {
                return res.status(404).json({
                    status: 'fail',
                    message: 'Order not found'
                });
            }
            if (error.message === 'Invalid status') {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid status. Must be: pending, processing, completed, or cancelled'
                });
            }
            throw error;
        }
    } catch (error) {
        logger.error('Error updating order status:', error);
        next(error);
    }
};

/**
 * Update order
 * @route PATCH /api/orders/:id
 */
exports.updateOrder = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const {
            customerName, customerEmail, customerPhone,
            status, paymentMethod, paymentStatus,
            notes, items
        } = req.body;

        // Validate items if provided
        if (items) {
            for (const item of items) {
                if (item.price && (isNaN(item.price) || parseFloat(item.price) < 0)) {
                    return res.status(400).json({
                        status: 'fail',
                        message: 'Item price must be a non-negative number'
                    });
                }

                if (item.quantity && (isNaN(item.quantity) || parseInt(item.quantity) <= 0)) {
                    return res.status(400).json({
                        status: 'fail',
                        message: 'Item quantity must be a positive integer'
                    });
                }

                if (item.price && item.quantity && !item.amount) {
                    // Calculate amount if price and quantity changed but amount not provided
                    item.amount = parseFloat(item.price) * parseInt(item.quantity);
                }
            }
        }

        try {
            const updatedOrder = await Order.update(orderId, {
                customerName,
                customerEmail,
                customerPhone,
                status,
                paymentMethod,
                paymentStatus,
                notes,
                items
            });
            res.status(200).json({
                status: 'success',
                data: updatedOrder
            });
        } catch (error) {
            if (error.message === 'Order not found') {
                return res.status(404).json({
                    status: 'fail',
                    message: 'Order not found'
                });
            }
            if (error.message.includes('Cannot update')) {
                return res.status(400).json({
                    status: 'fail',
                    message: error.message
                });
            }
            throw error;
        }
    } catch (error) {
        logger.error('Error updating order:', error);
        next(error);
    }
};

/**
 * Delete order
 * @route DELETE /api/orders/:id
 */
exports.deleteOrder = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id, 10);

        try {
            const result = await Order.delete(orderId);
            if (!result) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Failed to delete order'
                });
            }
            res.status(200).json({
                status: 'success',
                message: 'Order deleted successfully'
            });
        } catch (error) {
            if (error.message === 'Order not found') {
                return res.status(404).json({
                    status: 'fail',
                    message: 'Order not found'
                });
            }
            throw error;
        }
    } catch (error) {
        logger.error('Error deleting order:', error);
        next(error);
    }
};

/**
 * Get order queue
 * @route GET /api/orders/queue
 */
exports.getOrderQueue = async (req, res, next) => {
    try {
        // Get pending and processing orders
        const pendingOrders = await Order.getAll({
            status: 'pending',
            limit: 5,
            orderBy: 'created_at',
            order: 'ASC'
        });

        const processingOrders = await Order.getAll({
            status: 'processing',
            limit: 5,
            orderBy: 'created_at',
            order: 'ASC'
        });

        // Combine orders for the queue
        const queueOrders = [...pendingOrders, ...processingOrders]
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .slice(0, 10);

        res.status(200).json({
            status: 'success',
            results: queueOrders.length,
            data: queueOrders
        });
    } catch (error) {
        logger.error('Error getting order queue:', error);
        next(error);
    }
};

/**
 * Get recent orders
 * @route GET /api/orders/recent
 */
exports.getRecentOrders = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 5;
        const recentOrders = await Order.getRecent(limit);

        res.status(200).json({
            status: 'success',
            results: recentOrders.length,
            data: recentOrders
        });
    } catch (error) {
        logger.error('Error getting recent orders:', error);
        next(error);
    }
};