const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Email service for sending various types of emails
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        // Don't initialize immediately - wait until first use
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        try {
            // Check for environment variables first
            if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                logger.info('📧 Using custom SMTP configuration from environment variables');
                this.transporter = nodemailer.createTransport({
                    host: process.env.EMAIL_HOST,
                    port: process.env.EMAIL_PORT || 587,
                    secure: process.env.EMAIL_SECURE === 'true',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                this.isConfigured = true;
            }
            // Gmail configuration for real email sending
            else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
                logger.info('📧 Using Gmail SMTP configuration');
                this.transporter = nodemailer.createTransport({
                    service: 'gmail',
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_APP_PASSWORD
                    }
                });
                this.isConfigured = true;
                logger.info('✅ Gmail SMTP configured for:', process.env.GMAIL_USER);
            }
            // Fallback to demo mode
            else {
                logger.info('⚠️ No email credentials found. Using demo mode.');
                this.transporter = {
                    sendMail: async (mailOptions) => {
                        logger.info('\n📧 DEMO EMAIL (Not actually sent)');
                        logger.info('To:', mailOptions.to);
                        logger.info('Subject:', mailOptions.subject);
                        return { messageId: 'demo-' + Date.now() };
                    }
                };
                this.isConfigured = true;
            }
        } catch (error) {
            logger.error('Error initializing email transporter:', error);
        }
    }

    /**
     * Ensure transporter is initialized
     */
    ensureTransporter() {
        if (!this.transporter) {
            this.initializeTransporter();
        }
    }

    /**
     * Send email verification
     */
    async sendEmailVerification(userEmail, userName, verificationToken) {
        this.ensureTransporter();
        try {
            const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

            const mailOptions = {
                from: process.env.EMAIL_FROM || '"K-Wise Team" <noreply@kwise.com>',
                to: userEmail,
                subject: 'Verify Your K-Wise Account',
                html: this.getEmailVerificationTemplate(userName, verificationLink),
                text: `Dear ${userName}, Welcome to K-Wise! Please verify your email: ${verificationLink}`
            };

            const info = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('Error sending email verification:', error);
            throw error;
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(userEmail, userName, resetToken, resetLink = null) {
        this.ensureTransporter();
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"K-Wise Team" <noreply@kwise.com>',
                to: userEmail,
                subject: 'Reset Your K-Wise Password',
                html: this.getPasswordResetTemplate(userName, resetToken, resetLink),
                text: `Dear ${userName}, Your reset code is: ${resetToken}`
            };

            const info = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('Error sending password reset email:', error);
            throw error;
        }
    }

    /**
     * Email verification template
     */
    getEmailVerificationTemplate(userName, verificationLink) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your K-Wise Account</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #006f51, #00a67d); padding: 40px 20px; text-align: center; }
        .logo-container { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin: 0 auto;
            width: 100%;
        }
        .logo-symbol { 
            width: 80px; 
            height: 80px; 
            background: linear-gradient(135deg, #ffffff, #f8f9fa);
            border: 3px solid #ffffff;
            border-radius: 16px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 32px; 
            font-weight: 900; 
            color: #006f51; 
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            margin: 0 auto;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .content { padding: 40px 20px; }
        .welcome { font-size: 24px; color: #333; margin-bottom: 20px; }
        .message { font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #006f51, #00a67d); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">
                <div class="logo-symbol">KW</div>
            </div>
        </div>
        <div class="content">
            <h2 class="welcome">Welcome to K-Wise!</h2>
            <p class="message">Hello ${userName},</p>
            <p class="message">Thank you for creating your K-Wise account. To complete your registration and start using our services, please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify My Email</a>
            <p class="message">This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.</p>
            <p class="message">If you have any questions, feel free to contact our support team.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 K-Wise. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Password reset template
     */
    getPasswordResetTemplate(userName, resetToken, resetLink = null) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your K-Wise Password</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #006f51, #00a67d); padding: 40px 20px; text-align: center; }
        .logo-container { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin: 0 auto;
            width: 100%;
        }
        .logo-symbol { 
            width: 80px; 
            height: 80px; 
            background: linear-gradient(135deg, #ffffff, #f8f9fa);
            border: 3px solid #ffffff;
            border-radius: 16px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 32px; 
            font-weight: 900; 
            color: #006f51; 
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            margin: 0 auto;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .content { padding: 40px 20px; }
        .title { font-size: 24px; color: #333; margin-bottom: 20px; }
        .message { font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px; }
        .code { background-color: #f8f9fa; border: 2px dashed #006f51; padding: 20px; text-align: center; margin: 20px 0; }
        .code-text { font-size: 32px; font-weight: bold; color: #006f51; letter-spacing: 4px; margin: 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #006f51, #00a67d); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">
                <div class="logo-symbol">KW</div>
            </div>
        </div>
        <div class="content">
            <h2 class="title">Password Reset Request</h2>
            <p class="message">Hello ${userName},</p>
            <p class="message">You requested a password reset for your K-Wise account. Enter this 6-digit code on the password reset page:</p>
            <div class="code">
                <p class="code-text">${resetToken}</p>
            </div>
            <p class="message">Enter this code on the password reset page to set your new password.</p>
            <p class="message">This code will expire in 15 minutes. If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
            <p class="message">For security reasons, never share this code with anyone.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 K-Wise. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
    }
}

module.exports = new EmailService();


