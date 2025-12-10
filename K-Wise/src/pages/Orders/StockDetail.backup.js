/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiUpload, FiImage, FiX, FiSearch, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import './StockDetail.css';
import './StockDetail.admin-scope.css'; // Scoped admin styles (Issue 2)

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
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [brands, setBrands] = useState([]);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'inStock', 'outOfStock'
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('ASC');
    
    // Selected items for bulk actions
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    
    // Action dropdown state
    const [activeDropdown, setActiveDropdown] = useState(null);
    
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
            const isConfirmed = window.confirm(`K-Wise wants to ${message}`);
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
            if (notyf && notyf[type]) {
                notyf[type](message);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (err) {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }, [notyf]);

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
            const response = await fetch('http://localhost:5000/api/stock/brands', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    }, []);

    // Load items using enhanced API with pagination and filters
    const loadItems = useCallback(async (searchTerm = searchQuery) => {
        if (!category || !mountedRef.current) return;

        try {
            setIsLoading(true);
            setError(null);

            console.log('📡 Fetching items for category:', category);
            
            // Build query parameters
            const params = new URLSearchParams({
                category: category,
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                sort: sortBy,
                order: sortOrder
            });

            if (searchTerm && searchTerm.trim()) {
                params.append('q', searchTerm.trim());
            }

            if (selectedBrand) {
                params.append('brand', selectedBrand);
            }

            if (priceRange.min) {
                params.append('minPrice', priceRange.min);
            }

            if (priceRange.max) {
                params.append('maxPrice', priceRange.max);
            }

            if (stockFilter === 'inStock') {
                params.append('inStock', 'true');
            } else if (stockFilter === 'outOfStock') {
                params.append('inStock', 'false');
            }

            // Use the main stock API with pagination
            const response = await fetch(`http://localhost:5000/api/stock?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && mountedRef.current) {
                console.log('✅ Items loaded successfully:', data.data.length);
                setItems(data.data || []);
                
                // Update pagination info
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages);
                    setTotalItems(data.pagination.totalItems);
                    setCurrentPage(data.pagination.currentPage);
                }
            } else {
                throw new Error(data.message || 'Failed to load items');
            }

        } catch (error) {
            console.error('❌ Error loading items:', error);
            if (mountedRef.current) {
                setError('Failed to load items: ' + error.message);
                setItems([]);
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [category, currentPage, itemsPerPage, selectedBrand, priceRange, stockFilter, sortBy, sortOrder]);

    // Handle category changes
    useEffect(() => {
        console.log('📂 StockDetail: Category changed to:', category);
        setItems([]);
        setCurrentPage(1);
        setSearchQuery('');
        setSelectedBrand('');
        setPriceRange({ min: '', max: '' });
        setStockFilter('all');
        setSelectedItems([]);
        setSelectAll(false);
    }, [category]);

    // Load data when component mounts or filters change
    useEffect(() => {
        if (category) {
            loadItems();
            loadBrands();
        }
    }, [category, loadItems, loadBrands]);

    // Debounced search effect to prevent cursor jumping
    useEffect(() => {
        if (!category) return;
        
        const debounceTimer = setTimeout(() => {
            console.log('🔍 Debounced search triggered for:', searchQuery);
            setCurrentPage(1); // Reset to first page when actually searching
            loadItems(searchQuery);
        }, 300); // 300ms debounce

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, category]); // Only depend on searchQuery and category

    // Pagination handlers
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleItemsPerPageChange = (newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1); // Reset to first page
    };

    // Search and filter handlers
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        // Don't reset page immediately to avoid triggering re-renders
        // The debounced search will reset the page when it actually searches
    };

    const handleBrandChange = (e) => {
        setSelectedBrand(e.target.value);
        setCurrentPage(1);
    };

    const handlePriceRangeChange = (field, value) => {
        setPriceRange(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleStockFilterChange = (e) => {
        setStockFilter(e.target.value);
        setCurrentPage(1);
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
        if (!confirmed) {
            return;
        }

        try {
            setIsSubmitting(true);
            console.log('🗑️ Bulk deleting items:', selectedItems);

            // Check if we have a valid token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            // Delete each selected item
            const deletePromises = selectedItems.map(itemId => 
                fetch(`http://localhost:5000/api/stock/${itemId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            );

            const responses = await Promise.all(deletePromises);
            
            // Check for authentication failures
            const authFailures = responses.filter(response => response.status === 401);
            if (authFailures.length > 0) {
                localStorage.removeItem('token');
                throw new Error('Authentication failed. Please log in again.');
            }

            // Check if all deletions were successful
            const failedDeletions = responses.filter(response => !response.ok);
            
            if (failedDeletions.length === 0) {
                showNotification('success', `Successfully deleted ${selectedItems.length} items!`);
                setSelectedItems([]);
                setSelectAll(false);
                await loadItems();
            } else {
                console.log('Failed responses:', failedDeletions.map(r => ({ status: r.status, statusText: r.statusText })));
                showNotification('error', `Failed to delete ${failedDeletions.length} items`);
            }

        } catch (error) {
            console.error('❌ Error in bulk delete:', error);
            
            if (error.message.includes('log in again')) {
                showNotification('error', 'Your session has expired. Please refresh the page and log in again.');
            } else {
                showNotification('error', 'Failed to delete items: ' + error.message);
            }
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
        const parsedStock = parseInt(bulkStockQuantity);
        if (isNaN(parsedStock) || parsedStock < 0) {
            showNotification('error', 'Please enter a valid stock quantity (0 or greater)');
            return;
        }

        try {
            setIsSubmitting(true);
            console.log('📦 Bulk updating stock for items:', selectedItems, 'to quantity:', parsedStock);

            // Get selected items data to update
            const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
            
            // Update each selected item's stock using PATCH
            const updatePromises = selectedItemsData.map(item => 
                fetch(`http://localhost:5000/api/stock/${item.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        stock: parsedStock
                    })
                })
            );

            const responses = await Promise.all(updatePromises);
            
            // Check if all updates were successful
            const failedUpdates = responses.filter(response => !response.ok);
            
            if (failedUpdates.length === 0) {
                showNotification('success', `Successfully updated stock for ${selectedItems.length} items!`);
                setSelectedItems([]);
                setSelectAll(false);
                setShowBulkStockModal(false);
                setBulkStockQuantity('0');
                await loadItems();
            } else {
                showNotification('error', `Failed to update ${failedUpdates.length} items`);
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
    const handleSeparateImageUpload = async (file, item) => {
        try {
            if (!file || !item) return;
            if (!file.type.startsWith('image/')) return showNotification('error', 'Invalid image file');
            if (file.size > 5 * 1024 * 1024) return showNotification('error', 'File too large (max 5MB)');
            const fd = new FormData();
            fd.append('image', file);
            const endpoint = `http://localhost:5000/api/images/${encodeURIComponent(category)}/${item.id}`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
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
        setFormData({
            name: '',
            brand: '',
            price: '',
            stock: '',
            description: '',
            imageFile: null
        });
        
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };

    // Handle add item
    const handleAddItem = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);

            // Validate required fields
            if (!formData.name.trim() || !formData.price) {
                showNotification('error', 'Please fill in required fields (name and price)');
                return;
            }

            console.log('➕ Adding new item:', formData.name);

            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('category', category);
            submitData.append('brand', formData.brand.trim() || '');
            submitData.append('price', parseFloat(formData.price) || 0);
            submitData.append('stock', parseInt(formData.stock) || 0);
            submitData.append('description', formData.description.trim() || '');
            
            // Add image file if selected
            if (formData.imageFile) {
                submitData.append('image', formData.imageFile);
                console.log('📸 Including image file:', formData.imageFile.name);
            }

            const response = await fetch('http://localhost:5000/api/stock', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                    // Note: Don't set Content-Type for FormData - browser will set it with boundary
                },
                body: submitData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ Item added successfully:', data.data);
                
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

            console.log('✏️ Starting edit process for item:', currentItem.id);
            console.log('📝 Form data before submission:', formData);

            // Create FormData for file upload (matching backend expectations)
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('category', category);
            submitData.append('brand', formData.brand.trim() || '');
            submitData.append('price', parseFloat(formData.price) || 0);
            // Fix: Backend expects 'stock', not 'stock_quantity'
            submitData.append('stock', parseInt(formData.stock) || 0);
            submitData.append('description', formData.description.trim() || '');
            
            // Add image file if new one is selected (multer will handle this as req.file)
            if (formData.imageFile) {
                submitData.append('image', formData.imageFile);
                console.log('📸 Including image file:', formData.imageFile.name);
            }

            // Debug: Log all FormData entries
            console.log('📦 FormData contents:');
            for (let [key, value] of submitData.entries()) {
                console.log(`  ${key}:`, value);
            }

            console.log('🌐 Making API call to:', `http://localhost:5000/api/stock/${currentItem.id}`);
            
            const response = await fetch(`http://localhost:5000/api/stock/${currentItem.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                    // Note: Don't set Content-Type for FormData - browser will set it with boundary
                },
                body: submitData
            });

            console.log('📡 Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                console.error('❌ Error response:', errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Update response:', data);

            if (data.success) {
                console.log('✅ Item updated successfully:', data.data);
                
                // Force refresh items list and clear cache
                console.log('🔄 Refreshing items list...');
                setItems([]); // Clear current items to force reload
                await loadItems();
                
                // Small delay to ensure backend cache is cleared
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Second refresh to ensure we get the latest data
                await loadItems();
                
                // Reset form and close modal
                resetForm();
                setShowEditModal(false);
                setCurrentItem(null);
                
                showNotification('success', 'Item updated successfully!');
            } else {
                throw new Error(data.message || 'Failed to update item');
            }

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
        if (!confirmed) {
            return;
        }

        try {
            console.log('🗑️ Deleting item:', item.id);

            // Check if we have a valid token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            const response = await fetch(`http://localhost:5000/api/stock/${item.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Delete response status: ${response.status}`);

            if (response.status === 401) {
                // Authentication failed - token might be expired
                localStorage.removeItem('token');
                throw new Error('Authentication failed. Please log in again.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ Item deleted successfully');
                
                // Refresh items list
                await loadItems();
                
                showNotification('success', 'Item deleted successfully!');
            } else {
                throw new Error(data.message || 'Failed to delete item');
            }

        } catch (error) {
            console.error('❌ Error deleting item:', error);
            
            if (error.message.includes('log in again')) {
                showNotification('error', 'Your session has expired. Please refresh the page and log in again.');
            } else {
                showNotification('error', 'Failed to delete item: ' + error.message);
            }
        }
    };

    // Handle make out of stock
    const handleMakeOutOfStock = async (item) => {
        // Validate that item has stock
        if (item.stock <= 0) {
            showNotification('warning', 'This item is already out of stock');
            return;
        }

        const confirmed = await showConfirmation(`mark "${item.name}" as out of stock? This will set stock to 0.`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/stock/${item.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    stock: 0
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update stock');
            }

            const data = await response.json();
            if (data.success) {
                showNotification('success', `"${item.name}" marked as out of stock!`);
                await loadItems();
            } else {
                throw new Error(data.message || 'Failed to update stock');
            }
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

    // Handle stock quantity confirmation
    const handleStockQuantityConfirm = async () => {
        if (!stockQuantity || isNaN(stockQuantity) || parseInt(stockQuantity) <= 0) {
            showNotification('warning', 'Please enter a valid quantity greater than 0');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/stock/${stockModalItem.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    stock: parseInt(stockQuantity)
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

    // Open edit modal with item data
    const openEditModal = (item) => {
        setCurrentItem(item);
        setFormData({
            name: item.name || '',
            brand: item.brand || '',
            price: item.price || '',
            stock: item.stock || '',
            description: item.description || '',
            imageFile: null // Always start with no file selected for editing
        });
        setImagePreview(null); // Clear preview for editing
        setShowEditModal(true);
    };

    // Format currency
    const formatCurrency = (amount) => {
        const safeAmount = Number(amount) || 0;
        return `₱${safeAmount.toLocaleString()}`;
    };

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
                <button 
                    className="add-btn"
                    onClick={() => setShowAddModal(true)}
                >
                    <FiPlus /> Add New {category}
                </button>
            </div>

            {/* Search and Filters */}
            <div className="stock-filters">
                <div className="search-section">
                    <div className="search-input">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <select 
                        value={itemsPerPage} 
                        onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
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
                            className="add-btn"
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
                                    {sortBy === 'name' && (
                                        <span className={`sort-arrow ${sortOrder.toLowerCase()}`}>
                                            {sortOrder === 'ASC' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </th>
                                <th 
                                    className="sortable-column"
                                    onClick={() => handleSort('category')}
                                >
                                    Category
                                    {sortBy === 'category' && (
                                        <span className={`sort-arrow ${sortOrder.toLowerCase()}`}>
                                            {sortOrder === 'ASC' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </th>
                                <th 
                                    className="sortable-column"
                                    onClick={() => handleSort('stock')}
                                >
                                    Stock
                                    {sortBy === 'stock' && (
                                        <span className={`sort-arrow ${sortOrder.toLowerCase()}`}>
                                            {sortOrder === 'ASC' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </th>
                                <th>Sold</th>
                                <th 
                                    className="sortable-column"
                                    onClick={() => handleSort('price')}
                                >
                                    Price
                                    {sortBy === 'price' && (
                                        <span className={`sort-arrow ${sortOrder.toLowerCase()}`}>
                                            {sortOrder === 'ASC' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
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
                                                    <img
                                                        src={`http://localhost:5000${item.image_url || item.file_path}`}
                                                        alt={item.name}
                                                        onClick={() => setModalImage(`http://localhost:5000${item.image_url || item.file_path}`)}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            const placeholder = e.target.nextSibling;
                                                            if (placeholder) placeholder.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="image-placeholder-small">
                                                        <FiImage />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="product-details">
                                                <span className="product-name">{item.name}</span>
                                                {item.brand && <span className="product-brand">{item.brand}</span>}
                                            </div>
                                        </div>
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
                                        <span className={`status-badge ${item.stock > 0 ? 'published' : 'out-of-stock'}`}>
                                            {item.stock > 0 ? 'Published' : 'Out of Stock'}
                                        </span>
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
                                                <button onClick={() => {
                                                    openEditModal(item);
                                                    setActiveDropdown(null);
                                                }}>
                                                    <FiEdit /> Edit Stock
                                                </button>
                                                {/* Make Stock Out - Only available when stock > 0 */}
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
                                                {/* Make Available - Only available when stock = 0 */}
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
                            ))}
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
                            onClick={() => handlePageChange(1)}
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
            {showAddModal && (
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
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="name">Name *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="brand">Brand</label>
                                    <input
                                        type="text"
                                        id="brand"
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleInputChange}
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

                            {/* Phase 2: File Upload Section */}
                            <div className="form-group">
                                <label htmlFor="image">Product Image</label>
                                <div className="file-upload-section">
                                    <input
                                        type="file"
                                        id="image"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    
                                    {!formData.imageFile ? (
                                        <label htmlFor="image" className="file-upload-btn">
                                            <FiUpload /> Choose Image File
                                        </label>
                                    ) : (
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
                                    )}
                                    
                                    <p className="file-help">
                                        Upload image files only (JPEG, PNG, WebP). Max size: 5MB.
                                    </p>
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
            )}

            {/* Edit Modal */}
            {showEditModal && currentItem && (
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
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="edit-name">Name *</label>
                                    <input
                                        type="text"
                                        id="edit-name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-brand">Brand</label>
                                    <input
                                        type="text"
                                        id="edit-brand"
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleInputChange}
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

                            {/* Current Image Display */}
                            {currentItem.image_url && (
                                <div className="form-group">
                                    <label>Current Image</label>
                                    <div className="current-image">
                                        <img 
                                            src={`http://localhost:5000${currentItem.image_url}`} 
                                            alt={currentItem.name}
                                            style={{ maxWidth: '200px', maxHeight: '150px' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Phase 2: File Upload for Update */}
                            <div className="form-group">
                                <label htmlFor="edit-image">Update Image (Optional)</label>
                                <div className="file-upload-section">
                                    <input
                                        type="file"
                                        id="edit-image"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    
                                    {!formData.imageFile ? (
                                        <label htmlFor="edit-image" className="file-upload-btn">
                                            <FiUpload /> Choose New Image
                                        </label>
                                    ) : (
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
                                    )}
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
            )}
            {modalImage && (
                <div className="image-modal-overlay" onClick={() => setModalImage(null)}>
                    <div className="image-modal" onClick={(e)=> e.stopPropagation()}>
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
                                    disabled={isSubmitting || bulkStockQuantity === '' || isNaN(bulkStockQuantity) || parseInt(bulkStockQuantity) < 0}
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
