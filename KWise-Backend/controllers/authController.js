const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const config = require('../config/config');
const logger = require('../utils/logger');
const { updateLastLogin } = require('../middleware/auth');
const emailService = require('../services/emailService');
const crypto = require('node:crypto');
const db = require('../config/db');
const isTest = process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH_FOR_TESTS === 'true';
const testUsers = new Map(); // email -> { password, name, role, id }
const {
    generateResetCode,
    validateResetCode,
    constantTimeCompare,
    cleanResetCode,
    generateSessionId
} = require('../utils/passwordReset');
const { validatePassword } = require('../utils/passwordPolicy');
const { setCsrfCookie, clearCsrfCookie } = require('../middleware/csrfProtection');

/**
 * Generate JWT token
 * @param {number} id - User ID
 * @returns {string} - JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: config.jwt.issuer
    });
};

const shouldReturnLegacyToken = () => process.env.NODE_ENV === 'test' || process.env.RETURN_AUTH_TOKEN === 'true';

const setAuthCookies = (res, token) => {
    res.cookie('jwt', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
    });

    return setCsrfCookie(res);
};

const clearAuthCookies = (res) => {
    res.clearCookie('jwt', { path: '/' });
    clearCsrfCookie(res);
};

const sanitizeUser = (user = {}) => {
    const {
        password: _password,
        password_hash: _passwordHash,
        password_reset_token: _resetToken,
        password_reset_expires: _resetExpires,
        reset_token: _legacyResetToken,
        reset_token_expires: _legacyResetExpires,
        email_verification_token: _emailVerificationToken,
        two_factor_secret: _twoFactorSecret,
        two_factor_recovery_codes: _twoFactorRecoveryCodes,
        refresh_token: _refreshToken,
        session_token: _sessionToken,
        api_key: _apiKey,
        api_key_hash: _apiKeyHash,
        ...safeUser
    } = user;

    return safeUser;
};

// --- Helper: handle login in test mode ---
function handleTestLogin(req, res) {
    const { email, password } = req.body;
    const existing = email ? testUsers.get(email) : null;

    if (existing) {
        if (existing.password !== password) {
            return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
        }
        const token = generateToken(existing.id);
        const csrfToken = setAuthCookies(res, token);
        return res.status(200).json({
            status: 'success',
            ...(shouldReturnLegacyToken() ? { token } : {}),
            csrfToken,
            user: { id: existing.id, name: existing.name, email, role: existing.role }
        });
    }

    // Auto-provision a user in test mode for convenience
    const newUser = {
        id: testUsers.size + 1,
        name: req.body.name || 'Test Admin',
        password: password,
        role: 'admin'
    };
    testUsers.set(email, newUser);
    const token = generateToken(newUser.id);
    const csrfToken = setAuthCookies(res, token);
    return res.status(200).json({
        status: 'success',
        ...(shouldReturnLegacyToken() ? { token } : {}),
        csrfToken,
        user: { id: newUser.id, name: newUser.name, email, role: newUser.role }
    });
}

// --- Helper: validate registration input, returns error message or null ---
function validateRegistrationInput(name, email, password, role) {
    if (!name || !email || !password) {
        return 'Please provide name, email, and password';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Please provide a valid email address';
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
        return pwCheck.message;
    }
    const validRoles = ['admin', 'superadmin', 'developer'];
    if (role && !validRoles.includes(role)) {
        return 'Role must be admin, superadmin, or developer';
    }
    return null;
}

// --- Helper: validate reset password input, returns { status, message } or null ---
function validateResetPasswordInput(cleanedToken, newPassword, confirmPassword) {
    if (!cleanedToken) {
        return { status: 400, message: 'Please provide a valid 6-digit reset code' };
    }
    if (!newPassword || !confirmPassword) {
        return { status: 400, message: 'Please provide new password and confirm password' };
    }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
        return { status: 400, message: pwCheck.message };
    }
    if (newPassword !== confirmPassword) {
        return { status: 400, message: 'New password and confirm password do not match' };
    }
    return null;
}

// --- Helper: find user by reset token using multiple strategies ---
async function findUserByResetToken(cleanedToken, email) {
    // Strategy 1: Direct token lookup with pending status
    let user = await User.findByValidResetToken(cleanedToken);
    logger.info('Strategy 1 (pending tokens):', user ? 'Found user' : 'No user found');
    if (user) return user;

    // Strategy 2: Email + token lookup with flexible status
    if (email) {
        logger.info('Strategy 2: Trying email + token lookup...');
        const result = await db.query(
            `SELECT id, name, email, password, role, reference_email, 
                    password_reset_token, password_reset_expires, reset_attempts, reset_status
             FROM users 
             WHERE (email = $1 OR reference_email = $1)
               AND password_reset_token = $2
               AND password_reset_expires > NOW()
               AND (reset_status = 'pending' OR reset_status = 'none' OR reset_status IS NULL)
               AND reset_attempts < 5`,
            [email, cleanedToken]
        );
        user = result.rows[0] || null;
        logger.info('Strategy 2 result:', user ? 'Found user' : 'No user found');
        if (user) return user;
    }

    // Strategy 3: Token-only lookup with flexible status
    logger.info('Strategy 3: Trying token-only lookup...');
    const flexibleResult = await db.query(
        `SELECT id, name, email, password, role, reference_email, 
                password_reset_token, password_reset_expires, reset_attempts, reset_status
         FROM users 
         WHERE password_reset_token = $1 
           AND password_reset_expires > NOW()
           AND reset_attempts < 5
           AND (reset_status != 'expired')`,
        [cleanedToken]
    );
    user = flexibleResult.rows[0] || null;
    logger.info('Strategy 3 result:', user ? 'Found user' : 'No user found');
    return user;
}

// --- Helper: diagnose token lookup failure, returns { status, message } or null ---
async function diagnoseTokenFailure(cleanedToken) {
    const expCheck = await db.query(
        `SELECT id, password_reset_expires, reset_attempts, reset_status,
                password_reset_expires > NOW() as not_expired
         FROM users 
         WHERE password_reset_token = $1`,
        [cleanedToken]
    );

    logger.info('Token existence check result:', expCheck.rows);

    if (expCheck.rows.length === 0) {
        return { status: 400, message: 'Your code is invalid or expired. Please click Resend to get a new code.' };
    }

    const tokenData = expCheck.rows[0];

    if (tokenData.reset_attempts >= 5) {
        return { status: 400, message: 'Reset code has been used too many times. Please request a new code.' };
    }
    if (tokenData.reset_status === 'expired' || !tokenData.not_expired) {
        return { status: 400, message: 'Reset code has expired. Please request a new code.' };
    }
    if (tokenData.reset_status === 'used') {
        await User.incrementResetAttempts(tokenData.id);
        return { status: 400, message: 'This reset code has already been used. Please request a new code if you need to reset your password again.' };
    }

    // Increment attempts for undiagnosed failure
    await User.incrementResetAttempts(tokenData.id);
    return { status: 400, message: 'Your code is invalid or expired. Please click Resend to get a new code.' };
}

/**
 * User login
 * @route POST /api/auth/login
 */
