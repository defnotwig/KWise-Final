import React from 'react';
import { FiShoppingCart, FiPackage, FiUser, FiX, FiFileText, FiGrid, FiSettings, FiDollarSign } from 'react-icons/fi';
import { useSearch } from '../../contexts/SearchContext-simple';
import { useLocation, useNavigate } from 'react-router-dom';
import './SearchResults.css';
import activityLogger from '../../services/activityLogger';

const SearchResults = () => {
    const { searchResults, isSearching, showResults, handleSelectResult, clearSearch, searchQuery } = useSearch();
    const location = useLocation();
    const navigate = useNavigate();

    // Check if we're in the admin section
    const isAdminSection = location.pathname.startsWith('/admin');

    if (!showResults) {
        return null;
    }

    // Get the appropriate icon with enhanced types
    const getIcon = (iconName, type) => {
        switch (iconName || type) {
            case 'shopping-cart':
            case 'order':
                return <FiShoppingCart />;
            case 'package':
            case 'product':
                return <FiPackage />;
            case 'user':
                return <FiUser />;
            case 'file-text':
            case 'log':
                return <FiFileText />;
            case 'page':
            case 'dashboard':
                return <FiGrid />;
            case 'settings':
                return <FiSettings />;
            default:
                return <FiPackage />;
        }
    };

    // Get formatted path for display
    // eslint-disable-next-line no-unused-vars
    const getFormattedPath = (result) => {
        // Use navigationPath if available, otherwise use path
        const path = result.navigationPath || result.path;
        
        // If in admin section, show path with /admin prefix if not already there
        if (isAdminSection && path && !path.startsWith('/admin')) {
            return `/admin${path}`;
        }
        return path || '';
    };

    // Get type badge color
    const getTypeBadgeColor = (type) => {
        switch (type) {
            case 'product':
                return '#10b981'; // Green
            case 'order':
                return '#3b82f6'; // Blue
            case 'user':
                return '#8b5cf6'; // Purple
            case 'log':
                return '#f59e0b'; // Amber
            case 'page':
                return '#6366f1'; // Indigo
            default:
                return '#6b7280'; // Gray
        }
    };

    // Group results by type for better organization
    const groupedResults = searchResults.reduce((acc, result) => {
        const type = result.type || 'other';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(result);
        return acc;
    }, {});

    const typeOrder = ['page', 'product', 'order', 'user', 'log'];
    const typeTitles = {
        page: '📄 Pages',
        product: '📦 Products',
        order: '🛒 Orders',
        user: '👤 Users',
        log: '📝 Logs'
    };

    return (
        <div className="search-results-container">
            <div className="search-results-header">
                <h3>Search Results ({searchResults.length})</h3>
                <button className="close-search-btn" onClick={clearSearch}>
                    <FiX />
                </button>
            </div>

            {isSearching ? (
                <div className="search-loading">
                    <div className="spinner"></div>
                    <span>Searching...</span>
                </div>
            ) : searchResults.length > 0 ? (
                <div className="search-results-list">
                    {typeOrder.map(type => {
                        const results = groupedResults[type];
                        if (!results || results.length === 0) return null;
                        
                        return (
                            <div key={type} className="search-category">
                                <div className="category-header">{typeTitles[type]}</div>
                                {results.map((result, index) => (
                                    <div
                                        key={`${result.type}-${result.id}-${index}`}
                                        className="search-result-item"
                                        onClick={() => {
                                            // Log search click
                                            activityLogger.log('SEARCH_CLICK', `Clicked search result: ${result.title}`, 'GlobalSearch', {
                                                resultType: result.type,
                                                resultId: result.id,
                                                query: searchQuery,
                                                navigationPath: result.navigationPath || result.path
                                            });
                                            
                                            // Navigate to result
                                            const navPath = result.navigationPath || result.path;
                                            if (navPath) {
                                                navigate(navPath);
                                                clearSearch();
                                            } else {
                                                handleSelectResult(result);
                                            }
                                        }}
                                    >
                                        <div className="result-icon" style={{ color: getTypeBadgeColor(result.type) }}>
                                            {getIcon(result.icon, result.type)}
                                        </div>
                                        <div className="result-details">
                                            <div className="result-title">{result.title}</div>
                                            {result.subtitle && (
                                                <div className="result-subtitle">{result.subtitle}</div>
                                            )}
                                            {result.description && (
                                                <div className="result-description">{result.description}</div>
                                            )}
                                            {result.metadata && (
                                                <div className="result-metadata">
                                                    {result.metadata.price && (
                                                        <span className="metadata-item">
                                                            <FiDollarSign size={12} /> ₱{Number.parseFloat(result.metadata.price).toLocaleString()}
                                                        </span>
                                                    )}
                                                    {result.metadata.stock !== undefined && (
                                                        <span className="metadata-item">
                                                            <FiPackage size={12} /> Stock: {result.metadata.stock}
                                                        </span>
                                                    )}
                                                    {result.metadata.status && (
                                                        <span className={`metadata-status status-${result.metadata.status.toLowerCase()}`}>
                                                            {result.metadata.status}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="result-type-badge" style={{ backgroundColor: getTypeBadgeColor(result.type) }}>
                                            {result.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="no-results">
                    <FiPackage size={48} />
                    <p>No results found</p>
                    <span>Try searching with different keywords</span>
                </div>
            )}
        </div>
    );
};

export default SearchResults; 