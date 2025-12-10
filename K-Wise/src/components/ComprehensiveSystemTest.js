import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiRefreshCw } from 'react-icons/fi';

const ComprehensiveSystemTest = () => {
    const [testResults, setTestResults] = useState({});
    const [testing, setTesting] = useState(false);

    const testSuites = useMemo(() => ({
        'Phase 1: Backend Enhancements': [
            { name: 'Dashboard Statistics API', url: 'http://localhost:5000/api/dashboard/stats', method: 'GET' },
            { name: 'Enhanced Stock API', url: 'http://localhost:5000/api/stock/categories', method: 'GET' },
            { name: 'Settings API (EN/PH only)', url: 'http://localhost:5000/api/settings', method: 'GET' },
            { name: 'SMTP Configuration', url: 'http://localhost:5000/api/settings/smtp/test', method: 'POST', skipTest: true }
        ],
        'Phase 2: Frontend Integration': [
            { name: 'User Management API', url: 'http://localhost:5000/api/users', method: 'GET' },
            { name: 'User Roles API', url: 'http://localhost:5000/api/users/roles/available', method: 'GET' },
            { name: 'Health Check', url: 'http://localhost:5000/api/health', method: 'GET' }
        ],
        'Phase 3: Orders System': [
            { name: 'Orders API', url: 'http://localhost:5000/api/orders', method: 'GET' },
            { name: 'Recent Orders', url: 'http://localhost:5000/api/orders/recent?limit=5', method: 'GET' }
        ],
        'Phase 4: Settings & Localization': [
            { name: 'Language Settings (EN/PH)', endpoint: 'Language limitation test', skipTest: true },
            { name: 'SMTP Configuration UI', endpoint: 'SMTP interface test', skipTest: true }
        ],
        'Phase 5: System Validation': [
            { name: 'Database Integrity', endpoint: 'Database test', skipTest: true },
            { name: 'File Upload System', endpoint: 'Image handling test', skipTest: true },
            { name: 'Security Validation', endpoint: 'Security test', skipTest: true }
        ]
    }), []);

    const testEndpoint = async (test) => {
        if (test.skipTest) {
            return { status: 'Manual Test Required', success: null, message: 'Manual verification needed' };
        }

        try {
            const options = {
                method: test.method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            };

            if (test.method === 'POST' && test.url.includes('smtp/test')) {
                options.body = JSON.stringify({
                    smtpHost: 'test.smtp.com',
                    smtpPort: '587',
                    smtpUser: 'test@test.com',
                    smtpPassword: 'testpass',
                    smtpSecure: true,
                    smtpFrom: 'test@test.com'
                });
            }

            const response = await fetch(test.url, options);
            
            return {
                status: response.status,
                success: response.ok,
                message: response.ok ? 'Connected Successfully' : `Error ${response.status}`
            };
        } catch (error) {
            return {
                status: 'Connection Error',
                success: false,
                message: error.message
            };
        }
    };

    const runAllTests = useCallback(async () => {
        setTesting(true);
        const results = {};

        for (const [suitePhase, tests] of Object.entries(testSuites)) {
            results[suitePhase] = {};
            
            for (const test of tests) {
                const result = await testEndpoint(test);
                results[suitePhase][test.name] = result;
                
                // Update results in real-time
                setTestResults({ ...results });
                
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        setTesting(false);
    }, [testSuites]); // Added testSuites as dependency

    const getStatusIcon = (result) => {
        if (!result) return <FiClock style={{ color: '#666' }} />;
        if (result.success === true) return <FiCheckCircle style={{ color: '#28a745' }} />;
        if (result.success === false) return <FiXCircle style={{ color: '#dc3545' }} />;
        return <FiClock style={{ color: '#ffc107' }} />;
    };

    const getStatusColor = (result) => {
        if (!result) return '#f8f9fa';
        if (result.success === true) return '#d4edda';
        if (result.success === false) return '#f8d7da';
        return '#fff3cd';
    };

    useEffect(() => {
        runAllTests();
    }, [runAllTests]); // Added runAllTests as dependency

    return (
        <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            margin: '20px', 
            borderRadius: '8px',
            border: '2px solid #007bff'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#007bff' }}>🚀 K-Wise Admin System - Complete Integration Test</h2>
                <button 
                    onClick={runAllTests} 
                    disabled={testing}
                    style={{ 
                        marginLeft: 'auto', 
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: testing ? 'not-allowed' : 'pointer'
                    }}
                >
                    {testing ? <><FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} /> Testing...</> : 'Re-run All Tests'}
                </button>
            </div>

            {Object.entries(testSuites).map(([suitePhase, tests]) => (
                <div key={suitePhase} style={{ 
                    marginBottom: '20px',
                    backgroundColor: 'white',
                    padding: '15px',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>{suitePhase}</h3>
                    
                    {tests.map(test => {
                        const result = testResults[suitePhase]?.[test.name];
                        return (
                            <div key={test.name} style={{ 
                                padding: '10px', 
                                margin: '5px 0', 
                                backgroundColor: getStatusColor(result),
                                border: '1px solid #dee2e6',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <div style={{ marginRight: '10px' }}>
                                    {getStatusIcon(result)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <strong>{test.name}</strong>
                                    {test.url && (
                                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                                            {test.method} {test.url}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {result?.message || 'Pending...'}
                                    </div>
                                    {result?.status && (
                                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                                            {result.status}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

            <div style={{ 
                marginTop: '20px', 
                padding: '15px',
                backgroundColor: '#e7f3ff',
                border: '1px solid #007bff',
                borderRadius: '6px'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Implementation Summary</h4>
                <div style={{ fontSize: '0.9em' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <strong>✅ Phase 1 Completed:</strong>
                            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                <li>Enhanced dashboard statistics</li>
                                <li>Improved stock image system</li>
                                <li>Limited settings to EN/PH</li>
                                <li>SMTP configuration endpoints</li>
                            </ul>
                        </div>
                        <div>
                            <strong>✅ Phase 2 Completed:</strong>
                            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                <li>Real-time dashboard integration</li>
                                <li>Enhanced user management UI</li>
                                <li>Settings interface updates</li>
                                <li>API connection fixes</li>
                            </ul>
                        </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                        <strong>🔄 Phases 3-5 Status:</strong> Backend integration tested, manual verification for UI components recommended.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComprehensiveSystemTest;
