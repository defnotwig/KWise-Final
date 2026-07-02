import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiMail, FiShield, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { getServerBaseUrl } from '../utils/networkConfig';
import './ReferenceEmailManager.css';

const ReferenceEmailManager = ({ currentUser, onUpdateComplete }) => {
    const [referenceEmail, setReferenceEmail] = useState(currentUser?.referenceEmail || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        setMessage({ type: '', text: '' });

        if (!referenceEmail?.trim()) {
            setMessage({ type: 'error', text: 'Please enter a reference email address' });
            setIsUpdating(false);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(referenceEmail)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            setIsUpdating(false);
            return;
        }

        if (referenceEmail === currentUser?.email) {
            setMessage({ type: 'error', text: 'Reference email should be different from your login email for security' });
            setIsUpdating(false);
            return;
        }

        try {
            const response = await fetch(`${getServerBaseUrl()}/api/auth/update-reference-email`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentEmail: currentUser.email,
                    newReferenceEmail: referenceEmail
                })
            });

            const result = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Reference email updated successfully!' });
                if (onUpdateComplete) {
                    onUpdateComplete(referenceEmail);
                }
                setTimeout(() => {
                    setMessage({ type: '', text: '' });
                }, 3000);
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to update reference email' });
            }
        } catch (error) {
            console.error('Error updating reference email:', error);
            setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="reference-email-manager">
            <div className="manager-header">
                <div className="header-icon">
                    <FiShield />
                </div>
                <div className="header-content">
                    <h2>Set Up Reference Email for Password Recovery</h2>
                    <p>Configure a backup email address for secure password recovery</p>
                </div>
            </div>

            <div className="current-account-info">
                <h3><FiMail /> Current Account Information</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <strong>Login Email:</strong>
                        <span>{currentUser?.email}</span>
                    </div>
                    <div className="info-item">
                        <strong>Name:</strong>
                        <span>{currentUser?.name}</span>
                    </div>
                    <div className="info-item">
                        <strong>Role:</strong>
                        <span className="role-badge">{currentUser?.role}</span>
                    </div>
                    <div className="info-item">
                        <strong>Current Reference Email:</strong>
                        <span className={currentUser?.referenceEmail ? 'has-reference' : 'no-reference'}>
                            {currentUser?.referenceEmail || 'Not set'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="reference-email-form-container">
                <h3>Update Reference Email</h3>
                <p className="form-description">
                    Your reference email will be used for password recovery. Make sure it's an email
                    address you have access to and is different from your login email.
                </p>

                <form onSubmit={handleSubmit} className="reference-email-form">
                    <div className="form-group">
                        <label htmlFor="referenceEmail">
                            <FiMail /> Reference Email Address
                        </label>
                        <input
                            type="email"
                            id="referenceEmail"
                            value={referenceEmail}
                            onChange={(e) => setReferenceEmail(e.target.value)}
                            placeholder="Enter your backup email address"
                            required
                            disabled={isUpdating}
                            className="form-input"
                        />
                    </div>

                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isUpdating}
                    >
                        {isUpdating ? 'Updating...' : 'Update Reference Email'}
                    </button>
                </form>
            </div>

            <div className="info-section">
                <h3>Important Information</h3>
                <div className="info-cards">
                    <div className="info-card">
                        <div className="card-icon">🔐</div>
                        <h4>Password Recovery</h4>
                        <p>Use your reference email when you forget your password and need to reset it.</p>
                    </div>
                    <div className="info-card">
                        <div className="card-icon">✉️</div>
                        <h4>Email Access</h4>
                        <p>Make sure you have access to the reference email address you provide.</p>
                    </div>
                    <div className="info-card">
                        <div className="card-icon">🛡️</div>
                        <h4>Security</h4>
                        <p>Use a different email from your login email for enhanced security.</p>
                    </div>
                </div>
            </div>

            <div className="usage-guide">
                <h3>How to Use Your Reference Email</h3>
                <ol>
                    <li>Go to the login page and click "Forgot Password"</li>
                    <li>Enter your <strong>reference email</strong> (not your login email)</li>
                    <li>Check your reference email for the reset code</li>
                    <li>Use the code to set a new password</li>
                    <li>Login with your original email and new password</li>
                </ol>
            </div>
        </div>
    );
};

ReferenceEmailManager.propTypes = {
    currentUser: PropTypes.shape({
        email: PropTypes.string,
        name: PropTypes.string,
        role: PropTypes.string,
        referenceEmail: PropTypes.string,
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    onUpdateComplete: PropTypes.func,
};

export default ReferenceEmailManager;
