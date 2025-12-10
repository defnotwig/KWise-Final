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

// Import working API
import kioskAPI from "../api/kioskAPI-working";

const PC_Parts_Fixed = () => {
    const navigate = useNavigate();

    // State management for real-time data
    const [categories, setCategories] = useState([]);
    const [selectedItem, setSelectedItem] = useState(0);
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Featured product states
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

    // Peripherals subcategory state
    const [selectedPeripheralSubCategory, setSelectedPeripheralSubCategory] = useState(null);
    const [peripheralSubCategories, setPeripheralSubCategories] = useState([]);

    // Cart state
    const [cart] = useState([]);
    const [totalPrice] = useState(0);

    // Default category images mapping
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
        peripherals: Vector,
        monitor: Vector,
        keyboard: Vector,
        mouse: Vector,
        headphones: Vector,
        speakers: Vector,
        webcam: Vector
    }), []);

    /**
     * Format category name for display
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
     * Load categories and featured products on component mount
     */
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                console.log('🔍 Loading initial kiosk data...');

                // Add "Home" as the first category
                const homeCategory = {
                    category: "home",
                    name: "Home",
                    image: defaultCategoryImages.home,
                    productCount: 0,
                    inStockCount: 0,
                    order: -1
                };

                // Load categories from API
                const categoriesData = await kioskAPI.getCategories();
                console.log('📊 Categories loaded:', categoriesData);

                // Add default images for categories
                const categoriesWithImages = categoriesData.map(cat => ({
                    ...cat,
                    image: cat.image || defaultCategoryImages[cat.category?.toLowerCase()] || defaultCategoryImages.home
                }));

                const allCategories = [homeCategory, ...categoriesWithImages];
                setCategories(allCategories);

                // Load featured products
                await loadFeaturedProducts();
                console.log('✅ Initial data loading complete');

            } catch (err) {
                console.error("❌ Failed to load initial data:", err);

                // Set fallback categories if API fails
                const fallbackCategories = [
                    { category: "home", name: "Home", image: defaultCategoryImages.home, productCount: 0, inStockCount: 0, order: -1 },
                    { category: "cpu", name: "Central Processing Unit", image: defaultCategoryImages.cpu, productCount: 0, inStockCount: 0, order: 10 },
                    { category: "gpu", name: "Graphics Processing Unit", image: defaultCategoryImages.gpu, productCount: 0, inStockCount: 0, order: 50 },
                    { category: "motherboard", name: "Motherboard", image: defaultCategoryImages.motherboard, productCount: 0, inStockCount: 0, order: 20 },
                    { category: "ram", name: "Memory (RAM)", image: defaultCategoryImages.ram, productCount: 0, inStockCount: 0, order: 30 },
                    { category: "storage", name: "Storage", image: defaultCategoryImages.storage, productCount: 0, inStockCount: 0, order: 40 }
                ];
                setCategories(fallbackCategories);

            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [defaultCategoryImages]);

    /**
     * Load featured products for home page sections
     */
    const loadFeaturedProducts = async () => {
        try {
            console.log('🔍 Loading featured products...');
            const featuredData = await kioskAPI.getFeaturedProducts();
            console.log('📊 Featured products loaded:', featuredData);

            if (featuredData && featuredData.length > 0) {
                // Try AI recommendations with fallback
                try {
                    const [hotPicks, valueForMoney] = await Promise.all([
                        kioskAPI.getAIRecommendations(featuredData, 'hotpicks').catch(() => []),
                        kioskAPI.getAIRecommendations(featuredData, 'valueformoney').catch(() => [])
                    ]);

                    // Set recommendations or fallback to simple distribution
                    setRandomHotPicks(hotPicks.length > 0 ? hotPicks : featuredData.slice(0, 3));
                    setRandomValueForMoney(valueForMoney.length > 0 ? valueForMoney : featuredData.slice(3, 6));

                    console.log('🤖 AI recommendations set');
                } catch (aiError) {
                    console.warn("⚠️ AI recommendations failed, using fallback:", aiError);
                    setRandomHotPicks(featuredData.slice(0, 3));
                    setRandomValueForMoney(featuredData.slice(3, 6));
                }

                // Get on-sale products
                try {
                    const onSaleResponse = await kioskAPI.getOnSaleProducts({ limit: 3 });
                    setRandomOnSale(onSaleResponse.data || []);
                    console.log('💰 On-sale products loaded');
                } catch (error) {
                    console.error("❌ Failed to load on-sale products:", error);
                    setRandomOnSale(featuredData.slice(6, 9));
                }
            }
        } catch (error) {
            console.error("❌ Failed to load featured products:", error);
        }
    };

    /**
     * Handle menu item click with peripherals support
     */
    const handleMenuItemClick = useCallback(async (index) => {
        try {
            console.log('🔍 Category selected:', index);
            setSelectedItem(index);
            setCurrentPage(1);
            setSearchTerm("");
            setSelectedBrand("");
            setSelectedPeripheralSubCategory(null);

            const selectedCategory = categories[index];
            if (!selectedCategory) return;

            console.log('📂 Selected category:', selectedCategory);

            // Skip API call for home category
            if (selectedCategory.category === "home") {
                setCategoryProducts([]);
                setPeripheralSubCategories([]);
                setAvailableBrands([]);
                return;
            }

            // Handle peripherals category specially
            if (selectedCategory.category === "Peripherals" && selectedCategory.subCategories) {
                console.log('🔧 Setting up peripherals subcategories:', selectedCategory.subCategories);
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
                    console.error("❌ Failed to load peripheral brands:", error);
                    setAvailableBrands([]);
                }
                return;
            }

            setLoading(true);
            setPeripheralSubCategories([]);

            // Load products for regular category
            const products = await kioskAPI.getCategoryProducts(selectedCategory.category, {
                page: currentPage,
                limit: 20,
                sortBy,
                sortOrder
            });

            console.log('📦 Products loaded for category:', products);
            setCategoryProducts(products || []);

            // Load available brands for this category
            try {
                const brands = await kioskAPI.getCategoryBrands(selectedCategory.category);
                setAvailableBrands(brands);
            } catch (error) {
                console.error("❌ Failed to load category brands:", error);
                setAvailableBrands([]);
            }

        } catch (error) {
            console.error("❌ Failed to load category products:", error);
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
            console.log('🔧 Peripheral subcategory selected:', subCategory);
            setSelectedPeripheralSubCategory(subCategory);
            setLoading(true);

            const products = await kioskAPI.getCategoryProducts(subCategory.category, {
                page: currentPage,
                limit: 20,
                sortBy,
                sortOrder,
                brand: selectedBrand || undefined
            });

            console.log('📦 Peripheral products loaded:', products);
            setCategoryProducts(products || []);

        } catch (error) {
            console.error("❌ Failed to load peripheral subcategory products:", error);
            setCategoryProducts([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, sortBy, sortOrder, selectedBrand]);

    /**
     * Handle search functionality
     */
    const handleSearch = useCallback(async (searchValue) => {
        if (!searchValue.trim()) {
            handleMenuItemClick(selectedItem);
            return;
        }

        try {
            setLoading(true);
            const results = await kioskAPI.searchProducts(searchValue, {
                limit: 20,
                category: selectedPeripheralSubCategory?.category || categories[selectedItem]?.category
            });
            console.log('🔍 Search results:', results);
            setCategoryProducts(results || []);
        } catch (error) {
            console.error("❌ Search failed:", error);
            setCategoryProducts([]);
        } finally {
            setLoading(false);
        }
    }, [selectedItem, selectedPeripheralSubCategory, categories]);

    /**
     * Handle product click
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
     * Filter products for display
     */
    const filteredProducts = categoryProducts.filter(product => {
        const matchesSearch = !searchTerm ||
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesBrand = !selectedBrand || product.brand === selectedBrand;

        return matchesSearch && matchesBrand && product.available;
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
                style={{ cursor: 'pointer', margin: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
            >
                <div className="product-image" style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <img
                        src={product.imageUrl || defaultCategoryImages.home}
                        alt={product.name}
                        style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                        onError={(e) => {
                            e.target.src = defaultCategoryImages.home;
                        }}
                    />
                    {saleInfo && (
                        <div className="sale-badge" style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'red',
                            color: 'white',
                            padding: '5px',
                            borderRadius: '50%',
                            fontSize: '12px'
                        }}>
                            -{saleInfo.discountPercent}%
                        </div>
                    )}
                </div>

                <div className="product-info">
                    <h4 className="product-name" style={{ marginBottom: '5px', fontSize: '14px' }}>{product.name}</h4>
                    <p className="product-brand" style={{ margin: '0', fontSize: '12px', color: '#666' }}>{product.brand}</p>

                    <div className="product-price" style={{ marginTop: '10px' }}>
                        {saleInfo ? (
                            <div>
                                <span style={{ color: 'red', fontWeight: 'bold' }}>{kioskAPI.formatPrice(effectivePrice)}</span>
                                <span style={{ textDecoration: 'line-through', marginLeft: '10px', color: '#999' }}>
                                    {kioskAPI.formatPrice(product.price)}
                                </span>
                            </div>
                        ) : (
                            <span style={{ fontWeight: 'bold' }}>{kioskAPI.formatPrice(effectivePrice)}</span>
                        )}
                    </div>

                    <div className="product-stock" style={{ marginTop: '5px', fontSize: '12px' }}>
                        <span style={{ color: product.stock > 10 ? 'green' : 'orange' }}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render home page content
     */
    const renderHomeContent = () => (
        <div className="home-content">
            {/* Hot Picks Section */}
            <section className="featured-section">
                <h2 style={{ color: '#00ff00', marginBottom: '20px' }}>
                    🔥 Hot Picks
                    <span style={{ fontSize: '12px', marginLeft: '10px', color: '#666' }}>AI Powered</span>
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {randomHotPicks.map((product) => renderProductCard(product))}
                </div>
            </section>

            {/* Value for Money Section */}
            <section className="featured-section">
                <h2 style={{ color: '#00ff00', marginBottom: '20px' }}>
                    💰 Value for Money
                    <span style={{ fontSize: '12px', marginLeft: '10px', color: '#666' }}>AI Powered</span>
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {randomValueForMoney.map((product) => renderProductCard(product))}
                </div>
            </section>

            {/* On Sale Section */}
            <section className="featured-section">
                <h2 style={{ color: '#00ff00', marginBottom: '20px' }}>
                    🔥 On Sale
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {randomOnSale.map((product) => renderProductCard(product))}
                </div>
            </section>
        </div>
    );

    if (loading && categories.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Loading K-Wise Kiosk System...</h2>
                <p>Please wait while we load the categories and products.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0a2a2a' }}>
            {/* Sidebar */}
            <div style={{ width: '250px', background: '#1a3a3a', padding: '20px', color: 'white' }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate("/")}
                    style={{
                        width: '100%',
                        padding: '10px',
                        marginBottom: '20px',
                        background: '#00ff00',
                        color: 'black',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Back to Main Menu
                </button>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img src={logo1} alt="PC Wise Logo" style={{ maxWidth: '100px' }} />
                </div>

                {/* Menu */}
                <div>
                    {categories.length > 0 ? categories.map((item, index) => (
                        <div key={`category-${item.category}-${index}`}>
                            <button
                                onClick={() => handleMenuItemClick(index)}
                                style={{
                                    width: '100%',
                                    padding: '15px 10px',
                                    marginBottom: '10px',
                                    background: selectedItem === index ? '#00ff00' : '#2a4a4a',
                                    color: selectedItem === index ? 'black' : 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    style={{ width: '30px', height: '30px', objectFit: 'contain' }}
                                />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.name}</div>
                                    {item.subCategories && (
                                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                            ({item.subCategories.length} subcategories)
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Peripheral Subcategories */}
                            {selectedItem === index && item.subCategories && (
                                <div style={{ marginLeft: '20px', marginBottom: '10px' }}>
                                    {item.subCategories.map((subCat) => (
                                        <button
                                            key={subCat.category}
                                            onClick={() => handlePeripheralSubCategoryClick(subCat)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                marginBottom: '5px',
                                                background: selectedPeripheralSubCategory?.category === subCat.category ? '#00aa00' : '#3a5a5a',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {subCat.name} ({subCat.productCount})
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div>Loading categories...</div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '20px', background: '#0a2a2a', color: 'white' }}>
                {selectedItem === 0 ? (
                    renderHomeContent()
                ) : (
                    <div>
                        {/* Category Header */}
                        <h1 style={{ color: '#00ff00', marginBottom: '20px' }}>
                            {selectedPeripheralSubCategory
                                ? selectedPeripheralSubCategory.name
                                : categories[selectedItem]?.name}
                        </h1>

                        {/* Search and Filter Bar */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <FontAwesomeIcon
                                    icon={faSearch}
                                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 40px',
                                        background: '#2a4a4a',
                                        color: 'white',
                                        border: '1px solid #4a6a6a',
                                        borderRadius: '5px'
                                    }}
                                />
                            </div>

                            <select
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                                style={{
                                    padding: '10px',
                                    background: '#2a4a4a',
                                    color: 'white',
                                    border: '1px solid #4a6a6a',
                                    borderRadius: '5px'
                                }}
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
                                style={{
                                    padding: '10px',
                                    background: '#2a4a4a',
                                    color: 'white',
                                    border: '1px solid #4a6a6a',
                                    borderRadius: '5px'
                                }}
                            >
                                <option value="name-asc">Name A-Z</option>
                                <option value="name-desc">Name Z-A</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="brand-asc">Brand A-Z</option>
                            </select>
                        </div>

                        {/* Products Grid */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {loading ? (
                                <div>Loading products...</div>
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map(product => renderProductCard(product))
                            ) : (
                                <div>
                                    <p>No products found matching your criteria.</p>
                                    {categoryProducts.length === 0 && (
                                        <p>Try selecting a different category or check your search terms.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Order Summary */}
            <div style={{ width: '300px', background: '#1a3a3a', padding: '20px', color: 'white' }}>
                <h3 style={{ color: '#00ff00', marginBottom: '20px' }}>Order Summary</h3>
                <div>
                    {cart.length === 0 ? (
                        <p>No items in cart</p>
                    ) : (
                        cart.map((item, index) => (
                            <div key={index} style={{ marginBottom: '10px', padding: '10px', background: '#2a4a4a', borderRadius: '5px' }}>
                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                <div>{kioskAPI.formatPrice(item.effectivePrice || item.price)}</div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #4a6a6a', paddingTop: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00ff00', marginBottom: '20px' }}>
                        TOTAL: {kioskAPI.formatPrice(totalPrice)}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button style={{
                            padding: '15px',
                            background: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                            Cancel Order
                        </button>
                        <button style={{
                            padding: '15px',
                            background: '#00ff00',
                            color: 'black',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                            Start Over
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PC_Parts_Fixed;