exports.login = async (req, res, next) => {
    try {
        if (isTest && process.env.BYPASS_AUTH_FOR_TESTS === 'true') {
            return handleTestLogin(req, res);
        }

        const { email, password } = req.body;

        // Extract client IP for failed login tracking
        const { extractClientIP, trackFailedLogin, resetFailedLogins } = require('../middleware/ipFirewall');
        const clientIP = extractClientIP(req);

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and password'
            });
        }

        // Check if user exists
        const user = await User.findByEmail(email);
        if (!user) {
            // Track failed login attempt
            await trackFailedLogin(clientIP);
            
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid email or password'
            });
        }

        // Check if password is correct
        const isPasswordCorrect = await User.comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            // Track failed login attempt
            await trackFailedLogin(clientIP);
            
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid email or password'
            });
        }

        // Reset failed login count on successful login
        await resetFailedLogins(clientIP);

        // Update last login + activity with enhanced admin tracking
        try {
            const { updateLoginActivity } = require('../middleware/adminActivityTracker');
            
            // Use enhanced login activity tracking
            await updateLoginActivity(user.id, user.role);
            
            // Legacy support - keep existing updateLastLogin call for compatibility
            await updateLastLogin(user.id); 
        } catch (e) {
            logger.warn('Partial login activity update issue:', e.message);
        }

        // Log successful login using helper
        try {
            const { insertAuditLog } = require('../utils/auditLogHelper');
            await insertAuditLog(req.app, {
                userId: user.id,
                action: 'LOGIN',
                entity: 'auth',
                description: `User ${user.name} logged in successfully`,
                severity: 'INFO',
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent') || 'Unknown',
                userName: user.name,
                userRole: user.role
            });
        } catch (auditError) {
            logger.error('Failed to log login audit:', auditError);
        }

        // Generate token
        const token = generateToken(user.id);
        const csrfToken = setAuthCookies(res, token);

        // Send response
        res.status(200).json({
            status: 'success',
            ...(shouldReturnLegacyToken() ? { token } : {}),
            csrfToken,
            user: sanitizeUser(user)
        });
    } catch (error) {
        logger.error('Login error:', error);
        next(error);
    }
};

