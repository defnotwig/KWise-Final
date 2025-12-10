import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Users, ShoppingCart, Package, FileText, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handle result click navigation
    const handleResultClick = (item) => {
        if (item.path) {
            // Use direct path if available (for admin pages)
            navigate(item.path);
        } else {
            // Legacy navigation mapping
            switch (item.type) {
                case 'user':
                    navigate('/admin/accounts');
                    break;
                case 'order':
                    navigate('/admin/history');
                    break;
                case 'product':
                case 'stock':
                    navigate('/admin/stock');
                    break;
                case 'log':
                    navigate('/admin/logs');
                    break;
                case 'page':
                    navigate(item.path);
                    break;
                default:
                    break;
            }
        }
        onClose(); // Close search modal after navigation
    };

    // Debounced search function
    const performSearch = useCallback(async (searchQuery) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(searchQuery.trim())}`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            setResults(data.data);

        } catch (error) {
            console.error('Search error:', error);
            setError('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    // Debounce search input
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            performSearch(query);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, performSearch]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    // Get icon for result type
    const getResultIcon = (type) => {
        switch (type) {
            case 'user': return <Users className="w-4 h-4" />;
            case 'order': return <ShoppingCart className="w-4 h-4" />;
            case 'product': return <Package className="w-4 h-4" />;
            case 'log': return <FileText className="w-4 h-4" />;
            default: return <Search className="w-4 h-4" />;
        }
    };

    // Format result display
    const formatResult = (item) => {
        switch (item.type) {
            case 'user':
                return {
                    title: item.name,
                    subtitle: `${item.email} • ${item.role}`,
                    meta: item.status === 'online' ? '🟢 Online' : item.status === 'away' ? '🟡 Away' : '⚫ Offline'
                };
            case 'order':
                return {
                    title: `Order #${item.id}`,
                    subtitle: `${item.customerName} • $${item.totalAmount}`,
                    meta: item.status
                };
            case 'product':
                return {
                    title: item.name,
                    subtitle: `${item.category} • ${item.brand}`,
                    meta: `Stock: ${item.stock} • $${item.price}`
                };
            case 'log':
                return {
                    title: item.action,
                    subtitle: item.description,
                    meta: item.userName
                };
            default:
                return {
                    title: 'Unknown',
                    subtitle: '',
                    meta: ''
                };
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
                {/* Search Header */}
                <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search users, orders, products, logs..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500"
                        autoFocus
                    />
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Results */}
                <div className="max-h-96 overflow-y-auto">
                    {loading && (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2">Searching...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-8 text-center">
                            <p className="text-red-500">{error}</p>
                        </div>
                    )}

                    {results && !loading && (
                        <div className="p-4">
                            {results.totalResults === 0 ? (
                                <div className="text-center py-8">
                                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No results found for "{results.query}"</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(results.categories).map(([category, data]) => {
                                        if (data.count === 0) return null;

                                        return (
                                            <div key={category}>
                                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                                    {category} ({data.count})
                                                </h3>
                                                <div className="space-y-2">
                                                    {data.items.map((item, index) => {
                                                        const formatted = formatResult(item);
                                                        return (
                                                            <div
                                                                key={`${category}-${index}`}
                                                                className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                                                onClick={() => handleResultClick(item)}
                                                            >
                                                                <div className="text-blue-500 mr-3">
                                                                    {getResultIcon(item.type)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                        {formatted.title}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                                        {formatted.subtitle}
                                                                    </p>
                                                                </div>
                                                                <div className="text-xs text-gray-400 flex items-center">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {formatted.meta}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {!query && !loading && (
                        <div className="p-8 text-center">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Start typing to search across all admin data</p>
                            <div className="mt-4 space-y-2 text-sm text-gray-400">
                                <p>• Search users by name or email</p>
                                <p>• Find orders by ID or customer</p>
                                <p>• Locate products by name or category</p>
                                <p>• Browse audit logs by action or user</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Footer */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                        <span>Press Escape to close</span>
                        {results && (
                            <span>{results.totalResults} total results</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
