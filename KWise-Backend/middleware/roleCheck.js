/**
 * Middleware to check user roles
 */

/**
 * Check if user has admin/superadmin role
 */
exports.isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
        });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action.'
        });
    }
    
    next();
};
/**
   * Check if user is superadmin
*/
exports.isSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
        });
    }
    
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
        status: 'fail',
        message: 'This action requires superadmin privileges.'
        });
    }
    
    next();
};
/**
   * Check if user has developer access
*/
    exports.isDeveloper = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
        });
    }
    
    if (req.user.role !== 'developer' && req.user.role !== 'superadmin') {
        return res.status(403).json({
        status: 'fail',
        message: 'This action requires developer privileges.'
        });
    }
    
    next();
};
/**
   * Check if user has permission to access resource
   * @param {Function} checkFunction - Function to check if user has permission
   */
exports.hasPermission = (checkFunction) => {
    return async (req, res, next) => {
        if (!req.user) {
        return res.status(401).json({
            status: 'fail',
            message: 'You are not logged in. Please log in to get access.'
        });
    }
    try {
        const hasPermission = await checkFunction(req);
        
        if (!hasPermission) {
        return res.status(403).json({
            status: 'fail',
            message: 'You do not have permission to perform this action.'
        });
    }
        next();
    } catch (err) {
        next(err);
    }
    };
};

/**
 * Role-based access control middleware factory
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the resource
 * @returns {Function} Middleware function
 */
exports.roleCheck = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in. Please log in to get access.'
            });
        }

        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                status: 'fail',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};