import React, { useState, useEffect } from 'react';

const APIConnectionTest = () => {
    const [results, setResults] = useState({});
    const [testing, setTesting] = useState(false);

    const testEndpoints = [
        { name: 'Health Check', url: 'http://localhost:5000/api/health' },
        { name: 'Dashboard Stats', url: 'http://localhost:5000/api/dashboard/stats' },
        { name: 'Stock Categories', url: 'http://localhost:5000/api/stock/categories' },
        { name: 'Settings', url: 'http://localhost:5000/api/settings' }
    ];

    const testConnection = async () => {
        setTesting(true);
        const newResults = {};

        for (const endpoint of testEndpoints) {
            try {
                const response = await fetch(endpoint.url, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                newResults[endpoint.name] = {
                    status: response.status,
                    success: response.ok,
                    message: response.ok ? 'Connected' : `Error ${response.status}`
                };
            } catch (error) {
                newResults[endpoint.name] = {
                    status: 'Error',
                    success: false,
                    message: error.message
                };
            }
        }

        setResults(newResults);
        setTesting(false);
    };

    useEffect(() => {
        testConnection();
    }, []);

    return (
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', margin: '20px', borderRadius: '8px' }}>
            <h3>🔧 Phase 2 API Connection Test</h3>
            <button 
                onClick={testConnection} 
                disabled={testing}
                style={{ marginBottom: '15px', padding: '8px 16px' }}
            >
                {testing ? 'Testing...' : 'Test All Endpoints'}
            </button>

            <div>
                {testEndpoints.map(endpoint => (
                    <div key={endpoint.name} style={{ 
                        padding: '8px', 
                        margin: '5px 0', 
                        backgroundColor: results[endpoint.name]?.success ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${results[endpoint.name]?.success ? '#c3e6cb' : '#f5c6cb'}`,
                        borderRadius: '4px'
                    }}>
                        <strong>{endpoint.name}</strong>: {' '}
                        <span style={{ color: results[endpoint.name]?.success ? '#155724' : '#721c24' }}>
                            {results[endpoint.name]?.message || 'Not tested yet'}
                        </span>
                        {results[endpoint.name]?.status && (
                            <span style={{ marginLeft: '10px', fontSize: '0.9em', color: '#666' }}>
                                ({results[endpoint.name].status})
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
                <p><strong>Phase 2 Integration Status:</strong></p>
                <ul>
                    <li>✅ Enhanced Dashboard with real-time stats</li>
                    <li>✅ User Management with simplified roles</li>
                    <li>✅ Settings with EN/PH language limitation</li>
                    <li>✅ SMTP Configuration interface</li>
                    <li>🔄 Stock management with enhanced image handling</li>
                </ul>
            </div>
        </div>
    );
};

export default APIConnectionTest;