/**
 * Get current user
 * @route GET /api/auth/me
 */
exports.getCurrentUser = async (req, res, next) => {
    try {
        // User is already set in req.user by auth middleware
        res.status(200).json({
            status: 'success',
            authenticated: true,
            data: sanitizeUser(req.user),
            csrfToken: setCsrfCookie(res, req.cookies?.kwise_csrf)
        });
    } catch (error) {
        logger.error('Get current user error:', error);
        next(error);
    }
};

exports.getGuestSession = (req, res) => {
    res.status(200).json({
        status: 'guest',
        authenticated: false,
        data: null,
        user: null,
        csrfToken: setCsrfCookie(res, req.cookies?.kwise_csrf)
    });
};

/**
 * Change password
 * @route PATCH /api/auth/change-password
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Check if passwords are provided
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide current password and new password'
            });
        }

        // Get user with password
        const user = await User.findByEmail(req.user.email);

        // Check if current password is correct
        const isPasswordCorrect = await User.comparePassword(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                status: 'fail',
                message: 'Current password is incorrect'
            });
        }

        // Validate new password
        if (newPassword.length < 8) {
            return res.status(400).json({
                status: 'fail',
                message: 'Password must be at least 8 characters long'
            });
        }

        // Update password
        await User.update(user.id, { password: newPassword });

        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully'
        });
    } catch (error) {
        logger.error('Change password error:', error);
        next(error);
    }
};

/**
 * Logout
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        // If user is authenticated, update their active status immediately
        if (req.user?.id) {
            const { updateLogoutActivity } = require('../middleware/adminActivityTracker');
            
            // Use enhanced logout activity tracking
            const logoutSuccess = await updateLogoutActivity(req.user.id);
            
            if (logoutSuccess) {
                logger.info(`User logged out successfully: ${req.user.name} (${req.user.email})`, {
                    service: 'pc-wise-admin',
                    userId: req.user.id,
                    action: 'logout',
                    realTimeUpdate: true
                });
            }

            // Log logout audit trail
            try {
                const { insertAuditLog } = require('../utils/auditLogHelper');
                await insertAuditLog(req.app, {
                    userId: req.user.id,
                    action: 'LOGOUT',
                    entity: 'auth',
                    description: `User ${req.user.name} logged out - immediate status update`,
                    severity: 'INFO',
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent') || 'Unknown',
                    userName: req.user.name,
                    userRole: req.user.role
                });
            } catch (auditError) {
                logger.error('Failed to log logout audit:', auditError);
            }
        }

        clearAuthCookies(res);

        res.status(200).json({
            status: 'success',
            message: 'Logged out successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error(`Logout error: ${error.message}`, {
            service: 'pc-wise-admin',
            userId: req.user?.id,
            error: error.message
        });

        // Still return success even if database update fails
        // to prevent logout issues for users
        clearAuthCookies(res);
        res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    }
};

/**
 * Register new user (create account)
 * @route POST /api/auth/register
 */
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role = 'admin' } = req.body;
        if (!req.user || req.user.role !== 'superadmin') {
            return res.status(403).json({
                status: 'fail',
                message: 'Only superadmins can create accounts from this endpoint'
            });
        }

        if (isTest && process.env.BYPASS_AUTH_FOR_TESTS === 'true') {
            if (testUsers.has(email)) {
                return res.status(409).json({ status: 'fail', message: 'Email is already in use' });
            }
            testUsers.set(email, { id: testUsers.size + 1, name, password, role });
            return res.status(201).json({
                status: 'success',
                message: 'Account created (test mode)',
                data: {
                    user: sanitizeUser({ id: testUsers.size, name, email, role, emailVerified: true })
                },
                requiresEmailVerification: false
            });
        }

        // Validate all inputs via helper
        const validationError = validateRegistrationInput(name, email, password, role);
        if (validationError) {
            return res.status(400).json({ status: 'fail', message: validationError });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                status: 'fail',
                message: 'Email is already in use'
            });
        }

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');

        // Create user with email verification token
        const newUser = await User.create({
            name,
            email,
            password,
            role,
            email_verification_token: emailVerificationToken,
            email_verified: false
        });

        if (!newUser?.id) {
            logger.error('Register: User.create returned invalid object', { newUser });
            return res.status(500).json({ status: 'error', message: 'Failed to create user account' });
        }

        // Send email verification
        try {
            await emailService.sendEmailVerification(email, name, emailVerificationToken);

            res.status(201).json({
                status: 'success',
                message: 'Account created successfully! Please check your email to verify your account.',
                data: {
                    user: {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        role: newUser.role,
                        emailVerified: false
                    }
                },
                requiresEmailVerification: true
            });
        } catch (emailError) {
            logger.error('Email sending failed during registration:', emailError);

            // Still create the account but inform user about email issue
            res.status(201).json({
                status: 'success',
                message: 'Account created successfully! Email verification will be sent shortly.',
                data: {
                    user: {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        role: newUser.role,
                        emailVerified: false
                    }
                },
                requiresEmailVerification: true,
                emailError: 'Email verification will be sent shortly'
            });
        }
    } catch (error) {
        logger.error('Registration error:', error);
        // Normalize duplicate email detection
        if (error && /email.*in use/i.test(error.message)) {
            return res.status(409).json({ status: 'fail', message: 'Email is already in use' });
        }
        return res.status(500).json({ status: 'error', message: 'Registration failed' });
    }
};

