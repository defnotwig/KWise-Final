import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import "./PC-Parts.css";
import "./PCCustomized.css";

// Import the fixed kiosk API and centralized API
import api from "../api/api";
import kioskAPI from "../api/kioskAPI";
// Import AI service for intelligent recommendations
import aiService from "../services/aiService";

// Static assets (keep these for UI components)
import PCWise from "../assets/PCWise.webp";
import logo1 from "../assets/LOGO1.webp";
import Vector from "../assets/Vector (3).webp"
import Chest from "../assets/Chest.webp";
import Frame from "../assets/Frame 138.webp";

// Default category images (will be replaced by database images when available)
import CPU1 from "../assets/CPU1.webp";
import GPU1 from "../assets/GPU1.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";

const PC_Parts = () => {
  const navigate = useNavigate();
  // const location = useLocation(); // Removed unused variable

  // State management for real-time data
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(0);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Removed error state as it's not being used

  // Debug categories state changes
  useEffect(() => {
    console.log('📊 Categories state changed:', categories.length, 'categories');
    console.log('📊 Categories state data:', categories);
  }, [categories]);

  // Debug loading state changes
  useEffect(() => {
    console.log('🔄 Loading state changed:', loading);
  }, [loading]);

  // Featured product states with AI integration
  const [randomHotPicks, setRandomHotPicks] = useState([]);
  const [randomValueForMoney, setRandomValueForMoney] = useState([]);
  const [randomOnSale, setRandomOnSale] = useState([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [availableBrands, setAvailableBrands] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilterSort, setShowFilterSort] = useState(false);

  // Peripherals subcategory state
  const [selectedPeripheralSubCategory, setSelectedPeripheralSubCategory] = useState(null);
  const [peripheralSubCategories, setPeripheralSubCategories] = useState([]);

  // Cart state for bottom section
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);

  // Calculate total price from cart
  const totalPrice = React.useMemo(() => {
    return cart.filter(item => item !== null).reduce((acc, item) => {
      const price = typeof item.price === "number" ? item.price : parseFloat(item.price?.replace(/[^\d.]/g, "")) || 0;
      return acc + (price * (item.quantity || 1));
    }, 0);
  }, [cart]);

  // Listen for cart changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(updatedCart);
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for changes in same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

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
    // Peripheral categories
    monitor: GPU1, // Using GPU1 as monitor placeholder
    keyboard: CPU1, // Using CPU1 as keyboard placeholder
    mouse: CPU1, // Using CPU1 as mouse placeholder
    headphones: CPU1, // Using CPU1 as headphones placeholder
    speakers: CPU1, // Using CPU1 as speakers placeholder
    webcam: CPU1, // Using CPU1 as webcam placeholder
    peripherals: GPU1, // Using GPU1 as general peripherals placeholder
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
      cooling: "Cooling System"
    };

    return nameMap[category.toLowerCase()] ||
      category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  /**
   * Format product specifications from JSON to string - USING CENTRALIZED API
   */
  const formatSpecifications = useCallback((specs) => {
    return api.utils.formatSpecifications(specs);
  }, []);

  /**
   * Filter products based on search term and brand
   */
  const filteredProducts = React.useMemo(() => {
    let filtered = categoryProducts;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.details && product.details.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply brand filter
    if (selectedBrand) {
      filtered = filtered.filter(product => product.brand === selectedBrand);
    }

    return filtered;
  }, [categoryProducts, searchTerm, selectedBrand]);

  /**
   * Load categories from API on component mount - FULLY DYNAMIC
   */
  useEffect(() => {
    console.log('🎬 PC_Parts useEffect triggered');
    
    const loadCategories = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading categories from backend...');
        console.log('🔗 kioskAPI object:', kioskAPI);

        // Test if kioskAPI is available
        if (!kioskAPI || typeof kioskAPI.getCategories !== 'function') {
          throw new Error('kioskAPI.getCategories is not available');
        }

        // Fetch categories from API - NO FALLBACKS
        const apiCategories = await kioskAPI.getCategories();
        console.log('📦 Received categories from API:', apiCategories);
        console.log('📦 Categories type:', typeof apiCategories);
        console.log('📦 Is array?', Array.isArray(apiCategories));
        console.log('📦 Categories length:', apiCategories?.length);

        if (!Array.isArray(apiCategories)) {
          throw new Error('API did not return an array of categories');
        }

        // Add home category first
        const homeCategory = {
          name: "Home",
          category: "home",
          image: Vector,
          product_count: 0
        };

        // Transform API categories to match current structure
        const transformedCategories = apiCategories.map(cat => ({
          name: cat.name || formatCategoryName(cat.category),
          category: cat.category.toLowerCase(),
          image: defaultCategoryImages[cat.category.toLowerCase()] || CPU1,
          product_count: cat.productCount || cat.product_count || 0,
          brands: cat.brands || [],
          subCategories: cat.subCategories || null
        }));

        console.log('🔄 Transformed categories:', transformedCategories);

        // Combine home with API categories
        const allCategories = [homeCategory, ...transformedCategories];
        console.log('🔄 All categories (home + API):', allCategories);
        
        setCategories(allCategories);

        console.log("✅ Categories state set successfully:", allCategories.length, "categories");
        console.log("✅ Categories data:", allCategories);
        console.log("✅ Setting categories state with:", allCategories);
      } catch (err) {
        console.error("❌ Error loading categories:", err);
        console.error("❌ Error stack:", err.stack);
        // Instead of fallback, show error state with some working categories for testing
        const errorCategories = [
          { name: "Home", category: "home", image: Vector, product_count: 0 },
          { name: "System Error - Click to retry", category: "error", image: CPU1, product_count: 0, error: "Unable to connect to backend. Please check server status." },
          { name: "CPU (Fallback)", category: "cpu", image: CPU1, product_count: 0 },
          { name: "GPU (Fallback)", category: "gpu", image: GPU1, product_count: 0 }
        ];
        setCategories(errorCategories);
        console.log("❌ Set error categories:", errorCategories);
      } finally {
        setLoading(false);
        console.log("✅ Loading finished, setting loading to false");
      }
    };

        // Fetch categories from API - NO FALLBACKS
        const apiCategories = await kioskAPI.getCategories();
        console.log('📦 Received categories from API:', apiCategories);
        console.log('📦 Categories type:', typeof apiCategories);
        console.log('📦 Is array?', Array.isArray(apiCategories));
        console.log('📦 Categories length:', apiCategories?.length);

        if (!Array.isArray(apiCategories)) {
          throw new Error('API did not return an array of categories');
        }

        // Add home category first
        const homeCategory = {
          name: "Home",
          category: "home",
          image: Vector,
          product_count: 0
        };

        // Transform API categories to match current structure
        const transformedCategories = apiCategories.map(cat => ({
          name: cat.name || formatCategoryName(cat.category),
          category: cat.category.toLowerCase(),
          image: defaultCategoryImages[cat.category.toLowerCase()] || CPU1,
          product_count: cat.productCount || cat.product_count || 0,
          brands: cat.brands || [],
          subCategories: cat.subCategories || null
        }));

        console.log('🔄 Transformed categories:', transformedCategories);

        // Combine home with API categories
        const allCategories = [homeCategory, ...transformedCategories];
        console.log('🔄 All categories (home + API):', allCategories);
        
        setCategories(allCategories);

        console.log("✅ Categories state set successfully:", allCategories.length, "categories");
        console.log("✅ Categories data:", allCategories);
        console.log("✅ Setting categories state with:", allCategories);
      } catch (err) {
        console.error("❌ Error loading categories:", err);
        console.error("❌ Error stack:", err.stack);
        // Instead of fallback, show error state
        const errorCategories = [
          { name: "Home", category: "home", image: Vector, product_count: 0 },
          { name: "System Error", category: "error", image: CPU1, product_count: 0, error: "Unable to connect to backend. Please check server status." }
        ];
        setCategories(errorCategories);
        console.log("❌ Set error categories:", errorCategories);
      } finally {
        setLoading(false);
        console.log("✅ Loading finished, setting loading to false");
      }
    };

    const loadFeaturedProducts = async () => {
      try {
        console.log('🌟 Loading featured products...');
        const featuredData = await kioskAPI.getFeaturedProducts(25); // Get more products for AI analysis
  
        // Get real on-sale products
        const onSaleResponse = await kioskAPI.getOnSaleProducts({ limit: 6 });
        const onSaleProducts = onSaleResponse.data || [];
  
        // Use AI service to generate intelligent recommendations
        console.log('🤖 Generating AI-powered recommendations...');
        
        // Set featured product states
        setRandomHotPicks(featuredData.hotPicks || []);
        setRandomValueForMoney(featuredData.valueForMoney || []);
        setRandomOnSale(onSaleProducts);
        
        console.log('✅ Featured products loaded successfully');
      } catch (err) {
        console.error('❌ Error loading featured products:', err);
        // Set empty arrays as fallback
        setRandomHotPicks([]);
        setRandomValueForMoney([]);
        setRandomOnSale([]);
      }
    };

    loadCategories();
    loadFeaturedProducts();
  }, []); // Run only once on mount

  /**
   * Load products for selected category with peripherals subcategory support
   */
  useEffect(() => {
    const loadCategoryProducts = async () => {
      if (selectedItem === 0 || !categories[selectedItem]) return; // Skip home or invalid

      try {
        setLoading(true);
        const selectedCategory = categories[selectedItem];

        // Handle peripherals subcategory selection
        let categoryToFetch = selectedCategory.category;
        if (selectedCategory.category === 'peripherals' && selectedPeripheralSubCategory) {
          categoryToFetch = selectedPeripheralSubCategory;
        }

        const options = {
          page: currentPage,
          limit: 50, // Increased to show more variety
          sortBy: sortBy,
          sortOrder: sortOrder,
          inStock: true, // Only show available products in kiosk
          brand: selectedBrand || undefined // Add brand filter
        };

        const response = await kioskAPI.getCategoryProducts(categoryToFetch, options);


        // Transform products to match current structure
        const transformedProducts = response.map(product => ({
          id: product.id,
          name: product.name,
          image: product.imageUrl || product.image || defaultCategoryImages[categoryToFetch] || CPU1,
          imageUrl: product.imageUrl || product.image,
          price: product.price, // Keep as number for kioskAPI.formatPrice()
          details: product.description || "No description available",
          specifications: formatSpecifications(product.specifications),
          brand: product.brand,
          stock_quantity: product.stock,
          category: selectedCategory.category,
          available: product.available,
          on_sale: product.onSale,
          sale_price: product.salePrice
        }));


        // Extract brands from products and get subcategory info for peripherals
        const productBrands = transformedProducts
          .map(p => p.brand)
          .filter(brand => brand && brand.trim())
          .filter((brand, index, arr) => arr.indexOf(brand) === index)
          .sort();

        setAvailableBrands(productBrands);
        setCategoryProducts(transformedProducts);

        // If this is peripherals category, set up subcategories
        if (selectedCategory.category === 'peripherals' && selectedCategory.subCategories) {
          setPeripheralSubCategories(selectedCategory.subCategories);
          if (!selectedPeripheralSubCategory && selectedCategory.subCategories.length > 0) {
            setSelectedPeripheralSubCategory(selectedCategory.subCategories[0].category);
          }
        } else {
          setPeripheralSubCategories([]);
          setSelectedPeripheralSubCategory(null);
        }

        console.log(`Loaded ${transformedProducts.length} products for ${selectedCategory.name}`);
      } catch (err) {
        console.error("Failed to load category products:", err);
        setCategoryProducts([]);
        setAvailableBrands([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem, categories, currentPage, selectedPeripheralSubCategory]);

  /**
   * Handle category selection
   */
  const handleMenuItemClick = useCallback((index) => {
    setSelectedItem(index);
    setCurrentPage(1); // Reset to first page when changing categories
    setSearchTerm(""); // Clear search when changing categories
    setSelectedBrand(""); // Clear brand filter
    setSelectedPeripheralSubCategory(null); // Clear peripheral subcategory
  }, []);

  /**
   * Handle peripheral subcategory selection
   */
  const handlePeripheralSubCategoryClick = useCallback((subCategory) => {
    setSelectedPeripheralSubCategory(subCategory);
    setCurrentPage(1);
    setSearchTerm("");
    setSelectedBrand("");
  }, []);

  /**
   * Handle brand filter change
   */
  const handleBrandFilterChange = useCallback((brand) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
    setSearchTerm("");
  }, []);

  /**
   * Handle filter & sort button click
   */
  const handleFilterSortToggle = useCallback(() => {
    setShowFilterSort(!showFilterSort);
  }, [showFilterSort]);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  }, []);

  /**
   * Handle cancel order
   */
  const handleCancelOrder = useCallback(() => {
    localStorage.removeItem("cart");
    setCart([]);
  }, []);

  /**
   * Handle start over
   */
  const handleStartOver = useCallback(() => {
    localStorage.removeItem("cart");
    setCart([]);
    setSelectedItem(0); // Go back to home
    setSearchTerm("");
    setSelectedBrand("");
    setCurrentPage(1);
  }, []);

  /**
   * Handle product click - navigate to product details
   */
  const handleProductClick = useCallback((category, product, index) => {
    // Fallback if category is undefined
    const safeCategory = category || "unknown-category";

    // Ensure price is a valid number before parsing
    const formattedPrice = typeof product.price === "number"
      ? product.price
      : parseFloat(String(product.price || 0).replace(/[^\d.]/g, "")) || 0;


    navigate(`/product/${safeCategory}-${index}`, {
      state: {
        productName: product.name,
        productPrice: formattedPrice,
        productImage: product.image || product.imageUrl || defaultCategoryImages[product.category] || CPU1,
        details: product.description || "No details available.",
        specifications: formatSpecifications(product.specifications),
        previousCategory: selectedItem, // Store the selected category index
        brand: product.brand,
        stock: product.stock,
        category: safeCategory,
        productId: product.id
      }
    });
  }, [navigate, selectedItem, formatSpecifications, defaultCategoryImages]);

  return (
    <div className="pc-parts-container">
      {/* Sidebar */}
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

        {/* Menu */}
        <div className="menu">
          {/* Debug information - visible on page */}
          <div style={{ color: 'white', background: 'red', padding: '10px', margin: '10px' }}>
            DEBUG: Categories Length = {categories.length}, Loading = {loading.toString()}
            <br />
            Categories: {JSON.stringify(categories.map(c => c.name))}
          </div>
          
          {console.log("🎯 Rendering categories:", categories.length, categories)}
          {categories.length > 0 ? categories.map((item, index) => (
            <button
              key={`category-${item.category}-${index}`}
              className={`menu-item ${selectedItem === index ? "active" : "inactive"}`}
              onClick={() => handleMenuItemClick(index)}
            >
              <div className="menu-item-image">
                <img src={item.image} alt={item.name} />
              </div>
              <div className="menu-item-text">{item.name}</div>
            </button>
          )) : (
            <div className="loading-categories" style={{ color: 'white', background: 'blue', padding: '20px' }}>
              <p>Loading categories... {categories.length} found</p>
              <p>Loading state: {loading.toString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {selectedItem === 0 ? (
          /* Home Page */
          <div className="home-content">
            <h1 className="home-title">Welcome to PC Wise</h1>

            <div className="home-section">
              <h3>🔥 Hot Picks</h3>
              <div className="home-large-box">
                <div className="carousel-container">
                  <div className="carousel-slider">
                    <div className="carousel-slide" onClick={() => handleMenuItemClick(1)}>
                      <img src={PCWise} alt="Featured Product" className="carousel-image" />
                    </div>
                    <div className="carousel-slide" onClick={() => handleMenuItemClick(2)}>
                      <img src={PCWise} alt="Featured Product 2" className="carousel-image" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-section">
              <div className="home-grid">
                {randomHotPicks.map((product, index) => (
                  <div
                    key={`hot-pick-${product.id || index}`}
                    className="home-box"
                    onClick={() => handleProductClick(product.category, product, index)}
                  >
                    <img src={product.image || product.imageUrl || CPU1} alt={product.name} className="home-box-image" />
                    <p className="home-box-name">{product.name}</p>
                    <p className="home-box-price">{kioskAPI.formatPrice(product.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="home-section">
              <h3>💰 Value for Money</h3>
              <div className="home-grid">
                {randomValueForMoney.map((product, index) => (
                  <div
                    key={`value-${product.id || index}`}
                    className="home-box"
                    onClick={() => handleProductClick(product.category, product, index)}
                  >
                    <img src={product.image || product.imageUrl || CPU1} alt={product.name} className="home-box-image" />
                    <p className="home-box-name">{product.name}</p>
                    <p className="home-box-price">{kioskAPI.formatPrice(product.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="home-section">
              <h3>🔥 On Sale</h3>
              <div className="home-grid">
                {randomOnSale.map((product, index) => {
                  const saleInfo = kioskAPI.getSaleInfo(product);
                  return (
                    <div
                      key={`sale-${product.id || index}`}
                      className="home-box sale-item"
                      onClick={() => handleProductClick(product.category, product, index)}
                    >
                      <img src={product.image || product.imageUrl || CPU1} alt={product.name} className="home-box-image" />
                      <p className="home-box-name">{product.name}</p>
                      {saleInfo ? (
                        <div className="sale-price-container">
                          <p className="original-price">{kioskAPI.formatPrice(saleInfo.originalPrice)}</p>
                          <p className="sale-price">{kioskAPI.formatPrice(saleInfo.salePrice)}</p>
                          <span className="discount-badge">-{saleInfo.discountPercent}%</span>
                        </div>
                      ) : (
                        <p className="home-box-price">{kioskAPI.formatPrice(product.effectivePrice || product.price)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Category Products Page */
          <div className="category-content">
            <div className="category-header">
              <h2 className="category-title">{categories[selectedItem]?.name || "Loading..."}</h2>
              <span className="category-count">({filteredProducts.length} products)</span>
            </div>

            {/* Peripherals Subcategory Selection */}
            {categories[selectedItem]?.category === 'peripherals' && peripheralSubCategories.length > 0 && (
              <div className="subcategory-filter-container">
                <div className="subcategory-section">
                  <label className="subcategory-label">Category:</label>
                  <div className="subcategory-list">
                    {peripheralSubCategories.map(subCat => (
                      <button
                        key={subCat.category}
                        className={`subcategory-item ${selectedPeripheralSubCategory === subCat.category ? "active" : ""}`}
                        onClick={() => handlePeripheralSubCategoryClick(subCat.category)}
                      >
                        {subCat.name} ({subCat.inStockCount || subCat.productCount || 0})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="brand-filter-container">
              <div className="brand-section">
                <label className="brand-label">Brand:</label>
                <div className="brand-list">
                  <button
                    className={`brand-item ${selectedBrand === "" ? "active" : ""}`}
                    onClick={() => handleBrandFilterChange("")}
                  >
                    All
                  </button>
                  {availableBrands.map(brand => (
                    <button
                      key={brand}
                      className={`brand-item ${selectedBrand === brand ? "active" : ""}`}
                      onClick={() => handleBrandFilterChange(brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <button className="filter-button" onClick={handleFilterSortToggle}>
                Filter & Sort {showFilterSort ? '▲' : '▼'}
              </button>

              {/* Filter & Sort Panel */}
              {showFilterSort && (
                <div className="filter-sort-panel" onClick={(e) => e.target === e.currentTarget && setShowFilterSort(false)}>
                  <div className="filter-sort-content">
                    <div className="filter-sort-header">
                      <h2 className="filter-sort-title">Filter & Sort</h2>
                      <button className="filter-close-btn" onClick={() => setShowFilterSort(false)}>
                        ×
                      </button>
                    </div>

                    <div className="filter-section">
                      <h3 className="filter-section-title">Manufacturer</h3>
                      <div className="filter-options">
                        <button
                          className={`filter-option ${selectedBrand === '' ? 'active' : ''}`}
                          onClick={() => handleBrandFilterChange('')}
                        >
                          All
                        </button>
                        {availableBrands.map(brand => (
                          <button
                            key={brand}
                            className={`filter-option ${selectedBrand === brand ? 'active' : ''}`}
                            onClick={() => handleBrandFilterChange(brand)}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <h3 className="filter-section-title">Sort By</h3>
                      <div className="filter-options">
                        <button
                          className={`filter-option ${sortBy === 'name' ? 'active' : ''}`}
                          onClick={() => handleSortChange('name', sortOrder)}
                        >
                          Name
                        </button>
                        <button
                          className={`filter-option ${sortBy === 'price' ? 'active' : ''}`}
                          onClick={() => handleSortChange('price', sortOrder)}
                        >
                          Price
                        </button>
                        <button
                          className={`filter-option ${sortBy === 'brand' ? 'active' : ''}`}
                          onClick={() => handleSortChange('brand', sortOrder)}
                        >
                          Brand
                        </button>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h3 className="filter-section-title">Order</h3>
                      <div className="filter-options">
                        <button
                          className={`filter-option ${sortOrder === 'asc' ? 'active' : ''}`}
                          onClick={() => handleSortChange(sortBy, 'asc')}
                        >
                          Ascending
                        </button>
                        <button
                          className={`filter-option ${sortOrder === 'desc' ? 'active' : ''}`}
                          onClick={() => handleSortChange(sortBy, 'desc')}
                        >
                          Descending
                        </button>
                      </div>
                    </div>

                    <button
                      className="clear-filters-btn"
                      onClick={() => {
                        setSelectedBrand('');
                        setSortBy('name');
                        setSortOrder('asc');
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-products">
                <p>Loading products...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="scroll-container">
                <div className="grid">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={`product-${product.id || index}`}
                      className="grid-item"
                      onClick={() => handleProductClick(categories[selectedItem].category, product, index)}
                    >
                      <div className="product-image-container">
                        <img
                          src={product.image || product.imageUrl || product.image_url || defaultCategoryImages[product.category?.toLowerCase()] || CPU1}
                          alt={product.name}
                          className="product-image"
                          onError={(e) => {
                            e.target.src = defaultCategoryImages[product.category?.toLowerCase()] || CPU1;
                          }}
                        />
                        {product.on_sale && (
                          <div className="sale-badge">ON SALE</div>
                        )}
                      </div>
                      <div className="product-info">
                        <div className="product-name">{product.name}</div>
                        <div className="product-brand">{product.brand}</div>
                        {product.on_sale ? (
                          <div className="price-container">
                            <div className="original-price">{kioskAPI.formatPrice(product.price)}</div>
                            <div className="sale-price">{kioskAPI.formatPrice(product.sale_price || product.salePrice)}</div>
                          </div>
                        ) : (
                          <div className="price">{kioskAPI.formatPrice(product.effectivePrice || product.price)}</div>
                        )}
                        {product.stock < 5 && product.stock > 0 && (
                          <span className="low-stock">Only {product.stock} left</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-products">
                <p>No products found in this category.</p>
                {searchTerm && <p>Try clearing your search or selecting a different category.</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="pc-parts-bottom-section">
        <div className="pc-parts-process-container">
          <div className="pc-parts-order-info">
            <div className="pc-parts-cart-icon">
              <img src={Chest} alt="Cart" />
              {cart.length > 0 && (
                <div className="pc-parts-notification">{cart.length}</div>
              )}
            </div>
            <div className="pc-parts-total-label">
              <div className="pc-parts-total">TOTAL</div>
              <div className="pc-parts-price">₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="pc-parts-right-buttons">
            <button
              className="pc-parts-order-summary"
              onClick={() => navigate("/order-summary")}
            >
              Order Summary
            </button>
            <div className="pc-parts-action-buttons">
              <button className="pc-parts-cancel-order" onClick={handleCancelOrder}>Cancel Order</button>
              <button className="pc-parts-start-over" onClick={handleStartOver}>Start Over</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PC_Parts;