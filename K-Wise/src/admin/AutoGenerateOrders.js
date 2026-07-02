/**
 * TASK 7: AUTO-GENERATE ORDERS
 * Admin UI component for generating test orders for testing
 */

import React, { useState } from 'react';
import { ordersAPI } from '../api/api';
import './AutoGenerateOrders.css';

const AutoGenerateOrders = () => {
    const [config, setConfig] = useState({
        count: 10,
        customerPrefix: 'Test Customer',
        includeServices: false,
        minItems: 1,
        maxItems: 5,
        minTotal: 5000,
        maxTotal: 50000,
        autoSave: true
    });

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? Number.parseInt(value, 10) : value
        }));
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await ordersAPI.autoGenerate(config);
            setResults(response.data);
        } catch (err) {
            console.error('Error generating test orders:', err);
            setError(err.response?.data?.message || 'Failed to generate test orders');
        } finally {
            setLoading(false);
        }
    };

    const handleCleanup = async () => {
        if (!window.confirm(`Are you sure you want to delete all test orders matching "${config.customerPrefix}"?`)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await ordersAPI.cleanupTestOrders(config.customerPrefix);
            setResults({
                cleanup: true,
                deleted: response.data.deleted,
                message: response.message
            });
        } catch (err) {
            console.error('Error cleaning up test orders:', err);
            setError(err.response?.data?.message || 'Failed to cleanup test orders');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auto-generate-orders">
            <div className="auto-generate-header">
                <h2>🤖 Auto-Generate Test Orders</h2>
                <p className="subtitle">Generate realistic test orders for testing and development</p>
            </div>

            <div className="auto-generate-config">
                <div className="config-section">
                    <h3>Order Configuration</h3>
                    
                    <div className="config-row">
                        <label htmlFor="count">
                            <span className="label-text">Number of Orders</span>
                            <span className="label-hint">How many test orders to generate</span>
                        </label>
                        <input
                            type="number"
                            id="count"
                            name="count"
                            value={config.count}
                            onChange={handleInputChange}
                            min="1"
                            max="100"
                            disabled={loading}
                        />
                    </div>

                    <div className="config-row">
                        <label htmlFor="customerPrefix">
                            <span className="label-text">Customer Name Prefix</span>
                            <span className="label-hint">Prefix for test customer names</span>
                        </label>
                        <input
                            type="text"
                            id="customerPrefix"
                            name="customerPrefix"
                            value={config.customerPrefix}
                            onChange={handleInputChange}
                            disabled={loading}
                            placeholder="Test Customer"
                        />
                    </div>

                    <div className="config-row">
                        <label htmlFor="includeServices">
                            <span className="label-text">Include Services</span>
                            <span className="label-hint">Add random services to orders</span>
                        </label>
                        <input
                            type="checkbox"
                            id="includeServices"
                            name="includeServices"
                            checked={config.includeServices}
                            onChange={handleInputChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="config-row">
                        <label htmlFor="autoSave">
                            <span className="label-text">Auto-Save to Database</span>
                            <span className="label-hint">Save orders immediately (uncheck for preview only)</span>
                        </label>
                        <input
                            type="checkbox"
                            id="autoSave"
                            name="autoSave"
                            checked={config.autoSave}
                            onChange={handleInputChange}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="config-section">
                    <h3>Item Configuration</h3>
                    
                    <div className="config-row-group">
                        <div className="config-row">
                            <label htmlFor="minItems">
                                <span className="label-text">Min Items per Order</span>
                            </label>
                            <input
                                type="number"
                                id="minItems"
                                name="minItems"
                                value={config.minItems}
                                onChange={handleInputChange}
                                min="1"
                                max={config.maxItems}
                                disabled={loading}
                            />
                        </div>

                        <div className="config-row">
                            <label htmlFor="maxItems">
                                <span className="label-text">Max Items per Order</span>
                            </label>
                            <input
                                type="number"
                                id="maxItems"
                                name="maxItems"
                                value={config.maxItems}
                                onChange={handleInputChange}
                                min={config.minItems}
                                max="10"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <div className="config-section">
                    <h3>Price Configuration</h3>
                    
                    <div className="config-row-group">
                        <div className="config-row">
                            <label htmlFor="minTotal">
                                <span className="label-text">Min Total (₱)</span>
                            </label>
                            <input
                                type="number"
                                id="minTotal"
                                name="minTotal"
                                value={config.minTotal}
                                onChange={handleInputChange}
                                min="1000"
                                max={config.maxTotal}
                                step="1000"
                                disabled={loading}
                            />
                        </div>

                        <div className="config-row">
                            <label htmlFor="maxTotal">
                                <span className="label-text">Max Total (₱)</span>
                            </label>
                            <input
                                type="number"
                                id="maxTotal"
                                name="maxTotal"
                                value={config.maxTotal}
                                onChange={handleInputChange}
                                min={config.minTotal}
                                max="100000"
                                step="1000"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="auto-generate-actions">
                <button 
                    className="btn-generate"
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? '⏳ Generating...' : '🤖 Generate Test Orders'}
                </button>

                <button 
                    className="btn-cleanup"
                    onClick={handleCleanup}
                    disabled={loading}
                >
                    {loading ? '⏳ Cleaning...' : '🗑️ Cleanup Test Orders'}
                </button>
            </div>

            {error && (
                <div className="auto-generate-error">
                    <span className="error-icon">⚠️</span>
                    <span className="error-message">{error}</span>
                </div>
            )}

            {results && !results.cleanup && (
                <div className="auto-generate-results">
                    <div className="results-header">
                        <h3>✅ Generation Results</h3>
                        <p>{results.message}</p>
                    </div>

                    {results.summary && (
                        <div className="results-summary">
                            <div className="summary-stat">
                                <span className="stat-label">Total Generated</span>
                                <span className="stat-value">{results.summary.totalGenerated}</span>
                            </div>
                            <div className="summary-stat">
                                <span className="stat-label">Successfully Saved</span>
                                <span className="stat-value success">{results.summary.totalSaved}</span>
                            </div>
                            {results.summary.totalFailed > 0 && (
                                <div className="summary-stat">
                                    <span className="stat-label">Failed</span>
                                    <span className="stat-value error">{results.summary.totalFailed}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {results.saveResults?.errors?.length > 0 && (
                        <div className="results-errors">
                            <h4>Errors:</h4>
                            <ul>
                                {results.saveResults.errors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {results.orders?.length > 0 && (
                        <div className="results-preview">
                            <h4>Sample Orders (First 3):</h4>
                            <div className="orders-list">
                                {results.orders.map((order, idx) => (
                                    <div key={idx} className="order-card">
                                        <div className="order-header">
                                            <span className="order-customer">{order.customer_name}</span>
                                            <span className={`order-status status-${order.status}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="order-details">
                                            <span>Items: {order.items?.length || 0}</span>
                                            <span>Total: ₱{order.total_amount?.toLocaleString()}</span>
                                        </div>
                                        <div className="order-date">
                                            {new Date(order.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {results && results.cleanup && (
                <div className="auto-generate-results">
                    <div className="results-header">
                        <h3>✅ Cleanup Complete</h3>
                        <p>{results.message}</p>
                    </div>

                    <div className="results-summary">
                        <div className="summary-stat">
                            <span className="stat-label">Orders Deleted</span>
                            <span className="stat-value">{results.deleted}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutoGenerateOrders;
