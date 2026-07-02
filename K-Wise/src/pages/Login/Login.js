import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiShield, FiUser, FiKey, FiCheck, FiX } from 'react-icons/fi';
import logo from "../../assets/logo.webp";
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, handleAPIError } from '../../services/api';
import { getApiBaseUrl } from '../../utils/networkConfig';
import './Login.css';

const LoginEnhanced = () => {
    const [email, setEmail] = useState('admin@pcwise.com');
    const [password, setPassword] = useState('Admin@123');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [statusMessage, setStatusMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isTypingEmail, setIsTypingEmail] = useState(false);
    const typingTimeoutRef = useRef(null);
    // Initialize currentView from localStorage or default to 'login'
    const getInitialView = () => {
        const savedView = localStorage.getItem('kwise_current_view');
        if (savedView && ['login', 'forgot-password', 'create-account', 'two-factor'].includes(savedView)) {
            return savedView;
        }
        return 'login';
    };

    const [currentView, setCurrentView] = useState(getInitialView); // login, forgot-password, two-factor, create-account

    // Save current view to localStorage whenever it changes and clear status messages
    useEffect(() => {
        localStorage.setItem('kwise_current_view', currentView);

        // Clear reset step when navigating away from forgot password
        if (currentView !== 'forgot-password') {
            localStorage.removeItem('kwise_reset_step');
            setIsOtpSent(false);
            setShowResetCodeStep(false);
            setResetEmail('');
            setResetCode('');
            setNewPassword('');
            setConfirmPassword('');
        }

        // Clear create account data when navigating away
        if (currentView !== 'create-account') {
            setCreateAccountData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'developer',
                referenceEmail: ''
            });
        }

        // COMPREHENSIVE alert/status message clearing
        // Clear ALL status messages and errors when switching views
        setStatusMessage('');
        setError('');
        
        // Clear loading states when changing views
        setIsLoading(false);
        
        // Only log view changes in development and reduce frequency
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('View changed to:', currentView);
        }
    }, [currentView]);

    // Initialize reset password step from localStorage
    const getInitialResetStep = () => {
        const savedStep = localStorage.getItem('kwise_reset_step');
        return savedStep === 'code' ? true : false;
    };

    const [showResetCodeStep, setShowResetCodeStep] = useState(getInitialResetStep);

    // Save reset step to localStorage whenever it changes
    useEffect(() => {
        if (currentView === 'forgot-password') {
            localStorage.setItem('kwise_reset_step', showResetCodeStep ? 'code' : 'email');
        }
    }, [showResetCodeStep, currentView]);
    // eslint-disable-next-line no-unused-vars
    const [isOtpSent, setIsOtpSent] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showResetPwdPopup, setShowResetPwdPopup] = useState(false);
    const [showDemoAccountsPopup, setShowDemoAccountsPopup] = useState(false);
    const [resendSeconds, setResendSeconds] = useState(0);
    // eslint-disable-next-line no-unused-vars
    const [lastResetAttemptAt, setLastResetAttemptAt] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [savedAccounts, setSavedAccounts] = useState([]);
    const [autoLogin, setAutoLogin] = useState(false);
    const isResetSubmittingRef = useRef(false);

    // Password strength and validation
    const [passwordRequirements, setPasswordRequirements] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        symbol: false
    });

    const checkPasswordRequirements = (pwd) => {
        return {
            length: pwd.length >= 8,
            uppercase: /[A-Z]/.test(pwd),
            lowercase: /[a-z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            symbol: /[^A-Za-z0-9]/.test(pwd)
        };
    };

    // Update password strength when password changes
    useEffect(() => {
        const requirements = checkPasswordRequirements(newPassword);
        setPasswordRequirements(requirements);
    }, [newPassword]);

    // Create account form
    const [createAccountData, setCreateAccountData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'developer',
        referenceEmail: ''
    });
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
    const [showCreatePwdPopup, setShowCreatePwdPopup] = useState(false);
    const [createPasswordRequirements, setCreatePasswordRequirements] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        symbol: false
    });

    // Update create account password strength
    useEffect(() => {
        const requirements = checkPasswordRequirements(createAccountData.password);
        setCreatePasswordRequirements(requirements);
    }, [createAccountData.password]);

    // Load remembered email and saved accounts on component mount
    useEffect(() => {
        // Migrate any legacy saved credentials to email-only data.
        const savedCredentials = localStorage.getItem('kwise_credentials');
        if (savedCredentials) {
            try {
                const { email: savedEmail, rememberMe: savedRememberMe } = JSON.parse(savedCredentials);
                if (savedRememberMe && savedEmail) {
                    setEmail(savedEmail);
                    setRememberMe(true);
                    console.log('Loaded remembered email for:', savedEmail);
                }
            } catch (error) {
                console.error('Error loading remembered email:', error);
            } finally {
                localStorage.removeItem('kwise_credentials');
            }
        }
        
        // Load saved accounts list
        try {
            const savedAccountsData = localStorage.getItem('kwise_saved_accounts');
            if (savedAccountsData) {
                const accounts = JSON.parse(savedAccountsData);
                const safeAccounts = accounts
                    .filter((account) => account?.email)
                    .map(({ email, rememberMe, savedAt }) => ({ email, rememberMe: Boolean(rememberMe), savedAt }));
                localStorage.setItem('kwise_saved_accounts', JSON.stringify(safeAccounts));
                setSavedAccounts(safeAccounts);
            }
        } catch (error) {
            console.error('Error loading saved accounts:', error);
            localStorage.removeItem('kwise_saved_accounts');
        }
        
        // Check auto login setting
        const autoLoginSetting = localStorage.getItem('kwise_auto_login') === 'true';
        setAutoLogin(autoLoginSetting);
    }, []);    const { login, apiAvailable, currentUser, updateCurrentUser } = useAuth();

    // Function to handle selection of saved account
    const selectSavedAccount = (account) => {
        setEmail(account.email);
        setPassword('');
        setRememberMe(true);
    };
    
    // Function to remove a saved account
    const removeSavedAccount = (accountEmail) => {
        const updatedAccounts = savedAccounts.filter(account => account.email !== accountEmail);
        localStorage.setItem('kwise_saved_accounts', JSON.stringify(updatedAccounts));
        setSavedAccounts(updatedAccounts);
        
        // If this was the current credentials, clear them
        if (email === accountEmail) {
            localStorage.removeItem('kwise_credentials');
            setEmail('');
            setPassword('');
        }
    };
    
    // Function to toggle auto login setting
    const toggleAutoLogin = () => {
        const newAutoLogin = !autoLogin;
        setAutoLogin(newAutoLogin);
        localStorage.setItem('kwise_auto_login', newAutoLogin.toString());
    };

    // Function to handle remember me checkbox change
    const handleRememberMeChange = (checked) => {
        setRememberMe(checked);
        if (!checked) {
            // Clear saved login preference if user unchecks remember me
            localStorage.removeItem('kwise_credentials');
            console.log('Remember me disabled - saved login preference cleared');
        } else if (email) {
            // Save email-only account metadata. Passwords are never persisted.
            const accountExists = savedAccounts.some(account => account.email === email);
            if (!accountExists && email) {
                const newAccount = {
                    email,
                    rememberMe: true,
                    savedAt: new Date().toISOString()
                };
                
                const updatedAccounts = [...savedAccounts, newAccount];
                localStorage.setItem('kwise_saved_accounts', JSON.stringify(updatedAccounts));
                setSavedAccounts(updatedAccounts);
            }
        }
    };
    
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser) {
            console.log('User already logged in, redirecting');
            const redirectPath = sessionStorage.getItem('redirectPath') || '/admin/dashboard';
            console.log('Redirecting to:', redirectPath);
            navigate(redirectPath);
            sessionStorage.removeItem('redirectPath');
        }
    }, [currentUser, navigate]);

    // Simple direct connection test function
    const testDirectConnection = async () => {
        try {
            // Only log in development mode
            if (process.env.NODE_ENV === 'development') {
                console.log('Testing direct connection to backend...');
            }
            const response = await fetch(`${getApiBaseUrl().replace('/api', '')}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (process.env.NODE_ENV === 'development') {
                    console.log('Direct connection successful:', data);
                }
                return true;
            } else {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Direct connection failed with status:', response.status);
                }
                return false;
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Direct connection error:', error);
            }
            return false;
        }
    };

    // Check API connection on component mount
    useEffect(() => {
        const checkConnection = async () => {
            setConnectionStatus('checking');
            setStatusMessage('Checking connection to server...');
            
            const isConnected = await testDirectConnection();
            
            if (isConnected) {
                setConnectionStatus('connected');
                setStatusMessage('Connected to server. You can now log in.');
                setError('');
            } else {
                setConnectionStatus('error');
                setStatusMessage('Failed to connect to server. Please ensure backend is running on port 5000.');
            }
        };

        checkConnection();
    }, []); // No dependencies to avoid loops

    // Cooldown timer for resend code
    useEffect(() => {
        if (resendSeconds <= 0) return;
        const timer = setInterval(() => {
            setResendSeconds((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendSeconds]);

    const handleLogin = async (e) => {
        // Completely prevent form submission behavior
        if (e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent) {
                e.nativeEvent.preventDefault();
                e.nativeEvent.stopImmediatePropagation();
            }
        }
        
        setError('');
        setIsLoading(true);

        try {
            const response = await login(email, password);
            // CRITICAL FIX: Check if login was successful
            if (response?.id || response?.email || response?.user) {
                // Save email-only account metadata if remember me is checked
                if (rememberMe && email && password) {
                    const credentials = {
                        email,
                        rememberMe: true,
                        savedAt: new Date().toISOString()
                    };
                    localStorage.setItem('kwise_credentials', JSON.stringify(credentials));
                    // Save to saved accounts list as well
                    const accountExists = savedAccounts.some(account => account.email === email);
                    if (!accountExists) {
                        const updatedAccounts = [...savedAccounts, credentials];
                        localStorage.setItem('kwise_saved_accounts', JSON.stringify(updatedAccounts));
                        setSavedAccounts(updatedAccounts);
                    }
                } else {
                    // Clear saved login preference if remember me is unchecked
                    localStorage.removeItem('kwise_credentials');
                }
                // Clear the saved view state on successful login
                localStorage.removeItem('kwise_current_view');
                // CRITICAL FIX: Handle navigation after successful login
                const redirectPath = sessionStorage.getItem('redirectPath') || '/admin/dashboard';
                navigate(redirectPath);
                sessionStorage.removeItem('redirectPath');
                return; // Important: return here to prevent error handling
            } else {
                throw new Error(response?.error || 'Login failed - invalid response');
            }
        } catch (error) {
            console.error('Login failed:', error);
            
            // Enhanced error handling - prevent any page reloads or navigation
            const errorMessage = error.message || 'Invalid email or password. Please try again.';
            
            // Show appropriate error message based on error type
            if (error.response?.status === 401 || errorMessage.includes('401') || errorMessage.includes('Invalid') || errorMessage.includes('incorrect')) {
                setError('⚠️ Invalid email or password. Please check your credentials and try again.');
            } else if (errorMessage.includes('Network') || errorMessage.includes('connect')) {
                setError('🔌 Cannot connect to server. Please check if the backend is running.');
            } else {
                setError(`❌ Login failed: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!resetEmail) {
            setError('Please enter your reference email address');
            return;
        }

        try {
            setIsLoading(true);
            setStatusMessage('Sending reset code to your email...');

            // Call the real API for password reset
            const response = await authAPI.forgotPassword(resetEmail);

            // Handle Axios response structure
            const responseData = response.data || response;

            setIsOtpSent(true);
            setShowResetCodeStep(true);
            setStatusMessage(`Reset code sent to ${responseData.sentToEmail || resetEmail}. Enter the code and your new password below.`);
            // Clear the reset code field to ensure user enters the code from email
            setResetCode('');

            setError('');
        } catch (err) {
            // Fallback to direct fetch in case of Axios/network issues
            try {
                const base = getApiBaseUrl();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const res = await fetch(`${base}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmail }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || 'Failed to send reset code');
                }
                const data = await res.json();
                setIsOtpSent(true);
                setShowResetCodeStep(true);
                setStatusMessage(`Reset code sent to ${data.sentToEmail || resetEmail}. Enter the code and your new password below.`);
                // Clear the reset code field to ensure user enters the code from email
                setResetCode('');
                setError('');
            } catch (fallbackErr) {
                const errorInfo = handleAPIError(fallbackErr);
                setError(errorInfo.message || 'Failed to send reset code. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        const code = (resetCode || '').trim();
        if (!code || !newPassword || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Enhanced password validation
        const requirements = checkPasswordRequirements(newPassword);
        const allRequirementsMet = Object.values(requirements).every(req => req);

        if (!allRequirementsMet) {
            setError('Password does not meet all requirements. Please check the password guidelines.');
            return;
        }

        if (isResetSubmittingRef.current) {
            return;
        }

        try {
            setIsLoading(true);
            setStatusMessage('Resetting password...');
            setLastResetAttemptAt(Date.now());
            isResetSubmittingRef.current = true;

            // Call the API for password reset
            const response = await authAPI.resetPassword({
                resetToken: code,
                newPassword: newPassword,
                confirmPassword: confirmPassword,
                email: resetEmail
            });

            // Handle successful password reset
            console.log('✅ Password reset successful:', response);
            
            // Extract response data properly
            const responseData = response.data || response;
            
            if (responseData.status === 'success') {
                console.log('✅ Backend confirmed success, proceeding with success flow...');

                // Show success message and prepare redirect
                setStatusMessage('Password reset successful! Redirecting to login...');
                setError('');

                // Clear all form data
                setResetCode('');
                setNewPassword('');
                setConfirmPassword('');
                setResetEmail('');
                setIsOtpSent(false);
                setShowResetCodeStep(false);

                // Clear any stored authentication data
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('kwise_current_view');
                    localStorage.removeItem('kwise_reset_step');
                } catch (e) {
                    console.warn('Could not clear localStorage:', e);
                }

                // Redirect to login page after a short delay with success message
                setTimeout(() => {
                    setCurrentView('login');
                    setStatusMessage('Password reset successful! You can now log in with your new password.');
                    // Clear status message after showing it
                    setTimeout(() => {
                        setStatusMessage('');
                        setError('');
                    }, 5000);
                }, 2000);

                // Exit early since we handled success
                return;
            } else {
                console.warn('⚠️ Response does not indicate success:', responseData);
                throw new Error(responseData.message || 'Password reset response indicates failure');
            }

        } catch (err) {
            console.log('❌ Password reset error caught:', err);
            
            // Enhanced error handling for the new backend responses
            let errorMessage = '';
            let shouldClearResetCode = false;
            
            try {
                const msg = err?.response?.data?.message || err?.message || '';
                console.log('Error message extracted:', msg);
                
                if (typeof msg === 'string') {
                    const lowerMsg = msg.toLowerCase();

                    // Handle specific error cases from enhanced backend
                    if (lowerMsg.includes('invalid reset code') ||
                        lowerMsg.includes('invalid or expired') ||
                        lowerMsg.includes('expired') ||
                        lowerMsg.includes('too many times') ||
                        lowerMsg.includes('used too many times')) {
                        errorMessage = 'Your code is invalid or expired. Please click Resend to get a new code.';
                        shouldClearResetCode = true;
                    }
                    // Handle password similarity error
                    else if (lowerMsg.includes('new password must be different') ||
                             lowerMsg.includes('different from your current password') ||
                             lowerMsg.includes('different from your previous password')) {
                        errorMessage = 'New password must be different from your current password. Please choose a different password.';
                    }
                    // Handle rate limiting
                    else if (lowerMsg.includes('wait') && lowerMsg.includes('seconds')) {
                        errorMessage = 'Please wait before requesting another code. Try again in a moment.';
                    }
                    // Generic message
                    else {
                        errorMessage = msg;
                    }
                } else {
                    errorMessage = 'Failed to reset password. Please try again.';
                }
                
                // Set the error and clear reset code if needed
                setError(errorMessage);
                if (shouldClearResetCode) {
                    setResetCode('');
                }
                
                console.log('✅ Error handled gracefully:', errorMessage);
                return; // Exit early, no need for fallback
                
            } catch (parseError) {
                console.log('⚠️ Could not parse error response:', parseError);
                errorMessage = 'Failed to reset password. Please try again.';
            }
            
            // Only use fallback fetch if we couldn't handle the error above or it's a network issue
            if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED' || !err.response) {
                console.log('🔄 Network error detected, trying fallback fetch...');
                
                try {
                    const base = getApiBaseUrl();
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);
                    
                    const res = await fetch(`${base}/auth/reset-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            resetToken: code,
                            newPassword: newPassword,
                            confirmPassword: confirmPassword,
                            email: resetEmail
                        }),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);

                    if (!res.ok) {
                        const txt = await res.text();
                        const msg = (txt || '').toString();
                        const lowerMsg = msg.toLowerCase();

                        // Enhanced error handling for fallback requests
                        if (lowerMsg.includes('invalid reset code') ||
                            lowerMsg.includes('invalid or expired') ||
                            lowerMsg.includes('expired') ||
                            lowerMsg.includes('too many times') ||
                            lowerMsg.includes('used too many times')) {
                            setError('Your code is invalid or expired. Please click Resend to get a new code.');
                            setResetCode('');
                            return;
                        }

                        if (lowerMsg.includes('new password must be different') ||
                            lowerMsg.includes('different from your current password') ||
                            lowerMsg.includes('different from your previous password')) {
                            setError('New password must be different from your current password. Please choose a different password.');
                            return;
                        }

                        // Handle rate limiting
                        if (lowerMsg.includes('wait') && lowerMsg.includes('seconds')) {
                            setError('Please wait before requesting another code. Try again in a moment.');
                            return;
                        }

                        throw new Error(msg || 'Failed to reset password');
                    }

                    // On success with fallback fetch
                    const responseData = await res.json();
                    console.log('✅ Password reset successful (fallback):', responseData);

                    setStatusMessage('Password reset successful! Redirecting to login...');
                    setError('');

                    // Clear all form data
                    setResetCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetEmail('');
                    setIsOtpSent(false);
                    setShowResetCodeStep(false);

                    // Clear any stored authentication data
                    try {
                        localStorage.removeItem('token');
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('kwise_current_view');
                        localStorage.removeItem('kwise_reset_step');
                    } catch { }

                    // Redirect to login page after a short delay
                    setTimeout(() => {
                        setCurrentView('login');
                        setStatusMessage('Password reset successful! You can now log in with your new password.');
                        // Clear status message after showing it
                        setTimeout(() => {
                            setStatusMessage('');
                            setError('');
                        }, 5000);
                    }, 2000);

                } catch (fallbackErr) {
                    console.log('❌ Fallback fetch also failed:', fallbackErr);
                    const errorInfo = handleAPIError(fallbackErr);
                    setError(errorInfo.message || 'Failed to reset password. Please try again.');
                }
            } else {
                // Error was already handled above, just set a generic message if none was set
                if (!errorMessage) {
                    setError('Failed to reset password. Please try again.');
                }
            }
        } finally {
            setIsLoading(false);
            isResetSubmittingRef.current = false;
        }
    };

    const handleResendCode = async (e) => {
        e.preventDefault();
        setError('');
        if (!resetEmail) {
            setError('Please enter your reference email first');
            return;
        }

        if (resendSeconds > 0) return;

        try {
            setIsLoading(true);
            setStatusMessage('Resending reset code...');
            const response = await authAPI.forgotPassword(resetEmail);

            // Handle Axios response structure
            const responseData = response.data || response;
            setStatusMessage(`New reset code sent to ${responseData.sentToEmail || resetEmail}.`);
            setResendSeconds(60);
        } catch (err) {
            // Enhanced error handling for resend
            try {
                const msg = err?.response?.data?.message || err?.message || '';
                if (typeof msg === 'string') {
                    const lowerMsg = msg.toLowerCase();

                    // Handle rate limiting
                    if (lowerMsg.includes('wait') && lowerMsg.includes('seconds')) {
                        setError('Please wait before requesting another code. Try again in a moment.');
                        return;
                    }

                    // Handle other specific errors
                    if (lowerMsg.includes('invalid') || lowerMsg.includes('not found')) {
                        setError('Please check your email address and try again.');
                        return;
                    }
                }
            } catch { }

            const errorInfo = handleAPIError(err);
            setError(errorInfo.message || 'Failed to resend code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTwoFactorAuth = async (e) => {
        e.preventDefault();
        setError('');

        if (!twoFactorCode) {
            setError('Please enter the verification code');
            return;
        }

        try {
            setIsLoading(true);
            setStatusMessage('Verifying code...');

            // Call the real API for 2FA verification
            const response = await authAPI.verifyTwoFactor({
                email: email,
                code: twoFactorCode
            });

            // Handle successful 2FA login
            const verifiedUser = response.data?.data?.user || response.data?.user;
            if (verifiedUser) {
                updateCurrentUser(verifiedUser);
            }

            const redirectPath = sessionStorage.getItem('redirectPath') || '/admin/dashboard';
            sessionStorage.removeItem('redirectPath');
            navigate(redirectPath);
        } catch (err) {
            const errorInfo = handleAPIError(err);
            setError(errorInfo.message || 'Invalid verification code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        setError('');

        const { name, email, password, confirmPassword, role, referenceEmail } = createAccountData;

        if (!name || !email || !password || !confirmPassword || !referenceEmail) {
            setError('Please fill in all required information including your reference email');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Enhanced password validation
        const requirements = checkPasswordRequirements(password);
        const allRequirementsMet = Object.values(requirements).every(req => req);

        if (!allRequirementsMet) {
            setError('Password does not meet all requirements. Please check the password guidelines.');
            return;
        }

        try {
            setIsLoading(true);
            setStatusMessage('Please wait while we create your account...');

            // Call the real API for account creation
            const response = await authAPI.register({
                name: name,
                email: email,
                password: password,
                confirmPassword: confirmPassword,
                role: role,
                referenceEmail: referenceEmail
            });

            // Handle successful registration (auto-login + redirect)
            const user = response.user || response?.data?.user;
            if (user) {
                // Clear the saved view state on successful account creation
                localStorage.removeItem('kwise_current_view');
                updateCurrentUser(user);

                const redirectPath = (response.redirectTo || response?.data?.redirectTo) || sessionStorage.getItem('redirectPath') || '/admin/dashboard';
                navigate(redirectPath);
                sessionStorage.removeItem('redirectPath');
                return;
            }

            setStatusMessage('Account created successfully! Redirecting to admin page...');
            setCreateAccountData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'developer',
                referenceEmail: ''
            });
        } catch (err) {
            const errorInfo = handleAPIError(err);
            setError(errorInfo.message || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // renderConnectionStatus function removed as it's no longer used

    // Clean password requirements popup without strength meter
    const renderPasswordRequirementsPopup = (requirements) => (
        <div className="password-requirements-popup">
            <div className="password-requirements-header">
                <h4>🔒 Password Requirements</h4>
                <p>A good password should be long, at least 8-12 characters, and include a mix of uppercase and lowercase letters, numbers, and symbols.</p>
            </div>
            <div className="password-requirements">
                <div className="requirement-item">
                    <span className={`requirement-icon ${requirements.length ? 'met' : 'not-met'}`}>
                        {requirements.length ? <FiCheck /> : <FiX />}
                    </span>
                    <span className={`requirement-text ${requirements.length ? 'met' : 'not-met'}`}>
                        At least 8 characters
                    </span>
                </div>
                <div className="requirement-item">
                    <span className={`requirement-icon ${requirements.uppercase ? 'met' : 'not-met'}`}>
                        {requirements.uppercase ? <FiCheck /> : <FiX />}
                    </span>
                    <span className={`requirement-text ${requirements.uppercase ? 'met' : 'not-met'}`}>
                        Uppercase letter (A-Z)
                    </span>
                </div>
                <div className="requirement-item">
                    <span className={`requirement-icon ${requirements.lowercase ? 'met' : 'not-met'}`}>
                        {requirements.lowercase ? <FiCheck /> : <FiX />}
                    </span>
                    <span className={`requirement-text ${requirements.lowercase ? 'met' : 'not-met'}`}>
                        Lowercase letter (a-z)
                    </span>
                </div>
                <div className="requirement-item">
                    <span className={`requirement-icon ${requirements.number ? 'met' : 'not-met'}`}>
                        {requirements.number ? <FiCheck /> : <FiX />}
                    </span>
                    <span className={`requirement-text ${requirements.number ? 'met' : 'not-met'}`}>
                        Number (0-9)
                    </span>
                </div>
                <div className="requirement-item">
                    <span className={`requirement-icon ${requirements.symbol ? 'met' : 'not-met'}`}>
                        {requirements.symbol ? <FiCheck /> : <FiX />}
                    </span>
                    <span className={`requirement-text ${requirements.symbol ? 'met' : 'not-met'}`}>
                        Symbol (!@#$%^&*)
                    </span>
                </div>
            </div>
        </div>
    );

    const renderLoginForm = () => (
        <form onSubmit={(e) => { e.preventDefault(); return false; }} method="POST" action="#">
            <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-group">
                    <input
                        type="email"
                        id="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setIsTypingEmail(true);
                            clearTimeout(typingTimeoutRef.current);
                            typingTimeoutRef.current = setTimeout(() => setIsTypingEmail(false), 900);
                        }}
                        onFocus={() => setShowDemoAccountsPopup(true)}
                        onBlur={() => {
                            setShowDemoAccountsPopup(false);
                            setIsTypingEmail(false);
                        }}
                        required
                        disabled={isLoading}
                        placeholder="Enter your email address"
                    />
                    <FiMail className="input-icon" />
                    {showDemoAccountsPopup && (
                        <div className={`demo-accounts-tooltip ${isTypingEmail ? 'visible' : ''}`}>
                            <div className="demo-accounts-tooltip-content">
                                <h4>🚀 Demo Accounts Available:</h4>
                                <div className="demo-account-item">
                                    <span className="demo-role">👑 Superadmin:</span>
                                    <span className="demo-email">admin@pcwise.com</span>
                                </div>
                                <div className="demo-account-item">
                                    <span className="demo-role">👨‍💻 Developer:</span>
                                    <span className="demo-email">rudymarhanggas@gmail.com</span>
                                </div>
                                <div className="demo-account-item">
                                    <span className="demo-role">👤 Admin:</span>
                                    <span className="demo-email">test@pcwise.com</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-group">
                    <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Enter your password"
                    />
                    <FiLock className="input-icon" />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                    >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                </div>
                {/* Password strength meter removed from login form */}
            </div>
            <button
                type="button"
                className="login-btn"
                disabled={isLoading}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLogin(e);
                    return false;
                }}
            >
                {isLoading ? (
                    <>
                        <div className="loading-spinner"></div>
                        Logging in...
                    </>
                ) : (
                    'Sign In'
                )}
            </button>

            {/* Remember Me and Forgot Password Row */}
            <div className="login-options-row">
                <div className="remember-me-container">
                    <button
                        type="button"
                        className={`remember-toggle ${rememberMe ? 'active' : ''}`}
                        onClick={() => handleRememberMeChange(!rememberMe)}
                        disabled={isLoading}
                    >
                        <div className="toggle-circle"></div>
                    </button>
                    <span className="remember-text">Remember me</span>
                </div>

                <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => setCurrentView('forgot-password')}
                    disabled={isLoading}
                >
                    Forgot Password?
                </button>
            </div>
            
            {/* Saved Accounts Section */}
            {savedAccounts.length > 0 && (
                <div className="saved-accounts-container">
                    <h4>Saved Accounts</h4>
                    <div className="saved-accounts-list">
                        {savedAccounts.map((account, index) => (
                            <div className="saved-account-item" key={index}>
                                <button 
                                    className="saved-account-btn" 
                                    onClick={() => selectSavedAccount(account)}
                                    title={`Login as ${account.email}`}
                                >
                                    <div className="saved-account-icon">
                                        {account.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="saved-account-info">
                                        <span className="saved-account-email">{account.email}</span>
                                        <span className="saved-account-date">
                                            {new Date(account.savedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>
                                <button 
                                    className="remove-account-btn"
                                    onClick={() => removeSavedAccount(account.email)}
                                    title="Remove this account"
                                >
                                    <FiX />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="auto-login-option">
                        <button
                            type="button"
                            className={`remember-toggle ${autoLogin ? 'active' : ''}`}
                            onClick={toggleAutoLogin}
                        >
                            <div className="toggle-circle"></div>
                        </button>
                        <span className="auto-login-text">Auto-login with saved accounts</span>
                    </div>
                </div>
            )}

            {/* Create Account Button - Centered below Sign In */}
            <div className="create-account-container">
                <button
                    type="button"
                    className="create-account-btn"
                    onClick={() => setCurrentView('create-account')}
                    disabled={isLoading}
                >
                    Create Account
                </button>
            </div>
        </form>
    );

    const renderForgotPasswordForm = () => {
        if (!showResetCodeStep) {
            // Step 1: Enter reference email
            return (
                <div>
                    <button
                        type="button"
                        className="back-to-login-btn"
                        onClick={() => {
                            setCurrentView('login');
                            // Reset the reset password step when going back to login
                            setShowResetCodeStep(false);
                            localStorage.removeItem('kwise_reset_step');
                            // Clear all reset form fields
                            setResetCode('');
                            setNewPassword('');
                            setConfirmPassword('');
                        }}
                        disabled={isLoading}
                    >
                        <FiArrowLeft /> Back to Login
                    </button>
                    <form className="login-form reset-password-form" onSubmit={handleForgotPassword}>
                        <div className="form-group">
                            <label htmlFor="resetEmail" className="form-label no-icon">
                                Reference Email Address
                            </label>
                            <div className="input-group">
                                <input
                                    type="email"
                                    id="resetEmail"
                                    className="form-control"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    placeholder="Enter your reference email address"
                                />
                                <FiMail className="input-icon" />
                            </div>
                            <small className="form-text">Enter your reference email to receive a reset code</small>
                        </div>
                        <button
                            type="submit"
                            className="login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending Code...' : 'Send Reset Code'}
                        </button>
                    </form>
                </div>
            );
        } else {
            // Step 2: Enter code and new password
            return (
                <div>
                    <button
                        type="button"
                        className="back-to-login-btn"
                        onClick={() => {
                            setCurrentView('login');
                            // Reset the reset password step when going back to login
                            setShowResetCodeStep(false);
                            localStorage.removeItem('kwise_reset_step');
                        }}
                        disabled={isLoading}
                    >
                        <FiArrowLeft /> Back to Login
                    </button>
                    <form className="login-form reset-password-form" onSubmit={handleResetPassword}>
                        <div className="form-group">
                            <label htmlFor="resetCode" className="form-label">
                                <FiKey /> 6-Digit Reset Code
                            </label>
                            <input
                                type="text"
                                id="resetCode"
                                className="form-control"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="Enter the 6-digit code from your email"
                                maxLength={6}
                            />
                        </div>
                        <div className="form-group password-group" style={{ position: 'relative' }}>
                            <label htmlFor="newPassword" className="form-label">
                                <FiLock /> New Password
                            </label>
                            <div className="password-input-container">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    id="newPassword"
                                    className="form-control"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        setShowResetPwdPopup(true);
                                    }}
                                    required
                                    disabled={isLoading}
                                    placeholder="Enter new password"
                                    onFocus={() => setShowResetPwdPopup(true)}
                                    onBlur={() => setTimeout(() => setShowResetPwdPopup(false), 200)}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    disabled={isLoading}
                                >
                                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                            {showResetPwdPopup && newPassword.length > 0 && (
                                <div className="password-requirements-popup-right">
                                    {renderPasswordRequirementsPopup(passwordRequirements)}
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                <FiLock /> Confirm New Password
                            </label>
                            <div className="password-input-container">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    placeholder="Confirm new password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                        <div className="login-actions">
                            <small>
                                {resendSeconds > 0 ? (
                                    <span>Resend available in {`${String(Math.floor(resendSeconds / 60)).padStart(2, '0')}:${String(resendSeconds % 60).padStart(2, '0')}`}</span>
                                ) : (
                                    <button type="button" className="link-btn" onClick={handleResendCode} disabled={isLoading}>
                                        Didn't receive a code? Resend it
                                    </button>
                                )}
                            </small>
                        </div>
                    </form>
                </div>
            );
        }
    };

    const renderTwoFactorForm = () => (
        <form className="login-form" onSubmit={handleTwoFactorAuth}>
            <div className="form-group">
                <label htmlFor="twoFactorCode" className="form-label">
                    <FiShield /> Two-Factor Authentication
                </label>
                <input
                    type="text"
                    id="twoFactorCode"
                    className="form-control"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter 6-digit code"
                    maxLength="6"
                />
                <small className="form-text">
                    Enter the 6-digit code from your authenticator app
                </small>
            </div>
            <button
                type="submit"
                className="login-btn"
                disabled={isLoading}
            >
                {isLoading ? 'Verifying...' : 'Verify'}
            </button>
            <div className="login-actions">
                <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                        setCurrentView('login');
                        setIsTwoFactorEnabled(false);
                    }}
                    disabled={isLoading}
                >
                    <FiArrowLeft /> Back to Login
                </button>
            </div>
        </form>
    );

    const renderCreateAccountForm = () => (
        <div>
            <button
                type="button"
                className="back-to-login-btn"
                onClick={() => setCurrentView('login')}
                disabled={isLoading}
            >
                <FiArrowLeft /> Back to Login
            </button>
            <form className="login-form create-account-form" onSubmit={handleCreateAccount}>
                {/* Left column: name, email, reference only */}
                <div className="create-left">
                    <div className="form-group create-name">
                        <label htmlFor="createName" className="form-label">
                            <FiUser /> Full Name
                        </label>
                        <input
                            type="text"
                            id="createName"
                            className="form-control"
                            value={createAccountData.name}
                            onChange={(e) => setCreateAccountData({ ...createAccountData, name: e.target.value })}
                            required
                            disabled={isLoading}
                            placeholder="Enter your full name"
                        />
                    </div>
                    <div className="form-group create-email">
                        <label htmlFor="createEmail" className="form-label">
                            <FiMail /> Email Address
                        </label>
                        <input
                            type="email"
                            id="createEmail"
                            className="form-control"
                            value={createAccountData.email}
                            onChange={(e) => setCreateAccountData({ ...createAccountData, email: e.target.value })}
                            required
                            disabled={isLoading}
                            placeholder="Enter your email address"
                        />
                    </div>
                    <div className="form-group create-reference">
                        <label htmlFor="createReferenceEmail" className="form-label">
                            <FiShield /> Reference Email
                        </label>
                        <input
                            type="email"
                            id="createReferenceEmail"
                            className="form-control"
                            value={createAccountData.referenceEmail}
                            onChange={(e) => setCreateAccountData({ ...createAccountData, referenceEmail: e.target.value })}
                            required
                            disabled={isLoading}
                            placeholder="Enter a backup/reference email"
                        />
                        <small className="form-text">
                            A different email used for security purposes and password recovery
                        </small>
                    </div>
                </div>

                {/* Right column: password, requirements, confirm */}
                <div className="create-right">
                    <div className="form-group create-password" style={{ position: 'relative' }}>
                        <label htmlFor="createPassword" className="form-label">
                            <FiLock /> Password
                        </label>
                        <div className="password-input-container">
                            <input
                                type={showCreatePassword ? "text" : "password"}
                                id="createPassword"
                                className="form-control"
                                value={createAccountData.password}
                                onChange={(e) => {
                                    const newPassword = e.target.value;
                                    setCreateAccountData({ ...createAccountData, password: newPassword });
                                    setShowCreatePwdPopup(newPassword.length > 0);
                                }}
                                required
                                disabled={isLoading}
                                placeholder="Enter password"
                                onFocus={() => setShowCreatePwdPopup(createAccountData.password.length > 0)}
                                onBlur={() => setTimeout(() => setShowCreatePwdPopup(false), 200)}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowCreatePassword(!showCreatePassword)}
                                disabled={isLoading}
                            >
                                {showCreatePassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                        {/* Clean password requirements popup */}
                        {showCreatePwdPopup && createAccountData.password.length > 0 && (
                            <div className="password-requirements-popup-right">
                                {renderPasswordRequirementsPopup(createPasswordRequirements)}
                            </div>
                        )}
                    </div>
                    <div className="form-group create-role">
                        <label htmlFor="createRole" className="form-label">
                            <FiUser /> Role
                        </label>
                        <select
                            id="createRole"
                            className="form-control"
                            value={createAccountData.role}
                            onChange={(e) => setCreateAccountData({ ...createAccountData, role: e.target.value })}
                            required
                            disabled={isLoading}
                        >
                            <option value="developer">Developer</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                        </select>
                    </div>
                    <div className="form-group create-confirm">
                        <label htmlFor="createConfirmPassword" className="form-label">
                            <FiLock /> Confirm Password
                        </label>
                        <div className="password-input-container">
                            <input
                                type={showCreateConfirmPassword ? "text" : "password"}
                                id="createConfirmPassword"
                                className="form-control"
                                value={createAccountData.confirmPassword}
                                onChange={(e) => setCreateAccountData({ ...createAccountData, confirmPassword: e.target.value })}
                                required
                                disabled={isLoading}
                                placeholder="Confirm password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                                disabled={isLoading}
                            >
                                {showCreateConfirmPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    type="submit"
                    className="login-btn"
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating...' : 'Create Account'}
                </button>
            </form>
        </div>
    );

    // getCurrentTitle and renderCurrentForm functions removed as they're no longer used

    return (
        <>
            {/* Professional Alert Notifications - Positioned outside container */}
            {/* Show only one alert at a time: error > connection > status > checking */}
            {error ? (
                <div className="alert-notification danger" data-text-length="medium">
                    <div className="alert-icon"><FiX /></div>
                    <div className="alert-text">{error}</div>
                </div>
            ) : (connectionStatus === 'error' && !apiAvailable) ? (
                <div className="alert-notification warning" data-text-length="very-long">
                    <div className="alert-icon">⚠️</div>
                    <div className="alert-text">
                        <strong>Connection Status:</strong> {statusMessage || 'Checking server connection...'}
                        <div style={{ marginTop: '10px' }}>
                            <button 
                                className="retry-connection-btn"
                                onClick={async () => {
                                    setConnectionStatus('checking');
                                    setStatusMessage('Retrying connection...');
                                    const isConnected = await testDirectConnection();
                                    if (isConnected) {
                                        setConnectionStatus('connected');
                                        setStatusMessage('Connected to server. You can now log in.');
                                    } else {
                                        setConnectionStatus('error');
                                        setStatusMessage('Failed to connect to server. Please ensure backend is running on port 5000.');
                                    }
                                }}
                                style={{
                                    background: '#00a67d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    marginRight: '10px'
                                }}
                            >
                                🔄 Retry Connection
                            </button>
                        </div>
                        <div className="demo-credentials">
                            <p>Default admin credentials:</p>
                            <ul>
                                <li><strong>Email:</strong> admin@pcwise.com</li>
                                <li><strong>Password:</strong> Admin@123</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (connectionStatus === 'checking') ? (
                <div className="alert-notification info" data-text-length="short">
                    <div className="alert-icon">⏳</div>
                    <div className="alert-text">{statusMessage || 'Checking connection to server...'}</div>
                </div>
            ) : null}

            <div className="login-container">
                <div className={`login-card ${currentView === 'create-account' ? 'create-mode' : ''} ${currentView === 'login' ? 'login-mode' : ''}`}>
                    <div className="login-logo">
                        <img src={logo} alt="K-Wise Logo" />
                        <h1>K-Wise</h1>
                    </div>

                    {/* View Container */}
                    <div className="view-container">
                        {currentView === 'login' && (
                            <div className="view-enter">
                                <h2 className="login-title">Welcome Back</h2>
                                <p className="login-subtitle">Sign in to your K-Wise account to continue</p>
                                {renderLoginForm()}
                            </div>
                        )}

                        {currentView === 'forgot-password' && (
                            <div className="view-enter reset-password-view">
                                <h2 className="login-title">Reset Password</h2>
                                <p className="login-subtitle">Enter your reference email to receive a reset code</p>
                                {renderForgotPasswordForm()}
                            </div>
                        )}

                        {currentView === 'two-factor' && (
                            <div className="view-enter">
                                <button className="back-btn" onClick={() => setCurrentView('login')}>
                                    <FiArrowLeft /> Back to Login
                                </button>
                                <h2 className="login-title">Two-Factor Authentication</h2>
                                <p className="login-subtitle">Enter the verification code sent to your email</p>
                                {renderTwoFactorForm()}
                            </div>
                        )}

                        {currentView === 'create-account' && (
                            <div className="view-enter create-account-view">
                                <h2 className="login-title">Create Account</h2>
                                <p className="login-subtitle">Join K-Wise and start managing our system</p>
                                {renderCreateAccountForm()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginEnhanced;
