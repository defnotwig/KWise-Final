/**
 * TASK 13: INVENTORY ALERTS WIDGET
 * Displays low stock and out of stock alerts on admin dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getServerBaseUrl } from '../../utils/networkConfig';
import './InventoryAlerts.css';

const InventoryAlerts = () => {
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(5);

    const fetchAlerts = useCallback(async () => {
        try {            const response = await axios.get(
                `${getServerBaseUrl()}/api/admin/inventory/alerts?threshold=${threshold}`,
                withCredentials: true
            );
            setAlerts(response.data.data);
        } catch (error) {
            console.error('Error fetching inventory alerts:', error);
        } finally {
            setLoading(false);
        }
    }, [threshold]);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    if (loading) return <div className="inventory-alerts-loading">Loading alerts...</div>;
    if (!alerts) return null;

    const { summary, lowStock, outOfStock } = alerts;

    return (
        <div className="inventory-alerts-widget">
            <div className="alerts-header">
                <h3>📊 Inventory Alerts</h3>
                <select 
                    value={threshold} 
                    onChange={(e) => setThreshold(Number.parseInt(e.target.value, 10))}
                    className="threshold-select"
                >
                    <option value="3">Threshold: 3</option>
                    <option value="5">Threshold: 5</option>
                    <option value="10">Threshold: 10</option>
                    <option value="20">Threshold: 20</option>
                </select>
            </div>

            <div className="alerts-summary">
                <div className="alert-stat critical">
                    <span className="stat-label">Out of Stock</span>
                    <span className="stat-value">{outOfStock.total}</span>
                </div>
                <div className="alert-stat warning">
                    <span className="stat-label">Low Stock</span>
                    <span className="stat-value">{lowStock.total}</span>
                </div>
                <div className="alert-stat total">
                    <span className="stat-label">Total Alerts</span>
                    <span className="stat-value">{summary.totalAlertsCount}</span>
                </div>
            </div>

            {outOfStock.total > 0 && (
                <div className="alert-section">
                    <h4 className="section-title critical">🚨 Out of Stock</h4>
                    <div className="alert-list">
                        {outOfStock.products.slice(0, 5).map((product) => (
                            <div key={product.id} className="alert-item critical">
                                <span className="product-name">{product.name}</span>
                                <span className="product-category">{product.category}</span>
                                <span className="product-stock">0 units</span>
                            </div>
                        ))}
                    </div>
                    {outOfStock.total > 5 && (
                        <p className="more-items">+{outOfStock.total - 5} more items</p>
                    )}
                </div>
            )}

            {lowStock.total > 0 && (
                <div className="alert-section">
                    <h4 className="section-title warning">⚠️ Low Stock</h4>
                    <div className="alert-list">
                        {lowStock.products.slice(0, 5).map((product) => (
                            <div key={product.id} className="alert-item warning">
                                <span className="product-name">{product.name}</span>
                                <span className="product-category">{product.category}</span>
                                <span className="product-stock">{product.stock} units</span>
                            </div>
                        ))}
                    </div>
                    {lowStock.total > 5 && (
                        <p className="more-items">+{lowStock.total - 5} more items</p>
                    )}
                </div>
            )}

            {summary.totalAlertsCount === 0 && (
                <div className="no-alerts">
                    <p>✅ All products are well stocked!</p>
                </div>
            )}
        </div>
    );
};

export default InventoryAlerts;
