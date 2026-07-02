import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ProductList.css";
import BuildPC from "../assets/BuildPC.webp";
import BronzeTier from "../assets/Bronze.webp";
import SilverTier from "../assets/Silver.webp";
import GoldTier from "../assets/Gold.webp";
import DiamondTier from "../assets/Diamond.webp";
import filtercategory from "../assets/ProductList/filtercategory.svg";
import { stockAPI } from "../services/api";
import { parseKioskPrice, resolveProductImage } from "../utils/kioskContracts";
// AI service temporarily disabled - getPreBuiltRecommendations() not implemented
// import aiService from "../api/aiService";

// Removed unused static pcProducts array and image imports - data now comes from backend API

// Purpose colors for UI display
const purposeColors = {
  Gaming: "#003FE0",
  Work: "#E0005D",
  Multimedia: "#E05A00",
};

// Module-level helper: Get tier image based on selection
const getTierImage = (tierName) => {
  const tierImages = {
    "Starter": BronzeTier,
    "Mid Tier": SilverTier,
    "High Tier": GoldTier,
    "Elite": DiamondTier
  };
  return tierImages[tierName] || BuildPC;
};

// Module-level helper: Get tier display name for subtitle
const getTierDisplayName = (tierName) => {
  const tierDisplayNames = {
    "Starter": "Bronze Tier",
    "Mid Tier": "Silver Tier",
    "High Tier": "Gold Tier",
    "Elite": "Diamond Tier"
  };
  return tierDisplayNames[tierName] || tierName;
};

// Module-level helper: Get shuffled monitors for a tier's price range
const getShuffledMonitorsForTier = (tier, monitors) => {
  const priceRanges = {
    'Starter': { min: 2000, max: 4500 },
    'Mid Tier': { min: 3500, max: 6000 },
    'High Tier': { min: 5000, max: 10000 },
    'Elite': { min: 8000, max: 30000 }
  };
  
  const range = priceRanges[tier] || { min: 2000, max: 10000 };
  
  const filteredMonitors = monitors.filter(m => 
    m.price >= range.min && m.price <= range.max && m.stock > 0
  );
  
  const shuffled = [...filteredMonitors].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(monitor => ({
    id: monitor.id,
    name: monitor.name,
    price: parseKioskPrice(monitor.price),
    image: resolveProductImage(monitor),
    stock: monitor.stock
  }));
};

// Module-level helper: Transform backend product data to frontend format
const transformProduct = (item, monitors) => {
  const tier = item.tier || item.specifications?.buildType || 'Starter';
  const image = resolveProductImage(item, BuildPC);
  
  return {
    id: item.id,
    name: item.name,
    price: parseKioskPrice(item.price),
    category: item.category || tier || 'Unknown',
    tier: tier,
    purposes: item.purposes || [],
    image,
    image_url: item.image_url || item.imageUrl || item.image || '',
    stock: item.stock,
    components: item.components || [],
    specifications: item.specifications,
    addonsTitle: "Gaming Monitors Addons",
    addons: getShuffledMonitorsForTier(tier, monitors)
  };
};

const extractResponseItems = (response) => {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.data?.items)) return response.data.data.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

// Module-level helper: Build query string for API request
const buildQueryString = (category, purposes, source) => {
  const params = new URLSearchParams();
  if (category) {
    params.append('category', category);
  }
  if (purposes.length > 0) {
    params.append('purposes', purposes.join(','));
  }
  params.append('buildSource', source);
  return params.toString() ? `?${params.toString()}` : '';
};

// Module-level helper: Fetch pre-built products from backend
const fetchProductData = async (selectedCategory, selectedPurposes, buildSource) => {
  const queryString = buildQueryString(selectedCategory, selectedPurposes, buildSource);
  
  const [prebuiltResponse, monitorsResponse] = await Promise.all([
    stockAPI.get(`/kiosk/prebuilt${queryString}`),
    stockAPI.getItems({ category: 'Monitor', page: 1, limit: 100 })
  ]);

  const monitors = extractResponseItems(monitorsResponse);
  
  return {
    products: extractResponseItems(prebuiltResponse).map(item =>
      transformProduct(item, monitors)
    ),
    monitorCount: monitors.length
  };
};

// Module-level helper: Get header title based on build source
const getHeaderTitle = (buildSource) => {
  return buildSource === "preset" ? "PREBUILT PC'S" : "COMMUNITY";
};

// Module-level helper: Get header subtitle based on build source and category
const getHeaderSubtitle = (buildSource, categoryName) => {
  if (buildSource === "preset") {
    return `${categoryName} Level PC Builds`;
  }
  return "Crafted by the community";
};

