const express = require('express');
const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

const optionalCurrentUser = (req, res, next) => {
    if (!req.cookies?.jwt && !req.headers.authorization) {
        return authController.getGuestSession(req, res, next);
    }

    return protect(req, res, next);
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get logged in user
 * @access  Private
 */
router.get('/me', optionalCurrentUser, authController.getCurrentUser);

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Change current user password
 * @access  Private
 */
router.patch('/change-password', protect, authController.changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client side)
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token and get user data
 * @access  Private
 */
router.get('/verify', protect, authController.getCurrentUser);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (create account)
 * @access  Superadmin
 */
router.post('/register', protect, restrictTo('superadmin'), authController.register);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email/OTP (legacy)
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP/token (legacy)
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/auth/request-reset
 * @desc    Request password reset (Step 1) - Enhanced flow
 * @access  Public
 */
router.post('/request-reset', passwordResetController.requestReset);

/**
 * @route   POST /api/auth/verify-reset-code
 * @desc    Verify reset code (Step 2) - Enhanced flow
 * @access  Public
 */
router.post('/verify-reset-code', passwordResetController.verifyResetCode);

/**
 * @route   POST /api/auth/reset-password-enhanced
 * @desc    Reset password with session ID (Step 3) - Enhanced flow
 * @access  Public
 */
router.post('/reset-password-enhanced', passwordResetController.resetPassword);

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify two-factor authentication code
 * @access  Public
 */
router.post('/verify-2fa', authController.verifyTwoFactor);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address with token
 * @access  Public
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @route   PATCH /api/auth/update-reference-email
 * @desc    Update reference email for password recovery
 * @access  Private
 */
router.patch('/update-reference-email', protect, authController.updateReferenceEmail);

module.exports = router;
