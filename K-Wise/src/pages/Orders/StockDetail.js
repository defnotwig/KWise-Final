/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiUpload, FiImage, FiX, FiSearch, FiFilter, FiCpu, FiCheckSquare } from 'react-icons/fi';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import { getApiBaseUrl, getFullImageUrl } from '../../utils/networkConfig'; // Network-aware URLs
import AutocompleteInput from '../../components/AutocompleteInput'; // Auto-predictive input component
import './StockDetail.css';
import './StockDetail.admin-scope.css'; // Scoped admin styles (Issue 2)
import './StockDetailSpecifications.css'; // Specifications styling
import './StockDetailPreBuilt.css'; // Pre-Built component management styling

/**
 * Fetch a URL with optional authentication retry.
 * Uses cookie-backed admin authentication for protected stock actions.
 */
const fetchWithAuthRetry = async (url) => {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) return response;

    return fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

/**
 * Build URLSearchParams for the stock list API from filter state.
 */
const buildStockQueryParams = ({ category, currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, selectedBrand, selectedTier, priceRange, stockFilter }) => {
    const params = new URLSearchParams({
        category,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort: sortBy,
        order: sortOrder
    });

    const safeSearchTerm = typeof searchTerm === 'string' ? searchTerm : '';
    if (safeSearchTerm.trim()) params.append('q', safeSearchTerm.trim());
    if (selectedBrand) params.append('brand', selectedBrand);
    if (selectedTier) params.append('tier', selectedTier);
    if (priceRange.min) params.append('minPrice', priceRange.min);
    if (priceRange.max) params.append('maxPrice', priceRange.max);
    if (stockFilter === 'inStock') params.append('inStock', 'true');
    else if (stockFilter === 'outOfStock') params.append('inStock', 'false');

    return params;
};

/**
 * Get field metadata from a spec field definition (string or object).
 */
const getFieldMeta = (field) => {
    const fieldName = typeof field === 'string' ? field : field.name;
    const fieldType = typeof field === 'object' ? field.type : 'text';
    const isRequired = typeof field === 'object' ? field.required : false;
    const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replaceAll('_', ' ');
    return { fieldName, fieldType, isRequired, label };
};

/**
 * Process bulk API responses: check for auth failures and report results.
 * Returns { authFailed, failedCount }.
 */
const processBulkResponses = (responses) => {
    const authFailed = responses.some(r => r.status === 401);
    const failedCount = responses.filter(r => !r.ok).length;
    return { authFailed, failedCount };
};

/**
 * Build FormData for stock item add/edit submissions.
 */
const buildStockFormData = (formData, categoryName, specifications, prebuiltSpecs) => {
    const submitData = new FormData();
    submitData.append('name', formData.name.trim());
    submitData.append('category', categoryName);
    submitData.append('brand', formData.brand.trim() || '');
    submitData.append('price', Number.parseFloat(formData.price) || 0);
    submitData.append('stock', Number.parseInt(formData.stock, 10) || 0);
    submitData.append('description', formData.description.trim() || '');
    submitData.append('tier', formData.tier || '');

    const finalSpecifications = prebuiltSpecs
        ? { ...specifications, ...prebuiltSpecs }
        : specifications;

    if (Object.keys(finalSpecifications).length > 0) {
        submitData.append('specifications', JSON.stringify(finalSpecifications));
    }

    if (formData.imageFile) {
        submitData.append('image', formData.imageFile);
    }

    return submitData;
};

/**
 * Enhanced Stock Detail Component with Modern Table Design
 * 
 * This component provides a table-based interface for stock management
 * matching the reference design with pagination and search functionality.
 */

