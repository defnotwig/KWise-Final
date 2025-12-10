import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSearch, faFilter } from "@fortawesome/free-solid-svg-icons";

// Import styles
import "./PC-Parts.css";

// Import images
import logo1 from "../assets/LOGO1.webp";
import Vector from "../assets/Vector.webp";
import CPU1 from "../assets/CPU1.webp";
import GPU1 from "../assets/GPU1.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Chest from "../assets/Chest.webp";
import Frame from "../assets/Frame.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import Peripheral from "../assets/Peripheral.webp";

// Import API
import kioskAPI from "../api/kioskAPI";

const PC_Parts_Enhanced = () => {
    const navigate = useNavigate();

    // State management for real-time data with enhancements
    const [categories, setCategories] = useState([]);
    const [selectedItem, setSelectedItem] = useState(0);
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Featured product states with AI integration
    const [randomHotPicks, setRandomHotPicks] = useState([]);
    const [randomValueForMoney, setRandomValueForMoney] = useState([]);
    const [randomOnSale, setRandomOnSale] = useState([]);

    // Enhanced search and filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedBrand, setSelectedBrand] = useState("");
    const [availableBrands, setAvailableBrands] = useState([]);
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");
    const [priceRange, setPriceRange] = useState({ min: "", max: "" });

    // Peripherals subcategory state
    const [selectedPeripheralSubCategory, setSelectedPeripheralSubCategory] = useState(null);
    const [peripheralSubCategories, setPeripheralSubCategories] = useState([]);

    // Cart state for bottom section
    const [cart] = useState([]);
    const [totalPrice] = useState(0);

    // Enhanced category images mapping with peripherals
    const defaultCategoryImages = React.useMemo(() => ({
        home: Vector,
        cpu: CPU1,
        gpu: GPU1,
        motherboard: Motherboard1,
        memory: Ram,
        ram: Ram,
        storage: Storage1,
        case: Chest,
        psu: Frame,
        cooling: CPU1,
        peripherals: Peripheral,
        monitor: Peripheral,
        keyboard: Peripheral,
        mouse: Peripheral,
        headphones: Peripheral,
        speakers: Peripheral,
        webcam: Peripheral
    }), []);

    /**
     * Enhanced format category name for display
     */
    const formatCategoryName = useCallback((category) => {
        const nameMap = {
            cpu: "Central Processing Unit",
            gpu: "Graphics Processing Unit",
            motherboard: "Motherboard",
            memory: "Memory (RAM)",
            ram: "Memory (RAM)",
            storage: "Storage",
            case: "PC Case",
            psu: "Power Supply Unit",
            cooling: "Cooling System",
            peripherals: "Peripherals",
            monitor: "Monitor",
            keyboard: "Keyboard",
            mouse: "Mouse",
            headphones: "Headphones",
            speakers: "Speakers",
            webcam: "Webcam"
        };

        return nameMap[category.toLowerCase()] ||
            category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }, []);

    /**
     * Enhanced format product specifications from JSON to string
     */
    const formatSpecifications = useCallback((specs) => {
        if (!specs || typeof specs !== 'object') {
            return "Specifications not available";
        }

        try {
            const formatted = kioskAPI.formatSpecifications(specs);
            return formatted
                .map(spec => `${spec.label}: ${spec.value}`)
                .join(' | ') || "Specifications not available";
        } catch (error) {
            console.error('Error formatting specifications:', error);
            return "Specifications not available";
        }
    }, []);

    /**
     * Load categories and featured products with AI integration
     */
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);

                // Load categories (now includes peripherals consolidation)
                const categoriesData = await kioskAPI.getCategories();

                // Add "Home" as the first category
                const homeCategory = {
                    category: "home",
                    name: "Home",
                    image: defaultCategoryImages.home,
                    productCount: 0,
                    inStockCount: 0,
                    order: -1
                };

                const categoriesWithHome = [homeCategory, ...categoriesData];

                // Add default images for categories
                const categoriesWithImages = categoriesWithHome.map(cat => ({
                    ...cat,
                    image: cat.image || defaultCategoryImages[cat.category.toLowerCase()] || defaultCategoryImages.home
                }));

                setCategories(categoriesWithImages);

                // Load featured products for home page with AI enhancement
                await loadFeaturedProducts();

            } catch (err) {
                console.error("Failed to load initial data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [defaultCategoryImages]);

    /**
     * Load featured products with AI-powered recommendations
     */
    const loadFeaturedProducts = async () => {
        try {
            // Load all available products for AI analysis
            const featuredResponse = await kioskAPI.getFeaturedProducts();
            const products = featuredResponse || [];

            if (products.length > 0) {
                // Get AI-powered recommendations
                const [hotPicks, valueForMoney] = await Promise.all([
                    kioskAPI.getAIRecommendations(products, 'hotpicks'),
                    kioskAPI.getAIRecommendations(products, 'valueformoney')
                ]);

                // Get on-sale products
                try {
                    const onSaleResponse = await kioskAPI.getOnSaleProducts({ limit: 3 });
                    setRandomOnSale(onSaleResponse.data || []);
                } catch (error) {
                    console.error("Failed to load on-sale products:", error);
                    setRandomOnSale([]);
                }

                // Set AI recommendations, fallback to shuffled products if AI fails
                setRandomHotPicks(hotPicks.length > 0 ? hotPicks : products.slice(0, 3));
                setRandomValueForMoney(valueForMoney.length > 0 ? valueForMoney : products.slice(3, 6));
            }
        } catch (error) {
            console.error("Failed to load featured products:", error);
        }
    };

    /**
     * Enhanced menu item click with peripherals subcategory support
     */
    const handleMenuItemClick = useCallback(async (index) => {
        try {
            setSelectedItem(index);
            setCurrentPage(1);
            setSearchTerm("");
            setSelectedBrand("");
            setSelectedPeripheralSubCategory(null);
            setPriceRange({ min: "", max: "" });

            const selectedCategory = categories[index];
            if (!selectedCategory) return;

            // Skip API call for home category
            if (selectedCategory.category === "home") {
                setCategoryProducts([]);
                setPeripheralSubCategories([]);
                setAvailableBrands([]);
                return;
            }

            // Handle peripherals category specially
            if (selectedCategory.category === "Peripherals" && selectedCategory.subCategories) {
                setPeripheralSubCategories(selectedCategory.subCategories);
                setCategoryProducts([]);

                // Load brands for all peripheral subcategories
                try {
                    const allBrands = new Set();
                    for (const subCat of selectedCategory.subCategories) {
                        const brands = await kioskAPI.getCategoryBrands(subCat.category);
                        brands.forEach(brand => allBrands.add(brand));
                    }
                    setAvailableBrands(Array.from(allBrands).sort());
                } catch (error) {
                    console.error("Failed to load peripheral brands:", error);
                    setAvailableBrands([]);
                }
                return;
            }

            setLoading(true);
            setPeripheralSubCategories([]);

            // Load products for regular category
            const response = await kioskAPI.getCategoryProducts(selectedCategory.category, {
                page: currentPage,
                limit: 20,
                sortBy,
                sortOrder
            });

            setCategoryProducts(response.data || []);

            // Load available brands for this category
            try {
                const brands = await kioskAPI.getCategoryBrands(selectedCategory.category);
                setAvailableBrands(brands);
            } catch (error) {
                console.error("Failed to load category brands:", error);
                setAvailableBrands([]);
            }

        } catch (error) {
            console.error("Failed to load category products:", error);
            setCategoryProducts([]);
        } finally {
            setLoading(false);
        }
    }, [categories, currentPage, sortBy, sortOrder]);

    /**
     * Handle peripheral subcategory selection
     */
    const handlePeripheralSubCategoryClick = useCallback(async (subCategory) => {
        try {
            setSelectedPeripheralSubCategory(subCategory);
            setLoading(true);

            const response = await kioskAPI.getCategoryProducts(subCategory.category, {
                page: currentPage,
                limit: 20,
                sortBy,
                sortOrder,
                brand: selectedBrand || undefined,
                minPrice: priceRange.min || undefined,
                maxPrice: priceRange.max || undefined
            });

            setCategoryProducts(response.data || []);

        } catch (error) {
            console.error("Failed to load peripheral subcategory products:", error);
            setCategoryProducts([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, sortBy, sortOrder, selectedBrand, priceRange]);

    /**
     * Enhanced search functionality
     */
    const handleSearch = useCallback(async (searchValue) => {
        if (!searchValue.trim()) {
            // Reset to current category
            handleMenuItemClick(selectedItem);
            return;
        }

        try {
            setLoading(true);
            const results = await kioskAPI.searchProducts(searchValue, {
                limit: 20,
                category: selectedPeripheralSubCategory?.category || categories[selectedItem]?.category
            });
            setCategoryProducts(results || []);
        } catch (error) {
            console.error("Search failed:", error);
            setCategoryProducts([]);
        } finally {
            setLoading(false);
        }
    }, [selectedItem, selectedPeripheralSubCategory, categories]);

    /**
     * Enhanced filtering and sorting
     */
    const applyFiltersAndSort = useCallback(async () => {
        const currentCategory = selectedPeripheralSubCategory?.category || categories[selectedItem]?.category;
        if (!currentCategory || currentCategory === "home") return;

        try {
            setLoading(true);
            const response = await kioskAPI.getCategoryProducts(currentCategory, {
                page: currentPage,
                limit: 20,
                sortBy,
                sortOrder,
                brand: selectedBrand || undefined,
                minPrice: priceRange.min || undefined,
                maxPrice: priceRange.max || undefined
            });

            setCategoryProducts(response.data || []);
        } catch (error) {
            console.error("Failed to apply filters:", error);
        } finally {
            setLoading(false);
        }
    }, [categories, selectedItem, selectedPeripheralSubCategory, currentPage, sortBy, sortOrder, selectedBrand, priceRange]);

    // Apply filters when they change
    useEffect(() => {
        if (selectedItem > 0) { // Don't apply to home
            applyFiltersAndSort();
        }
    }, [selectedBrand, sortBy, sortOrder, priceRange, applyFiltersAndSort, selectedItem]);

    /**
     * Enhanced product click with sale info
     */
    const handleProductClick = useCallback((product) => {
        const saleInfo = kioskAPI.getSaleInfo(product);

        navigate("/pc-product-details", {
            state: {
                category: selectedPeripheralSubCategory?.category || categories[selectedItem]?.category,
                product: {
                    ...product,
                    saleInfo
                },
                allProducts: categoryProducts
            }
        });
    }, [navigate, selectedPeripheralSubCategory, categories, selectedItem, categoryProducts]);

    /**
     * Filter products for display with enhanced filtering
     */
    const filteredProducts = categoryProducts.filter(product => {
        const matchesSearch = !searchTerm ||
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.brand.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBrand = !selectedBrand || product.brand === selectedBrand;

        const matchesPrice = (!priceRange.min || product.effectivePrice >= parseFloat(priceRange.min)) &&
            (!priceRange.max || product.effectivePrice <= parseFloat(priceRange.max));

        return matchesSearch && matchesBrand && matchesPrice && product.available;
    });

    /**
     * Render product card with enhanced sale info
     */
    const renderProductCard = (product) => {
        const saleInfo = kioskAPI.getSaleInfo(product);
        const effectivePrice = product.effectivePrice || product.price;

        return (
            <div
                key={product.id}
                className="product-card"
                onClick={() => handleProductClick(product)}
            >
                <div className="product-image">
                    <img
                        src={product.imageUrl || defaultCategoryImages.home}
                        alt={product.name}
                        onError={(e) => {
                            e.target.src = defaultCategoryImages.home;
                        }}
                    />
                    {saleInfo && (
                        <div className="sale-badge">
                            -{saleInfo.discountPercent}%
                        </div>
                    )}
                </div>

                <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-brand">{product.brand}</p>

                    <div className="product-price">
                        {saleInfo ? (
                            <>
                                <span className="sale-price">{kioskAPI.formatPrice(effectivePrice)}</span>
                                <span className="original-price">{kioskAPI.formatPrice(product.price)}</span>
                            </>
                        ) : (
                            <span className="regular-price">{kioskAPI.formatPrice(effectivePrice)}</span>
                        )}
                    </div>

                    <div className="product-specs">
                        {formatSpecifications(product.specifications)}
                    </div>

                    <div className="product-stock">
                        <span className={`stock-indicator ${product.stock > 10 ? 'in-stock' : 'low-stock'}`}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render home page content with AI recommendations
     */
    const renderHomeContent = () => (
        <div className="home-content">
            {/* Hot Picks Section with AI */}
            <section className="featured-section">
                <h2 className="section-title">
                    <span className="fire-icon">🔥</span> Hot Picks
                    <span className="ai-badge">AI Powered</span>
                </h2>
                <div className="featured-products">
                    {randomHotPicks.map((product) => renderProductCard(product))}
                </div>
            </section>

            {/* Value for Money Section with AI */}
            <section className="featured-section">
                <h2 className="section-title">
                    <span className="value-icon">💰</span> Value for Money
                    <span className="ai-badge">AI Powered</span>
                </h2>
                <div className="featured-products">
                    {randomValueForMoney.map((product) => renderProductCard(product))}
                </div>
            </section>

            {/* On Sale Section */}
            <section className="featured-section">
                <h2 className="section-title">
                    <span className="sale-icon">🔥</span> On Sale
                </h2>
                <div className="featured-products">
                    {randomOnSale.map((product) => renderProductCard(product))}
                </div>
            </section>
        </div>
    );

    return (
        <div className="pc-parts-container">
            {/* Enhanced Sidebar */}
            <div className="sidebar">
                {/* Back Button */}
                <div className="back-button-container">
                    <button
                        className="back-button"
                        onClick={() => navigate("/")}
                        title="Back to Home"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Back to Main Menu
                    </button>
                </div>

                {/* Logo */}
                <div className="logo1">
                    <img src={logo1} alt="PC Wise Logo" />
                </div>

                {/* Menu with Peripherals Support */}
                <div className="menu">
                    {categories.length > 0 ? categories.map((item, index) => (
                        <div key={`category-${item.category}-${index}`} className="menu-category">
                            <button
                                className={`menu-item ${selectedItem === index ? "active" : "inactive"}`}
                                onClick={() => handleMenuItemClick(index)}
                            >
                                <div className="menu-item-image">
                                    <img src={item.image} alt={item.name} />
                                </div>
                                <div className="menu-item-text">{item.name}</div>
                                {item.subCategories && (
                                    <span className="subcategory-count">({item.subCategories.length})</span>
                                )}
                            </button>

                            {/* Peripheral Subcategories */}
                            {selectedItem === index && item.subCategories && (
                                <div className="peripheral-subcategories">
                                    {item.subCategories.map((subCat) => (
                                        <button
                                            key={subCat.category}
                                            className={`subcategory-item ${selectedPeripheralSubCategory?.category === subCat.category ? "active" : ""
                                                }`}
                                            onClick={() => handlePeripheralSubCategoryClick(subCat)}
                                        >
                                            <span className="subcategory-name">{subCat.name}</span>
                                            <span className="subcategory-count">({subCat.productCount})</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="loading-categories">
                            <p>Loading categories...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Main Content */}
            <div className="main-content">
                {selectedItem === 0 ? (
                    renderHomeContent()
                ) : (
                    <div className="category-content">
                        {/* Enhanced Category Header */}
                        <div className="category-header">
                            <h1 className="category-title">
                                {selectedPeripheralSubCategory
                                    ? selectedPeripheralSubCategory.name
                                    : categories[selectedItem]?.name}
                            </h1>

                            {/* Enhanced Search and Filter Bar */}
                            <div className="search-filter-bar">
                                <div className="search-container">
                                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            handleSearch(e.target.value);
                                        }}
                                        className="search-input"
                                    />
                                </div>

                                <div className="filter-container">
                                    <FontAwesomeIcon icon={faFilter} className="filter-icon" />

                                    <select
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">All Brands</option>
                                        {availableBrands.map(brand => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={`${sortBy}-${sortOrder}`}
                                        onChange={(e) => {
                                            const [newSortBy, newSortOrder] = e.target.value.split('-');
                                            setSortBy(newSortBy);
                                            setSortOrder(newSortOrder);
                                        }}
                                        className="filter-select"
                                    >
                                        <option value="name-asc">Name A-Z</option>
                                        <option value="name-desc">Name Z-A</option>
                                        <option value="price-asc">Price: Low to High</option>
                                        <option value="price-desc">Price: High to Low</option>
                                        <option value="brand-asc">Brand A-Z</option>
                                    </select>

                                    <div className="price-filter">
                                        <input
                                            type="number"
                                            placeholder="Min Price"
                                            value={priceRange.min}
                                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                                            className="price-input"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max Price"
                                            value={priceRange.max}
                                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                                            className="price-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="products-grid">
                            {loading ? (
                                <div className="loading-spinner">Loading products...</div>
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map(product => renderProductCard(product))
                            ) : (
                                <div className="no-products">
                                    <p>No products found matching your criteria.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced Order Summary */}
            <div className="order-summary">
                <div className="summary-content">
                    <h3>Order Summary</h3>
                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <p>No items in cart</p>
                        ) : (
                            cart.map((item, index) => (
                                <div key={index} className="cart-item">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-price">{kioskAPI.formatPrice(item.effectivePrice || item.price)}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="total-section">
                        <div className="total-price">
                            <strong>TOTAL: {kioskAPI.formatPrice(totalPrice)}</strong>
                        </div>

                        <div className="summary-buttons">
                            <button className="summary-btn cancel-btn">Cancel Order</button>
                            <button className="summary-btn start-over-btn">Start Over</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PC_Parts_Enhanced;