const ProductList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  
  // Get tier and buildSource from navigation state
  const tier = location.state?.tier || searchParams.get("category");
  const buildSource = location.state?.buildSource
    || searchParams.get("buildSource")
    || (location.state?.from === "community" ? "community" : "preset"); // preset or community
  
  // Memoize selectedPurposes to prevent infinite loop - only recreate when URL changes
  const selectedPurposes = useMemo(() => {
    return searchParams.get("purposes")?.split(",").map(p => p.trim().toLowerCase()) || [];
  }, [searchParams]);
  
  const selectedCategory = tier || searchParams.get("category");

  // State for API data and filters
  const [pcProducts, setPcProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePurposeFilter, setActivePurposeFilter] = useState(null); // null = all, or Gaming, Work, Multimedia
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0); // Track cart items

  // Check cart on mount and when returning from PreBuiltDisplay
  useEffect(() => {
    const checkCart = () => {
      const cart = JSON.parse(localStorage.getItem("prebuiltCart") || "[]");
      setCartItemCount(cart.length);
      console.log(`🛒 ProductList: Cart has ${cart.length} items`);
    };
    
    checkCart();
    
    // Also check when component receives focus (user returns from display page)
    window.addEventListener('focus', checkCart);
    return () => window.removeEventListener('focus', checkCart);
  }, [location.state]);

  // Fetch Pre-Built products from backend when filters change
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { products, monitorCount } = await fetchProductData(selectedCategory, selectedPurposes, buildSource);
        setPcProducts(products);
        setFilteredProducts(products);
        console.log(`✅ Loaded ${products.length} Pre-Built products with ${monitorCount} monitors from backend (Category: ${selectedCategory || 'All'}, Purposes: ${selectedPurposes.join(',') || 'All'}, BuildSource: ${buildSource})`);
      } catch (err) {
        console.error('❌ Error fetching Pre-Built products:', err);
        setError(err.message || 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [selectedCategory, selectedPurposes, buildSource]);

  // Filter products by purpose when filter changes
  useEffect(() => {
    if (activePurposeFilter) {
      const filtered = pcProducts.filter(product => 
        product.purposes.some(p => p.toLowerCase() === activePurposeFilter.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(pcProducts);
    }
  }, [activePurposeFilter, pcProducts]);

  const priceRanges = {
    "Starter": { min: 15000, max: 20000 },
    "Mid Tier": { min: 21000, max: 30000 },
    "High Tier": { min: 31000, max: 50000 },
    "Elite": { min: 51000, max: 85000 },
  };

  // Use filteredProducts for display
  const filteredByCategoryPriceAndPurpose = useMemo(() => {
    return filteredProducts;
  }, [filteredProducts]);

  // Handle purpose filter toggle
  const handlePurposeFilter = (purpose) => {
    if (activePurposeFilter === purpose) {
      setActivePurposeFilter(null); // Clear filter if clicking same purpose
    } else {
      setActivePurposeFilter(purpose);
    }
    setShowFilterMenu(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="product-list-container">
        <div className="product-list-header">
          <div className="product-list-header-content">
            <img src={getTierImage(tier)} alt="Loading" className="product-list-icon" />
            <div className="product-list-header-text">
              <h1 className="product-list-title">
              {getHeaderTitle(buildSource)}
            </h1>
            <p className="product-list-subtitle">
              {getHeaderSubtitle(buildSource, getTierDisplayName(selectedCategory) || 'Loading...')}
              </p>
            </div>
          </div>
        </div>

        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading products...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="product-list-container">
        <div className="product-list-header">
          <div className="product-list-header-content">
            <img src={getTierImage(tier)} alt="Error" className="product-list-icon" />
            <div className="product-list-header-text">
              <h1 className="product-list-title">
              {getHeaderTitle(buildSource)}
            </h1>
            <p className="product-list-subtitle">
              {getHeaderSubtitle(buildSource, getTierDisplayName(selectedCategory) || 'Error')}
              </p>
            </div>
          </div>
        </div>

        <div className="error-state">
          <p className="error-icon">⚠️</p>
          <p className="error-text">{error}</p>
          <button 
            className="retry-button" 
            onClick={() => globalThis.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (buildSource === "preset" && (!selectedCategory || !priceRanges[selectedCategory])) {
    return (
      <div className="error-message">
        <p>Please select a valid category from the homepage.</p>
        <p>Available categories: Starter, Mid Tier, High Tier, Elite</p>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <div className="product-list-header">
        <div className="product-list-header-content">
          <img src={getTierImage(tier)} alt={`${tier} Tier`} className="product-list-icon" />
          <div className="product-list-header-text">
            <h1 className="product-list-title">
              {getHeaderTitle(buildSource)}
              <span className="category-count">({filteredByCategoryPriceAndPurpose.length})</span>
            </h1>
            <p className="product-list-subtitle">
              {getHeaderSubtitle(buildSource, getTierDisplayName(selectedCategory) || 'All')}
            </p>
          </div>
        </div>
        <div className="product-list-brands">
          <div className="product-list-brands-filter-section">
            <div className="product-list-filter-button-container">
              <button 
                className="product-list-filter-button"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <img src={filtercategory} alt="Filter" className="product-list-filter-icon" />
                <span className="product-list-filter-text">
                  {activePurposeFilter ? `${activePurposeFilter}` : "Filter Category"}
                </span>
              </button>
              {showFilterMenu && (
                <div className="product-list-filter-menu">
                  <button 
                    className={`product-list-filter-option ${activePurposeFilter ? '' : 'active'}`}
                    onClick={() => handlePurposeFilter(null)}
                  >
                    All
                  </button>
                  <button 
                    className={`product-list-filter-option ${activePurposeFilter === 'Gaming' ? 'active' : ''}`}
                    onClick={() => handlePurposeFilter('Gaming')}
                    style={{ backgroundColor: purposeColors.Gaming }}
                  >
                    Gaming
                  </button>
                  <button 
                    className={`product-list-filter-option ${activePurposeFilter === 'Work' ? 'active' : ''}`}
                    onClick={() => handlePurposeFilter('Work')}
                    style={{ backgroundColor: purposeColors.Work }}
                  >
                    Work
                  </button>
                  <button 
                    className={`product-list-filter-option ${activePurposeFilter === 'Multimedia' ? 'active' : ''}`}
                    onClick={() => handlePurposeFilter('Multimedia')}
                    style={{ backgroundColor: purposeColors.Multimedia }}
                  >
                    Multimedia
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="product-build-grid">
        {filteredByCategoryPriceAndPurpose.length > 0 ? (
          filteredByCategoryPriceAndPurpose.map((product) => (
            <button
              type="button"
              className="product-build-card"
              key={product.id}
              onClick={() => {
                console.log('🔍 Product Card Clicked:', product.name, product.id);
                console.log('🔍 Navigate function:', typeof navigate);
                console.log('🔍 Full product data:', product);
                navigate("/prebuilt-display", { 
                  state: { 
                    product,
                    buildSource: buildSource // Pass buildSource (preset/community)
                  } 
                });
              }}
            >
              {/* Recommendation Badge */}
              {product.isAIRecommended && (
                <div className="ai-recommendation-badge">
                  <span className="ai-badge">LOCAL</span>
                  <span className="recommendation-text">Recommended</span>
                </div>
              )}
              
              {/* Score Display */}
              {product.aiScore && product.aiScore > 0 && (
                <div className="ai-score-display">
                  <span className="score-value">{Math.round(product.aiScore)}</span>
                  <span className="score-label">Match Score</span>
                </div>
              )}

              <div className="image-container">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-build-image"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    console.error('❌ Image failed to load:', product.image);
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="image-placeholder">Image not available</div>';
                  }}
                  onLoad={(e) => {
                    console.log('✅ Image loaded:', product.image);
                    e.target.style.opacity = '1';
                  }}
                  style={{ opacity: 0, transition: 'opacity 0.3s ease-in-out' }}
                />
              </div>
              
              <div className="purpose-build-tags">
                {product.purposes.map((purpose) => (
                  <span
                    key={purpose}
                    className="purpose-build-tag"
                    style={{ backgroundColor: purposeColors[purpose] }}
                  >
                    {purpose}
                  </span>
                ))}
              </div>
              
              <div className="product-build-info">
                <h3 className="product-build-name">{product.name}</h3>
                <p className="product-build-price">₱{product.price.toLocaleString()}</p>
                
                {/* Analysis Display */}
                {product.aiAnalysis && (
                  <div className="ai-analysis">
                    <p className="ai-category">{product.aiAnalysis.category}</p>
                    <div className="ai-strengths">
                      {product.aiAnalysis.strengths.map((strength, index) => (
                        <span key={`strength-${index}-${strength.slice(0, 15)}`} className="ai-strength-tag">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="no-products-message">
            <p>No products found matching your criteria.</p>
            <p>Category: {selectedCategory}</p>
            <p>Purposes: {selectedPurposes.join(", ") || "Any"}</p>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <footer className="product-list-footer">
        <div className="product-list-action-buttons">
          <button className="product-list-cancel-order" onClick={() => navigate(-1)}>
            Back
          </button>
          {cartItemCount > 0 && (
            <button 
              className="product-list-proceed-button" 
              onClick={() => {
                const cart = JSON.parse(localStorage.getItem("prebuiltCart") || "[]");
                navigate('/peripherals-prompt', {
                  state: {
                    from: buildSource, // 'preset' or 'community'
                    buildType: 'prebuilt',
                    prebuiltCart: cart,
                    buildSource: buildSource
                  }
                });
              }}
            >
              Proceed ({cartItemCount} {cartItemCount === 1 ? 'item' : 'items'})
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default ProductList;
