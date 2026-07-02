const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const {
        generateCode,
        hashCode,
        verifyCode,
        cleanResetCode,
        generateSessionId
} = require('../utils/passwordResetEnhanced');
const { validatePassword } = require('../utils/passwordPolicy');
const { insertAuditLog } = require('../utils/auditLogHelper');

// Throttling strategy: prefer DB-backed row so attempts persist across instances; fallback to in-memory map if table missing
const memoryThrottle = new Map();
async function recordThrottle(client, email, windowMs = 10 * 60 * 1000, max = 8) {
    const lower = (email || '').toLowerCase();
    if (!lower) return true;
    try {
        const res = await client.query(`
            INSERT INTO password_reset_throttle (email_lower, window_start, attempt_count, last_attempt_at)
            VALUES ($1, NOW(), 1, NOW())
            ON CONFLICT (email_lower)
            DO UPDATE SET 
                attempt_count = CASE 
                    WHEN EXTRACT(EPOCH FROM (NOW() - password_reset_throttle.window_start)) * 1000 > $2 THEN 1
                    ELSE password_reset_throttle.attempt_count + 1 END,
                window_start = CASE 
                    WHEN EXTRACT(EPOCH FROM (NOW() - password_reset_throttle.window_start)) * 1000 > $2 THEN NOW()
                    ELSE password_reset_throttle.window_start END,
                last_attempt_at = NOW()
            RETURNING attempt_count, window_start;`, [lower, windowMs]);
        const attempts = res.rows[0].attempt_count;
        return attempts <= max;
    } catch (error) {
        // Fallback memory throttle if table absent
        logger.debug('Throttle table unavailable, using memory fallback:', error.message);
        const now = Date.now();
        const rec = memoryThrottle.get(lower) || { count: 0, start: now };
        if (now - rec.start > windowMs) { rec.count = 0; rec.start = now; }
        rec.count += 1;
        memoryThrottle.set(lower, rec);
        return rec.count <= max;
    }
}

/**
 * Request password reset - Step 1
 * Generates reset code and sends email
 * @route POST /api/auth/request-reset
 */
exports.requestReset = async (req, res, next) => {
    const { email } = req.body;
    const client = await db.getClient();

    try {
        if (!email) {
            return res.status(400).json({
                status: 'fail',
                message: 'Email address is required'
            });
        }

        // Throttle rapid requests (DB first, else memory)
        const throttleOk = await recordThrottle(client, email);
        if (!throttleOk) {
            try { await insertAuditLog(req.app, { userId: null, action: 'RESET_THROTTLE', entity: 'PASSWORD_RESET', description: `Throttle exceeded for email ${email}`, severity: 'warn', ipAddress: req.ip }); } catch(auditErr) { logger.warn('Audit log failed for RESET_THROTTLE:', auditErr.message); }
            return res.status(429).json({ status: 'fail', message: 'Too many reset attempts. Try again later.' });
        }

        // Find user by email (don't reveal if user exists)
        const userRes = await client.query(
            'SELECT id, name, email, reference_email FROM users WHERE email = $1 OR reference_email = $1',
            [email]
        );

        if (userRes.rowCount === 0) {
            // Don't reveal if user exists or not
            return res.status(200).json({
                status: 'success',
                message: 'If an account exists with that email, a reset code has been sent.',
                sentToEmail: email
            });
        }

        const user = userRes.rows[0];
        const recipientEmail = user.reference_email || user.email;

        await client.query('BEGIN');

        // Mark previous pending resets as expired
        await client.query(
            `UPDATE password_resets 
             SET status = 'expired' 
             WHERE user_id = $1 AND status = 'pending'`,
            [user.id]
        );

        // Generate secure reset code
        const code = generateCode(6);
        const codeHash = hashCode(code);
        const expiresAt = new Date(Date.now() + (process.env.RESET_CODE_TTL_MIN || 15) * 60 * 1000);

        // Insert new reset record
        const insertRes = await client.query(
            `INSERT INTO password_resets 
             (user_id, code_hash, status, created_at, expires_at, attempts, resend_count, last_sent_at)
             VALUES ($1, $2, 'pending', NOW(), $3, 0, 0, NOW())
             RETURNING id`,
            [user.id, codeHash, expiresAt]
        );

        const resetRowId = insertRes.rows[0].id;

        await client.query('COMMIT');

        // AFTER commit: send email with the plain code
        try {
            await emailService.sendPasswordReset(recipientEmail, user.name, code);
            logger.info({
                event: 'password-reset-created',
                resetId: resetRowId,
                userId: user.id,
                email: recipientEmail,
                correlationId: resetRowId
            });

            return res.status(200).json({
                status: 'success',
                message: `A 6-digit reset code has been sent to ${recipientEmail}. Please check your inbox and enter the code below.`,
                sentToEmail: recipientEmail,
                expiresIn: '15 minutes',
                ...(process.env.NODE_ENV === 'test' ? { testCode: code } : {})
            });
        } catch (emailError) {
            logger.error('Email sending failed during password reset:', emailError);
            return res.status(200).json({
                status: 'success',
                message: 'Reset code generated. Email delivery failed; try again shortly or contact support.',
                sentToEmail: recipientEmail,
                expiresIn: '15 minutes',
                ...(process.env.NODE_ENV === 'test' ? { testCode: code } : {})
            });
        }

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Request reset error:', error);
        next(error);
    } finally {
        client.release();
    }
};

