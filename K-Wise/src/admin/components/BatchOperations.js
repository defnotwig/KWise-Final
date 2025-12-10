/**
 * TASK 8: BATCH OPERATIONS MODAL
 * Lightweight modal for batch product operations
 */

import React, { useState } from 'react';
import { productsAPI } from '../../api/api';
import './BatchOperations.css';

const BatchOperations = ({ selectedProducts, onClose, onComplete }) => {
    const [operation, setOperation] = useState('delete');
    const [newCategory, setNewCategory] = useState('');
    const [priceAdjustment, setPriceAdjustment] = useState({ type: 'fixed', value: 0 });
    const [stockAdjustment, setStockAdjustment] = useState({ type: 'set', value: 0 });
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    const categories = [
        'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 
        'Case', 'Cooling', 'Monitor', 'Keyboard', 'Mouse', 'Headset'
    ];

    const handleExecute = async () => {
        if (selectedProducts.length === 0) {
            alert('No products selected');
            return;
        }

        setLoading(true);
        setResults(null);

        try {
            let response;
            const productIds = selectedProducts.map(p => p.id);

            switch (operation) {
                case 'delete':
                    if (!window.confirm(`Delete ${selectedProducts.length} products permanently?`)) {
                        setLoading(false);
                        return;
                    }
                    response = await productsAPI.batchDelete(productIds);
                    break;

                case 'category':
                    if (!newCategory) {
                        alert('Please select a category');
                        setLoading(false);
                        return;
                    }
                    response = await productsAPI.batchUpdateCategories(productIds, newCategory);
                    break;

                case 'price':
                    const priceUpdates = selectedProducts.map(p => {
                        let newPrice = p.price;
                        if (priceAdjustment.type === 'fixed') {
                            newPrice = parseFloat(priceAdjustment.value);
                        } else if (priceAdjustment.type === 'increase') {
                            newPrice = p.price + parseFloat(priceAdjustment.value);
                        } else if (priceAdjustment.type === 'decrease') {
                            newPrice = p.price - parseFloat(priceAdjustment.value);
                        } else if (priceAdjustment.type === 'percent') {
                            newPrice = p.price * (1 + parseFloat(priceAdjustment.value) / 100);
                        }
                        return { id: p.id, newPrice: Math.max(0, newPrice) };
                    });
                    response = await productsAPI.batchUpdatePrices(priceUpdates);
                    break;

                case 'stock':
                    const stockUpdates = selectedProducts.map(p => {
                        let newStock = p.stock || 0;
                        if (stockAdjustment.type === 'set') {
                            newStock = parseInt(stockAdjustment.value);
                        } else if (stockAdjustment.type === 'increase') {
                            newStock = newStock + parseInt(stockAdjustment.value);
                        } else if (stockAdjustment.type === 'decrease') {
                            newStock = newStock - parseInt(stockAdjustment.value);
                        }
                        return { id: p.id, newStock: Math.max(0, newStock) };
                    });
                    response = await productsAPI.batchUpdateStock(stockUpdates);
                    break;

                default:
                    alert('Invalid operation');
                    setLoading(false);
                    return;
            }

            setResults(response.data);
            if (onComplete) onComplete();
        } catch (error) {
            console.error('Batch operation error:', error);
            alert(error.response?.data?.message || 'Batch operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="batch-modal-overlay" onClick={onClose}>
            <div className="batch-modal" onClick={(e) => e.stopPropagation()}>
                <div className="batch-modal-header">
                    <h2>🔧 Batch Operations</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="batch-modal-body">
                    <div className="batch-info">
                        <p><strong>{selectedProducts.length}</strong> products selected</p>
                    </div>

                    <div className="batch-operation-select">
                        <label>Operation:</label>
                        <select value={operation} onChange={(e) => setOperation(e.target.value)}>
                            <option value="delete">🗑️ Delete Products</option>
                            <option value="category">🏷️ Change Category</option>
                            <option value="price">💰 Adjust Prices</option>
                            <option value="stock">📦 Adjust Stock</option>
                        </select>
                    </div>

                    {operation === 'category' && (
                        <div className="batch-config">
                            <label>New Category:</label>
                            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {operation === 'price' && (
                        <div className="batch-config">
                            <label>Price Adjustment:</label>
                            <select value={priceAdjustment.type} onChange={(e) => setPriceAdjustment({ ...priceAdjustment, type: e.target.value })}>
                                <option value="fixed">Set Fixed Price</option>
                                <option value="increase">Increase by Amount</option>
                                <option value="decrease">Decrease by Amount</option>
                                <option value="percent">Increase by Percentage</option>
                            </select>
                            <input
                                type="number"
                                value={priceAdjustment.value}
                                onChange={(e) => setPriceAdjustment({ ...priceAdjustment, value: e.target.value })}
                                placeholder={priceAdjustment.type === 'percent' ? 'Percentage' : 'Amount'}
                            />
                        </div>
                    )}

                    {operation === 'stock' && (
                        <div className="batch-config">
                            <label>Stock Adjustment:</label>
                            <select value={stockAdjustment.type} onChange={(e) => setStockAdjustment({ ...stockAdjustment, type: e.target.value })}>
                                <option value="set">Set Stock Level</option>
                                <option value="increase">Increase Stock</option>
                                <option value="decrease">Decrease Stock</option>
                            </select>
                            <input
                                type="number"
                                value={stockAdjustment.value}
                                onChange={(e) => setStockAdjustment({ ...stockAdjustment, value: e.target.value })}
                                placeholder="Quantity"
                            />
                        </div>
                    )}

                    {results && (
                        <div className="batch-results">
                            <h3>Results:</h3>
                            <p className="success">✅ Success: {results.success}</p>
                            {results.failed > 0 && (
                                <>
                                    <p className="error">❌ Failed: {results.failed}</p>
                                    {results.errors?.length > 0 && (
                                        <ul className="error-list">
                                            {results.errors.slice(0, 5).map((err, idx) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="batch-modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button 
                        className="btn-execute" 
                        onClick={handleExecute}
                        disabled={loading}
                    >
                        {loading ? '⏳ Processing...' : '✅ Execute'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchOperations;
