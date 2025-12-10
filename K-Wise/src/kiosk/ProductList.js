import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProductList.css";
import BuildPC from "../assets/BuildPC.webp";
import BronzeTier from "../assets/Bronze.webp";
import SilverTier from "../assets/Silver.webp";
import GoldTier from "../assets/Gold.webp";
import DiamondTier from "../assets/Diamond.webp";
import filtercategory from "../assets/ProductList/filtercategory.svg";
import { getApiBaseUrl } from "../utils/networkConfig";
// AI service temporarily disabled - getPreBuiltRecommendations() not implemented
// import aiService from "../api/aiService";

// Removed unused static pcProducts array and image imports - data now comes from backend API

// Purpose colors for UI display
const purposeColors = {
  Gaming: "#003FE0",
  Work: "#E0005D",
  Multimedia: "#E05A00",
};

const ProductList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get tier and buildSource from navigation state
  const tier = location.state?.tier || new URLSearchParams(location.search).get("category");
  const buildSource = location.state?.buildSource || "preset"; // preset or community
  
  // Get tier image based on selection
  const getTierImage = (tierName) => {
    const tierImages = {
      "Starter": BronzeTier,
      "Mid Tier": SilverTier,
      "High Tier": GoldTier,
      "Elite": DiamondTier
    };
    return tierImages[tierName] || BuildPC;
  };
  
  // Get tier display name for subtitle
  const getTierDisplayName = (tierName) => {
    const tierDisplayNames = {
      "Starter": "Bronze Tier",
      "Mid Tier": "Silver Tier",
      "High Tier": "Gold Tier",
      "Elite": "Diamond Tier"
    };
    return tierDisplayNames[tierName] || tierName;
  };
  
  // Get tier price range for community subtitle
  // eslint-disable-next-line no-unused-vars
  const getTierPriceRange = (tierName) => {
    const tierPriceRanges = {
      "Starter": "₱15,000 - ₱20,000",
      "Mid Tier": "₱21,000 - ₱30,000",
      "High Tier": "₱31,000 - ₱50,000",
      "Elite": "₱51,000 - ₱85,000"
    };
    return tierPriceRanges[tierName] || "";
  };
  
  const searchParams = new URLSearchParams(location.search);
  
  // Memoize selectedPurposes to prevent infinite loop - only recreate when URL changes
  const selectedPurposes = useMemo(() => {
    return searchParams.get("purposes")?.split(",").map(p => p.trim().toLowerCase()) || [];
  }, [searchParams.get("purposes")]); // eslint-disable-line react-hooks/exhaustive-deps
  
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
    const fetchPreBuiltProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiBaseUrl = getApiBaseUrl();
        
        // Build query parameters for backend filtering
        const params = new URLSearchParams();
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }
        if (selectedPurposes.length > 0) {
          params.append('purposes', selectedPurposes.join(','));
        }
        // Add buildSource parameter to differentiate preset vs community
        params.append('buildSource', buildSource);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        
        // Fetch Pre-Built products and Monitors in parallel
        const [prebuiltResponse, monitorsResponse] = await Promise.all([
          axios.get(`${apiBaseUrl}/kiosk/prebuilt${queryString}`),
          axios.get(`${apiBaseUrl}/stock?category=Monitor`)
        ]);

        const monitors = monitorsResponse.data.data || [];
        
        // Helper function to get shuffled monitors based on tier pricing
        const getShuffledMonitorsForTier = (tier) => {
          const priceRanges = {
            'Starter': { min: 2000, max: 4500 },
            'Mid Tier': { min: 3500, max: 6000 },
            'High Tier': { min: 5000, max: 10000 },
            'Elite': { min: 8000, max: 30000 }
          };
          
          const range = priceRanges[tier] || { min: 2000, max: 10000 };
          
          // Filter monitors by price range
          const filteredMonitors = monitors.filter(m => 
            m.price >= range.min && m.price <= range.max && m.stock > 0
          );
          
          // Shuffle and take 3 random monitors
          const shuffled = [...filteredMonitors].sort(() => Math.random() - 0.5);
          return shuffled.slice(0, 3).map(monitor => ({
            id: monitor.id,
            name: monitor.name,
            price: monitor.price,
            image: `${apiBaseUrl}${monitor.image_url || monitor.image}`,
            stock: monitor.stock
          }));
        };

        // Transform backend data to match expected frontend format
        const products = prebuiltResponse.data.data.map(item => {
          const tier = item.tier || item.specifications?.buildType || 'Starter';
          
          return {
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category || tier || 'Unknown',
            tier: tier,
            purposes: item.purposes || [],
            // 🔥 FIX: Use image field from backend response (already processed by backend)
            // Backend returns 'image' field (from row.image_url in database)
            image: item.image?.startsWith('http') 
              ? item.image 
              : `http://localhost:5000${item.image || '/assets/placeholder.png'}`,
            image_url: item.image, // Keep original for reference
            stock: item.stock,
            components: item.components || [],
            specifications: item.specifications,
            addonsTitle: "Gaming Monitors Addons",
            addons: getShuffledMonitorsForTier(tier) // Real monitors with rotation
          };
        });

        setPcProducts(products);
        setFilteredProducts(products); // Initialize filtered products
        console.log(`✅ Loaded ${products.length} Pre-Built products with ${monitors.length} monitors from backend (Category: ${selectedCategory || 'All'}, Purposes: ${selectedPurposes.join(',') || 'All'}, BuildSource: ${buildSource})`);
      } catch (err) {
        console.error('❌ Error fetching Pre-Built products:', err);
        setError(err.message || 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreBuiltProducts();
  }, [selectedCategory, selectedPurposes, buildSource]); // Added buildSource dependency

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
                {buildSource === "preset" ? "PREBUILT PC'S" : "COMMUNITY"}
              </h1>
              <p className="product-list-subtitle">
                {buildSource === "preset" 
                  ? `${getTierDisplayName(selectedCategory) || 'Loading...'} Level PC Builds`
                  : "Crafted by the community"
                }
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
                {buildSource === "preset" ? "PREBUILT PC'S" : "COMMUNITY"}
              </h1>
              <p className="product-list-subtitle">
                {buildSource === "preset" 
                  ? `${getTierDisplayName(selectedCategory) || 'Error'} Level PC Builds`
                  : "Crafted by the community"
                }
              </p>
            </div>
          </div>
        </div>

        <div className="error-state">
          <p className="error-icon">⚠️</p>
          <p className="error-text">{error}</p>
          <button 
            className="retry-button" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedCategory || !priceRanges[selectedCategory]) {
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
              {buildSource === "preset" ? "PREBUILT PC'S" : "COMMUNITY"}
              <span className="category-count">({filteredByCategoryPriceAndPurpose.length})</span>
            </h1>
            <p className="product-list-subtitle">
              {buildSource === "preset" 
                ? `${getTierDisplayName(selectedCategory)} Level PC Builds`
                : `${getTierDisplayName(selectedCategory)} Level PC Builds`
              }
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
                    className={`product-list-filter-option ${!activePurposeFilter ? 'active' : ''}`}
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
            <div
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
              {/* AI Recommendation Badge */}
              {product.isAIRecommended && (
                <div className="ai-recommendation-badge">
                  <span className="ai-badge">AI</span>
                  <span className="recommendation-text">Recommended</span>
                </div>
              )}
              
              {/* AI Score Display */}
              {product.aiScore && product.aiScore > 0 && (
                <div className="ai-score-display">
                  <span className="score-value">{Math.round(product.aiScore)}</span>
                  <span className="score-label">AI Score</span>
                </div>
              )}

              <div className="image-container">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-build-image"
                  loading="eager"
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
                
                {/* AI Analysis Display */}
                {product.aiAnalysis && (
                  <div className="ai-analysis">
                    <p className="ai-category">{product.aiAnalysis.category}</p>
                    <div className="ai-strengths">
                      {product.aiAnalysis.strengths.map((strength, index) => (
                        <span key={index} className="ai-strength-tag">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