/**
 * Forgot password - send reset token with enhanced security
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email address'
            });
        }

        // Find user by reference email first, then by primary email
        let user = await User.findByReferenceEmail(email);
        if (!user) {
            user = await User.findByEmail(email);
        }

        if (!user) {
            // Don't reveal if user exists or not
            return res.status(200).json({
                status: 'success',
                message: 'If an account exists with that email, a reset code has been sent.',
                sentToEmail: email,
                expiresIn: '15 minutes'
            });
        }

        // Check rate limiting
        const canRequest = await User.canRequestReset(user.id, 120); // 120 second cooldown to prevent abuse
        if (!canRequest) {
            return res.status(429).json({
                status: 'fail',
                message: 'Please wait 2 minutes before requesting another reset code.'
            });
        }

        // Choose recipient: prefer reference_email, fallback to primary email
        const recipientEmail = user.reference_email || user.email;

        // Generate secure 6-digit reset code (preserves leading zeros)
        const resetToken = generateResetCode();
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Persist reset token to DB with enhanced security
        await User.savePasswordResetToken(user.id, resetToken, resetTokenExpiry);

        // Send password reset email
        try {
            await emailService.sendPasswordReset(recipientEmail, user.name, resetToken);
            logger.info(`Password reset email sent to ${recipientEmail} for user ${user.id}`);

            return res.status(200).json({
                status: 'success',
                message: `A 6-digit reset code has been sent to ${recipientEmail}. Please check your inbox and enter the code below.`,
                sentToEmail: recipientEmail,
                expiresIn: '15 minutes'
            });
        } catch (emailError) {
            logger.error('Email sending failed during password reset:', emailError);
            return res.status(200).json({
                status: 'success',
                message: 'Reset code generated. Email delivery failed; try again shortly or contact support.',
                sentToEmail: recipientEmail,
                expiresIn: '15 minutes'
            });
        }
    } catch (error) {
        logger.error('Forgot password error:', error);
        next(error);
    }
};

/**
 * Reset password with token - enhanced security version
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
    try {
        logger.info('Reset password request received for email:', req.body.email || '(not provided)');
        const { resetToken, newPassword, confirmPassword } = req.body;

        // Clean and validate input
        const cleanedToken = cleanResetCode(resetToken);
        logger.info('Original token:', resetToken, 'Cleaned token:', cleanedToken);
        
        const inputError = validateResetPasswordInput(cleanedToken, newPassword, confirmPassword);
        if (inputError) {
            return res.status(inputError.status).json({ status: 'fail', message: inputError.message });
        }

        // Find user via multiple token lookup strategies
        const user = await findUserByResetToken(cleanedToken, req.body.email);

        if (!user) {
            logger.info('All token lookup strategies failed, checking for token existence...');
            const diagnosis = await diagnoseTokenFailure(cleanedToken);
            return res.status(diagnosis.status).json({ status: 'fail', message: diagnosis.message });
        }

        logger.info('Found user for password reset:', { 
            id: user.id, 
            email: user.email, 
            reference_email: user.reference_email,
            reset_status: user.reset_status 
        });

        // Skip password comparison to avoid timeout and allow password reset
        logger.info('✅ Proceeding with password reset (skipping same-password check for better UX)...');

        logger.info('Proceeding with password update...');
        
        // Update password first
        await User.update(user.id, { password: newPassword });
        logger.info('Password updated successfully');

        // Only mark as used and clear token AFTER successful password update
        await User.markResetUsed(user.id);
        await User.clearPasswordResetToken(user.id);
        logger.info('Reset token marked as used and cleared');

        logger.info(`Password reset successful for user ${user.id}`);

        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully. You can now login with your new password.',
            redirect: '/login'
        });
    } catch (error) {
        logger.error('Reset password error:', error);
        next(error);
    }
};

/**
 * Verify two-factor authentication
 * @route POST /api/auth/verify-2fa
 */
