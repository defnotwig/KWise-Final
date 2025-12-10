import React, { useState } from 'react';

const APITester = () => {
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const testAPI = async () => {
        setLoading(true);
        setResult('Testing...');
        
        try {
            console.log('API Tester: Starting test');
            console.log('Environment:', process.env.NODE_ENV);
            console.log('API URL from env:', process.env.REACT_APP_API_URL);
            
            // Test 1: Direct fetch
            const response = await fetch('http://localhost:5000/api/stock/categories');
            console.log('Response received:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Data received:', data);
            
            setResult(JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('API Test Error:', error);
            setResult(`ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
            <h3>API Tester Component</h3>
            <button onClick={testAPI} disabled={loading}>
                {loading ? 'Testing...' : 'Test API Call'}
            </button>
            <pre style={{ background: '#f5f5f5', padding: '10px', marginTop: '10px' }}>
                {result}
            </pre>
        </div>
    );
};

export default APITester;
