import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import "./PC-Parts.css";
import "./PCCustomized.css";

// Import stock API for real-time data
import { stockAPI } from "../services/api";

// Static assets for UI
import PCWise from "../assets/PCWise.webp";
import logo1 from "../assets/LOGO1.webp";
import Vector from "../assets/Vector (3).webp"
import Chest from "../assets/Chest.webp";
import Frame from "../assets/Frame 138.webp";

// Default category images (fallback when no image from database)
import CPU1 from "../assets/CPU1.webp";
import GPU1 from "../assets/GPU1.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import PSU1 from "../assets/PSU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import Peripheral from "../assets/Peripheral.webp";

const PC_Parts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // WebSocket integration
  const { webSocket, isConnected } = useKioskWebSocket();

  // State management for real-time data
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(0);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Featured product states (replacing static hot picks)
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [randomHotPicks, setRandomHotPicks] = useState([]);
  const [randomValueForMoney, setRandomValueForMoney] = useState([]);
  const [randomOnSale, setRandomOnSale] = useState([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Derived state for current selected category
  const selectedCategory = categories[selectedItem]?.category || "home";

  // Default category images mapping
  const defaultCategoryImages = {
    home: Vector,
    cpu: CPU1,
    gpu: GPU1,
    motherboard: Motherboard1,
    memory: Ram,
    storage: Storage1,
    case: Chest,
    psu: Frame,
    cooling: CPU1, // Using CPU1 as default for cooling
  };

  /**
   * Load categories from API on component mount
   */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add home category first
        const homeCategory = { 
          name: "Home", 
          category: "home", 
          image: Vector, 
          product_count: 0 
        };

        // Fetch categories from API
        const apiCategories = await kioskAPI.getCategories();
        
        // Transform API categories to match current structure
        const transformedCategories = apiCategories.map(cat => ({
          name: formatCategoryName(cat.category),
          category: cat.category.toLowerCase(),
          image: defaultCategoryImages[cat.category.toLowerCase()] || CPU1,
          product_count: cat.product_count,
          brands: cat.brands || []
        }));

        // Combine home with API categories
        const allCategories = [homeCategory, ...transformedCategories];
        setCategories(allCategories);

        console.log("Loaded categories:", allCategories);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setError("Failed to load categories. Please try again.");
        // Use fallback categories if API fails
        setCategories([
          { name: "Home", category: "home", image: Vector, product_count: 0 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  /**
   * WebSocket event handlers for real-time updates
   */
  useEffect(() => {
    if (!isConnected) return;

    console.log("🔄 Setting up WebSocket event handlers for PC-Parts");

    // Handle category updates
    const handleCategoryUpdate = (data) => {
      console.log("📂 Category updated via WebSocket:", data);
      // Reload categories when they're updated
      loadCategoriesFromAPI();
    };

    // Handle product updates
    const handleProductUpdate = (data) => {
      console.log("📦 Product updated via WebSocket:", data);
      // If we're showing featured products, reload them
      if (selectedCategory === "home") {
        loadFeaturedProducts();
      }
    };

    // Handle featured products updates
    const handleFeaturedUpdate = (data) => {
      console.log("⭐ Featured products updated via WebSocket:", data);
      loadFeaturedProducts();
    };

    // Handle force refresh
    const handleForceRefresh = (data) => {
      console.log("🔄 Force refresh requested via WebSocket:", data);
      const { components } = data;
      
      if (!components || components.includes('categories')) {
        loadCategoriesFromAPI();
      }
      if (!components || components.includes('featured')) {
        loadFeaturedProducts();
      }
      if (!components || components.includes('products')) {
        // Refresh current category if not home
        if (selectedCategory !== "home") {
          // This will trigger a reload of the current category view
          setSearchResults([]);
        }
      }
    };

    // Register event handlers
    webSocket.on('category_updated', handleCategoryUpdate);
    webSocket.on('product_updated', handleProductUpdate);
    webSocket.on('featured_updated', handleFeaturedUpdate);
    webSocket.on('force_refresh', handleForceRefresh);

    // Send current status
    webSocket.sendStatus({
      component: 'PC-Parts',
      selectedCategory,
      productsVisible: searchResults.length,
      lastUpdate: new Date().toISOString()
    });

    // Cleanup event handlers on unmount or connection change
    return () => {
      webSocket.off('category_updated', handleCategoryUpdate);
      webSocket.off('product_updated', handleProductUpdate);
      webSocket.off('featured_updated', handleFeaturedUpdate);
      webSocket.off('force_refresh', handleForceRefresh);
    };
  }, [isConnected, selectedCategory, searchResults.length]);

  /**
   * Helper function to reload categories (extracted for reuse)
   */
  const loadCategoriesFromAPI = async () => {
    try {
      // Add home category first
      const homeCategory = { 
        name: "Home", 
        category: "home", 
        image: Vector, 
        product_count: 0 
      };

      // Fetch categories from API
      const apiCategories = await kioskAPI.getCategories();
      
      // Transform API categories to match current structure
      const transformedCategories = apiCategories.map(cat => ({
        name: formatCategoryName(cat.category),
        category: cat.category.toLowerCase(),
        image: defaultCategoryImages[cat.category.toLowerCase()] || CPU1,
        product_count: cat.product_count,
        brands: cat.brands || []
      }));

      // Combine home with API categories
      const allCategories = [homeCategory, ...transformedCategories];
      setCategories(allCategories);

      console.log("🔄 Reloaded categories from API:", allCategories);
    } catch (err) {
      console.error("Failed to reload categories:", err);
    }
  };

  /**
   * Helper function to load featured products (extracted for reuse)
   */
  const loadFeaturedProducts = async () => {
    try {
      const featured = await kioskAPI.getFeaturedProducts(15);
      setFeaturedProducts(featured);

      // Create randomized sections from featured products
      const shuffled = [...featured].sort(() => Math.random() - 0.5);
      setRandomHotPicks(shuffled.slice(0, 5));
      setRandomValueForMoney(shuffled.slice(5, 10));
      setRandomOnSale(shuffled.slice(10, 15));

      console.log("🔄 Reloaded featured products:", featured.length);
    } catch (err) {
      console.error("Failed to load featured products:", err);
      // Set empty arrays as fallback
      setRandomHotPicks([]);
      setRandomValueForMoney([]);
      setRandomOnSale([]);
    }
  };

  /**
   * Load featured products for home screen on mount
   */
  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  /**
   * Load products when category selection changes
   */
  useEffect(() => {
    const loadCategoryProducts = async () => {
      if (!categories.length || selectedItem < 0 || selectedItem >= categories.length) {
        return;
      }

      const selectedCategory = categories[selectedItem];
      
      // Skip API call for home category
      if (selectedCategory.category === 'home') {
        setCategoryProducts([]);
        return;
      }

      try {
        setLoading(true);
        
        const options = {
          page: currentPage,
          limit: 20,
          sortBy: 'name',
          sortOrder: 'asc',
          inStock: true // Only show available products in kiosk
        };

        const response = await kioskAPI.getCategoryProducts(selectedCategory.category, options);
        
        // Transform products to match current structure
        const transformedProducts = response.items.map(product => ({
          id: product.id,
          name: product.name,
          image: product.image_url || defaultCategoryImages[selectedCategory.category] || CPU1,
          price: product.price,
          details: product.description || "No description available",
          specifications: formatSpecifications(product.specifications),
          brand: product.brand,
          stock_quantity: product.stock_quantity,
          category: selectedCategory.category
        }));

        setCategoryProducts(transformedProducts);
        console.log(`Loaded ${transformedProducts.length} products for ${selectedCategory.name}`);
      } catch (err) {
        console.error("Failed to load category products:", err);
        setCategoryProducts([]);
        setError(`Failed to load ${selectedCategory.name} products`);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryProducts();
  }, [selectedItem, categories, currentPage]);

  /**
   * Format category name for display
   */
  const formatCategoryName = (category) => {
    const nameMap = {
      cpu: "Central Processing Unit",
      gpu: "Graphics Processing Unit", 
      motherboard: "Motherboard",
      memory: "Memory (RAM)",
      storage: "Storage",
      case: "PC Case",
      psu: "Power Supply Unit",
      cooling: "Cooling System"
    };

    return nameMap[category.toLowerCase()] || 
           category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  /**
   * Format product specifications from JSON to string
   */
  const formatSpecifications = (specs) => {
    if (!specs || typeof specs !== 'object') {
      return "Specifications not available";
    }

    return kioskAPI.formatSpecifications(specs)
      .map(spec => `${spec.label}: ${spec.value}`)
      .join(' | ') || "Specifications not available";
  };

  /**
   * Handle category selection
   */
  const handleMenuItemClick = useCallback((index) => {
    setSelectedItem(index);
    setCurrentPage(1); // Reset to first page when changing categories
    setSearchTerm(""); // Clear search when changing categories
    setSelectedBrand(""); // Clear brand filter
  }, []);

  /**
   * Handle product click - navigate to product details
   */
  const handleProductClick = useCallback((category, product, index) => {
    const formattedPrice = typeof product.price === "number" 
      ? product.price 
      : parseFloat(String(product.price || 0).replace(/[^\d.]/g, "")) || 0;

    navigate("/pc-product-details", {
      state: {
        category,
        product: {
          ...product,
          price: formattedPrice
        },
        index,
        allProducts: categoryProducts
      }
    });
  }, [navigate, categoryProducts]);

  /**
   * Search products across all categories
   */
  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSearchTerm("");
      return;
    }

    try {
      setLoading(true);
      setSearchTerm(searchQuery);

      const searchResults = await kioskAPI.searchProducts(searchQuery, {
        limit: 50,
        inStock: true
      });

      // Transform search results to match current structure
      const transformedResults = searchResults.results.map(product => ({
        id: product.id,
        name: product.name,
        image: product.image_url || defaultCategoryImages[product.category] || CPU1,
        price: product.price,
        details: product.description || "No description available",
        specifications: formatSpecifications(product.specifications),
        brand: product.brand,
        stock_quantity: product.stock_quantity,
        category: product.category
      }));

      setCategoryProducts(transformedResults);
      console.log(`Search found ${transformedResults.length} products for "${searchQuery}"`);
    } catch (err) {
      console.error("Search failed:", err);
      setError(`Search failed for "${searchQuery}"`);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Filter products by brand
   */
  const filteredProducts = categoryProducts.filter(product => {
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesBrand && matchesSearch;
  });

  /**
   * Get unique brands for current category
   */
  const availableBrands = [...new Set(categoryProducts.map(p => p.brand).filter(Boolean))];

  /**
   * Handle going back
   */
  const handleGoBack = useCallback(() => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate("/kiosk");
    }
  }, [navigate, location.state]);

  // Loading state
  if (loading && !categories.length) {
    return (
      <div className="pc-parts-container">
        <div className="loading-state">
          <h2>Loading PC Components...</h2>
          <p>Fetching the latest products from our database</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !categories.length) {
    return (
      <div className="pc-parts-container">
        <div className="error-state">
          <h2>Unable to Load Components</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-parts-container">
      {/* Header */}
      <div className="header">
        <button onClick={handleGoBack} className="back-button">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="logo-container">
          <img src={logo1} alt="PC-Wise Logo" className="header-logo" />
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Sidebar - Category Menu */}
        <div className="sidebar">
          <div className="menu-section">
            <h3>Categories</h3>
            {categories.map((item, index) => (
              <div
                key={`${item.category}-${index}`}
                className={`menu-item ${selectedItem === index ? "active" : ""}`}
                onClick={() => handleMenuItemClick(index)}
              >
                <img src={item.image} alt={item.name} className="menu-icon" />
                <span>{item.name}</span>
                {item.product_count > 0 && (
                  <span className="product-count">({item.product_count})</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {selectedItem === 0 ? (
            // Home Content
            <div className="home-content">
              <div className="hero-section">
                <img src={PCWise} alt="PC-Wise" className="hero-image" />
                <h1>Welcome to PC-Wise Kiosk</h1>
                <p>Discover the latest PC components and build your dream system</p>
              </div>

              {/* Search Bar */}
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Featured Sections */}
              {randomHotPicks.length > 0 && (
                <div className="featured-section">
                  <h2>🔥 Hot Picks</h2>
                  <div className="product-grid">
                    {randomHotPicks.map((product, index) => (
                      <div
                        key={`hot-${product.id || index}`}
                        className="product-card"
                        onClick={() => handleProductClick(product.category, product, index)}
                      >
                        <img src={product.image_url || defaultCategoryImages[product.category] || CPU1} alt={product.name} />
                        <h4>{product.name}</h4>
                        <p className="price">{kioskAPI.formatPrice(product.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {randomValueForMoney.length > 0 && (
                <div className="featured-section">
                  <h2>💰 Value for Money</h2>
                  <div className="product-grid">
                    {randomValueForMoney.map((product, index) => (
                      <div
                        key={`value-${product.id || index}`}
                        className="product-card"
                        onClick={() => handleProductClick(product.category, product, index)}
                      >
                        <img src={product.image_url || defaultCategoryImages[product.category] || CPU1} alt={product.name} />
                        <h4>{product.name}</h4>
                        <p className="price">{kioskAPI.formatPrice(product.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {randomOnSale.length > 0 && (
                <div className="featured-section">
                  <h2>🏷️ On Sale</h2>
                  <div className="product-grid">
                    {randomOnSale.map((product, index) => (
                      <div
                        key={`sale-${product.id || index}`}
                        className="product-card"
                        onClick={() => handleProductClick(product.category, product, index)}
                      >
                        <img src={product.image_url || defaultCategoryImages[product.category] || CPU1} alt={product.name} />
                        <h4>{product.name}</h4>
                        <p className="price">{kioskAPI.formatPrice(product.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Category Products
            <div className="category-content">
              <div className="category-header">
                <h2>{categories[selectedItem]?.name}</h2>
                
                {/* Search and Filter Controls */}
                <div className="controls">
                  <input
                    type="text"
                    placeholder="Search in category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  
                  {availableBrands.length > 0 && (
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="brand-filter"
                    >
                      <option value="">All Brands</option>
                      {availableBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="loading-products">
                  <p>Loading products...</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="products-grid">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={`product-${product.id || index}`}
                      className="product-card"
                      onClick={() => handleProductClick(categories[selectedItem].category, product, index)}
                    >
                      <img src={product.image || defaultCategoryImages[product.category] || CPU1} alt={product.name} />
                      <h4>{product.name}</h4>
                      <p className="brand">{product.brand}</p>
                      <p className="price">{kioskAPI.formatPrice(product.price)}</p>
                      {product.stock_quantity < 5 && product.stock_quantity > 0 && (
                        <span className="low-stock">Only {product.stock_quantity} left</span>
                      )}
                    </div>
                  ))}
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
      </div>
    </div>
  );
};

export default PC_Parts;