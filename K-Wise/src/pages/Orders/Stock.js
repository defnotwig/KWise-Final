import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    FiCpu, FiMonitor, FiHardDrive, FiBox,
    FiCommand, FiHexagon, FiGrid, FiPower,
    FiWifi, FiMousePointer, FiRefreshCw, FiPackage, FiSettings, FiUsers
} from 'react-icons/fi';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/networkConfig'; // Network-aware API URLs
import ReferenceBuildsModal from '../../components/ReferenceBuildsModal';
import './Stock.css';

const Stock = () => {
    const mountedRef = useRef(true);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [showReferenceBuildsModal, setShowReferenceBuildsModal] = useState(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Category icons mapping - using the exact category names from our API (case-insensitive)
    const categoryIcons = useMemo(() => ({
        'cpu': <FiCpu />,
        'motherboard': <FiHexagon />,
        'gpu': <FiGrid />,
        'ram': <FiCommand />,
        'storage': <FiHardDrive />,
        'psu': <FiPower />,
        'case': <FiBox />,
        'cooling': <FiWifi />,
        'monitor': <FiMonitor />,
        'mouse': <FiMousePointer />,
        'keyboard': <FiMousePointer />,
        'speakers': <FiMousePointer />,
        'headphones': <FiMousePointer />,
        'webcam': <FiMousePointer />,
        'pre-built': <FiPackage />,
        'community build': <FiUsers /> // NEW - Community Build category
    }), []);

    const fetchCategories = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Make API call
            const response = await axios.get(`${getApiBaseUrl()}/stock/categories`, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Extract data from response - the API returns categories in data property
            const responseData = response.data;
            const categoriesData = responseData.data || responseData || [];
            
            if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
                throw new Error('No categories found');
            }

            // Map categories with icons
            const categoriesWithIcons = categoriesData.map((category) => ({
                id: category.category,
                name: category.category,
                category: category.category,
                count: parseInt(category.count) || 0,
                totalValue: parseFloat(category.totalValue) || 0,
                icon: categoryIcons[category.category?.toLowerCase()] || <FiBox />
            }));

            // Update state
            setCategories(categoriesWithIcons);
            setLastUpdated(new Date());
            
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError(`Failed to load categories: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [categoryIcons]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (mountedRef.current) {
                fetchCategories();
            }
        }, 30000);

        return () => {
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array is intentional for auto-refresh

    return (
        <div className="stock-page">
            <div className="stock-header">
                <h1 className="page-title">Stock Categories</h1>
                <div className="stock-controls">
                    <button
                        className="reference-builds-btn"
                        onClick={() => setShowReferenceBuildsModal(true)}
                        title="Manage PC Upgrade Reference Builds"
                    >
                        <FiSettings /> Manage Reference Builds
                    </button>
                    {lastUpdated && (
                        <span className="last-updated">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        className="refresh-btn"
                        onClick={fetchCategories}
                        disabled={isLoading}
                        title="Refresh categories"
                    >
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message" style={{
                    background: '#ffebee', 
                    color: '#c62828', 
                    padding: '20px', 
                    margin: '20px 0', 
                    border: '2px solid #f44336',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    ❌ ERROR: {error}
                </div>
            )}

            {!error && isLoading && (
                <div style={{
                    background: '#fff3cd',
                    color: '#856404',
                    padding: '20px',
                    margin: '20px 0',
                    border: '2px solid #ffc107',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    ⏳ Loading stock categories...
                </div>
            )}

            {!error && !isLoading && categories.length === 0 && (
                <div style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '20px',
                    margin: '20px 0',
                    border: '2px solid #2196f3',
                    borderRadius: '4px',
                    fontSize: '16px',
                    textAlign: 'center'
                }}>
                    ℹ️ No categories found. Try refreshing the page.
                </div>
            )}

            {!isLoading && !error && categories.length > 0 && (
                <div className="stock-categories">
                    {categories.map((category) => (
                        <Link
                            to={`/admin/stock/${category.id}`}
                            key={category.id}
                            className="category-card"
                        >
                            <div className="category-icon">
                                {category.icon}
                            </div>
                            <div className="category-info">
                                <span className="category-name">{category.name}</span>
                                <span className="category-count">{category.count} items</span>
                                {category.totalValue > 0 && (
                                    <span className="category-value">
                                        ₱{category.totalValue.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Reference Builds Management Modal */}
            {showReferenceBuildsModal && (
                <ReferenceBuildsModal 
                    onClose={() => setShowReferenceBuildsModal(false)}
                />
            )}
        </div>
    );
};

export default Stock;