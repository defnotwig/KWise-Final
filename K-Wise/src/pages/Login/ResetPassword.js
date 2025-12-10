import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLock, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { authAPI, handleAPIError } from '../../services/api';
import './Login.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Get email and token from URL parameters
        const emailParam = searchParams.get('email');
        const tokenParam = searchParams.get('token');

        if (emailParam && tokenParam) {
            setEmail(emailParam);
            setToken(tokenParam);
        } else {
            setError('Invalid reset link. Please request a new password reset.');
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!newPassword || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (!email || !token) {
            setError('Invalid reset parameters. Please request a new password reset.');
            return;
        }

        try {
            setIsLoading(true);

            // Call the reset password API
            await authAPI.resetPassword({
                email: email,
                resetToken: token,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            });

            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login', {
                    state: {
                        message: 'Password reset successful! You can now log in with your new password.'
                    }
                });
            }, 3000);

        } catch (err) {
            console.error('Reset password error:', err);
            const errorInfo = handleAPIError(err);
            setError(errorInfo.message || 'Failed to reset password. Please try again or request a new reset link.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate('/login');
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Password Reset Successful!</h1>
                    </div>
                    <div className="success-content">
                        <FiCheckCircle size={64} color="#22c55e" />
                        <p>Your password has been successfully updated.</p>
                        <p>Redirecting to login page...</p>
                        <button
                            onClick={handleBackToLogin}
                            className="auth-button"
                        >
                            Go to Login Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <button
                        onClick={handleBackToLogin}
                        className="back-button"
                    >
                        <FiArrowLeft /> Back to Login
                    </button>
                    <h1>Reset Your Password</h1>
                    <p>Enter your new password below</p>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Account Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            disabled
                            className="form-control disabled"
                        />
                        <small>This is the account that will be updated</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="token">Reset Token</label>
                        <input
                            type="text"
                            id="token"
                            value={token}
                            disabled
                            className="form-control disabled"
                        />
                        <small>Token from your email</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">
                            <FiLock /> New Password
                        </label>
                        <div className="password-input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="form-control"
                                placeholder="Enter your new password"
                                minLength={8}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                        <small>Minimum 8 characters</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            <FiLock /> Confirm New Password
                        </label>
                        <div className="password-input-container">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="form-control"
                                placeholder="Confirm your new password"
                                minLength={8}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={isLoading || !newPassword || !confirmPassword}
                    >
                        {isLoading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Remember your password? <button onClick={handleBackToLogin} className="link-button">Back to Login</button></p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
