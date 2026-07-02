import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import searchService from '../services/searchService';

// Create the context
const SearchContext = createContext();

// Custom hook to use the search context
export function useSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
}

export function SearchProvider({ children }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Check if we're in the admin section
    const isAdminSection = location.pathname.startsWith('/admin');

    // Enhanced search handler with debouncing
    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);
        
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            setIsSearching(false);
            setSearchStats(null);
            return;
        }

        setIsSearching(true);
        setShowResults(true);

        // Clear previous timeout
        if (globalThis.searchTimeout) {
            clearTimeout(globalThis.searchTimeout);
        }

        // Debounce search by 300ms
        globalThis.searchTimeout = setTimeout(async () => {
            try {
                const result = await searchService.search(query, {
                    includeProducts: isAdminSection,
                    includeOrders: isAdminSection,
                    includeUsers: isAdminSection,
                    limit: 15,
                    minRelevance: 20
                });

                setSearchResults(result.results);
                setSearchStats({
                    total: result.total,
                    searchTime: result.searchTime,
                    suggestions: result.suggestions,
                    categories: result.categories,
                    fromCache: result.fromCache
                });
                setIsSearching(false);

            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
                setSearchStats(null);
                setIsSearching(false);
            }
        }, 300);
    }, [isAdminSection]);

    // Handle result click
    const handleResultClick = useCallback((result) => {
        setShowResults(false);
        setSearchQuery('');
        if (result?.path) {
            navigate(result.path);
        }
    }, [navigate]);

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
        setIsSearching(false);
        setSearchStats(null);
        
        // Clear any pending search timeout
        if (globalThis.searchTimeout) {
            clearTimeout(globalThis.searchTimeout);
        }
    };

    const value = useMemo(() => ({
        searchQuery,
        searchResults,
        isSearching,
        showResults,
        searchStats,
        handleSearch,
        handleResultClick,
        handleSelectResult: handleResultClick, // Alias for compatibility
        clearSearch,
        isAdminSection,
        setSearchQuery,
        setShowResults
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [searchQuery, searchResults, isSearching, showResults, searchStats, isAdminSection, handleSearch, handleResultClick]);

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