exports.verifyTwoFactor = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and verification code'
            });
        }

        // Check if user exists
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid verification request'
            });
        }

        // For demo purposes, accept any 6-digit code starting with '12'
        if (code.length !== 6 || !code.startsWith('12')) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid verification code'
            });
        }

        // Generate token for successful 2FA
        const token = generateToken(user.id);
        const csrfToken = setAuthCookies(res, token);

        res.status(200).json({
            status: 'success',
            message: 'Two-factor authentication successful',
            ...(shouldReturnLegacyToken() ? { token } : {}),
            csrfToken,
            data: {
                user: sanitizeUser(user)
            }
        });
    } catch (error) {
        logger.error('2FA verification error:', error);
        next(error);
    }
};

/**
 * Verify email address
 * @route POST /api/auth/verify-email
 */
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                status: 'fail',
                message: 'Verification token is required'
            });
        }

        // Find user with this verification token
        const user = await User.findOne({ email_verification_token: token });
        if (!user) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid or expired verification token'
            });
        }

        // Update user as verified
        await User.update(user.id, {
            email_verified: true,
            email_verification_token: null
        });

        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully! You can now log in.',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    emailVerified: true
                }
            }
        });
    } catch (error) {
        logger.error('Email verification error:', error);
        next(error);
    }
};

/**
 * Update reference email for password recovery
 * @route PATCH /api/auth/update-reference-email
 */
exports.updateReferenceEmail = async (req, res, next) => {
    try {
        const { currentEmail, newReferenceEmail } = req.body;
        const userId = req.user.id;

        // Validate inputs
        if (!currentEmail || !newReferenceEmail) {
            return res.status(400).json({
                status: 'fail',
                message: 'Current email and new reference email are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newReferenceEmail)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide a valid reference email address'
            });
        }

        // Check if user exists and current email matches
        const user = await User.findById(userId);
        if (!user || user.email !== currentEmail) {
            return res.status(400).json({
                status: 'fail',
                message: 'Current email does not match user account'
            });
        }

        // Update reference email in database
        const updateQuery = `
            UPDATE users 
            SET reference_email = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 AND email = $3
            RETURNING id, name, email, reference_email
        `;
        
        const result = await db.query(updateQuery, [newReferenceEmail, userId, currentEmail]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Failed to update reference email'
            });
        }

        const updatedUser = result.rows[0];

        logger.info(`Reference email updated for user ${updatedUser.email} to ${newReferenceEmail}`, {
            service: 'pc-wise-admin',
            userId: updatedUser.id
        });

        res.status(200).json({
            status: 'success',
            message: 'Reference email updated successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    referenceEmail: updatedUser.reference_email
                }
            }
        });

    } catch (error) {
        logger.error('Reference email update error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating reference email'
        });
    }
};