const StockDetail = () => {
    const { category } = useParams(); // Get category from URL parameters
    const mountedRef = useRef(true);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Specification state - MOVED UP BEFORE useEffects
    const [specifications, setSpecifications] = useState({});
    const [specFields, setSpecFields] = useState([]);
    const [showSpecifications, setShowSpecifications] = useState(true);

    // Pre-Built specific state
    const [prebuiltComponents, setPrebuiltComponents] = useState({
        CPU: null,
        Motherboard: null,
        GPU: null,
        RAM: null,
        Storage: null,
        PSU: null,
        Case: null,
        Cooling: null
    });
    const [prebuiltPurposes, setPrebuiltPurposes] = useState([]);
    const [showComponentPicker, setShowComponentPicker] = useState(false);
    const [pickerCategory, setPickerCategory] = useState(null);
    const [componentSearchResults, setComponentSearchResults] = useState([]);
    const [componentSearchQuery, setComponentSearchQuery] = useState('');

    // Sale modal state
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleModalItem, setSaleModalItem] = useState(null);
    const [saleData, setSaleData] = useState({
        salePrice: '',
        startDate: '',
        endDate: ''
    });

    // Debug category detection
    useEffect(() => {
        console.log('🔍 StockDetail: Category from URL params:', category);
        console.log('🔍 StockDetail: Current URL:', globalThis.location.href);
        console.log('🔍 StockDetail: useParams result:', { category });
        console.log('🔍 StockDetail: URL pathname:', globalThis.location.pathname);
    }, [category]);

    // Debug spec fields changes
    useEffect(() => {
        console.log('📋 SpecFields changed:', specFields);
        console.log('📋 SpecFields length:', specFields.length);
        console.log('📋 ShowSpecifications state:', showSpecifications);
        console.log('📋 Current category:', category);
        console.log('📋 Current item (if editing):', currentItem?.name || 'None');
    }, [specFields, showSpecifications, category, currentItem]);

    // References
    const searchInputRef = useRef(null);
    const cursorPositionRef = useRef(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false); // Track search loading state
    const [selectedBrand, setSelectedBrand] = useState('');
    const [brands, setBrands] = useState([]);
    const [selectedTier, setSelectedTier] = useState(''); // Tier filter state
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'inStock', 'outOfStock'
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('ASC');

    // Selected items for bulk actions
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Action dropdown state
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Scroll position preservation
    const [preserveScrollPosition, setPreserveScrollPosition] = useState(false);
    const scrollPositionRef = useRef(0);

    // Single cursor position restoration effect - simplified approach
    useEffect(() => {
        if (searchInputRef.current && cursorPositionRef.current !== null && document.activeElement === searchInputRef.current) {
            const position = cursorPositionRef.current;
            const input = searchInputRef.current;

            // Only restore if the input is still focused and position is valid
            if (input.value.length >= position) {
                requestAnimationFrame(() => {
                    input.setSelectionRange(position, position);
                    console.log('🎯 Restored cursor position to:', position);
                });
            }

            // Clear after restoration attempt
            cursorPositionRef.current = null;
        }
    }, [searchQuery]); // Only trigger when searchQuery changes

    // Stock quantity modal state
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockModalItem, setStockModalItem] = useState(null);
    const [stockQuantity, setStockQuantity] = useState('1');

    // Bulk update stock modal state
    const [showBulkStockModal, setShowBulkStockModal] = useState(false);
    const [bulkStockQuantity, setBulkStockQuantity] = useState('0');

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        price: '',
        stock: '',
        description: '',
        imageFile: null
    });

    // Image preview state
    const [imagePreview, setImagePreview] = useState(null);
    const [modalImage, setModalImage] = useState(null);

    // Initialize Notyf for ultra-compact notifications next to header
    const notyf = useRef(new Notyf({
        duration: 2500, // Shorter duration to prevent color block issue
        position: {
            x: 'left', // Position will be overridden by CSS
            y: 'top'
        },
        // Custom styling to make notifications ultra-compact and visible
        ripple: false, // Disable ripple to prevent animation conflicts
        dismissible: true,
        types: [
            {
                type: 'success',
                background: '#10b981',
                icon: {
                    className: 'notyf__icon--success',
                    tagName: 'i'
                }
            },
            {
                type: 'error',
                background: '#ef4444',
                icon: {
                    className: 'notyf__icon--error',
                    tagName: 'i'
                }
            },
            {
                type: 'warning',
                background: '#f59e0b',
                icon: {
                    className: 'notyf__icon--warning',
                    tagName: 'i'
                }
            },
            {
                type: 'info',
                background: '#3b82f6',
                icon: {
                    className: 'notyf__icon--info',
                    tagName: 'i'
                }
            }
        ]
    })).current;

    // Professional confirmation dialog using Notyf
    const showConfirmation = (message, onConfirm, onCancel = null) => {
        return new Promise((resolve) => {
            const isConfirmed = globalThis.confirm(`K-Wise wants to ${message}`);
            if (isConfirmed) {
                if (onConfirm) onConfirm();
                resolve(true);
            } else {
                if (onCancel) onCancel();
                resolve(false);
            }
        });
    };

    // Safety function for notifications to prevent runtime errors
    const showNotification = useCallback((type, message) => {
        try {
            if (notyf?.[type]) {
                notyf[type](message);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (notyfErr) {
            console.log(`${type.toUpperCase()}: ${message} (notification error: ${notyfErr.message})`);
        }
    }, [notyf]);

    // Helper function to get tier display info
    const getTierInfo = (tierValue) => {
        if (!tierValue) {
            return {
                className: 'no-tier',
                displayName: 'Unclassified'
            };
        }
        
        // Normalize tier value to lowercase for comparison
        const normalizedTier = tierValue.toLowerCase().replaceAll(/\s+/g, '-');
        
        const tierMap = {
            'entry': { className: 'entry', displayName: 'Entry' },
            'starter': { className: 'entry', displayName: 'Starter' },
            'mid-tier': { className: 'mid-tier', displayName: 'Mid-Tier' },
            'high-tier': { className: 'high-tier', displayName: 'High-Tier' },
            'elite': { className: 'elite', displayName: 'Elite' }
        };
        
        return tierMap[normalizedTier] || {
            className: 'no-tier',
            displayName: tierValue // Show original value if no match
        };
    };

    // Cleanup on unmount
    useEffect(() => {
        console.log('🚀 StockDetail: Component mounted, category:', category);
        mountedRef.current = true;
        return () => {
            console.log('🧹 StockDetail: Component unmounting');
            mountedRef.current = false;
            // Clean up image preview URL
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [category, imagePreview]);

    // Load brands for filter dropdown
    const loadBrands = useCallback(async () => {
        try {
            // Load brands specific to the current category
            const response = await fetch(`${getApiBaseUrl()}/stock/brands?category=${encodeURIComponent(category)}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setBrands(data.data || []);
            }
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }, [category]);

    // Load specification fields for current category
    const loadSpecificationFields = useCallback(async (targetCategory = null) => {
        const categoryToUse = targetCategory || category;
        if (!categoryToUse) return;

        try {
            const response = await fetchWithAuthRetry(`${getApiBaseUrl()}/stock/meta/${categoryToUse}`);

            if (!response.ok) {
                if (response.status === 401) {
                    showNotification('error', 'Session expired. Please refresh and log in again.');
                } else {
                    showNotification('warning', 'Could not load specification fields for ' + categoryToUse);
                }
                setSpecFields([]);
                return;
            }

            const data = await response.json();
            if (data?.success && data?.data?.fields) {
                setSpecFields(data.data.fields);
                if (data.data.fields.length > 0) {
                    setShowSpecifications(true);
                }
            } else {
                setSpecFields([]);
            }
        } catch (error) {
            console.error('❌ Error loading specification fields:', error);
            showNotification('error', 'Network error loading specifications');
            setSpecFields([]);
        }
    }, [category, showNotification]);

    // Load items using enhanced API with pagination and filters
    const loadItems = useCallback(async (searchTerm = searchQuery) => {
        if (!category || !mountedRef.current) return;

        const isNewSearch = searchTerm !== searchQuery;
        (isNewSearch ? setIsSearching : setIsLoading)(true);
        setError(null);

        try {

            const params = buildStockQueryParams({
                category, currentPage, itemsPerPage, sortBy, sortOrder,
                searchTerm, selectedBrand, selectedTier, priceRange, stockFilter
            });

            const response = await fetch(`${getApiBaseUrl()}/stock?${params}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !mountedRef.current) {
                throw new Error(data.message || 'Failed to load items');
            }

            setItems(data.data || []);

            if (data.pagination) {
                const { totalPages: newTotalPages, totalItems: newTotalItems } = data.pagination;
                setTotalPages(newTotalPages);
                setTotalItems(newTotalItems);

                if (currentPage > newTotalPages && newTotalPages > 0) {
                    setTimeout(() => setCurrentPage(newTotalPages), 0);
                }
            }
        } catch (error) {
            console.error('❌ Error loading items:', error);
            if (!mountedRef.current) return;
            setError('Failed to load items: ' + error.message);
            setItems([]);
        } finally {
            if (!mountedRef.current) return;
            setIsLoading(false);
            setIsSearching(false);

            if (preserveScrollPosition && scrollPositionRef.current > 0) {
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPositionRef.current);
                    setPreserveScrollPosition(false);
                    scrollPositionRef.current = 0;
                });
            }
        }
        // Removed dependency array - we'll manage dependencies differently
    }, [category, currentPage, itemsPerPage, selectedBrand, selectedTier, priceRange, stockFilter, sortBy, sortOrder, searchQuery, preserveScrollPosition]); // Fixed ESLint warning

    // Handle category changes
    useEffect(() => {
        console.log('📂 StockDetail: Category changed to:', category);
        setItems([]);
        setCurrentPage(1);
        setSearchQuery('');
        setSelectedBrand('');
        setSelectedTier('');
        setPriceRange({ min: '', max: '' });
        setStockFilter('all');
        setSelectedItems([]);
        setSelectAll(false);

        // Reset specifications state when category changes
        setSpecifications({});
        setSpecFields([]);
        setShowSpecifications(true); // Always start with specs visible
    }, [category]);

    // Load data when component mounts or filters change
    useEffect(() => {
        if (category) {
            console.log('🔄 Loading items due to filter/page change:', { currentPage, itemsPerPage, selectedBrand, stockFilter, searchQuery: searchQuery.trim() });
            loadItems();
            loadBrands();
            loadSpecificationFields();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, currentPage, itemsPerPage, selectedBrand, selectedTier, priceRange, stockFilter, sortBy, sortOrder, searchQuery]); // Functions called directly to avoid dependency loop

    // Removed duplicate useEffect that was causing conflicts

    // Optimized debounced search effect to prevent excessive API calls
    useEffect(() => {
        if (!category) return;

        // Only handle active search queries - don't interfere with pagination when search is empty
        if (searchQuery.trim() === '') {
            return; // Exit early, let the main loadItems effect handle empty search
        }

        // Set searching state immediately for better UX
        setIsSearching(true);

        const debounceTimer = setTimeout(() => {
            console.log('🔍 Debounced search triggered for:', searchQuery);

            // Store cursor position before search API call (only if input is focused)
            if (searchInputRef.current && document.activeElement === searchInputRef.current) {
                cursorPositionRef.current = searchInputRef.current.selectionStart;
                console.log('💾 Stored cursor position before search:', cursorPositionRef.current);
            }

            setCurrentPage(1); // Reset to first page when actually searching
            loadItems(searchQuery);
        }, 300); // 300ms debounce

        return () => {
            clearTimeout(debounceTimer);
            // Don't clear searching state in cleanup - let the API call finish
        };
    }, [searchQuery, category, loadItems]);

    // Pagination handlers
    const handlePageChange = (newPage) => {
        console.log(`🔄 handlePageChange called: ${currentPage} → ${newPage}`);
        if (newPage >= 1 && newPage <= totalPages) {
            // Ensure we don't preserve scroll position for pagination changes
            setPreserveScrollPosition(false);
            scrollPositionRef.current = 0;
            setCurrentPage(newPage);
            console.log(`✅ setCurrentPage called with: ${newPage}`);
            // Scroll to top for pagination changes
            window.scrollTo(0, 0);
        } else {
            console.log(`❌ Invalid page: ${newPage} (totalPages: ${totalPages})`);
        }
    };

    const handleItemsPerPageChange = (newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1); // Reset to first page
    };

    // Search and filter handlers
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;

        // Store cursor position before state update
        cursorPositionRef.current = cursorPosition;

        setSearchQuery(value);

        // If search is being cleared, reset to page 1 to show all results from the beginning
        const valueStr = typeof value === 'string' ? value : String(value);
        const searchStr = typeof searchQuery === 'string' ? searchQuery : String(searchQuery);
        if (!valueStr.trim() && searchStr.trim()) {
            console.log('🔍 Search cleared, resetting to page 1');
            setCurrentPage(1);
        }
        // Don't reset page for active searches - the debounced search will handle that
    }, [searchQuery]);

    const handleSearchFocus = useCallback(() => {
        console.log('🎯 Search input focused');
    }, []);

    const handleSearchBlur = useCallback(() => {
        console.log('👋 Search input blurred');
        cursorPositionRef.current = null; // Clear stored position when losing focus
    }, []);

    const handleBrandChange = (e) => {
        // Preserve scroll position when applying filters
        scrollPositionRef.current = window.pageYOffset;
        setPreserveScrollPosition(true);
        setSelectedBrand(e.target.value);
        // Don't reset page - let user stay on current page with new filter
    };

    const handlePriceRangeChange = (field, value) => {
        // Preserve scroll position when applying filters
        scrollPositionRef.current = window.pageYOffset;
        setPreserveScrollPosition(true);
        setPriceRange(prev => ({
            ...prev,
            [field]: value
        }));
        // Don't reset page - let user stay on current page with new filter
    };

    const handleStockFilterChange = (e) => {
        // Preserve scroll position when applying filters
        scrollPositionRef.current = window.pageYOffset;
        setPreserveScrollPosition(true);
        setStockFilter(e.target.value);
        // Don't reset page - let user stay on current page with new filter
    };

    const handleTierFilterChange = (e) => {
        // Preserve scroll position when applying filters
        scrollPositionRef.current = window.pageYOffset;
        setPreserveScrollPosition(true);
        setSelectedTier(e.target.value);
        // Don't reset page - let user stay on current page with new filter
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(field);
            setSortOrder('ASC');
        }
        setCurrentPage(1);
    };

    // Selection handlers
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems([]);
        } else {
            setSelectedItems(items.map(item => item.id));
        }
        setSelectAll(!selectAll);
    };

    const handleSelectItem = (itemId) => {
        setSelectedItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            } else {
                return [...prev, itemId];
            }
        });
    };

    // Update selectAll state when items change
    useEffect(() => {
        setSelectAll(items.length > 0 && selectedItems.length === items.length);
    }, [selectedItems, items]);

    // Bulk actions
    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) {
            showNotification('warning', 'Please select items to delete');
            return;
        }

        const confirmed = await showConfirmation(`delete ${selectedItems.length} items? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            setIsSubmitting(true);

            const responses = await Promise.all(
                selectedItems.map(itemId =>
                    fetch(`${getApiBaseUrl()}/stock/${itemId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    })
                )
            );

            const { authFailed, failedCount } = processBulkResponses(responses);
            if (authFailed) {
                throw new Error('Authentication failed. Please log in again.');
            }

            if (failedCount === 0) {
                showNotification('success', `Successfully deleted ${selectedItems.length} items!`);
                setSelectedItems([]);
                setSelectAll(false);
                await loadItems();
            } else {
                showNotification('error', `Failed to delete ${failedCount} items`);
            }
        } catch (error) {
            console.error('❌ Error in bulk delete:', error);
            showNotification('error', error.message.includes('log in again')
                ? 'Your session has expired. Please refresh the page and log in again.'
                : 'Failed to delete items: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkUpdateStock = async () => {
        if (selectedItems.length === 0) {
            showNotification('warning', 'Please select items to update');
            return;
        }

        // Show bulk stock update modal instead of prompt
        setShowBulkStockModal(true);
    };

    // Handle bulk stock quantity confirmation
    const handleBulkStockConfirm = async () => {
        const parsedStock = Number.parseInt(bulkStockQuantity, 10);
        if (Number.isNaN(parsedStock) || parsedStock < 0) {
            showNotification('error', 'Please enter a valid stock quantity (0 or greater)');
            return;
        }

        try {
            setIsSubmitting(true);
            const selectedItemsData = items.filter(item => selectedItems.includes(item.id));

            const responses = await Promise.all(
                selectedItemsData.map(item =>
                    fetch(`${getApiBaseUrl()}/stock/${item.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stock: parsedStock })
                    })
                )
            );

            const { failedCount } = processBulkResponses(responses);
            if (failedCount === 0) {
                showNotification('success', `Successfully updated stock for ${selectedItems.length} items!`);
                setSelectedItems([]);
                setSelectAll(false);
                setShowBulkStockModal(false);
                setBulkStockQuantity('0');
                await loadItems();
            } else {
                showNotification('error', `Failed to update ${failedCount} items`);
            }
        } catch (error) {
            console.error('❌ Error in bulk stock update:', error);
            showNotification('error', 'Failed to update stock: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle action dropdown toggle
    const toggleActionDropdown = (itemId) => {
        setActiveDropdown(activeDropdown === itemId ? null : itemId);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.action-dropdown')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle specification input changes
    const handleSpecificationChange = (field, value) => {
        setSpecifications(prev => ({
            ...prev,
            [field]: value
        }));
        console.log(`📋 Specification updated: ${field} = ${value}`);
    };

    // Helper function to render the appropriate input type based on field type
    const renderSpecificationField = (field, isEditMode = false) => {
        const { fieldName, fieldType, isRequired, label } = getFieldMeta(field);
        const inputId = isEditMode ? `spec-${fieldName}` : `add-spec-${fieldName}`;
        const value = specifications[fieldName] || '';

        const commonProps = {
            id: inputId,
            value: value,
            required: isRequired
        };

        switch (fieldType) {
            case 'boolean':
                return (
                    <div key={fieldName} className="form-group checkbox-group">
                        <label htmlFor={inputId} className="checkbox-label">
                            <input
                                type="checkbox"
                                {...commonProps}
                                checked={value === true || value === 'true'}
                                onChange={(e) => handleSpecificationChange(fieldName, e.target.checked)}
                            />
                            <span className="checkbox-text">{label}</span>
                            {isRequired && <span className="required-asterisk">*</span>}
                        </label>
                    </div>
                );

            case 'number':
                return (
                    <div key={fieldName} className="form-group">
                        <label htmlFor={inputId}>
                            {label}
                            {isRequired && <span className="required-asterisk">*</span>}
                        </label>
                        <input
                            type="number"
                            {...commonProps}
                            onChange={(e) => handleSpecificationChange(fieldName, e.target.value)}
                            placeholder={`Enter ${label.toLowerCase()}`}
                            step="any"
                        />
                    </div>
                );

            case 'text':
            default:
                return (
                    <div key={fieldName} className="form-group">
                        <label htmlFor={inputId}>
                            {label}
                            {isRequired && <span className="required-asterisk">*</span>}
                        </label>
                        <AutocompleteInput
                            id={inputId}
                            name={fieldName}
                            value={value}
                            onChange={(e) => handleSpecificationChange(fieldName, e.target.value)}
                            placeholder={`Enter ${label.toLowerCase()}`}
                            required={isRequired}
                            category={category}
                            fieldName={fieldName}
                            apiBaseUrl={getApiBaseUrl()}
                            type="text"
                        />
                    </div>
                );
        }
    };

    // Phase 2: Handle file upload with preview
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showNotification('error', 'Please select a valid image file');
                return;
            }

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('error', 'File size must be less than 5MB');
                return;
            }

            setFormData(prev => ({
                ...prev,
                imageFile: file
            }));

            // Create preview URL
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            console.log('📸 Image file selected:', file.name, 'Size:', file.size);
        }
    };

    // Upload image separately for an existing item lacking an image
    const _handleSeparateImageUpload = async (file, item) => {
        try {
            if (!file || !item) return;
            if (!file.type.startsWith('image/')) return showNotification('error', 'Invalid image file');
            if (file.size > 5 * 1024 * 1024) return showNotification('error', 'File too large (max 5MB)');
            const fd = new FormData();
            fd.append('image', file);
            const endpoint = `${getApiBaseUrl()}/images/${encodeURIComponent(category)}/${item.id}`;
            const res = await fetch(endpoint, {
                method: 'POST',
                withCredentials: true,
                body: fd
            });
            if (!res.ok) {
                try { const err = await res.json(); throw new Error(err.message || 'Upload failed'); } catch { throw new Error('Upload failed'); }
            }
            await loadItems();
        } catch (err) {
            console.error('Separate image upload failed:', err.message);
            showNotification('error', 'Image upload failed: ' + err.message);
        }
    };

    // Clear image selection
    const clearImage = () => {
        setFormData(prev => ({
            ...prev,
            imageFile: null
        }));

        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };

    // Reset form
    const resetForm = () => {
        console.log('🧹 Resetting form data and specifications');

        setFormData({
            name: '',
            brand: '',
            price: '',
            stock: '',
            description: '',
            tier: '', // Reset tier field
            imageFile: null
        });

        setSpecifications({});
        setShowSpecifications(true); // Keep specs visible for next use

        // Reset Pre-Built component state
        setPrebuiltComponents({
            CPU: null,
            Motherboard: null,
            GPU: null,
            RAM: null,
            Storage: null,
            PSU: null,
            Case: null,
            Cooling: null
        });
        setPrebuiltPurposes([]);

        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }

        console.log('✅ Form reset complete');
    };

    // ========== PRE-BUILT COMPONENT MANAGEMENT ==========
    
    // Toggle purpose selection (max 3)
    const togglePurpose = (purpose) => {
        setPrebuiltPurposes(prev => {
            if (prev.includes(purpose)) {
                return prev.filter(p => p !== purpose);
            } else if (prev.length < 3) {
                return [...prev, purpose];
            } else {
                showNotification('warning', 'Maximum 3 purposes allowed');
                return prev;
            }
        });
    };

    // Open component picker modal
    const openComponentPicker = async (componentCategory) => {
        setPickerCategory(componentCategory);
        setComponentSearchQuery('');
        setShowComponentPicker(true);
        
        // Fetch available components for this category
        try {
            const response = await fetch(
                `${getApiBaseUrl()}/stock/items/${encodeURIComponent(componentCategory)}`
            );
            
            if (response.ok) {
                const data = await response.json();
                setComponentSearchResults(data.items || []);
            }
        } catch (error) {
            console.error('Error fetching components:', error);
            showNotification('error', 'Failed to load components');
        }
    };

    // Select component from picker
    const selectComponent = (component) => {
        setPrebuiltComponents(prev => ({
            ...prev,
            [pickerCategory]: {
                id: component.id,
                name: component.name,
                price: component.price,
                stock: component.stock
            }
        }));
        setShowComponentPicker(false);
        showNotification('success', `${pickerCategory} selected: ${component.name}`);
    };

    // Remove component
    const removeComponent = (componentCategory) => {
        setPrebuiltComponents(prev => ({
            ...prev,
            [componentCategory]: null
        }));
        showNotification('info', `${componentCategory} removed`);
    };

    // Load Pre-Built data when editing
    const loadPreBuiltData = (item) => {
        if (item.category === 'Pre-Built' && item.specifications) {
            const specs = typeof item.specifications === 'string' 
                ? JSON.parse(item.specifications) 
                : item.specifications;

            // Load purposes
            setPrebuiltPurposes(specs.purposes || []);

            // Load components - 🔥 FIX: Properly handle empty components
            const components = {
                CPU: null,
                Motherboard: null,
                GPU: null,
                RAM: null,
                Storage: null,
                PSU: null,
                Case: null,
                Cooling: null
            };
            
            // ✅ FIX: Handle both componentLinks (regular Pre-Built) and components (Community Build)
            if (specs.componentLinks && Array.isArray(specs.componentLinks)) {
                // Regular Pre-Built format
                specs.componentLinks.forEach(link => {
                    // Only set component if it has a name (not empty)
                    if (link.componentName?.trim()) {
                        components[link.componentType] = {
                            id: link.linkedStockIds?.[0],
                            name: link.componentName,
                            hasMatch: link.hasMatch
                        };
                    }
                    // If componentName is empty, leave it as null
                });
            } else if (specs.components && Array.isArray(specs.components)) {
                // Community Build format
                specs.components.forEach(comp => {
                    // Normalize component type to match expected keys (e.g., "cpu" → "CPU")
                    const compType = comp.category || comp.name;
                    const normalizedType = compType.charAt(0).toUpperCase() + compType.slice(1);
                    
                    if (comp.value && typeof comp.value === 'string' && comp.value.trim()) {
                        components[normalizedType] = {
                            id: comp.part_id || null,
                            name: comp.value,
                            hasMatch: !!comp.part_id
                        };
                    }
                });
            }
            
            setPrebuiltComponents(components);
        }
    };

    // Build Pre-Built specifications object
    const buildPreBuiltSpecifications = () => {
        const components = [];
        const componentLinks = [];

        // 🔥 FIX: Always include all 8 component slots, even if empty
        // This preserves the component structure when components are removed
        const COMPONENT_ORDER = ['CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];
        
        COMPONENT_ORDER.forEach(type => {
            const component = prebuiltComponents[type];
            
            if (component?.name) {
                // Component has a value - include it
                components.push({
                    name: type,
                    value: component.name
                });

                componentLinks.push({
                    componentType: type,
                    componentName: component.name,
                    linkedStockIds: component.id ? [component.id] : [],
                    hasMatch: !!component.id
                });
            } else {
                // Component is empty - still include it with empty value
                // This ensures all 8 slots are preserved
                components.push({
                    name: type,
                    value: '' // Empty string to preserve slot
                });

                componentLinks.push({
                    componentType: type,
                    componentName: '',
                    linkedStockIds: [],
                    hasMatch: false
                });
            }
        });

        return {
            buildType: formData.tier || 'Unknown',
            purposes: prebuiltPurposes,
            components: components,
            componentLinks: componentLinks,
            totalComponents: components.filter(c => c.value).length, // Count only filled components
            matchedComponents: componentLinks.filter(l => l.hasMatch).length
        };
    };

    // ========== END PRE-BUILT COMPONENT MANAGEMENT ==========

    // Handle add item
    const handleAddItem = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);

            if (!formData.name.trim() || !formData.price) {
                showNotification('error', 'Please fill in required fields (name and price)');
                return;
            }
            
            if (category === 'Pre-Built' && !formData.tier) {
                showNotification('error', 'Please select a Build Tier for Pre-Built items');
                return;
            }

            const prebuiltSpecs = category === 'Pre-Built' ? buildPreBuiltSpecifications() : null;
            const submitData = buildStockFormData(formData, category, specifications, prebuiltSpecs);

            const response = await fetch(`${getApiBaseUrl()}/stock`, {
                method: 'POST',
                withCredentials: true,
                body: submitData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ Item added successfully:', data.data);
                console.log('🖼️ Image URL in response:', data.data.image_url);

                // Small delay to ensure database transaction is committed
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh items list
                await loadItems();

                // Reset form and close modal
                resetForm();
                setShowAddModal(false);

                showNotification('success', 'Item added successfully!');
            } else {
                throw new Error(data.message || 'Failed to add item');
            }

        } catch (error) {
            console.error('❌ Error adding item:', error);
            showNotification('error', 'Failed to add item: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit item
    const handleEditItem = async (e) => {
        e.preventDefault();
        if (isSubmitting || !currentItem) return;

        try {
            setIsSubmitting(true);

            const prebuiltSpecs = currentItem.category === 'Pre-Built' ? buildPreBuiltSpecifications() : null;
            const submitData = buildStockFormData(formData, currentItem.category, specifications, prebuiltSpecs);

            const response = await fetch(`${getApiBaseUrl()}/stock/${currentItem.id}`, {
                method: 'PATCH',
                withCredentials: true,
                body: submitData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to update item');
            }

            setItems(prevItems => 
                prevItems.map(item => 
                    item.id === currentItem.id ? data.data : item
                )
            );

            await loadItems();
            await new Promise(resolve => setTimeout(resolve, 100));
            await loadItems();

            resetForm();
            setShowEditModal(false);
            setCurrentItem(null);
            showNotification('success', 'Item updated successfully!');

        } catch (error) {
            console.error('❌ Error updating item:', error);
            console.error('📍 Error stack:', error.stack);
            showNotification('error', 'Failed to update item: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete item
    const handleDeleteItem = async (item) => {
        const confirmed = await showConfirmation(`delete "${item.name}"? This action cannot be undone.`);
        if (!confirmed) return;

        try {

            const response = await fetch(`${getApiBaseUrl()}/stock/${item.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 401) {
                throw new Error('Authentication failed. Please log in again.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to delete item');

            await loadItems();
            showNotification('success', 'Item deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting item:', error);
            showNotification('error', error.message.includes('log in again')
                ? 'Your session has expired. Please refresh the page and log in again.'
                : 'Failed to delete item: ' + error.message);
        }
    };

    // Handle make out of stock
    const handleMakeOutOfStock = async (item) => {
        if (item.stock <= 0) {
            return showNotification('warning', 'This item is already out of stock');
        }

        const confirmed = await showConfirmation(`mark "${item.name}" as out of stock? This will set stock to 0.`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${getApiBaseUrl()}/stock/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stock: 0 })
            });

            if (!response.ok) throw new Error('Failed to update stock');

            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to update stock');

            showNotification('success', `"${item.name}" marked as out of stock!`);
            await loadItems();
        } catch (error) {
            console.error('Error updating stock:', error);
            showNotification('error', 'Failed to update stock: ' + error.message);
        }
    };

    // Handle make available
    const handleMakeAvailable = (item) => {
        // Validate that item is out of stock
        if (item.stock > 0) {
            showNotification('warning', 'This item already has stock available');
            return;
        }

        setStockModalItem(item);
        setStockQuantity('1');
        setShowStockModal(true);
    };

    /**
     * Handle Make On Sale functionality
     */
    const handleMakeOnSale = (item) => {
        if (item.on_sale) {
            // Remove from sale
            handleRemoveFromSale(item);
        } else {
            // Add to sale
            setSaleModalItem(item);
            setSaleData({
                salePrice: (item.price * 0.9).toFixed(2), // Default 10% discount
                startDate: Date.now().toISOString().split('T')[0],
                endDate: ''
            });
            setShowSaleModal(true);
        }
    };

    /**
     * Handle adding item to sale
     */
    const handleAddToSale = async () => {
        try {
            setIsSubmitting(true);

            const response = await fetch(`${getApiBaseUrl()}/stock/${saleModalItem.id}/sale`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    salePrice: Number.parseFloat(saleData.salePrice),
                    saleDuration: saleData.endDate ? 
                        Math.ceil((new Date(saleData.endDate) - Date.now()) / (1000 * 60 * 60 * 24)) : 
                        null
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Update local state
                setItems(prevItems =>
                    prevItems.map(item =>
                        item.id === saleModalItem.id
                            ? {
                                ...item,
                                on_sale: true,
                                sale_price: Number.parseFloat(saleData.salePrice),
                                sale_start_date: Date.now().toISOString(),
                                sale_end_date: saleData.endDate ? new Date(saleData.endDate).toISOString() : null
                            }
                            : item
                    )
                );

                showNotification('success', 'Item successfully added to sale!');
                setShowSaleModal(false);
                setSaleModalItem(null);
            } else {
                throw new Error(data.message || 'Failed to add item to sale');
            }

        } catch (error) {
            console.error('❌ Error adding item to sale:', error);
            showNotification('error', `Failed to add item to sale: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle removing item from sale
     */
    const handleRemoveFromSale = async (item) => {
        try {
            setIsSubmitting(true);

            const response = await fetch(`${getApiBaseUrl()}/stock/${item.id}/sale`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Update local state
                setItems(prevItems =>
                    prevItems.map(prevItem =>
                        prevItem.id === item.id
                            ? {
                                ...prevItem,
                                on_sale: false,
                                sale_price: null,
                                sale_start_date: null,
                                sale_end_date: null
                            }
                            : prevItem
                    )
                );

                showNotification('success', 'Item successfully removed from sale!');
            } else {
                throw new Error(data.message || 'Failed to remove item from sale');
            }

        } catch (error) {
            console.error('❌ Error removing item from sale:', error);
            showNotification('error', `Failed to remove item from sale: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle stock quantity confirmation
    const handleStockQuantityConfirm = async () => {
        if (!stockQuantity || Number.isNaN(stockQuantity) || Number.parseInt(stockQuantity, 10) <= 0) {
            showNotification('warning', 'Please enter a valid quantity greater than 0');
            return;
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}/stock/${stockModalItem.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    stock: Number.parseInt(stockQuantity, 10)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update stock');
            }

            const data = await response.json();
            if (data.success) {
                showNotification('success', `"${stockModalItem.name}" made available with ${stockQuantity} units!`);
                await loadItems();
                setShowStockModal(false);
                setStockModalItem(null);
                setStockQuantity('1');
            } else {
                throw new Error(data.message || 'Failed to update stock');
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            showNotification('error', 'Failed to update stock: ' + error.message);
        }
    };

    /**
     * Handle Approve Community Build
     */
    const handleApproveCommunityBuild = async (item) => {
        const confirmed = await showConfirmation(
            `approve the community build "${item.name}"? This will make it visible in the kiosk.`
        );
        if (!confirmed) return;

        try {
            setIsSubmitting(true);
            const response = await fetch(`${getApiBaseUrl()}/stock/approve-community-build/${item.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                showNotification('success', `Community build "${item.name}" approved!`);
                await loadItems();
            } else {
                throw new Error(data.message || 'Failed to approve community build');
            }
        } catch (error) {
            console.error('❌ Error approving community build:', error);
            showNotification('error', `Failed to approve: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle Reject Community Build
     */
    const handleRejectCommunityBuild = async (item) => {
        const confirmed = await showConfirmation(
            `reject the community build "${item.name}"? This will remove it from the system.`
        );
        if (!confirmed) return;

        try {
            setIsSubmitting(true);
            const response = await fetch(`${getApiBaseUrl()}/stock/reject-community-build/${item.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                showNotification('success', `Community build "${item.name}" rejected and removed.`);
                await loadItems();
            } else {
                throw new Error(data.message || 'Failed to reject community build');
            }
        } catch (error) {
            console.error('❌ Error rejecting community build:', error);
            showNotification('error', `Failed to reject: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle Remove Backgrounds for Current Category
     */
    const handleRemoveBackgrounds = async () => {
        const confirmed = await showConfirmation(
            `remove white backgrounds from all images in ${category} category? This will process all product images and make backgrounds transparent.`
        );
        if (!confirmed) return;

        try {
            setIsSubmitting(true);
            showNotification('info', `Starting background removal for ${category}...`);

            const response = await fetch(`${getApiBaseUrl()}/stock/remove-backgrounds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category: category,
                    dryRun: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                showNotification('success', 
                    `✅ Background removal complete! Processed: ${data.processed}, Failed: ${data.failed}`
                );
                // Reload items to see updated images
                await loadItems();
            } else {
                throw new Error(data.message || 'Failed to remove backgrounds');
            }
        } catch (error) {
            console.error('❌ Error removing backgrounds:', error);
            showNotification('error', `Failed to remove backgrounds: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open edit modal with item data
    const openEditModal = async (item) => {
        console.log('✏️ Opening edit modal for item:', item.name, 'Item category:', item.category, 'URL category:', category);

        setCurrentItem(item);
        
        // Normalize tier value to match dropdown options (e.g., "Mid Tier" → "mid-tier")
        const normalizeTierForDropdown = (tierValue) => {
            if (!tierValue) return '';
            return tierValue.toLowerCase().replaceAll(/\s+/g, '-');
        };
        
        setFormData({
            name: item.name || '',
            brand: item.brand || '',
            price: item.price || '',
            stock: item.stock || '',
            description: item.description || '',
            tier: normalizeTierForDropdown(item.tier) || '', // ✅ FIX: Normalize tier to match dropdown values
            imageFile: null // Always start with no file selected for editing
        });

        // Load existing specifications
        if (item.specifications && typeof item.specifications === 'object') {
            setSpecifications(item.specifications);
            console.log('📋 Loaded existing specifications:', item.specifications);
        } else if (item.specifications && typeof item.specifications === 'string') {
            try {
                const parsedSpecs = JSON.parse(item.specifications);
                setSpecifications(parsedSpecs);
                console.log('📋 Parsed existing specifications:', parsedSpecs);
            } catch (error) {
                console.error('❌ Error parsing specifications JSON:', error);
                setSpecifications({});
            }
        } else {
            setSpecifications({});
            console.log('📋 No existing specifications found, starting with empty specs');
        }

        // Ensure specifications are visible when editing
        setShowSpecifications(true);

        setImagePreview(null); // Clear preview for editing

        // Load spec fields for this item's category BEFORE showing modal
        const itemCategory = item.category || category;
        if (itemCategory) {
            console.log('📋 Loading spec fields for category:', itemCategory);
            await loadSpecificationFields(itemCategory);
        } else {
            console.warn('⚠️ No category available for loading specifications');
        }

        // Log current spec fields to help debug
        console.log('📋 Current spec fields available:', specFields);
        console.log('📋 Current spec fields count:', specFields.length);

        // Load Pre-Built data if editing a Pre-Built item
        if (item.category === 'Pre-Built') {
            console.log('🖥️ Loading Pre-Built component data...');
            loadPreBuiltData(item);
        }

        // Show modal after loading specifications
        setShowEditModal(true);
    };

    // Format currency
    const formatCurrency = (amount) => {
        const safeAmount = Number(amount) || 0;
        return `₱${safeAmount.toLocaleString()}`;
    };

    // Extracted: sort arrow indicator (eliminates 5 repeated conditionals)
    const renderSortArrow = (field) => {
        if (sortBy !== field) return null;
        return (
            <span className={`sort-arrow ${sortOrder.toLowerCase()}`}>
                {sortOrder === 'ASC' ? '↑' : '↓'}
            </span>
        );
    };

    // Extracted: single table row rendering (isolates ~12 CC from component body)
    const renderTableRow = (item, index) => (
        <tr key={item.id} className={selectedItems.includes(item.id) ? 'selected' : ''}>
            <td>
                <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                />
            </td>
            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="product-name-cell">
                <div className="product-info">
                    <div className="product-image-thumb">
                        {(item.image_url || item.file_path) ? (
                            <button
                                type="button"
                                className="product-image-button"
                                onClick={() => setModalImage(getFullImageUrl(item.image_url || item.file_path))}
                            >
                            <img
                                src={getFullImageUrl(item.image_url || item.file_path)}
                                alt={item.name}
                                onLoad={() => {
                                    console.log(`🖼️ Image loaded successfully: ${item.image_url || item.file_path}`);
                                }}
                                onError={(e) => {
                                    console.error(`❌ Image failed to load: ${item.image_url || item.file_path}`);
                                    console.error('❌ Full URL attempted:', e.target.src);
                                    console.error('❌ Network error or file not found');
                                    e.target.style.display = 'none';
                                    const placeholder = e.target.nextSibling;
                                    if (placeholder) placeholder.style.display = 'flex';
                                }}
                                crossOrigin="anonymous"
                            />
                            </button>
                        ) : (
                            <div className="image-placeholder-small">
                                <FiImage />
                                <small style={{ fontSize: '10px', marginTop: '4px' }}>No Image</small>
                            </div>
                        )}
                    </div>
                    <div className="product-details">
                        <span className="product-name">{item.name}</span>
                        {item.brand && <span className="product-brand">{item.brand}</span>}
                    </div>
                </div>
            </td>
            <td className="tier-cell">
                {(() => {
                    const tierInfo = getTierInfo(item.tier);
                    return (
                        <span className={`tier-badge ${tierInfo.className}`}>
                            {tierInfo.displayName}
                        </span>
                    );
                })()}
            </td>
            <td>{category}</td>
            <td>
                <span className={`stock-badge ${item.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {item.stock}
                </span>
            </td>
            <td>{item.sold || 0}</td>
            <td className="price-cell">{formatCurrency(item.price)}</td>
            <td>
                {category === 'Community Build' && item.specifications?.approvalStatus ? (
                    <span className={`status-badge approval-${item.specifications.approvalStatus}`}>
                        {item.specifications.approvalStatus === 'pending' && '⏳ Pending Approval'}
                        {item.specifications.approvalStatus === 'approved' && '✓ Approved'}
                        {item.specifications.approvalStatus === 'rejected' && '✗ Rejected'}
                    </span>
                ) : (
                    <span className={`status-badge ${item.stock > 0 ? 'published' : 'out-of-stock'}`}>
                        {item.stock > 0 ? 'Published' : 'Out of Stock'}
                    </span>
                )}
            </td>
            <td>
                <div className="action-dropdown">
                    <button
                        className="action-btn"
                        onClick={() => toggleActionDropdown(item.id)}
                    >
                        ⋯
                    </button>
                    <div className={`dropdown-menu ${activeDropdown === item.id ? 'show' : ''}`}>
                        {category === 'Community Build' && item.specifications?.approvalStatus === 'pending' && (
                            <>
                                <button
                                    onClick={() => {
                                        handleApproveCommunityBuild(item);
                                        setActiveDropdown(null);
                                    }}
                                    className="approve-btn"
                                >
                                    ✓ Approve Build
                                </button>
                                <button
                                    onClick={() => {
                                        handleRejectCommunityBuild(item);
                                        setActiveDropdown(null);
                                    }}
                                    className="reject-btn danger"
                                >
                                    ✗ Reject Build
                                </button>
                                <div className="dropdown-divider"></div>
                            </>
                        )}
                        
                        <button onClick={() => {
                            openEditModal(item);
                            setActiveDropdown(null);
                        }}>
                            <FiEdit /> Edit Stock
                        </button>
                        <button
                            onClick={() => {
                                handleMakeOnSale(item);
                                setActiveDropdown(null);
                            }}
                            className={`sale-btn ${item.on_sale ? 'remove-sale' : 'add-sale'}`}
                        >
                            {item.on_sale ? 'Remove from Sale' : 'Make On Sale'}
                        </button>

                        {item.stock > 0 && (
                            <button
                                onClick={() => {
                                    handleMakeOutOfStock(item);
                                    setActiveDropdown(null);
                                }}
                                className="stock-out-btn"
                            >
                                Make Stock Out
                            </button>
                        )}
                        {item.stock === 0 && (
                            <button
                                onClick={() => {
                                    handleMakeAvailable(item);
                                    setActiveDropdown(null);
                                }}
                                className="make-available-btn"
                            >
                                Make Available
                            </button>
                        )}
                        <button onClick={() => {
                            handleDeleteItem(item);
                            setActiveDropdown(null);
                        }} className="danger">
                            <FiTrash2 /> Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );

    if (isLoading) {
        return (
            <div className="stock-detail">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading {category} items...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="stock-detail">
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={loadItems} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="stock-detail kw-admin-stock">
            {/* Header */}
            <div className="stock-header">
                <h2>{category} Stock Management</h2>
                <p className="subtitle"></p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="stock-detail-add-btn"
                        onClick={() => setShowAddModal(true)}
                    >
                        <FiPlus /> Add New {category}
                    </button>
                    {category !== 'Pre-Built' && (
                        <button
                            className="remove-bg-btn"
                            onClick={handleRemoveBackgrounds}
                            disabled={isSubmitting}
                            title="Remove white backgrounds from all product images in this category"
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#9C27B0',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.3s ease',
                                opacity: isSubmitting ? 0.6 : 1
                            }}
                        >
                            <FiImage /> {isSubmitting ? 'Processing...' : 'Remove Backgrounds'}
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filters */}
            <div className="stock-filters">
                <div className="search-section">
                    <div className={`search-input ${isSearching ? 'searching' : ''}`}>
                        {isSearching ? (
                            <div className="search-spinner"></div>
                        ) : (
                            <FiSearch />
                        )}
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            key="search-input"
                        />
                    </div>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(Number.parseInt(e.target.value, 10))}
                        className="items-per-page"
                    >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>

                <div className="filter-section">
                    <select value={selectedBrand} onChange={handleBrandChange} className="brand-filter">
                        <option value="">All Brands</option>
                        {brands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>

                    <select value={selectedTier} onChange={handleTierFilterChange} className="tier-filter">
                        <option value="">All Tiers</option>
                        <option value="entry">🟢 Entry Level</option>
                        <option value="mid-tier">🔵 Mid-Tier</option>
                        <option value="high-tier">🟣 High-Tier</option>
                        <option value="elite">🟠 Elite</option>
                    </select>

                    <select value={stockFilter} onChange={handleStockFilterChange} className="stock-filter">
                        <option value="all">All Stock</option>
                        <option value="inStock">In Stock</option>
                        <option value="outOfStock">Out of Stock</option>
                    </select>

                    <input
                        type="number"
                        placeholder="Min Price"
                        value={priceRange.min}
                        onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                        className="price-filter"
                    />

                    <input
                        type="number"
                        placeholder="Max Price"
                        value={priceRange.max}
                        onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                        className="price-filter"
                    />
                </div>

                {/* Bulk Actions */}
                {selectedItems.length > 0 && (
                    <div className="bulk-actions">
                        <span>{selectedItems.length} selected</span>
                        <button onClick={handleBulkUpdateStock} className="bulk-btn">
                            Update Stock
                        </button>
                        <button onClick={handleBulkDelete} className="bulk-btn danger">
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            {/* Modern Table */}
            <div className="stock-table-container">
                {items.length === 0 ? (
                    <div className="empty-state">
                        <FiImage size={48} />
                        <p>No {category} items found</p>
                        <button
                            className="stock-detail-add-btn"
                            onClick={() => setShowAddModal(true)}
                        >
                            <FiPlus /> Add First Item
                        </button>
                    </div>
                ) : (
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th className="select-column">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="sn-column">Sn</th>
                                <th
                                    className="sortable-column"
                                    onClick={() => handleSort('name')}
                                >
                                    Product Name
                                    {renderSortArrow('name')}
                                </th>
                                <th
                                    className="sortable-column"
                                    onClick={() => handleSort('tier')}
                                >
                                    Tier
                                    {renderSortArrow('tier')}
                                </th>
                                <th
                                    className="sortable-column"
                                    onClick={() => handleSort('category')}
                                >
                                    Category
                                    {renderSortArrow('category')}
                                </th>
                                <th
                                    className="sortable-column"
                                    onClick={() => handleSort('stock')}
                                >
                                    Stock
                                    {renderSortArrow('stock')}
                                </th>
                                <th>Sold</th>
                                <th
                                    className="sortable-column"
                                    onClick={() => handleSort('price')}
                                >
                                    Price
                                    {renderSortArrow('price')}
                                </th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => renderTableRow(item, index))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination-container">
                    <div className="pagination-info">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                    </div>
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {(() => {
                if (!showAddModal) return null;
                return (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add New {category}</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowAddModal(false);
                                    resetForm();
                                }}
                            >
                                <FiX />
                            </button>
                        </div>

                        <form onSubmit={handleAddItem} className="modal-form">
                            <div className="modal-form-content">
                                <div className="modal-main-fields">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="name">Name *</label>
                                            <AutocompleteInput
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Enter product name"
                                                required
                                                category={category}
                                                fieldName="name"
                                                apiBaseUrl={getApiBaseUrl()}
                                                type="text"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="brand">Brand</label>
                                            <AutocompleteInput
                                                id="brand"
                                                name="brand"
                                                value={formData.brand}
                                                onChange={handleInputChange}
                                                placeholder="Enter brand name"
                                                category={category}
                                                fieldName="brand"
                                                apiBaseUrl={getApiBaseUrl()}
                                                type="text"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="price">Price *</label>
                                            <input
                                                type="number"
                                                id="price"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="stock">Stock</label>
                                            <input
                                                type="number"
                                                id="stock"
                                                name="stock"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="description">Description</label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows="3"
                                        />
                                    </div>

                                    {/* TIER/CLASSIFICATION SELECTION - ✅ FIX: Mandatory for all except Pre-Built */}
                                    <div className="form-group" style={{ marginBottom: '16px' }}>
                                        <label htmlFor="tier">
                                            Product Tier/Classification {category !== 'Pre-Built' && <span style={{ color: 'red' }}>*</span>}
                                        </label>
                                        <select
                                            id="tier"
                                            name="tier"
                                            value={formData.tier || ''}
                                            onChange={handleInputChange}
                                            required={category !== 'Pre-Built'} // ✅ FIX: Required for all except Pre-Built
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '14px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            <option value="">
                                                {category === 'Pre-Built' ? 'Select Tier (Optional)' : 'Select Tier'}
                                            </option>
                                            <option value="entry">🟢 Entry Level - Budget-friendly components</option>
                                            <option value="mid-tier">🔵 Mid-Tier - Balanced performance & value</option>
                                            <option value="high-tier">🟣 High-Tier - Premium components</option>
                                            <option value="elite">🟠 Elite - Top-of-the-line performance</option>
                                        </select>
                                        <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            {category === 'Pre-Built' 
                                                ? 'Classify product by performance/price tier (optional for Pre-Built)'
                                                : 'Required: Classify product by performance/price tier'
                                            }
                                        </small>
                                    </div>

                                    {/* PRE-BUILT COMPONENT MANAGEMENT SECTION - Moved below tier */}
                                    {category === 'Pre-Built' && (
                                        <div className="prebuilt-management-section">

                                            <h4 className="prebuilt-section-title">
                                                <FiCpu style={{ marginRight: '8px' }} />
                                                Pre-Built Components
                                            </h4>
                                            
                                            <div className="components-grid">
                                                {Object.keys(prebuiltComponents).map(compType => (
                                                    <div key={compType} className="component-item">
                                                        <label className="component-label">{compType}</label>
                                                        <div className="component-control">
                                                            {prebuiltComponents[compType] ? (
                                                                <div className="component-selected">
                                                                    <span className="component-name">
                                                                        {prebuiltComponents[compType].name}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="remove-component-btn"
                                                                        onClick={() => removeComponent(compType)}
                                                                        title="Remove component"
                                                                    >
                                                                        <FiX />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="select-component-btn"
                                                                    onClick={() => openComponentPicker(compType)}
                                                                >
                                                                    <FiSearch style={{ marginRight: '6px' }} /> 
                                                                    Select {compType}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <h4 className="prebuilt-section-title" style={{ marginTop: '24px' }}>
                                                <FiCheckSquare style={{ marginRight: '8px' }} />
                                                Build Purposes
                                            </h4>
                                            
                                            <div className="purpose-tags">
                                                <p className="purpose-hint">Select up to 3 purposes for this build</p>
                                                <div className="purpose-checkboxes">
                                                    {['Gaming', 'Work', 'Multimedia'].map(purpose => (
                                                        <label
                                                            key={purpose}
                                                            className={`purpose-checkbox ${
                                                                prebuiltPurposes.includes(purpose) ? 'selected' : ''
                                                            } ${
                                                                !prebuiltPurposes.includes(purpose) && 
                                                                prebuiltPurposes.length >= 3 ? 'disabled' : ''
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={prebuiltPurposes.includes(purpose)}
                                                                onChange={() => togglePurpose(purpose)}
                                                                disabled={
                                                                    !prebuiltPurposes.includes(purpose) && 
                                                                    prebuiltPurposes.length >= 3
                                                                }
                                                            />
                                                            <span className="purpose-label">{purpose}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <p className="purpose-count">
                                                    {prebuiltPurposes.length} / 3 selected
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Specifications Section - Hidden for Pre-Built (uses Component Links instead) */}
                                    {category !== 'Pre-Built' && (
                                        specFields.length > 0 ? (
                                            <div className="specification-section">
                                                <div className="section-header">
                                                    <h4>
                                                        <FiFilter className="section-icon" />
                                                        {category} Specifications
                                                        <span className="spec-count">({specFields.length} fields)</span>
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        className={`toggle-specs-btn ${showSpecifications ? 'active' : ''}`}
                                                        onClick={() => setShowSpecifications(!showSpecifications)}
                                                    >
                                                        {showSpecifications ? 'Hide' : 'Show'} Specs
                                                    </button>
                                                </div>

                                                {showSpecifications && (
                                                    <div className="specs-grid">
                                                        {specFields.map(field => renderSpecificationField(field, false))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="specification-section">
                                                <div className="section-header">
                                                    <h4>
                                                        <FiFilter className="section-icon" />
                                                        {category} Specifications
                                                    </h4>
                                                    <span className="spec-status">
                                                        {category ? 'Loading...' : 'No category detected'}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="modal-image-sidebar">
                                    <h4>Product Image</h4>
                                    <div className="file-upload-section">
                                        <input
                                            type="file"
                                            id="image"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                        />

                                        {formData.imageFile ? (
                                            <div className="file-selected">
                                                <div className="file-info">
                                                    <FiImage />
                                                    <span>{formData.imageFile.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={clearImage}
                                                        className="clear-file-btn"
                                                    >
                                                        <FiX />
                                                    </button>
                                                </div>

                                                {imagePreview && (
                                                    <div className="image-preview">
                                                        <img src={imagePreview} alt="Preview" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <label htmlFor="image" className="file-upload-btn">
                                                <FiUpload /> Choose Image File
                                            </label>
                                        )}

                                        <p className="file-help">
                                            Upload image files only (JPEG, PNG, WebP). Max size: 5MB.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                );
            })()}

            {/* Edit Modal */}
            {(() => {
                if (!showEditModal || !currentItem) return null;
                return (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit {currentItem.name}</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setCurrentItem(null);
                                    resetForm();
                                }}
                            >
                                <FiX />
                            </button>
                        </div>

                        <form onSubmit={handleEditItem} className="modal-form">
                            <div className="modal-form-content">
                                <div className="modal-main-fields">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="edit-name">Name *</label>
                                            <AutocompleteInput
                                                id="edit-name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Enter product name"
                                                required
                                                category={category}
                                                fieldName="name"
                                                apiBaseUrl={getApiBaseUrl()}
                                                type="text"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="edit-brand">Brand</label>
                                            <AutocompleteInput
                                                id="edit-brand"
                                                name="brand"
                                                value={formData.brand}
                                                onChange={handleInputChange}
                                                placeholder="Enter brand name"
                                                category={category}
                                                fieldName="brand"
                                                apiBaseUrl={getApiBaseUrl()}
                                                type="text"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="edit-price">Price *</label>
                                            <input
                                                type="number"
                                                id="edit-price"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="edit-stock">Stock</label>
                                            <input
                                                type="number"
                                                id="edit-stock"
                                                name="stock"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="edit-description">Description</label>
                                        <textarea
                                            id="edit-description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows="3"
                                        />
                                    </div>

                                    {/* TIER/CLASSIFICATION SELECTION - ✅ FIX: Mandatory for all except Pre-Built (EDIT MODE) */}
                                    <div className="form-group" style={{ marginBottom: '16px' }}>
                                        <label htmlFor="edit-tier">
                                            Product Tier/Classification {(currentItem?.category !== 'Pre-Built' && category !== 'Pre-Built') && <span style={{ color: 'red' }}>*</span>}
                                        </label>
                                        <select
                                            id="edit-tier"
                                            name="tier"
                                            value={formData.tier || ''}
                                            onChange={handleInputChange}
                                            required={currentItem?.category !== 'Pre-Built' && category !== 'Pre-Built'} // ✅ FIX: Required for all except Pre-Built
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '14px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            <option value="">
                                                {(currentItem?.category === 'Pre-Built' || category === 'Pre-Built') 
                                                    ? 'Select Tier (Optional)' 
                                                    : 'Select Tier'
                                                }
                                            </option>
                                            <option value="entry">🟢 Entry Level - Budget-friendly components</option>
                                            <option value="mid-tier">🔵 Mid-Tier - Balanced performance & value</option>
                                            <option value="high-tier">🟣 High-Tier - Premium components</option>
                                            <option value="elite">🟠 Elite - Top-of-the-line performance</option>
                                        </select>
                                        <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            {(currentItem?.category === 'Pre-Built' || category === 'Pre-Built')
                                                ? 'Classify product by performance/price tier (optional for Pre-Built)'
                                                : 'Required: Classify product by performance/price tier'
                                            }
                                        </small>
                                    </div>

                                    {/* PRE-BUILT COMPONENT MANAGEMENT SECTION - EDIT MODE */}
                                    {(currentItem?.category === 'Pre-Built' || category === 'Pre-Built') && (
                                        <div className="prebuilt-management-section">

                                            <h4 className="prebuilt-section-title">
                                                <FiCpu style={{ marginRight: '8px' }} />
                                                Pre-Built Components
                                            </h4>
                                            
                                            <div className="components-grid">
                                                {Object.keys(prebuiltComponents).map(compType => (
                                                    <div key={compType} className="component-item">
                                                        <label className="component-label">{compType}</label>
                                                        <div className="component-control">
                                                            {prebuiltComponents[compType] ? (
                                                                <div className="component-selected">
                                                                    <span className="component-name">
                                                                        {prebuiltComponents[compType].name}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="remove-component-btn"
                                                                        onClick={() => removeComponent(compType)}
                                                                        title="Remove component"
                                                                    >
                                                                        <FiX />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="select-component-btn"
                                                                    onClick={() => openComponentPicker(compType)}
                                                                >
                                                                    <FiSearch style={{ marginRight: '6px' }} /> 
                                                                    Select {compType}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <h4 className="prebuilt-section-title" style={{ marginTop: '24px' }}>
                                                <FiCheckSquare style={{ marginRight: '8px' }} />
                                                Build Purposes
                                            </h4>
                                            
                                            <div className="purpose-tags">
                                                <p className="purpose-hint">Select up to 3 purposes for this build</p>
                                                <div className="purpose-checkboxes">
                                                    {['Gaming', 'Work', 'Multimedia'].map(purpose => (
                                                        <label
                                                            key={purpose}
                                                            className={`purpose-checkbox ${
                                                                prebuiltPurposes.includes(purpose) ? 'selected' : ''
                                                            } ${
                                                                !prebuiltPurposes.includes(purpose) && 
                                                                prebuiltPurposes.length >= 3 ? 'disabled' : ''
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={prebuiltPurposes.includes(purpose)}
                                                                onChange={() => togglePurpose(purpose)}
                                                                disabled={
                                                                    !prebuiltPurposes.includes(purpose) && 
                                                                    prebuiltPurposes.length >= 3
                                                                }
                                                            />
                                                            <span className="purpose-label">{purpose}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <p className="purpose-count">
                                                    {prebuiltPurposes.length} / 3 selected
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Specifications Section - Hidden for Pre-Built (uses Component Links instead) */}
                                    {(currentItem?.category || category) !== 'Pre-Built' && (
                                        specFields.length > 0 ? (
                                            <div className="specification-section">
                                                <div className="section-header">
                                                    <h4>
                                                        <FiFilter className="section-icon" />
                                                        {(currentItem?.category || category)} Specifications
                                                        <span className="spec-count">({specFields.length} fields)</span>
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        className={`toggle-specs-btn ${showSpecifications ? 'active' : ''}`}
                                                        onClick={() => setShowSpecifications(!showSpecifications)}
                                                    >
                                                        {showSpecifications ? 'Hide' : 'Show'} Specs
                                                    </button>
                                                </div>

                                                {showSpecifications && (
                                                    <div className="specs-grid">
                                                        {specFields.map(field => renderSpecificationField(field, true))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="specification-section">
                                                <div className="section-header">
                                                    <h4>
                                                        <FiFilter className="section-icon" />
                                                        {(currentItem?.category || category)} Specifications
                                                    </h4>
                                                    <span className="spec-status">
                                                        {(currentItem?.category || category) ? 'Loading...' : 'No category detected'}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="modal-image-sidebar">
                                    <h4>Product Images</h4>

                                    {/* Display Current Image if exists */}
                                    {currentItem.image_url && (
                                        <div className="current-image-display">
                                            <span className="current-image-label">Current Image:</span>
                                            <div className="current-image">
                                                <img
                                                    src={getFullImageUrl(currentItem.image_url)}
                                                    alt={currentItem.name}
                                                    style={{ maxWidth: '100%', height: 'auto', marginBottom: '12px' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="file-upload-section">
                                        <input
                                            type="file"
                                            id="edit-image"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                        />

                                        {formData.imageFile ? (
                                            <div className="file-selected">
                                                <div className="file-info">
                                                    <FiImage />
                                                    <span>{formData.imageFile.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={clearImage}
                                                        className="clear-file-btn"
                                                    >
                                                        <FiX />
                                                    </button>
                                                </div>

                                                {imagePreview && (
                                                    <div className="image-preview">
                                                        <img src={imagePreview} alt="Preview" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <label htmlFor="edit-image" className="file-upload-btn">
                                                <FiUpload /> Choose New Image
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setCurrentItem(null);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Updating...' : 'Update Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                );
            })()}

            {/* Component Picker Modal */}
            {showComponentPicker && (
                <div className="modal-overlay component-picker-overlay">
                    <div className="modal component-picker-modal">
                        <div className="modal-header">
                            <h3>Select {pickerCategory}</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowComponentPicker(false)}
                            >
                                <FiX />
                            </button>
                        </div>
                        
                        <div className="modal-content">
                            <div className="search-box">
                                <FiSearch className="search-icon" />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder={`Search ${pickerCategory}...`}
                                    value={componentSearchQuery}
                                    onChange={(e) => setComponentSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="component-results">
                                {componentSearchResults
                                    .filter(item => 
                                        componentSearchQuery === '' ||
                                        item.name.toLowerCase().includes(
                                            componentSearchQuery.toLowerCase()
                                        ) ||
                                        (item.brand?.toLowerCase().includes(
                                            componentSearchQuery.toLowerCase()
                                        ))
                                    )
                                    .map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className="component-result-item"
                                            onClick={() => selectComponent(item)}
                                        >
                                            <div className="item-info">
                                                <span className="item-name">{item.name}</span>
                                                {item.brand && (
                                                    <span className="item-brand">{item.brand}</span>
                                                )}
                                            </div>
                                            <div className="item-details">
                                                <span className="item-price">₱{item.price}</span>
                                                <span className={`item-stock ${
                                                    item.stock > 0 ? 'in-stock' : 'out-of-stock'
                                                }`}>
                                                    Stock: {item.stock}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                }
                                {componentSearchResults.length === 0 && (
                                    <div className="no-results">
                                        No {pickerCategory} items found
                                    </div>
                                )}
                                {componentSearchResults.filter(item => 
                                    componentSearchQuery === '' ||
                                    item.name.toLowerCase().includes(
                                        componentSearchQuery.toLowerCase()
                                    ) ||
                                    (item.brand?.toLowerCase().includes(
                                        componentSearchQuery.toLowerCase()
                                    ))
                                ).length === 0 && componentSearchResults.length > 0 && (
                                    <div className="no-results">
                                        No matches found for "{componentSearchQuery}"
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => setShowComponentPicker(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalImage && (
                <div className="image-modal-overlay" role="none" onClick={() => setModalImage(null)} onKeyDown={(e) => { if (e.key === 'Escape') setModalImage(null); }}>
                    <div className="image-modal" role="none" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setModalImage(null)}><FiX /></button>
                        <img src={modalImage} alt="Preview" />
                    </div>
                </div>
            )}

            {/* Stock Quantity Modal */}
            {showStockModal && (
                <div className="modal-overlay">
                    <div className="modal stock-quantity-modal">
                        <div className="modal-header">
                            <h3>Set Stock Quantity</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowStockModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="modal-content">
                            <div className="stock-modal-info">
                                <p className="stock-modal-description">
                                    Enter the quantity to make available for:
                                </p>
                                <div className="current-item-info">
                                    <strong>{currentItem?.name}</strong>
                                </div>
                            </div>

                            <div className="form-group stock-input-group">
                                <label htmlFor="stock-quantity" className="required-label">Quantity *</label>
                                <div className="input-wrapper">
                                    <input
                                        type="number"
                                        id="stock-quantity"
                                        className="stock-quantity-input"
                                        value={stockQuantity}
                                        onChange={(e) => setStockQuantity(e.target.value)}
                                        min="0"
                                        placeholder="Enter quantity..."
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => setShowStockModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="submit-btn confirm-btn"
                                    onClick={handleStockQuantityConfirm}
                                    disabled={!stockQuantity || stockQuantity < 0}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sale Modal */}
            {showSaleModal && saleModalItem && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Put Item on Sale</h3>
                            <button
                                type="button"
                                className="close-btn"
                                onClick={() => {
                                    setShowSaleModal(false);
                                    setSaleModalItem(null);
                                }}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="modal-content">
                            <div className="sale-item-info">
                                <p><strong>Item:</strong> {saleModalItem.name}</p>
                                <p><strong>Original Price:</strong> ₱{Number.parseFloat(saleModalItem.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="sale-price">Sale Price *</label>
                                <input
                                    type="number"
                                    id="sale-price"
                                    value={saleData.salePrice}
                                    onChange={(e) => setSaleData(prev => ({ ...prev, salePrice: e.target.value }))}
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter sale price..."
                                    autoFocus
                                />
                                {saleData.salePrice && saleModalItem.price && (
                                    <small className="discount-info">
                                        Discount: {Math.round((1 - (Number.parseFloat(saleData.salePrice) / Number.parseFloat(saleModalItem.price))) * 100)}%
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="sale-start-date">Sale Start Date (Optional)</label>
                                <input
                                    type="date"
                                    id="sale-start-date"
                                    value={saleData.startDate}
                                    onChange={(e) => setSaleData(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="sale-end-date">Sale End Date (Optional)</label>
                                <input
                                    type="date"
                                    id="sale-end-date"
                                    value={saleData.endDate}
                                    onChange={(e) => setSaleData(prev => ({ ...prev, endDate: e.target.value }))}
                                    min={saleData.startDate || Date.now().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowSaleModal(false);
                                        setSaleModalItem(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="submit-btn sale-btn"
                                    onClick={handleAddToSale}
                                    disabled={isSubmitting || !saleData.salePrice || Number.parseFloat(saleData.salePrice) <= 0}
                                >
                                    {isSubmitting ? 'Adding to Sale...' : 'Put on Sale'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Stock Update Modal */}
            {showBulkStockModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Update Stock for Selected Items</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowBulkStockModal(false);
                                    setBulkStockQuantity('0');
                                }}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="modal-content">
                            <p>Set stock quantity for <strong>{selectedItems.length} selected items</strong>:</p>

                            <div className="form-group">
                                <label htmlFor="bulk-stock-quantity">New Stock Quantity *</label>
                                <input
                                    type="number"
                                    id="bulk-stock-quantity"
                                    value={bulkStockQuantity}
                                    onChange={(e) => setBulkStockQuantity(e.target.value)}
                                    min="0"
                                    placeholder="Enter quantity (0 for out of stock)..."
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowBulkStockModal(false);
                                        setBulkStockQuantity('0');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="submit-btn"
                                    onClick={handleBulkStockConfirm}
                                    disabled={isSubmitting || bulkStockQuantity === '' || Number.isNaN(bulkStockQuantity) || Number.parseInt(bulkStockQuantity, 10) < 0}
                                >
                                    {isSubmitting ? 'Updating...' : 'Update Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockDetail;