/**
 * Verify reset code - Step 2
 * Validates code and returns resetSessionId
 * @route POST /api/auth/verify-reset-code
 */
exports.verifyResetCode = async (req, res, next) => {
    const { email, code } = req.body;
    const client = await db.getClient();

    try {
        if (!email || !code) {
            return res.status(400).json({
                status: 'fail',
                message: 'Email and reset code are required'
            });
        }

        // Clean and validate input
        const cleanedCode = cleanResetCode(code);
        if (!cleanedCode) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide a valid 6-digit reset code'
            });
        }

        // Find user
        const userRes = await client.query(
            'SELECT id FROM users WHERE email = $1 OR reference_email = $1',
            [email]
        );

        if (userRes.rowCount === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid code or expired'
            });
        }

        const userId = userRes.rows[0].id;

        // Select most recent pending reset
        const prRes = await client.query(
            `SELECT id, code_hash, expires_at, attempts, status 
             FROM password_resets 
             WHERE user_id = $1 AND status = 'pending' 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (prRes.rowCount === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid code or expired'
            });
        }

        const resetRow = prRes.rows[0];

        // Check if expired
        if (new Date(resetRow.expires_at) < new Date()) {
            await client.query(
                'UPDATE password_resets SET status = $1 WHERE id = $2',
                ['expired', resetRow.id]
            );
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid code or expired'
            });
        }

        // Verify code using timing-safe comparison
        if (!verifyCode(cleanedCode, resetRow.code_hash)) {
            // Increment attempts
            await client.query(
                'UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1',
                [resetRow.id]
            );

            // Check if max attempts reached
            if (resetRow.attempts + 1 >= 5) {
                await client.query(
                    'UPDATE password_resets SET status = $1 WHERE id = $2',
                    ['expired', resetRow.id]
                );
            }

            try { await insertAuditLog(req.app, { userId: userId, action: 'RESET_CODE_INVALID', entity: 'PASSWORD_RESET', entityId: resetRow.id, description: 'Invalid reset code attempt', severity: 'warn', ipAddress: req.ip }); } catch(auditErr) { logger.warn('Audit log failed for RESET_CODE_INVALID:', auditErr.message); }
            return res.status(400).json({ status: 'fail', message: 'Invalid code or expired' });
        }

        // Code is valid, create resetSessionId
        const resetSessionId = generateSessionId();
        await client.query(
            `UPDATE password_resets 
             SET status = 'verified', reset_session_id = $1 
             WHERE id = $2`,
            [resetSessionId, resetRow.id]
        );

        logger.info({
            event: 'password-reset-verified',
            resetId: resetRow.id,
            userId: userId,
            correlationId: resetRow.id
        });

        return res.status(200).json({
            status: 'success',
            message: 'Reset code verified successfully',
            resetSessionId: resetSessionId
        });

    } catch (error) {
        logger.error('Verify reset code error:', error);
        next(error);
    } finally {
        client.release();
    }
};

/**
 * Reset password - Step 3
 * Uses resetSessionId to update password
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
    const { resetSessionId, newPassword } = req.body;
    const client = await db.getClient();

    try {
        if (!resetSessionId || !newPassword) {
            return res.status(400).json({
                status: 'fail',
                message: 'Reset session ID and new password are required'
            });
        }

        // Centralized password policy
        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.valid) {
            return res.status(400).json({ status: 'fail', message: pwCheck.message });
        }

        await client.query('BEGIN');

        // Lock the password_reset row
        const prRes = await client.query(
            `SELECT id, user_id, status, expires_at 
             FROM password_resets 
             WHERE reset_session_id = $1 FOR UPDATE`,
            [resetSessionId]
        );

        if (prRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid or expired reset session'
            });
        }

        const resetRow = prRes.rows[0];

        // Check status and expiry
        if (resetRow.status !== 'verified' || new Date(resetRow.expires_at) < new Date()) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid or expired reset session'
            });
        }

        // Get user current password hash
        const userRes = await client.query(
            'SELECT password FROM users WHERE id = $1 FOR UPDATE',
            [resetRow.user_id]
        );

        if (userRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        const user = userRes.rows[0];

        // Compare new password with current password using bcrypt
        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            logger.info('❌ User attempted to reuse the same password in controller');
            await client.query('ROLLBACK');
            return res.status(400).json({
                status: 'fail',
                message: 'New password must be different from previous password'
            });
        }

    // Hash new password (adaptive cost)
        const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
        const newHash = await bcrypt.hash(newPassword, saltRounds);

        // Update user password
        await client.query(
            'UPDATE users SET password = $1, password_changed_at = NOW() WHERE id = $2',
            [newHash, resetRow.user_id]
        );

        // Mark reset as used
        await client.query(
            `UPDATE password_resets 
             SET status = 'used', used_at = NOW() 
             WHERE id = $1`,
            [resetRow.id]
        );

        await client.query('COMMIT');

    logger.info({ event: 'password-reset-completed', resetId: resetRow.id, userId: resetRow.user_id, correlationId: resetRow.id });
    try { await insertAuditLog(req.app, { userId: resetRow.user_id, action: 'PASSWORD_RESET', entity: 'USER', entityId: resetRow.user_id, description: 'User password reset via enhanced flow', severity: 'info', ipAddress: req.ip }); } catch(auditErr) { logger.warn('Audit log failed for PASSWORD_RESET:', auditErr.message); }

        return res.status(200).json({
            status: 'success',
            message: 'Password reset successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Reset password error:', error);
        next(error);
    } finally {
        client.release();
    }
};
