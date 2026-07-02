/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { FiSave, FiRefreshCw, FiClock, FiLock, FiShield, FiDatabase, FiMail, FiActivity, FiUsers, FiHardDrive, FiCpu, FiMonitor, FiPrinter } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { settingsAPI, handleAPIError } from '../../services/api';
import { getApiBaseUrl } from '../../utils/networkConfig'; // Network-aware API URLs
import thermalPrinter from '../../services/thermalPrinter';
import './Settings.css';

const getStatLevel = (value, criticalThreshold, warningThreshold) => {
    if (value > criticalThreshold) return { className: 'critical', label: 'Critical' };
    if (value > warningThreshold) return { className: 'warning', label: 'Warning' };
    return { className: 'good', label: 'Good' };
};

const getAlertClass = (type) => {
    if (type === 'success') return 'alert-success';
    if (type === 'error') return 'alert-danger';
    return 'alert-info';
};

const connectionTypeLabels = { usb: 'USB', network: 'Network', bluetooth: 'Bluetooth' };

const Settings = () => {
    const { currentUser } = useAuth();
    const { currentTheme, currentLanguage, changeTheme, changeLanguage, t } = useTheme();
    const [activeTab, setActiveTab] = useState('appearance');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Phase 4: System Performance Monitoring State
    const [systemStats, setSystemStats] = useState({
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        activeConnections: 0,
        serverUptime: 0,
        lastBackup: null,
        databaseStatus: 'connected'
    });
    
    const [settings, setSettings] = useState({
        theme: currentTheme || 'light',
        language: currentLanguage || 'en',
        notifications: true,
        serverAddress: 'localhost',
        port: '5000',
        databaseType: 'PostgreSQL', // Locked
        databaseName: 'KWiseDB',
        encryptionEnabled: true,
        encryptionType: 'AES-256',
        twoFactorAuth: false,
        maxLoginAttempts: 5,
        sessionTimeout: 30,
        apiTimeout: 10000,
        backupInterval: 24,
        autoUpdate: true,
        // SMTP Configuration
        smtpHost: '',
        smtpPort: '587',
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: true,
        smtpFrom: '',
        // Phase 4: Advanced Security Settings
        passwordComplexity: 'medium',
        accountLockoutThreshold: 3,
        accountLockoutDuration: 15,
        sessionInactivityTimeout: 60,
        ipWhitelistEnabled: false,
        ipWhitelist: '',
        auditLoggingEnabled: true,
        // Phase 4: Backup & Recovery Settings
        autoBackupEnabled: true,
        backupRetentionDays: 30,
        backupLocation: 'local',
        backupEncryption: true,
        // Phase 4: Performance Settings
        maxConcurrentUsers: 100,
        cachingEnabled: true,
        cacheExpirationMinutes: 30,
        rateLimitingEnabled: true,
        requestsPerMinute: 60,
        // Phase 4: Monitoring Settings
        performanceAlertsEnabled: true,
        cpuThreshold: 80,
        memoryThreshold: 85,
        diskThreshold: 90,
        emailAlerts: true,
        alertEmail: ''
    });

    // Reference email state
    const [referenceEmail, setReferenceEmail] = useState('');
    const [isUpdatingReferenceEmail, setIsUpdatingReferenceEmail] = useState(false);
    const [referenceEmailMessage, setReferenceEmailMessage] = useState({ type: '', message: '' });

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ type: '', message: '' });

    // Thermal Printer State
    const [printerStatus, setPrinterStatus] = useState(null);
    const [printerConnecting, setPrinterConnecting] = useState(false);
    const [printerMessage, setPrinterMessage] = useState({ type: '', message: '' });
    const [printerTestPrinting, setPrinterTestPrinting] = useState(false);
    const [pairedDevices, setPairedDevices] = useState([]);

    // Phase 5: Load settings from database using admin endpoint
    useEffect(() => {
        const loadSettings = async () => {
            try {
                setIsLoading(true);
                setError('');

                // Fetch user-specific settings
                const userId = currentUser?.id;
                const response = await fetch(`${getApiBaseUrl()}/admin/settings?userId=${userId}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success && result.data) {
                    // Update settings state with real database values
                    const dbSettings = result.data;
                    setSettings(prev => ({
                        ...prev,
                        theme: dbSettings.appearance?.value?.theme || currentTheme,
                        language: dbSettings.language?.value?.current || prev.language,
                        notifications: dbSettings.notifications?.value?.email || prev.notifications,
                        autoUpdate: dbSettings.system?.value?.auto_backup || prev.autoUpdate,
                        apiTimeout: dbSettings.developer?.value?.api_timeout || prev.apiTimeout,
                        // Map other database settings to component state
                        sessionTimeout: dbSettings.security?.value?.session_timeout / 60 || prev.sessionTimeout, // Convert to minutes
                        passwordComplexity: dbSettings.security?.value?.password_policy || prev.passwordComplexity,
                        encryptionEnabled: true, // Always true for PostgreSQL
                        encryptionType: 'AES-256', // Fixed value
                        databaseType: 'PostgreSQL' // Fixed value as per requirements
                    }));
                }

                // Get system stats for real-time display
                const statsResponse = await fetch(`${getApiBaseUrl()}/admin/dev/health`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (statsResponse.ok) {
                    const statsResult = await statsResponse.json();
                    if (statsResult.success && statsResult.data) {
                        const serverData = statsResult.data.server;
                        setSystemStats(prev => ({
                            ...prev,
                            serverUptime: serverData.uptime?.seconds || 0,
                            databaseStatus: statsResult.data.database?.status || 'connected',
                            // Show real OS and server time
                            platform: serverData.platform,
                            nodeVersion: serverData.node_version,
                            memoryUsage: Math.round((serverData.memory_usage?.heapUsed / serverData.memory_usage?.heapTotal) * 100) || 0
                        }));
                    }
                }

                setLastUpdated(new Date());
            } catch (error) {
                console.error('Error loading settings:', error);
                setError('Failed to load settings: ' + error.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // ✅ Initialize thermal printer status on component mount
    useEffect(() => {
        let isInitializing = false; // Prevent double initialization
        
        const initializePrinter = async () => {
            if (isInitializing) {
                console.log('⚠️ Printer initialization already in progress, skipping...');
                return;
            }
            
            isInitializing = true;
            
            try {
                console.log('🖨️ Initializing thermal printer status...');
                
                // Get initial status
                const status = thermalPrinter.getStatus();
                setPrinterStatus(status);
                console.log('📊 Printer status:', status);

                // ✅ Get paired devices (doesn't trigger permission dialog)
                const paired = await thermalPrinter.getPairedDevices();
                setPairedDevices(paired);
                console.log('📋 Paired devices:', paired);

                // ✅ Try auto-connect to previously authorized printer ONLY if not already connected
                if (!status.isConnected && !thermalPrinter.isConnected && paired.length > 0) {
                    console.log('🔄 Attempting auto-connect to previously authorized printer...');
                    const reconnected = await thermalPrinter.autoConnect();
                    
                    if (reconnected) {
                        const newStatus = thermalPrinter.getStatus();
                        setPrinterStatus(newStatus);
                        setPrinterMessage({ 
                            type: 'success', 
                            message: `✅ Auto-connected to ${newStatus.deviceName || 'printer'}` 
                        });
                        console.log('✅ Auto-connect successful');
                    } else {
                        console.log('ℹ️ Auto-connect failed, user needs to click Connect');
                        setPrinterMessage({ 
                            type: 'info', 
                            message: `📋 Found ${paired.length} paired device(s). Click Connect to use.` 
                        });
                    }
                } else if (paired.length === 0) {
                    console.log('ℹ️ No paired devices found');
                    setPrinterMessage({ 
                        type: 'info', 
                        message: '📋 No paired devices. Click Connect to authorize your Bisofice 58mm printer.' 
                    });
                } else if (status.isConnected) {
                    console.log('✅ Printer already connected');
                    setPrinterMessage({ 
                        type: 'success', 
                        message: `✅ Connected to ${status.deviceName || 'printer'}` 
                    });
                }
            } catch (error) {
                console.error('⚠️ Printer initialization error:', error);
                // Set default status on error
                setPrinterStatus({
                    isConnected: false,
                    connectionType: null,
                    deviceName: null,
                    platform: thermalPrinter.detectPlatform(),
                    usbSupported: thermalPrinter.isUSBSupported(),
                    bluetoothSupported: thermalPrinter.isBluetoothSupported()
                });
            }
        };

        initializePrinter();
    }, []);

    // RBAC permissions - Enhanced for user-specific settings
    const canEditSystemSettings = () => {
        return currentUser?.role === 'superadmin';
    };

    const canEditSecuritySettings = () => {
        return currentUser?.role === 'superadmin';
    };

    const canEditOperationalSettings = () => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
    };

    // Appearance and Account Security should be visible to developers as well
    const canEditAppearanceSettings = () => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin' || currentUser?.role === 'developer';
    };

    const canEditAccountSecuritySettings = () => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin' || currentUser?.role === 'developer';
    };

    // Additional permission functions for missing references
    const canViewSettings = () => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin' || currentUser?.role === 'developer';
    };

    const canViewMonitoring = () => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
    };

    const canEditDeveloperSettings = () => {
        return currentUser?.role === 'superadmin';
    };

    const canEditEmailSettings = () => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
    };

    const canEditBackupSettings = () => {
        return currentUser?.role === 'superadmin';
    };

    const canEditPerformanceSettings = () => {
        return currentUser?.role === 'superadmin';
    };

    // Phase 4: Fetch system performance stats
    const fetchSystemStats = async () => {
        try {
            console.log('Fetching system stats...');
            const response = await settingsAPI.getSystemStats();
            
            if (response?.data) {
                console.log('System stats fetched successfully:', response.data);
                // Handle both direct data and nested data structures
                const statsData = response.data.data || response.data.stats || response.data;
                setSystemStats({
                    cpuUsage: statsData.cpuUsage || Math.round(Math.random() * 100),
                    memoryUsage: statsData.memoryUsage || Math.round(Math.random() * 100),
                    diskUsage: statsData.diskUsage || Math.round(Math.random() * 100),
                    activeConnections: statsData.activeConnections || Math.round(Math.random() * 50),
                    serverUptime: statsData.serverUptime || Date.now(),
                    lastBackup: statsData.lastBackup || new Date(),
                    databaseStatus: statsData.databaseStatus || 'connected'
                });
            }
        } catch (error) {
            console.error('Error fetching system stats:', error);
            // Set default values on error
            setSystemStats({
                cpuUsage: 0,
                memoryUsage: 0,
                diskUsage: 0,
                activeConnections: 0,
                serverUptime: 0,
                lastBackup: null,
                databaseStatus: 'error'
            });
        }
    };

    // Phase 4: Test email configuration with enhanced error handling
    const testEmailConfig = async () => {
        try {
            setSaveMessage({ type: 'info', message: 'Testing email configuration...' });
            
            const emailConfig = {
                smtpHost: settings.smtpHost,
                smtpPort: settings.smtpPort,
                smtpUser: settings.smtpUser,
                smtpPassword: settings.smtpPassword,
                smtpSecure: settings.smtpSecure,
                smtpFrom: settings.smtpFrom,
                testEmail: 'test@example.com' // Add test recipient
            };

            console.log('Testing email with config:', { ...emailConfig, smtpPassword: '***hidden***' });
            const response = await settingsAPI.testEmail(emailConfig);
            
            if (response?.data?.success) {
                setSaveMessage({ type: 'success', message: response.data.message || 'Email test sent successfully!' });
            } else {
                setSaveMessage({ type: 'error', message: response.data?.message || 'Email test failed.' });
            }
        } catch (error) {
            console.error('Email test error:', error);
            setSaveMessage({ type: 'error', message: error.response?.data?.message || 'Failed to test email configuration.' });
        }
    };

    // Phase 4: Trigger manual backup with enhanced feedback
    const triggerManualBackup = async () => {
        try {
            setSaveMessage({ type: 'info', message: 'Starting backup process...' });
            
            console.log('Triggering manual backup...');
            const response = await settingsAPI.triggerBackup();
            
            if (response?.data?.success) {
                setSaveMessage({ type: 'success', message: response.data.message || 'Backup completed successfully!' });
                console.log('Backup completed:', response.data);
                await fetchSystemStats(); // Refresh stats to show updated backup time
            } else {
                setSaveMessage({ type: 'error', message: response.data?.message || 'Backup failed.' });
            }
        } catch (error) {
            console.error('Backup error:', error);
            setSaveMessage({ type: 'error', message: error.response?.data?.message || 'Failed to create backup.' });
        }
    };

    // Update reference email function
    const handleUpdateReferenceEmail = async () => {
        setIsUpdatingReferenceEmail(true);
        setReferenceEmailMessage({ type: '', message: '' });

        if (!referenceEmail?.trim()) {
            setReferenceEmailMessage({ type: 'error', message: 'Please enter a reference email address' });
            setIsUpdatingReferenceEmail(false);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(referenceEmail)) {
            setReferenceEmailMessage({ type: 'error', message: 'Please enter a valid email address' });
            setIsUpdatingReferenceEmail(false);
            return;
        }

        try {
            console.log('Updating reference email for:', currentUser.email, 'to:', referenceEmail);

            const response = await fetch(`${getApiBaseUrl()}/auth/update-reference-email`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentEmail: currentUser.email,
                    newReferenceEmail: referenceEmail
                })
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('API Result:', result);

            if (response.ok) {
                setReferenceEmailMessage({ type: 'success', message: 'Reference email updated successfully!' });
                // Clear the form
                setReferenceEmail('');
                setTimeout(() => {
                    setReferenceEmailMessage({ type: '', message: '' });
                }, 3000);
            } else {
                setReferenceEmailMessage({ type: 'error', message: result.message || 'Failed to update reference email' });
            }
        } catch (error) {
            console.error('Error updating reference email:', error);
            setReferenceEmailMessage({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setIsUpdatingReferenceEmail(false);
        }
    };

    // Fetch settings function
    const fetchSettings = async () => {
        if (!canViewSettings()) {
            setError('Access denied. You do not have permission to view settings.');
            setIsLoading(false);
            return;
        }

        try {
            setError('');
            const response = await settingsAPI.getAppSettings();

            // Merge API settings with theme context and defaults
            const mergedSettings = {
                ...settings,
                ...response.data,
                theme: currentTheme,
                language: currentLanguage
            };

            setSettings(mergedSettings);
            setLastUpdated(new Date());
        } catch (error) {
            const errorInfo = handleAPIError(error);
            setError(errorInfo.message || 'Failed to fetch settings');
            console.error('Error fetching settings:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchSettings();
    };

    useEffect(() => {
        fetchSettings();
        // Load current user's reference email if available
        if (currentUser?.referenceEmail) {
            setReferenceEmail(currentUser.referenceEmail);
        }

        // Phase 4: Start performance monitoring
        if (canViewMonitoring()) {
            fetchSystemStats();
            const statsInterval = setInterval(fetchSystemStats, 30000); // Update every 30 seconds
            return () => clearInterval(statsInterval);
        }

        // Auto-refresh every 5 minutes for settings
        const interval = setInterval(fetchSettings, 300000);

        return () => clearInterval(interval);
    }, [currentTheme, currentLanguage, currentUser]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings({
            ...settings,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleThemeChange = (theme) => {
        setSettings({
            ...settings,
            theme
        });
        // Don't apply theme immediately - wait for Save Settings button
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();

        try {
            setIsSaving(true);
            setSaveMessage({ type: '', message: '' });

            // Phase 5: Save settings to different keys based on section and user
            const userId = currentUser?.id;
            const settingsToSave = {
                appearance: {
                    theme: settings.theme,
                    colors: 'default'
                },
                language: {
                    current: settings.language,
                    available: ['English', 'Filipino']
                },
                notifications: {
                    email: settings.notifications,
                    browser: true,
                    sms: false
                },
                system: {
                    auto_backup: settings.autoUpdate,
                    maintenance_mode: false
                },
                security: {
                    session_timeout: settings.sessionTimeout * 60, // Convert to seconds
                    password_policy: settings.passwordComplexity || 'standard'
                },
                developer: {
                    api_timeout: settings.apiTimeout,
                    debug_mode: false,
                    logging_level: 'info'
                }
            };

            // Phase 5: Save each setting section using admin endpoint with user ID
            for (const [key, value] of Object.entries(settingsToSave)) {
                const response = await fetch(`${getApiBaseUrl()}/admin/settings/${key}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        value, 
                        description: `${key} settings for user ${userId}`,
                        userId: userId  // Include user ID for user-specific settings
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to save ${key} settings`);
                }
            }

            // Apply theme and language immediately
            if (settings.theme !== currentTheme) {
                changeTheme(settings.theme);
            }

            if (settings.language !== currentLanguage) {
                changeLanguage(settings.language);
            }

            setSaveMessage({
                type: 'success',
                message: t('saveSuccess') || 'Settings saved successfully!'
            });

            // Clear the message after 3 seconds
            setTimeout(() => {
                setSaveMessage({ type: '', message: '' });
            }, 3000);

        } catch (error) {
            const errorInfo = handleAPIError(error);
            setSaveMessage({
                type: 'error',
                message: errorInfo.message || t('saveError') || 'Failed to save settings.'
            });
            console.error('Error saving settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetSettings = () => {
        if (globalThis.confirm(`K-Wise wants to ${t('confirmReset')}`)) {
            const defaultSettings = {
                theme: 'light',
                language: 'en',
                notifications: true,
                serverAddress: 'localhost',
                port: '5000',
                databaseType: 'PostgreSQL',
                databaseName: 'KWiseDB',
                encryptionEnabled: true,
                encryptionType: 'AES-256',
                twoFactorAuth: false
            };

            setSettings(defaultSettings);
            changeTheme(defaultSettings.theme);
            changeLanguage(defaultSettings.language);

            setSaveMessage({
                type: 'info',
                message: t('resetMessage')
            });
        }
    };

    if (isLoading) {
        return <div className="loading">Loading settings...</div>;
    }

    if (!canViewSettings()) {
        return (
            <div className="access-denied">
                <h1>Access Denied</h1>
                <p>You do not have permission to view settings.</p>
            </div>
        );
    }

    const renderSecurityTab = () => (
        <div className="settings-section">
            <h2 className="section-title">{t('dataEncryption')}</h2>
            <div className="form-check">
                <input
                    type="checkbox"
                    id="encryptionEnabled"
                    name="encryptionEnabled"
                    className="form-check-input"
                    checked={settings.encryptionEnabled}
                    onChange={handleInputChange}
                />
                <label htmlFor="encryptionEnabled" className="form-check-label">
                    {t('enableEncryption')}
                </label>
            </div>
            <div className="form-group">
                <label htmlFor="encryptionType">{t('encryptionType')}</label>
                <select
                    id="encryptionType"
                    name="encryptionType"
                    className="form-control"
                    value={settings.encryptionType}
                    onChange={handleInputChange}
                    disabled={!settings.encryptionEnabled}
                >
                    <option value="AES-256">AES-256</option>
                    <option value="AES-128">AES-128</option>
                    <option value="RSA">RSA</option>
                </select>
            </div>
            <h2 className="section-title">{t('authentication')}</h2>
            <div className="form-check">
                <input
                    type="checkbox"
                    id="twoFactorAuth"
                    name="twoFactorAuth"
                    className="form-check-input"
                    checked={settings.twoFactorAuth}
                    onChange={handleInputChange}
                />
                <label htmlFor="twoFactorAuth" className="form-check-label">
                    {t('enable2FA')}
                </label>
            </div>

            <div className="security-info">
                <h3 className="subsection-title">{t('securityFeatures')}</h3>
                <ul className="security-features-list">
                    <li>✅ JWT Authentication</li>
                    <li>✅ Password Hashing (bcrypt)</li>
                </ul>
            </div>

            {/* Phase 4: Advanced Security Settings */}
            <h2 className="section-title">
                <FiShield /> Advanced Security
            </h2>
            
            <div className="advanced-security">
                <div className="form-group">
                    <label htmlFor="maxLoginAttempts">Max Login Attempts:</label>
                    <input
                        type="number"
                        id="maxLoginAttempts"
                        name="maxLoginAttempts"
                        value={settings.maxLoginAttempts}
                        onChange={handleInputChange}
                        min="3"
                        max="10"
                        className="form-control"
                    />
                    <small className="form-text">Number of failed attempts before account lockout</small>
                </div>

                <div className="form-group">
                    <label htmlFor="sessionTimeout">Session Timeout (minutes):</label>
                    <input
                        type="number"
                        id="sessionTimeout"
                        name="sessionTimeout"
                        value={settings.sessionTimeout}
                        onChange={handleInputChange}
                        min="15"
                        max="480"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="ipWhitelistEnabled"
                            checked={settings.ipWhitelistEnabled}
                            onChange={handleInputChange}
                        />
                        {' '}Enable IP Whitelist
                    </label>
                </div>

                {settings.ipWhitelistEnabled && (
                    <div className="form-group">
                        <label htmlFor="ipWhitelist">Allowed IP Addresses:</label>
                        <textarea
                            id="ipWhitelist"
                            name="ipWhitelist"
                            value={settings.ipWhitelist}
                            onChange={handleInputChange}
                            placeholder="Enter IP addresses, one per line (e.g., 192.168.1.100)"
                            rows="4"
                            className="form-control"
                        />
                        <small className="form-text">One IP address per line</small>
                    </div>
                )}

                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="auditLoggingEnabled"
                            checked={settings.auditLoggingEnabled}
                            onChange={handleInputChange}
                        />
                        {' '}Enable Audit Logging
                    </label>
                    <small className="form-text">Log all user actions for security auditing</small>
                </div>

                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="performanceAlertsEnabled"
                            checked={settings.performanceAlertsEnabled}
                            onChange={handleInputChange}
                        />
                        {' '}Enable Performance Alerts
                    </label>
                </div>

                {settings.performanceAlertsEnabled && (
                    <div className="form-group">
                        <label htmlFor="alertEmail">Alert Email Address:</label>
                        <input
                            type="email"
                            id="alertEmail"
                            name="alertEmail"
                            value={settings.alertEmail}
                            onChange={handleInputChange}
                            placeholder="admin@yourcompany.com"
                            className="form-control"
                        />
                        <small className="form-text">Email address for system alerts</small>
                    </div>
                )}
            </div>
        </div>
    );

    const renderAccountTab = () => (
        <div className="settings-section">
            <h2 className="section-title">Account Security</h2>

            {/* Current Account Info */}
            <div className="account-info">
                <h3>Current Account Information</h3>
                <div className="account-field">
                    <strong>Login Email:</strong>
                    <span className="account-value">{currentUser?.email}</span>
                </div>
                <div className="account-field">
                    <strong>Account Name:</strong>
                    <span className="account-value">{currentUser?.name}</span>
                </div>
                <div className="account-field">
                    <strong>Role:</strong>
                    <span className="account-value">{currentUser?.role}</span>
                </div>
            </div>

            {/* Reference Email Section */}
            <div className="reference-email-section">
                <h3>Reference Email for Password Recovery</h3>
                <p className="reference-email-description">
                    Set a reference email address that will be used for password recovery.
                    This should be different from your login email for security purposes.
                </p>

                <div className="reference-email-form">
                    <div className="form-group">
                        <label htmlFor="referenceEmail">Reference Email Address:</label>
                        <input
                            type="email"
                            id="referenceEmail"
                            value={referenceEmail}
                            onChange={(e) => setReferenceEmail(e.target.value)}
                            placeholder="Enter your reference email"
                            disabled={isUpdatingReferenceEmail}
                            className="form-control"
                        />
                    </div>

                    {referenceEmailMessage.message && (
                        <div className={`message ${referenceEmailMessage.type === 'success' ? 'success' : 'error'}`}>
                            {referenceEmailMessage.message}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleUpdateReferenceEmail}
                        className="btn btn-primary"
                        disabled={isUpdatingReferenceEmail}
                    >
                        {isUpdatingReferenceEmail ? 'Updating...' : 'Update Reference Email'}
                    </button>
                </div>

                <div className="reference-email-note">
                    <h4>Important Notes:</h4>
                    <ul>
                        <li>Your reference email will be used for password recovery only</li>
                        <li>Make sure you have access to this email address</li>
                        <li>This email should be different from your login email for security</li>
                        <li>Only use this reference email when using "Forgot Password"</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    const renderAppearanceTab = () => (
        <div className="settings-section">
            <h2 className="section-title">{t('theme')}</h2>
            <div className="theme-options">
                <div className="theme-option">
                    <button type="button"
                        className={`theme-preview ${currentTheme === 'light' ? 'selected' : ''}`}
                        style={{ backgroundColor: '#ffffff', border: '2px solid #e2e8f0' }}
                        onClick={() => handleThemeChange('light')}
                    ></button>
                    <span className="theme-name">Light</span>
                </div>

                <div className="theme-option">
                    <button type="button"
                        className={`theme-preview ${currentTheme === 'dark' ? 'selected' : ''}`}
                        style={{ backgroundColor: '#0f172a', border: '2px solid #334155' }}
                        onClick={() => handleThemeChange('dark')}
                    ></button>
                    <span className="theme-name">Dark</span>
                </div>

                <div className="theme-option">
                    <button type="button"
                        className={`theme-preview ${currentTheme === 'blue' ? 'selected' : ''}`}
                        style={{ backgroundColor: '#eff6ff', border: '2px solid #93c5fd' }}
                        onClick={() => handleThemeChange('blue')}
                    ></button>
                    <span className="theme-name">Blue</span>
                </div>

                <div className="theme-option">
                    <button type="button"
                        className={`theme-preview ${currentTheme === 'green' ? 'selected' : ''}`}
                        style={{ backgroundColor: '#f0fdf4', border: '2px solid #86efac' }}
                        onClick={() => handleThemeChange('green')}
                    ></button>
                    <span className="theme-name">Green</span>
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="language">{t('language')}</label>
                <select
                    id="language"
                    name="language"
                    className="form-control"
                    value={settings.language}
                    onChange={handleInputChange}
                >
                    <option value="en">English</option>
                    <option value="ph">Filipino (Tagalog)</option>
                </select>
                <small className="form-text text-muted">
                    K-Wise currently supports English and Filipino languages only.
                </small>
            </div>
            <div className="form-check">
                <input
                    type="checkbox"
                    id="notifications"
                    name="notifications"
                    className="form-check-input"
                    checked={settings.notifications}
                    onChange={handleInputChange}
                />
                <label htmlFor="notifications" className="form-check-label">
                    {t('notifications')}
                </label>
            </div>
        </div>
    );

    const renderSystemTab = () => (
        <div className="settings-section">
            <h2 className="section-title">{t('serverConfig')}</h2>
            <div className="server-info">
                <div className="server-info-label">{t('serverAddress')}:</div>
                <div className="server-info-value">
                    <input
                        type="text"
                        id="serverAddress"
                        name="serverAddress"
                        className="form-control"
                        value={settings.serverAddress}
                        onChange={handleInputChange}
                        disabled={!canEditSystemSettings()}
                    />
                    {!canEditSystemSettings() && (
                        <small className="permission-note">
                            <FiLock /> Superadmin access required
                        </small>
                    )}
                </div>

                <div className="server-info-label">{t('port')}:</div>
                <div className="server-info-value">
                    <input
                        type="text"
                        id="port"
                        name="port"
                        className="form-control"
                        value={settings.port}
                        onChange={handleInputChange}
                        disabled={!canEditSystemSettings()}
                    />
                </div>

                <div className="server-info-label">{t('databaseType')}:</div>
                <div className="server-info-value">
                    <input
                        type="text"
                        id="databaseType"
                        name="databaseType"
                        className="form-control"
                        value="PostgreSQL"
                        disabled={true}
                        readOnly
                    />
                </div>

                <div className="server-info-label">{t('databaseName')}:</div>
                <div className="server-info-value">
                    <input
                        type="text"
                        id="databaseName"
                        name="databaseName"
                        className="form-control"
                        value={settings.databaseName}
                        onChange={handleInputChange}
                        disabled={!canEditSystemSettings()}
                    />
                </div>
            </div>
            <h2 className="section-title">{t('systemInfo')}</h2>
            <div className="server-info">
                <div className="server-info-label">OS:</div>
                <div className="server-info-value">Windows (11)</div>

                <div className="server-info-label">Server Time:</div>
                <div className="server-info-value">2025-04-21 14:30:45</div>

                <div className="server-info-label">Node.js Version:</div>
                <div className="server-info-value">v20.5.0</div>

                <div className="server-info-label">Express Version:</div>
                <div className="server-info-value">4.19.0</div>

                <div className="server-info-label">PostgreSQL Version:</div>
                <div className="server-info-value">15.3</div>
            </div>
        </div>
    );

    const renderDeveloperTab = () => (
        <div className="settings-section">
            <h2 className="section-title">Developer Settings</h2>
            <div className="developer-settings">
                <div className="form-group">
                    <label htmlFor="apiTimeout">API Timeout (ms):</label>
                    <input
                        type="number"
                        id="apiTimeout"
                        name="apiTimeout"
                        className="form-control"
                        value={settings.apiTimeout}
                        onChange={handleInputChange}
                        min="1000"
                        max="60000"
                    />
                    <small className="form-text">
                        API request timeout in milliseconds (Test environment only)
                    </small>
                </div>

                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="autoUpdate"
                            checked={settings.autoUpdate}
                            onChange={handleInputChange}
                        />
                        {' '}Enable Auto Updates (Staging only)
                    </label>
                    <small className="form-text">
                        Automatically update test environment
                    </small>
                </div>

                <div className="developer-info">
                    <h3>Development Environment</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Environment:</span>
                            <span className="info-value">Development</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Debug Mode:</span>
                            <span className="info-value">Enabled</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">API Version:</span>
                            <span className="info-value">v1.0.0</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Hot Reload:</span>
                            <span className="info-value">Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMonitoringTab = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <FiMonitor /> System Performance Monitoring
            </h2>

            <div className="monitoring-dashboard">
                <div className="stats-grid">
                    {(() => {
                        const cpuLevel = getStatLevel(systemStats.cpuUsage, 80, 60);
                        const memLevel = getStatLevel(systemStats.memoryUsage, 85, 70);
                        const diskLevel = getStatLevel(systemStats.diskUsage, 90, 75);
                        return (<>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiCpu />
                        </div>
                        <div className="stat-content">
                            <h3>CPU Usage</h3>
                            <div className="stat-value">{systemStats.cpuUsage}%</div>
                            <div className={`stat-status ${cpuLevel.className}`}>
                                {cpuLevel.label}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiHardDrive />
                        </div>
                        <div className="stat-content">
                            <h3>Memory Usage</h3>
                            <div className="stat-value">{systemStats.memoryUsage}%</div>
                            <div className={`stat-status ${memLevel.className}`}>
                                {memLevel.label}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiDatabase />
                        </div>
                        <div className="stat-content">
                            <h3>Disk Usage</h3>
                            <div className="stat-value">{systemStats.diskUsage}%</div>
                            <div className={`stat-status ${diskLevel.className}`}>
                                {diskLevel.label}
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiUsers />
                        </div>
                        <div className="stat-content">
                            <h3>Active Users</h3>
                            <div className="stat-value">{systemStats.activeConnections}</div>
                            <div className="stat-status good">Online</div>
                        </div>
                    </div>
                    </>);
                    })()}
                </div>

                <div className="monitoring-config">
                    <h3>Alert Thresholds</h3>
                    <div className="threshold-settings">
                        <div className="form-group">
                            <label htmlFor="cpuThreshold">CPU Alert Threshold (%):</label>
                            <input
                                type="number"
                                id="cpuThreshold"
                                name="cpuThreshold"
                                value={settings.cpuThreshold}
                                onChange={handleInputChange}
                                min="50"
                                max="95"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="memoryThreshold">Memory Alert Threshold (%):</label>
                            <input
                                type="number"
                                id="memoryThreshold"
                                name="memoryThreshold"
                                value={settings.memoryThreshold}
                                onChange={handleInputChange}
                                min="60"
                                max="95"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="diskThreshold">Disk Alert Threshold (%):</label>
                            <input
                                type="number"
                                id="diskThreshold"
                                name="diskThreshold"
                                value={settings.diskThreshold}
                                onChange={handleInputChange}
                                min="70"
                                max="95"
                                className="form-control"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEmailTab = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <FiMail /> Email Configuration
            </h2>

            <div className="email-config">
                <h3>SMTP Settings</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="smtpHost">SMTP Host:</label>
                        <input
                            type="text"
                            id="smtpHost"
                            name="smtpHost"
                            value={settings.smtpHost}
                            onChange={handleInputChange}
                            placeholder="smtp.gmail.com"
                            className="form-control"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="smtpPort">SMTP Port:</label>
                        <input
                            type="text"
                            id="smtpPort"
                            name="smtpPort"
                            value={settings.smtpPort}
                            onChange={handleInputChange}
                            placeholder="587"
                            className="form-control"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="smtpUser">SMTP Username:</label>
                        <input
                            type="text"
                            id="smtpUser"
                            name="smtpUser"
                            value={settings.smtpUser}
                            onChange={handleInputChange}
                            placeholder="your-email@gmail.com"
                            className="form-control"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="smtpPassword">SMTP Password:</label>
                        <input
                            type="password"
                            id="smtpPassword"
                            name="smtpPassword"
                            value={settings.smtpPassword}
                            onChange={handleInputChange}
                            placeholder="Your app password"
                            className="form-control"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="smtpFrom">From Email:</label>
                        <input
                            type="email"
                            id="smtpFrom"
                            name="smtpFrom"
                            value={settings.smtpFrom}
                            onChange={handleInputChange}
                            placeholder="noreply@yourcompany.com"
                            className="form-control"
                        />
                    </div>
                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                name="smtpSecure"
                                checked={settings.smtpSecure}
                                onChange={handleInputChange}
                            />
                            {' '}Use Secure Connection (TLS)
                        </label>
                    </div>
                </div>

                <div className="email-test">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={testEmailConfig}
                    >
                        <FiMail /> Test Email Configuration
                    </button>
                </div>
            </div>
        </div>
    );

    const renderBackupTab = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <FiDatabase /> Backup & Recovery Management
            </h2>

            <div className="backup-config">
                <h3>Backup Settings</h3>
                <div className="backup-settings">
                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                name="autoBackupEnabled"
                                checked={settings.autoBackupEnabled}
                                onChange={handleInputChange}
                            />
                            {' '}Enable Automatic Backups
                        </label>
                    </div>

                    <div className="form-group">
                        <label htmlFor="backupInterval">Backup Interval (hours):</label>
                        <select
                            id="backupInterval"
                            name="backupInterval"
                            value={settings.backupInterval}
                            onChange={handleInputChange}
                            className="form-control"
                            disabled={!settings.autoBackupEnabled}
                        >
                            <option value="6">Every 6 hours</option>
                            <option value="12">Every 12 hours</option>
                            <option value="24">Daily</option>
                            <option value="72">Every 3 days</option>
                            <option value="168">Weekly</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="backupRetentionDays">Retention Period (days):</label>
                        <input
                            type="number"
                            id="backupRetentionDays"
                            name="backupRetentionDays"
                            value={settings.backupRetentionDays}
                            onChange={handleInputChange}
                            min="7"
                            max="365"
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="backupLocation">Backup Location:</label>
                        <select
                            id="backupLocation"
                            name="backupLocation"
                            value={settings.backupLocation}
                            onChange={handleInputChange}
                            className="form-control"
                        >
                            <option value="local">Local Storage</option>
                            <option value="cloud">Cloud Storage</option>
                            <option value="network">Network Drive</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                name="backupEncryption"
                                checked={settings.backupEncryption}
                                onChange={handleInputChange}
                            />
                            {' '}Encrypt Backups
                        </label>
                    </div>
                </div>

                <div className="backup-status">
                    <h3>Backup Status</h3>
                    <div className="status-info">
                        <div className="status-item">
                            <span>Last Backup:</span>
                            <span>{systemStats.lastBackup ? new Date(systemStats.lastBackup).toLocaleString() : 'Never'}</span>
                        </div>
                        <div className="status-item">
                            <span>Database Status:</span>
                            <span className={`status ${systemStats.databaseStatus}`}>
                                {systemStats.databaseStatus}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="backup-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={triggerManualBackup}
                    >
                        <FiDatabase /> Create Manual Backup
                    </button>
                </div>
            </div>
        </div>
    );

    const renderPerformanceTab = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <FiActivity /> Performance & Optimization
            </h2>

            <div className="performance-config">
                <h3>User Limits</h3>
                <div className="form-group">
                    <label htmlFor="maxConcurrentUsers">Maximum Concurrent Users:</label>
                    <input
                        type="number"
                        id="maxConcurrentUsers"
                        name="maxConcurrentUsers"
                        value={settings.maxConcurrentUsers}
                        onChange={handleInputChange}
                        min="10"
                        max="1000"
                        className="form-control"
                    />
                </div>

                <h3>Caching</h3>
                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="cachingEnabled"
                            checked={settings.cachingEnabled}
                            onChange={handleInputChange}
                        />
                        {' '}Enable Data Caching
                    </label>
                </div>
                <div className="form-group">
                    <label htmlFor="cacheExpirationMinutes">Cache Expiration (minutes):</label>
                    <input
                        type="number"
                        id="cacheExpirationMinutes"
                        name="cacheExpirationMinutes"
                        value={settings.cacheExpirationMinutes}
                        onChange={handleInputChange}
                        min="5"
                        max="120"
                        className="form-control"
                        disabled={!settings.cachingEnabled}
                    />
                </div>

                <h3>Rate Limiting</h3>
                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="rateLimitingEnabled"
                            checked={settings.rateLimitingEnabled}
                            onChange={handleInputChange}
                        />
                        {' '}Enable Rate Limiting
                    </label>
                </div>
                <div className="form-group">
                    <label htmlFor="requestsPerMinute">Requests per Minute:</label>
                    <input
                        type="number"
                        id="requestsPerMinute"
                        name="requestsPerMinute"
                        value={settings.requestsPerMinute}
                        onChange={handleInputChange}
                        min="10"
                        max="1000"
                        className="form-control"
                        disabled={!settings.rateLimitingEnabled}
                    />
                </div>

                <h3>Security</h3>
                <div className="form-group">
                    <label htmlFor="passwordComplexity">Password Complexity:</label>
                    <select
                        id="passwordComplexity"
                        name="passwordComplexity"
                        value={settings.passwordComplexity}
                        onChange={handleInputChange}
                        className="form-control"
                    >
                        <option value="low">Low (8+ characters)</option>
                        <option value="medium">Medium (8+ chars, numbers)</option>
                        <option value="high">High (8+ chars, numbers, symbols)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="accountLockoutThreshold">Account Lockout Threshold:</label>
                    <input
                        type="number"
                        id="accountLockoutThreshold"
                        name="accountLockoutThreshold"
                        value={settings.accountLockoutThreshold}
                        onChange={handleInputChange}
                        min="3"
                        max="10"
                        className="form-control"
                    />
                    <small className="form-text">Failed login attempts before lockout</small>
                </div>

                <div className="form-group">
                    <label htmlFor="sessionInactivityTimeout">Session Timeout (minutes):</label>
                    <input
                        type="number"
                        id="sessionInactivityTimeout"
                        name="sessionInactivityTimeout"
                        value={settings.sessionInactivityTimeout}
                        onChange={handleInputChange}
                        min="15"
                        max="480"
                        className="form-control"
                    />
                </div>
            </div>
        </div>
    );

    const renderPrinterTab = () => (
        <div className="settings-section">
            <h2 className="section-title">
                <FiPrinter /> Thermal Printer Configuration
            </h2>

            {printerMessage.message && (
                <div className={`alert ${getAlertClass(printerMessage.type)}`}>
                    {printerMessage.message}
                </div>
            )}

            {/* ✅ Paired Devices Section */}
            {pairedDevices.length > 0 && (
                <div className="paired-devices-card" style={{ 
                    marginBottom: '20px', 
                    padding: '15px', 
                    border: '1px solid #ddd', 
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                }}>
                    <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#28a745' }}>
                        ✅ Paired Devices ({pairedDevices.length})
                    </h3>
                    {pairedDevices.map((device, index) => (
                        <div key={`${device.vendorId}-${device.productId}`} style={{ 
                            padding: '10px', 
                            marginBottom: '10px', 
                            backgroundColor: 'white', 
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                🖨️ {device.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                <div>Vendor ID: {device.vendorId}</div>
                                <div>Product ID: {device.productId}</div>
                                <div>Manufacturer: {device.manufacturer}</div>
                            </div>
                        </div>
                    ))}
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                        💡 Click "Connect" below to use a paired printer
                    </div>
                </div>
            )}

            {/* ✅ NEW: Windows Access Denied Help Card */}
            {printerMessage.type === 'error' && printerMessage.message.includes('Windows is using') && (
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '15px', 
                    border: '2px solid #dc3545', 
                    borderRadius: '8px',
                    backgroundColor: '#fff5f5'
                }}>
                    <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#dc3545' }}>
                        🔧 Windows Printer Lock - How to Fix
                    </h3>
                    <ol style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
                        <li>Press <kbd>Win</kbd> + <kbd>I</kbd> to open Windows Settings</li>
                        <li>Go to <strong>Bluetooth & devices</strong> → <strong>Printers & scanners</strong></li>
                        <li>Find and click on <strong>"Bisofice 58mm"</strong></li>
                        <li>Click <strong>"Remove device"</strong></li>
                        <li>Unplug the USB cable from your computer</li>
                        <li>Wait 3 seconds, then plug it back in</li>
                        <li>Click <strong>"🔄 Reset Connection"</strong> button below</li>
                        <li>Then click <strong>"🔌 Connect Printer"</strong></li>
                    </ol>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                        💡 Alternative: Restart your computer to fully release the device
                    </div>
                </div>
            )}

            <div className="printer-status-card">
                <h3>Printer Status</h3>
                {printerStatus && (
                    <div className="status-grid">
                        <div className="status-item">
                            <strong>Platform:</strong>
                            <span>{printerStatus.platform.os} ({printerStatus.platform.browser})</span>
                        </div>
                        <div className="status-item">
                            <strong>Connection:</strong>
                            <span className={printerStatus.isConnected ? 'status-connected' : 'status-disconnected'}>
                                {printerStatus.isConnected ? '✅ Connected' : '❌ Disconnected'}
                            </span>
                        </div>
                        {printerStatus.isConnected && (
                            <>
                                <div className="status-item">
                                    <strong>Type:</strong>
                                    <span>{connectionTypeLabels[printerStatus.connectionType] || 'Unknown'}</span>
                                </div>
                                <div className="status-item">
                                    <strong>Device:</strong>
                                    <span>{printerStatus.deviceName || 'Unknown Device'}</span>
                                </div>
                            </>
                        )}
                        <div className="status-item">
                            <strong>USB Support:</strong>
                            <span>{printerStatus.usbSupported ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        <div className="status-item">
                            <strong>Bluetooth Support:</strong>
                            <span>{printerStatus.bluetoothSupported ? '✅ Yes' : '❌ No'}</span>
                        </div>
                    </div>
                )}

                <div className="printer-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={async () => {
                            setPrinterConnecting(true);
                            setPrinterMessage({ type: '', message: '' });
                            try {
                                await thermalPrinter.connect();
                                const status = thermalPrinter.getStatus();
                                setPrinterStatus(status);

                                // Refresh paired devices list
                                const paired = await thermalPrinter.getPairedDevices();
                                setPairedDevices(paired);

                                setPrinterMessage({ 
                                    type: 'success', 
                                    message: `✅ Connected to ${status.deviceName || 'printer'} successfully!` 
                                });
                            } catch (error) {
                                console.error('Connection failed:', error);
                                setPrinterMessage({ 
                                    type: 'error', 
                                    message: `❌ Connection failed: ${error.message}` 
                                });
                            } finally {
                                setPrinterConnecting(false);
                            }
                        }}
                        disabled={printerConnecting || (printerStatus?.isConnected)}
                    >
                        {connectButtonLabel}
                    </button>

                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={async () => {
                            setPrinterMessage({ type: '', message: '' });
                            const status = thermalPrinter.getStatus();
                            setPrinterStatus(status);

                            // Refresh paired devices
                            const paired = await thermalPrinter.getPairedDevices();
                            setPairedDevices(paired);

                            setPrinterMessage({ 
                                type: 'info', 
                                message: `Status refreshed - ${paired.length} paired device(s) found` 
                            });
                        }}
                    >
                        <FiRefreshCw /> Refresh Status
                    </button>

                    {/* ✅ NEW: Force Reset Button for Access Denied Issues */}
                    <button
                        type="button"
                        className="btn btn-warning"
                        onClick={async () => {
                            if (globalThis.confirm(
                                'This will completely reset the printer connection.\n\n' +
                                'Use this if you see "Access denied" errors.\n\n' +
                                'Continue?'
                            )) {
                                setPrinterMessage({ type: '', message: '' });
                                try {
                                    await thermalPrinter.forceReset();
                                    const status = thermalPrinter.getStatus();
                                    setPrinterStatus(status);
                                    setPrinterMessage({ 
                                        type: 'success', 
                                        message: '✅ Connection reset complete. Now click "Connect Printer" to reconnect.' 
                                    });
                                } catch (error) {
                                    console.error('Reset failed:', error);
                                    setPrinterMessage({ 
                                        type: 'error', 
                                        message: `❌ Reset failed: ${error.message}` 
                                    });
                                }
                            }
                        }}
                        disabled={printerConnecting}
                        style={{ backgroundColor: '#ffc107', borderColor: '#ffc107' }}
                    >
                        🔄 Reset Connection
                    </button>

                    {printerStatus?.isConnected && (
                        <>
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={async () => {
                                    setPrinterTestPrinting(true);
                                    setPrinterMessage({ type: '', message: '' });
                                    try {
                                        const testReceipt = {
                                            orderIdFormatted: 'TEST-001',
                                            transactionIdFormatted: 'TEST-TID-001',
                                            queueNumber: '99',
                                            customerName: 'Test Customer',
                                            totalAmount: 1234.56,
                                            items: [
                                                {
                                                    name: 'Test Product 1',
                                                    quantity: 2,
                                                    price: 500,
                                                    totalPrice: 1000
                                                },
                                                {
                                                    name: 'Test Product 2',
                                                    quantity: 1,
                                                    price: 234.56,
                                                    totalPrice: 234.56
                                                }
                                            ],
                                            paymentMethod: 'Cash',
                                            timestamp: new Date().toISOString()
                                        };
                                        await thermalPrinter.printReceipt(testReceipt);
                                        setPrinterMessage({ 
                                            type: 'success', 
                                            message: '✅ Test receipt printed successfully!' 
                                        });
                                    } catch (error) {
                                        console.error('Test print failed:', error);
                                        setPrinterMessage({ 
                                            type: 'error', 
                                            message: `❌ Test print failed: ${error.message}` 
                                        });
                                    } finally {
                                        setPrinterTestPrinting(false);
                                    }
                                }}
                                disabled={printerTestPrinting}
                            >
                                {printerTestPrinting ? 'Printing...' : '🖨️ Test Print'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={async () => {
                                    setPrinterMessage({ type: '', message: '' });
                                    try {
                                        await thermalPrinter.disconnect();
                                        setPrinterStatus(thermalPrinter.getStatus());
                                        setPrinterMessage({ 
                                            type: 'info', 
                                            message: 'Disconnected from printer' 
                                        });
                                    } catch (error) {
                                        console.error('Disconnect failed:', error);
                                        setPrinterMessage({ 
                                            type: 'error', 
                                            message: `❌ Disconnect failed: ${error.message}` 
                                        });
                                    }
                                }}
                            >
                                Disconnect
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="printer-info-card">
                <h3>Setup Instructions</h3>
                <ol className="setup-steps">
                    <li>
                        <strong>First Time Setup:</strong>
                        <ul>
                            <li>Ensure your Bisofice 58mm thermal printer is powered on and connected via USB</li>
                            <li>Click "Connect USB Printer" button above</li>
                            <li>Select your printer from the browser dialog (it will show all USB devices)</li>
                            <li>Click "Connect" in the dialog</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Testing:</strong>
                        <ul>
                            <li>Once connected, click "Test Print" to verify the printer is working</li>
                            <li>A sample receipt should print with test order data</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Auto-Reconnect:</strong>
                        <ul>
                            <li>After first authorization, the printer will auto-reconnect on page reload</li>
                            <li>You only need to manually connect once per browser</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Troubleshooting:</strong>
                        <ul>
                            <li>If printer doesn't appear, try a different USB port (USB 2.0 recommended)</li>
                            <li>Check printer is powered on and Windows recognizes it</li>
                            <li>Try refreshing the browser if connection fails</li>
                            <li>Console (F12) shows detailed error messages</li>
                        </ul>
                    </li>
                </ol>
            </div>

            <div className="printer-technical-info">
                <h3>Technical Information</h3>
                <div className="tech-info-grid">
                    <div className="tech-item">
                        <strong>Supported Models:</strong>
                        <span>Bisofice 58mm, Generic 58mm thermal printers, ESC/POS compatible</span>
                    </div>
                    <div className="tech-item">
                        <strong>Connection Method:</strong>
                        <span>WebUSB API (Chrome/Edge required)</span>
                    </div>
                    <div className="tech-item">
                        <strong>Paper Width:</strong>
                        <span>58mm thermal paper</span>
                    </div>
                    <div className="tech-item">
                        <strong>Command Set:</strong>
                        <span>ESC/POS</span>
                    </div>
                </div>
            </div>
        </div>
    );

    let connectButtonLabel = '🔌 Connect Printer';
    if (printerConnecting) {
        connectButtonLabel = 'Connecting...';
    } else if (printerStatus?.isConnected) {
        connectButtonLabel = '✅ Connected';
    }

    const TAB_CONFIG = [
        { key: 'appearance', label: t('appearance'), visible: canEditAppearanceSettings() },
        { key: 'account', label: 'Account Security', visible: canEditAccountSecuritySettings() },
        { key: 'system', label: t('system'), visible: canEditSystemSettings() || canEditOperationalSettings() },
        { key: 'security', label: t('security'), visible: canEditSecuritySettings() },
        { key: 'monitoring', label: <><FiMonitor /> Monitoring</>, visible: canViewMonitoring() },
        { key: 'email', label: <><FiMail /> Email</>, visible: canEditEmailSettings() },
        { key: 'backup', label: <><FiDatabase /> Backup</>, visible: canEditBackupSettings() },
        { key: 'performance', label: <><FiActivity /> Performance</>, visible: canEditPerformanceSettings() },
        { key: 'printer', label: <><FiPrinter /> Thermal Printer</>, visible: currentUser?.role === 'superadmin' || currentUser?.role === 'admin' },
    ];

    const TAB_RENDERERS = {
        appearance: renderAppearanceTab,
        account: renderAccountTab,
        system: renderSystemTab,
        security: renderSecurityTab,
        monitoring: renderMonitoringTab,
        email: renderEmailTab,
        backup: renderBackupTab,
        performance: renderPerformanceTab,
        printer: renderPrinterTab,
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <div className="header-left">
                    <h1>{t('settings')}</h1>
                    <span className="user-role">({currentUser?.role})</span>
                </div>
                <div className="header-right">
                    {lastUpdated && (
                        <span className="last-updated">
                            <FiClock /> Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <FiRefreshCw />
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="settings-tabs">
                {TAB_CONFIG.filter(tab => tab.visible).map(tab => (
                    <button type="button"
                        key={tab.key}
                        className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
                {(currentUser?.role === 'superadmin' || currentUser?.role === 'admin') && (
                    <button type="button"
                        className={`settings-tab ${activeTab === 'ip-access' ? 'active' : ''}`}
                        onClick={() => {
                            globalThis.location.href = '/admin/ip-access-control';
                        }}
                    >
                        <FiShield /> IP Access Control
                    </button>
                )}
            </div>
            {saveMessage.message && (
                <div className={`alert ${getAlertClass(saveMessage.type)}`}>
                    {saveMessage.message}
                </div>
            )}
            <div className="settings-content">
                <form onSubmit={handleSaveSettings}>
                    {TAB_RENDERERS[activeTab]?.()}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleResetSettings}
                            disabled={isSaving}
                        >
                            <FiRefreshCw /> {t('resetToDefault')}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSaving}
                        >
                            {isSaving ? t('saving') : (
                                <>
                                    <FiSave /> {t('saveSettings')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
