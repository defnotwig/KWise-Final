import React, { useState, useEffect } from 'react';
import kioskAPI from '../api/kioskAPI';

const CategoriesDebugTest = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugLog, setDebugLog] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLog(prev => [...prev, logEntry]);
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        addLog('🔄 Starting categories load...');
        
        // Test kioskAPI availability
        addLog('🔗 Testing kioskAPI: ' + (typeof kioskAPI));
        addLog('🔗 getCategories function: ' + (typeof kioskAPI.getCategories));
        
        const apiCategories = await kioskAPI.getCategories();
        addLog('📦 API response received: ' + JSON.stringify(apiCategories?.slice(0, 2) || 'null'));
        addLog('📦 Categories count: ' + (apiCategories?.length || 0));
        
        if (Array.isArray(apiCategories)) {
          setCategories(apiCategories);
          addLog('✅ Categories state set successfully');
        } else {
          throw new Error('API did not return an array');
        }
        
      } catch (err) {
        addLog('❌ Error: ' + err.message);
        setError(err.message);
      } finally {
        setLoading(false);
        addLog('✅ Loading finished');
      }
    };

    loadCategories();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Categories Debug Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> 
        {loading ? ' Loading...' : error ? ` Error: ${error}` : ` Success (${categories.length} categories)`}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Debug Log:</h3>
        <div style={{ background: '#f0f0f0', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
          {debugLog.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Categories Data:</h3>
        <div style={{ background: '#f8f8f8', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
          {categories.length > 0 ? (
            categories.map((cat, index) => (
              <div key={index} style={{ marginBottom: '10px', padding: '5px', border: '1px solid #ddd' }}>
                <strong>{cat.name || cat.category}</strong> ({cat.category}) - {cat.productCount} products
              </div>
            ))
          ) : (
            <p>No categories loaded yet...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesDebugTest;