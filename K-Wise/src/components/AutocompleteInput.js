import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AutocompleteInput.css';

/**
 * Autocomplete Input Component with Predictive Suggestions
 * 
 * Features:
 * - Shows suggestions on focus (all available values)
 * - Filters suggestions as user types
 * - Supports keyboard navigation (Arrow keys, Enter, Escape)
 * - Saves new values to database for future suggestions
 * - Category and field-specific suggestions
 */
const AutocompleteInput = ({ 
    id,
    name, 
    value = '', 
    onChange, 
    placeholder = '', 
    required = false,
    category = '',
    fieldName = '',
    apiBaseUrl = '',
    disabled = false,
    type = 'text'
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Fetch suggestions from API
    const fetchSuggestions = useCallback(async () => {
        if (!apiBaseUrl) {
            return;
        }

        // Special handling for brand field
        if (fieldName === 'brand' && category) {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `${apiBaseUrl}/stock/brand-suggestions/${category}`,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.data)) {
                        setSuggestions(data.data);
                        console.log(`✅ Loaded ${data.data.length} brand suggestions for ${category}`);
                    }
                }
            } catch (error) {
                console.error('❌ Error fetching brand suggestions:', error);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Special handling for name field
        if (fieldName === 'name' && category) {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `${apiBaseUrl}/stock/spec-values/${category}?field=name`,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.data)) {
                        setSuggestions(data.data);
                        console.log(`✅ Loaded ${data.data.length} name suggestions for ${category}`);
                    }
                }
            } catch (error) {
                console.error('❌ Error fetching name suggestions:', error);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Standard specification field handling
        if (!category || !fieldName) {
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(
                `${apiBaseUrl}/stock/spec-values/${category}?field=${fieldName}`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.data)) {
                    setSuggestions(data.data);
                    console.log(`✅ Loaded ${data.data.length} suggestions for ${category}.${fieldName}`);
                }
            }
        } catch (error) {
            console.error('❌ Error fetching suggestions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [category, fieldName, apiBaseUrl]);

    // Load suggestions on mount and when category/field changes
    useEffect(() => {
        if (category && fieldName) {
            fetchSuggestions();
        }
    }, [category, fieldName, fetchSuggestions]);

    // Filter suggestions based on input value
    useEffect(() => {
        if (!value || (typeof value === 'string' && value.trim() === '') || value === '') {
            setFilteredSuggestions(suggestions);
        } else {
            const searchValue = typeof value === 'string' ? value : String(value);
            const filtered = suggestions.filter(suggestion =>
                suggestion.toLowerCase().includes(searchValue.toLowerCase())
            );
            setFilteredSuggestions(filtered);
        }
        setSelectedIndex(-1);
    }, [value, suggestions]);

    // Handle input focus
    const handleFocus = () => {
        setShowSuggestions(true);
    };

    // Handle input blur with delay to allow click on suggestions
    const handleBlur = () => {
        setTimeout(() => {
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }, 200);
    };

    // Handle suggestion selection
    const handleSuggestionClick = (suggestion) => {
        onChange({ target: { name, value: suggestion } });
        setShowSuggestions(false);
        setSelectedIndex(-1);
        
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!showSuggestions || filteredSuggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < filteredSuggestions.length - 1 ? prev + 1 : prev
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
                    handleSuggestionClick(filteredSuggestions[selectedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;

            default:
                break;
        }
    };

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionsRef.current) {
            const selectedElement = suggestionsRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedIndex]);

    const handleInputChange = (e) => {
        onChange(e);
    };

    return (
        <div className="autocomplete-wrapper">
            <input
                ref={inputRef}
                type={type}
                id={id}
                name={name}
                value={value}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                autoComplete="off"
                className="autocomplete-input"
            />
            
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="autocomplete-suggestions" ref={suggestionsRef}>
                    {isLoading ? (
                        <div className="autocomplete-loading">Loading suggestions...</div>
                    ) : (
                        filteredSuggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className={`autocomplete-suggestion-item ${
                                    index === selectedIndex ? 'selected' : ''
                                }`}
                                onClick={() => handleSuggestionClick(suggestion)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                {suggestion}
                            </div>
                        ))
                    )}
                </div>
            )}
            
            {showSuggestions && !isLoading && filteredSuggestions.length === 0 && suggestions.length > 0 && (
                <div className="autocomplete-suggestions">
                    <div className="autocomplete-no-match">
                        No matching suggestions. Type to add new value.
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutocompleteInput;
