/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiUpload, FiImage, FiX, FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiSettings } from 'react-icons/fi';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import './StockDetail.css';
import './StockDetail.admin-scope.css'; // Scoped admin styles (Issue 2)

/**
 * Enhanced Stock Detail Component with Dynamic Specifications
 * 
 * This component provides a comprehensive interface for stock management
 * with category-specific specifications and real-time database connectivity.
 */

const StockDetailEnhanced = () => {
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
    
    // Enhanced form data with specifications
    const [formData, setFormData] = useState({
        name: '',
        category: category || '',
        brand: '',
        price: '',
        stock: '',
        description: '',
        imageFile: null,
        specifications: {}
    });

    // Specifications state
    const [specificationFields, setSpecificationFields] = useState([]);
    const [showSpecifications, setShowSpecifications] = useState(true);

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
            }
        ]
    }));

    // Fetch specification fields when category changes
    const fetchSpecificationFields = async (categoryName) => {
        try {
            const response = await fetch(`/api/stock/meta/${categoryName}`);
            const data = await response.json();
            
            if (data.success) {
                setSpecificationFields(data.data);
                // Initialize specification form data
                const initialSpecs = {};
                data.data.forEach(field => {
                    initialSpecs[field.name] = field.type === 'checkbox' ? false : '';
                });
                setFormData(prev => ({
                    ...prev,
                    specifications: initialSpecs
                }));
            }
        } catch (error) {
            console.error('Error fetching specification fields:', error);
        }
    };

    // Enhanced fetch items with specifications
    const fetchItems = useCallback(async () => {
        if (!mountedRef.current) return;

        try {
            setIsLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                sort: sortBy,
                order: sortOrder,
                includeSpecs: 'true'
            });

            if (category) params.append('category', category);
            if (searchQuery) params.append('q', searchQuery);
            if (selectedBrand) params.append('brand', selectedBrand);
            if (priceRange.min) params.append('minPrice', priceRange.min);
            if (priceRange.max) params.append('maxPrice', priceRange.max);
            if (stockFilter !== 'all') {
                params.append('inStock', stockFilter === 'inStock' ? 'true' : 'false');
            }

            const response = await fetch(`/api/stock?${params}`);
            const data = await response.json();

            if (!mountedRef.current) return;

            if (data.success) {
                setItems(data.data);
                setTotalPages(data.pagination.totalPages);
                setTotalItems(data.pagination.totalItems);
            } else {
                throw new Error(data.message || 'Failed to fetch items');
            }
        } catch (error) {
            if (mountedRef.current) {
                console.error('Error fetching items:', error);
                setError('Failed to load inventory items');
                notyf.current.error('Failed to load inventory items');
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [category, currentPage, itemsPerPage, sortBy, sortOrder, searchQuery, selectedBrand, priceRange, stockFilter]);

    // Fetch brands
    const fetchBrands = useCallback(async () => {
        try {
            const response = await fetch('/api/stock/brands');
            const data = await response.json();
            if (data.success) {
                setBrands(data.data);
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
        }
    }, []);

    // Load data on mount and when dependencies change
    useEffect(() => {
        mountedRef.current = true;
        fetchItems();
        fetchBrands();
        
        if (category) {
            fetchSpecificationFields(category);
        }

        return () => {
            mountedRef.current = false;
        };
    }, [fetchItems, fetchBrands, category]);

    // Enhanced form handlers
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.startsWith('spec_')) {
            // Handle specification fields
            const specName = name.replace('spec_', '');
            setFormData(prev => ({
                ...prev,
                specifications: {
                    ...prev.specifications,
                    [specName]: type === 'checkbox' ? checked : value
                }
            }));
        } else if (name === 'category') {
            // Handle category change - fetch new specification fields
            setFormData(prev => ({
                ...prev,
                [name]: value,
                specifications: {} // Reset specifications when category changes
            }));
            
            if (value) {
                fetchSpecificationFields(value);
            } else {
                setSpecificationFields([]);
            }
        } else {
            // Handle regular form fields
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                imageFile: file
            }));

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Reset form data
    const resetForm = () => {
        setFormData({
            name: '',
            category: category || '',
            brand: '',
            price: '',
            stock: '',
            description: '',
            imageFile: null,
            specifications: {}
        });
        setImagePreview(null);
        
        // Reset specifications based on current category
        if (category) {
            const initialSpecs = {};
            specificationFields.forEach(field => {
                initialSpecs[field.name] = field.type === 'checkbox' ? false : '';
            });
            setFormData(prev => ({
                ...prev,
                specifications: initialSpecs
            }));
        }
    };

    // Enhanced add item handler with specifications
    const handleAddItem = async () => {
        try {
            if (!formData.name.trim() || !formData.price) {
                notyf.current.error('Name and price are required');
                return;
            }

            setIsSubmitting(true);
            console.log('➕ Adding new item with specifications:', formData.name);

            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('category', formData.category || category || '');
            submitData.append('brand', formData.brand.trim() || '');
            submitData.append('price', parseFloat(formData.price) || 0);
            submitData.append('stock', parseInt(formData.stock) || 0);
            submitData.append('description', formData.description.trim() || '');
            
            // Add specifications
            if (Object.keys(formData.specifications).length > 0) {
                submitData.append('specifications', JSON.stringify(formData.specifications));
            }

            // Add image if provided
            if (formData.imageFile) {
                submitData.append('image', formData.imageFile);
            }

            const response = await fetch('/api/stock', {
                method: 'POST',
                body: submitData
            });

            const data = await response.json();

            if (data.success) {
                notyf.current.success('Item added successfully with specifications!');
                setShowAddModal(false);
                resetForm();
                fetchItems(); // Refresh the list
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error adding item:', error);
            notyf.current.error(error.message || 'Failed to add item');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enhanced edit item handler with specifications
    const handleEditItem = async () => {
        try {
            if (!formData.name.trim() || !formData.price) {
                notyf.current.error('Name and price are required');
                return;
            }

            setIsSubmitting(true);
            console.log('✏️ Updating item with specifications:', formData.name);

            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('category', formData.category || '');
            submitData.append('brand', formData.brand.trim() || '');
            submitData.append('price', parseFloat(formData.price) || 0);
            submitData.append('stock', parseInt(formData.stock) || 0);
            submitData.append('description', formData.description.trim() || '');
            
            // Add specifications
            if (Object.keys(formData.specifications).length > 0) {
                submitData.append('specifications', JSON.stringify(formData.specifications));
            }

            // Add image if provided
            if (formData.imageFile) {
                submitData.append('image', formData.imageFile);
            }

            const response = await fetch(`/api/stock/${currentItem.id}`, {
                method: 'PATCH',
                body: submitData
            });

            const data = await response.json();

            if (data.success) {
                notyf.current.success('Item updated successfully with specifications!');
                setShowEditModal(false);
                setCurrentItem(null);
                resetForm();
                fetchItems(); // Refresh the list
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error updating item:', error);
            notyf.current.error(error.message || 'Failed to update item');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open edit modal with specifications
    const openEditModal = async (item) => {
        try {
            // Fetch detailed item data with specifications
            const response = await fetch(`/api/stock/${item.id}`);
            const data = await response.json();
            
            if (data.success) {
                const itemWithSpecs = data.data;
                setCurrentItem(itemWithSpecs);
                
                // Populate form with item data
                setFormData({
                    name: itemWithSpecs.name || '',
                    category: itemWithSpecs.category || '',
                    brand: itemWithSpecs.brand || '',
                    price: itemWithSpecs.price || '',
                    stock: itemWithSpecs.stock || '',
                    description: itemWithSpecs.description || '',
                    imageFile: null,
                    specifications: itemWithSpecs.specifications || {}
                });
                
                // Load specification fields for the category
                if (itemWithSpecs.category) {
                    await fetchSpecificationFields(itemWithSpecs.category);
                }
                
                setShowEditModal(true);
            }
        } catch (error) {
            console.error('Error loading item for edit:', error);
            notyf.current.error('Failed to load item details');
        }
    };

    // Delete item handler
    const handleDeleteItem = async (item) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/stock/${item.id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                notyf.current.success('Item permanently deleted');
                fetchItems(); // Refresh the list
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            notyf.current.error(error.message || 'Failed to delete item');
        }
    };

    // Render specification fields dynamically
    const renderSpecificationFields = () => {
        if (!showSpecifications || specificationFields.length === 0) return null;

        return (
            <div className="specification-section">
                <div className="section-header">
                    <h4>
                        <FiSettings className="section-icon" />
                        Specifications
                    </h4>
                    <button
                        type="button"
                        className="toggle-specs-btn"
                        onClick={() => setShowSpecifications(!showSpecifications)}
                    >
                        {showSpecifications ? 'Hide' : 'Show'}
                    </button>
                </div>
                
                <div className="specs-grid">
                    {specificationFields.map(field => (
                        <div key={field.name} className="form-group">
                            <label htmlFor={`spec_${field.name}`}>
                                {field.label}
                                {field.required && <span className="required">*</span>}
                            </label>
                            
                            {field.type === 'checkbox' ? (
                                <div className="checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        id={`spec_${field.name}`}
                                        name={`spec_${field.name}`}
                                        checked={formData.specifications[field.name] || false}
                                        onChange={handleInputChange}
                                    />
                                    <span className="checkmark"></span>
                                </div>
                            ) : (
                                <input
                                    type={field.type}
                                    id={`spec_${field.name}`}
                                    name={`spec_${field.name}`}
                                    value={formData.specifications[field.name] || ''}
                                    onChange={handleInputChange}
                                    step={field.step}
                                    required={field.required}
                                    placeholder={`Enter ${field.label.toLowerCase()}`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Categories for the select dropdown
    const categories = [
        'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 
        'Cooling', 'Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam'
    ];

    if (isLoading && items.length === 0) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading inventory items...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p className="error-message">{error}</p>
                <button onClick={fetchItems} className="retry-btn">Retry</button>
            </div>
        );
    }

    return (
        <div className="stock-detail-container">
            {/* Header */}
            <div className="stock-header">
                <div className="header-left">
                    <h1>{category ? `${category} Inventory` : 'Stock Management'}</h1>
                    <p className="item-count">{totalItems} items total</p>
                </div>
                <div className="header-right">
                    <button 
                        className="add-btn primary"
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                    >
                        <FiPlus /> Add Item
                    </button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="filters-container">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="filter-group">
                    <select 
                        value={selectedBrand} 
                        onChange={(e) => setSelectedBrand(e.target.value)}
                    >
                        <option value="">All Brands</option>
                        {brands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={stockFilter} 
                        onChange={(e) => setStockFilter(e.target.value)}
                    >
                        <option value="all">All Stock</option>
                        <option value="inStock">In Stock</option>
                        <option value="outOfStock">Out of Stock</option>
                    </select>
                </div>
            </div>

            {/* Items Table */}
            <div className="table-container">
                <table className="stock-table">
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={(e) => {
                                        setSelectAll(e.target.checked);
                                        setSelectedItems(e.target.checked ? items.map(item => item.id) : []);
                                    }}
                                />
                            </th>
                            <th>Image</th>
                            <th 
                                className="sortable"
                                onClick={() => {
                                    setSortBy('name');
                                    setSortOrder(sortBy === 'name' && sortOrder === 'ASC' ? 'DESC' : 'ASC');
                                }}
                            >
                                Name
                            </th>
                            <th>Category</th>
                            <th>Brand</th>
                            <th 
                                className="sortable"
                                onClick={() => {
                                    setSortBy('price');
                                    setSortOrder(sortBy === 'price' && sortOrder === 'ASC' ? 'DESC' : 'ASC');
                                }}
                            >
                                Price
                            </th>
                            <th 
                                className="sortable"
                                onClick={() => {
                                    setSortBy('stock');
                                    setSortOrder(sortBy === 'stock' && sortOrder === 'ASC' ? 'DESC' : 'ASC');
                                }}
                            >
                                Stock
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className={item.stock === 0 ? 'out-of-stock' : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.includes(item.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedItems([...selectedItems, item.id]);
                                            } else {
                                                setSelectedItems(selectedItems.filter(id => id !== item.id));
                                            }
                                        }}
                                    />
                                </td>
                                <td>
                                    <div className="item-image">
                                        {item.image_url ? (
                                            <img 
                                                src={item.image_url} 
                                                alt={item.name}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="no-image">
                                                <FiImage />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="item-name">{item.name}</td>
                                <td>{item.category}</td>
                                <td>{item.brand}</td>
                                <td className="price">₱{parseFloat(item.price).toFixed(2)}</td>
                                <td className={`stock ${item.stock <= 10 ? 'low-stock' : ''}`}>
                                    {item.stock}
                                    {item.stock <= 10 && item.stock > 0 && (
                                        <span className="low-stock-badge">Low</span>
                                    )}
                                    {item.stock === 0 && (
                                        <span className="out-of-stock-badge">Out</span>
                                    )}
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="edit-btn"
                                            onClick={() => openEditModal(item)}
                                            title="Edit item"
                                        >
                                            <FiEdit />
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeleteItem(item)}
                                            title="Delete item"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
                <div className="pagination-info">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </div>
                <div className="pagination-controls">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        <FiChevronLeft />
                    </button>
                    
                    <span className="page-numbers">
                        Page {currentPage} of {totalPages}
                    </span>
                    
                    <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        <FiChevronRight />
                    </button>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Item</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAddModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <form onSubmit={(e) => e.preventDefault()}>
                                {/* Basic Information */}
                                <div className="form-section">
                                    <h4>Basic Information</h4>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="name">
                                                Name <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Enter item name"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="category">
                                                Category <span className="required">*</span>
                                            </label>
                                            <select
                                                id="category"
                                                name="category"
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="brand">Brand</label>
                                            <input
                                                type="text"
                                                id="brand"
                                                name="brand"
                                                value={formData.brand}
                                                onChange={handleInputChange}
                                                placeholder="Enter brand name"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="price">
                                                Price <span className="required">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                id="price"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                required
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="stock">Stock Quantity</label>
                                            <input
                                                type="number"
                                                id="stock"
                                                name="stock"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                                min="0"
                                                placeholder="0"
                                            />
                                        </div>
                                        
                                        <div className="form-group full-width">
                                            <label htmlFor="description">Description</label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Enter item description"
                                            />
                                        </div>
                                        
                                        <div className="form-group full-width">
                                            <label htmlFor="image">Image</label>
                                            <input
                                                type="file"
                                                id="image"
                                                name="image"
                                                onChange={handleImageChange}
                                                accept="image/*"
                                            />
                                            {imagePreview && (
                                                <div className="image-preview">
                                                    <img src={imagePreview} alt="Preview" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Dynamic Specifications */}
                                {renderSpecificationFields()}
                            </form>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                type="button"
                                className="cancel-btn"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                className="submit-btn primary"
                                onClick={handleAddItem}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Adding...' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && currentItem && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Item</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowEditModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <form onSubmit={(e) => e.preventDefault()}>
                                {/* Basic Information */}
                                <div className="form-section">
                                    <h4>Basic Information</h4>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="edit-name">
                                                Name <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="edit-name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Enter item name"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="edit-category">
                                                Category <span className="required">*</span>
                                            </label>
                                            <select
                                                id="edit-category"
                                                name="category"
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="edit-brand">Brand</label>
                                            <input
                                                type="text"
                                                id="edit-brand"
                                                name="brand"
                                                value={formData.brand}
                                                onChange={handleInputChange}
                                                placeholder="Enter brand name"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="edit-price">
                                                Price <span className="required">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                id="edit-price"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                required
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="edit-stock">Stock Quantity</label>
                                            <input
                                                type="number"
                                                id="edit-stock"
                                                name="stock"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                                min="0"
                                                placeholder="0"
                                            />
                                        </div>
                                        
                                        <div className="form-group full-width">
                                            <label htmlFor="edit-description">Description</label>
                                            <textarea
                                                id="edit-description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Enter item description"
                                            />
                                        </div>
                                        
                                        <div className="form-group full-width">
                                            <label htmlFor="edit-image">Image</label>
                                            <input
                                                type="file"
                                                id="edit-image"
                                                name="image"
                                                onChange={handleImageChange}
                                                accept="image/*"
                                            />
                                            {imagePreview && (
                                                <div className="image-preview">
                                                    <img src={imagePreview} alt="Preview" />
                                                </div>
                                            )}
                                            {!imagePreview && currentItem.image_url && (
                                                <div className="current-image">
                                                    <p>Current image:</p>
                                                    <img src={currentItem.image_url} alt="Current" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Dynamic Specifications */}
                                {renderSpecificationFields()}
                            </form>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                type="button"
                                className="cancel-btn"
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                className="submit-btn primary"
                                onClick={handleEditItem}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Updating...' : 'Update Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockDetailEnhanced;