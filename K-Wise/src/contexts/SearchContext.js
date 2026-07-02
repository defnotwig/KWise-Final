import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { stockAPI, ordersAPI, usersAPI } from '../services/api';

// Create the context
const SearchContext = createContext();

// Custom hook to use the search context
export function useSearch() {
    return useContext(SearchContext);
}

export function SearchProvider({ children }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Reset search when location changes
    useEffect(() => {
        setShowResults(false);
    }, [location.pathname]);

    // Check if we're in the admin section
    const isAdminSection = () => {
        return location.pathname.startsWith('/admin');
    }

    // Calculate relevance score for search results
    const calculateRelevance = (text, query) => {
        if (!text || !query) return 0;
        
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        // Exact match gets highest score
        if (lowerText === lowerQuery) return 100;
        
        // Starts with query gets high score
        if (lowerText.startsWith(lowerQuery)) return 80;
        
        // Contains query gets medium score
        if (lowerText.includes(lowerQuery)) return 60;
        
        // Word boundary match gets lower score
        const words = lowerText.split(/\s+/);
        for (let word of words) {
            if (word.startsWith(lowerQuery)) return 40;
            if (word.includes(lowerQuery)) return 20;
        }
        
        return 0;
    };

    // Search function with real API data and improved performance
    const performSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        setShowResults(true);

        try {
            // Normalize query for case-insensitive search
            const normalizedQuery = query.toLowerCase().trim();
            const allResults = [];

            // Use Promise.allSettled for parallel requests to improve speed
            const searchPromises = [
                // Search in stock items across all categories
                stockAPI.search({ q: query, limit: 10 }).then(stockResponse => {
                    if (stockResponse?.data?.data && Array.isArray(stockResponse.data.data)) {
                        const stockResults = stockResponse.data.data.map(item => ({
                            id: item.id,
                            type: 'product',
                            title: item.name,
                            subtitle: `${item.brand} - ${item.category}`,
                            path: `/admin/stock/${item.category}`,
                            icon: 'package',
                            price: item.price,
                            relevance: calculateRelevance(item.name, normalizedQuery)
                        }));
                        return { type: 'stock', results: stockResults };
                    }
                    return { type: 'stock', results: [] };
                }).catch(error => {
                    console.log('Stock search failed:', error);
                    return { type: 'stock', results: [] };
                })
                ,
                // Search in orders (if available)
                ordersAPI.search({ q: query, limit: 5 }).then(ordersResponse => {
                    if (ordersResponse?.data?.orders && Array.isArray(ordersResponse.data.orders)) {
                        const orderResults = ordersResponse.data.orders.map(order => ({
                            id: order.id || order._id,
                            type: 'order',
                            title: `Order #${order.order_number || order.id}`,
                            subtitle: order.customer_name || order.customer || 'Unknown Customer',
                            path: '/admin/order-queue',
                            icon: 'shopping-cart',
                            status: order.status,
                            relevance: calculateRelevance(order.customer_name || '', normalizedQuery)
                        }));
                        return { type: 'orders', results: orderResults };
                    }
                    return { type: 'orders', results: [] };
                }).catch(error => {
                    console.log('Orders search failed:', error);
                    return { type: 'orders', results: [] };
                })
                ,
                // Search in users (if available)
                usersAPI.search({ q: query, limit: 5 }).then(usersResponse => {
                    if (usersResponse?.data?.users && Array.isArray(usersResponse.data.users)) {
                        const userResults = usersResponse.data.users.map(user => ({
                            id: user.id || user._id,
                            type: 'user',
                            title: user.name || user.username || user.email,
                            subtitle: `${user.role || 'User'} - ${user.email}`,
                            path: '/admin/accounts',
                            icon: 'user',
                            relevance: calculateRelevance(user.name || user.email || '', normalizedQuery)
                        }));
                        return { type: 'users', results: userResults };
                    }
                    return { type: 'users', results: [] };
                }).catch(error => {
                    console.log('Users search failed:', error);
                    return { type: 'users', results: [] };
                })
            );

            // Execute all searches in parallel
            const searchResults = await Promise.allSettled(searchPromises);
            
            // Combine results from all searches
            searchResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value.results.length > 0) {
                    allResults.push(...result.value.results);
                }
            });

            // Sort by relevance and limit results
            allResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
            const sortedResults = allResults.slice(0, 20); // Limit to top 20 results

            setSearchResults(sortedResults);

        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search input with debouncing for performance
    const handleSearch = (query) => {
        setSearchQuery(query);
        
        // Clear previous timeout
        if (globalThis.searchTimeout) {
            clearTimeout(globalThis.searchTimeout);
        }
        
        // Debounce search by 300ms for better performance
        globalThis.searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    };

    // Handle result click
    const handleResultClick = (result) => {
        setShowResults(false);
        setSearchQuery('');
        navigate(result.path);
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
        setIsSearching(false);
    };

    const value = useMemo(() => ({
        searchQuery,
        searchResults,
        isSearching,
        showResults,
        handleSearch,
        handleResultClick,
        handleSelectResult: handleResultClick, // Alias for compatibility
        clearSearch,
        isAdminSection
    }), [searchQuery, searchResults, isSearching, showResults]);

    return (
        <SearchContext.Provider value={value}>
            {children}
        </SearchContext.Provider>
    );
}

SearchProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export default SearchContext;