const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Get all users
 * @route GET /api/users
 */
exports.getAllUsers = async (req, res, next) => {
try {
    // Parse query parameters
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;
    const orderBy = req.query.orderBy || 'id';
    const order = req.query.order || 'ASC';
    
    // Get users
    const users = await User.findAll({ limit, offset, orderBy, order });
    const total = await User.countAll();
    
    res.status(200).json({
        status: 'success',
        results: users.length,
        pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
        },
        data: users
    });
} catch (error) {
    logger.error('Error getting all users:', error);
    next(error);
}
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
exports.getUser = async (req, res, next) => {
try {
    const user = await User.findById(parseInt(req.params.id, 10));
    
    if (!user) {
        return res.status(404).json({
        status: 'fail',
        message: 'User not found'
        });
    }
    
    res.status(200).json({
        status: 'success',
        data: user
    });
    } catch (error) {
    logger.error('Error getting user by ID:', error);
    next(error);
}
};

/**
 * Create user
 * @route POST /api/users
 */
exports.createUser = async (req, res, next) => {
try {
    const { name, email, password, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({
        status: 'fail',
        message: 'Please provide name, email, and password'
        });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid email address'
        });
    }
    
    // Validate password length
    if (password.length < 8) {
        return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters long'
        });
    }
    
    // Validate role
    const validRoles = ['admin', 'superadmin', 'developer'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({
        status: 'fail',
        message: 'Role must be admin, superadmin, or developer'
        });
    }
    
    // Create user
    const newUser = await User.create({
        name,
        email,
        password,
        role
    });
    
    res.status(201).json({
        status: 'success',
        data: newUser
    });
} catch (error) {
    logger.error('Error creating user:', error);
    
    // Handle duplicate email error
    if (error.message.includes('Email already in use')) {
        return res.status(409).json({
        status: 'fail',
        message: 'Email is already in use'
        });
    }
    
    next(error);
}
};

/**
 * Update user
 * @route PATCH /api/users/:id
 */
exports.updateUser = async (req, res, next) => {
try {
    const userId = parseInt(req.params.id, 10);
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
        return res.status(404).json({
        status: 'fail',
        message: 'User not found'
        });
    }
    
    // Validate email format if provided
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please provide a valid email address'
        });
        }
    }
    
    // Validate password length if provided
    if (password && password.length < 8) {
        return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters long'
        });
    }
    
    // Validate role if provided
    const validRoles = ['admin', 'superadmin', 'developer'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({
        status: 'fail',
        message: 'Role must be admin, superadmin, or developer'
        });
    }
    
    // Prevent changing own role if not superadmin
    if (
        userId === req.user.id &&
        role && 
        role !== req.user.role && 
        req.user.role !== 'superadmin'
    ) {
    return res.status(403).json({
        status: 'fail',
        message: 'You cannot change your own role'
        });
    }
    
    // Update user
    const updatedUser = await User.update(userId, {
        name,
        email,
        password,
        role
    });
    
    res.status(200).json({
        status: 'success',
        data: updatedUser
    });
    } catch (error) {
    logger.error('Error updating user:', error);
    
    // Handle duplicate email error
    if (error.message.includes('Email already in use')) {
        return res.status(409).json({
        status: 'fail',
        message: 'Email is already in use by another user'
        });
    }
    
    next(error);
    }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 */
exports.deleteUser = async (req, res, next) => {
    try {
    const userId = parseInt(req.params.id, 10);
    
    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
        return res.status(404).json({
        status: 'fail',
        message: 'User not found'
        });
    }
    
    // Prevent users from deleting themselves
    if (userId === req.user.id) {
        return res.status(403).json({
        status: 'fail',
        message: 'You cannot delete your own account'
        });
    }
    
    // Prevent deleting superadmin if not superadmin
    if (existingUser.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
        status: 'fail',
        message: 'Only superadmins can delete other superadmins'
        });
    }
    
    // Delete user
    const result = await User.delete(userId);
    
    if (!result) {
        return res.status(400).json({
        status: 'fail',
        message: 'Failed to delete user'
        });
    }
    
    res.status(200).json({
        status: 'success',
        message: 'User deleted successfully'
    });
    } catch (error) {
    logger.error('Error deleting user:', error);
    
    // Handle specific error for last superadmin
    if (error.message.includes('last superadmin')) {
        return res.status(400).json({
        status: 'fail',
        message: 'Cannot delete the last superadmin account'
        });
    }
    
    next(error);
    }
};