// ProductPageCustom.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./ProductPageCustom.css";
import Stats from "../assets/Stats.webp";
import { menuItems, updateCartIcon } from "./PCCustomized.js";
import { formatSpecifications } from '../utils/categoryHelpers';

// Import component images for compatible products
import CPU1 from "../assets/CPU1.webp";
import GPU1 from "../assets/GPU1.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import PSU1 from "../assets/PSU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";

function ProductPageCustom() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const previousCategory = location.state?.previousCategory ?? 0;

  const [category, index] = productId.split("-");
  const categoryData = menuItems.find((item) => item.category === category);
  const product = categoryData?.products?.[Number(index)];
  const productDetails = product || location.state || {
    name: "Unknown Product",
    price: "₱0.00",
    image: "./assets/default.png",
    details: "No details available.",
    specifications: "No specifications provided."
  };

  const productPrice = parseFloat(productDetails.price.replace("₱", "").replace(",", "")) || 0;
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(productPrice);
  const [compatibleComponents, setCompatibleComponents] = useState([]);
  const [isLoadingCompatible, setIsLoadingCompatible] = useState(true);
  const [aiCompatibilityEnabled, setAiCompatibilityEnabled] = useState(false);
  const [compatibilityError, setCompatibilityError] = useState(null);

  // ROOT CAUSE FIX: Replace hardcoded fake AI data with real API calls
  useEffect(() => {
    const fetchCompatibleComponents = async () => {
      console.log('🔗 Fetching AI-powered compatible components for:', productDetails.name);
      setIsLoadingCompatible(true);
      setCompatibilityError(null);
      
      try {
        // Call real AI compatibility API
        const response = await fetch('http://localhost:5000/api/compatibility/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentProduct: {
              id: productDetails.id,
              name: productDetails.name,
              category: productDetails.category,
              price: productDetails.price,
              specifications: productDetails.specifications
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ AI Compatibility API Response:', data);

        if (data.success && data.data && Array.isArray(data.data)) {
          // Map API response to component format
          const compatibleItems = data.data.slice(0, 6).map((product, index) => ({
            id: product.id || `compatible-${product.category}-${index}`,
            name: product.name,
            price: `₱${parseFloat(product.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            image: getCategoryImage(product.category),
            category: product.category,
            compatibilityScore: product.compatibility_score || product.score || 0,
            aiReasoning: product.reasoning || product.ai_reasoning || ''
          }));

          setCompatibleComponents(compatibleItems);
          setAiCompatibilityEnabled(data.cached === false && data.source === 'ai');
          
          console.log(`✅ Loaded ${compatibleItems.length} AI-powered compatible components`);
          console.log(`   AI Enabled: ${data.source === 'ai' ? 'YES' : 'NO (fallback)'}`);
          console.log(`   Cached: ${data.cached === true ? 'YES' : 'NO'}`);
          
        } else {
          throw new Error(data.message || 'Invalid API response format');
        }
        
      } catch (error) {
        console.error('❌ AI Compatibility API failed:', error.message);
        setCompatibilityError(error.message);
        
        // Fallback: Use basic compatibility logic
        console.log('⚠️ Using fallback compatibility logic');
        const fallbackItems = await fetchBasicCompatibility(productDetails);
        setCompatibleComponents(fallbackItems);
        setAiCompatibilityEnabled(false);
        
      } finally {
        setIsLoadingCompatible(false);
      }
    };

    // Helper: Get category-specific placeholder image
    const getCategoryImage = (category) => {
      const imageMap = {
        'CPU': CPU1,
        'GPU': GPU1,
        'Motherboard': Motherboard1,
        'RAM': Ram,
        'Storage': Storage1,
        'PSU': PSU1,
        'Case': SystemUnit1
      };
      return imageMap[category] || CPU1;
    };

    // Helper: Fallback compatibility logic (non-AI)
    const fetchBasicCompatibility = async (product) => {
      try {
        // Fetch products from other categories (simple approach)
        const categories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case'];
        const compatibleCategories = categories.filter(cat => cat !== product.category);
        
        const items = [];
        for (const category of compatibleCategories.slice(0, 6)) {
          try {
            const res = await fetch(`http://localhost:5000/api/stock?category=${category}&page=1&limit=1&sort=popularity&order=DESC`);
            const stockData = await res.json();
            
            if (stockData.success && stockData.data && stockData.data.length > 0) {
              const topProduct = stockData.data[0];
              items.push({
                id: topProduct.id,
                name: topProduct.name,
                price: `₱${parseFloat(topProduct.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                image: getCategoryImage(category),
                category: category,
                compatibilityScore: 60,
                aiReasoning: 'Basic compatibility (AI unavailable)'
              });
            }
          } catch (err) {
            console.error(`Failed to fetch ${category}:`, err.message);
          }
        }
        
        return items;
      } catch (error) {
        console.error('Fallback compatibility failed:', error);
        return [];
      }
    };

    // Fetch compatible components when product changes
    if (productDetails && productDetails.id) {
      fetchCompatibleComponents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetails.id, productDetails.name, productDetails.category]);

  const handleIncrease = () => {
    setQuantity(quantity + 1);
    setTotalPrice((quantity + 1) * productPrice);
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
      setTotalPrice((quantity - 1) * productPrice);
    }
  };

  const addToCart = () => {
    const productWithQuantity = { ...productDetails, quantity, totalPrice };
    const updatedCart = [...cart, productWithQuantity];
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setCart(updatedCart);
    updateCartIcon();

    setTimeout(() => {
      navigate("/pc-customized", { state: { selectedCategory: previousCategory } });
    }, 500);
  };

  return (
    <div className="productPage-container">
      <img src={productDetails.image} alt={productDetails.name} className="product-image" />
      <div className="product-container">
        <div className="product-info">
          <h1 className="product-title">{productDetails.name}</h1>
          <p className="product-price">{productDetails.price}</p>
        </div>
        <div className="details-specs">
          <p className="details">➤ {productDetails.details}</p>
          <p className="details-text"></p>
          <p className="specifications">
            ➤ {typeof productDetails.specifications === 'string' 
                ? productDetails.specifications 
                : formatSpecifications(productDetails.specifications)}
          </p>
          <p className="specs-text"></p>
        </div>
      </div>

      <div className="productPage-compatible-section">
        <h2 className="productPage-compatible-title">
          🔗 Compatible With 
          {aiCompatibilityEnabled && <span className="ai-badge">🤖 AI</span>}
          {isLoadingCompatible && <span className="ai-loading">🔄</span>}
        </h2>
        {compatibilityError && (
          <div style={{ 
            padding: '10px', 
            margin: '10px 0', 
            backgroundColor: '#fff3cd', 
            color: '#856404', 
            borderRadius: '5px',
            fontSize: '14px',
            border: '1px solid #ffeaa7'
          }}>
            ⚠️ AI compatibility temporarily unavailable: {compatibilityError}
            <br />
            <small>Showing basic compatibility matches</small>
          </div>
        )}
        <div className="productPage-compatible-container">
          {compatibleComponents.slice(0, 6).map((component) => (
            <div
              key={component.id}
              className="productPage-compatible-item"
              onClick={() =>
                navigate(`/productpage-custom/${component.id}`, {
                  state: {
                    productName: component.name,
                    productPrice: component.price,
                    productImage: component.image,
                    previousCategory: previousCategory,
                  },
                })
              }
              style={{ cursor: "pointer" }}
            >
              <img src={component.image} alt={component.name} className="productPage-compatible-image" />
              <p className="productPage-compatible-name">{component.name}</p>
              <p className="productPage-compatible-price">{component.price}</p>
              {component.aiCompatibility && (
                <div className="ai-compatibility-tooltip" title={component.aiCompatibility}>
                  🤖 AI Verified
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="productPage-bottom-section">
        <div className="productPage-stats-icon">
          <img src={Stats} alt="Statistics Icon" />
          <p>STATISTICS</p>
        </div>
        <div className="productPage-process-container">
          <div className="productPage-quantity-selector">
            <button className="productPage-decrease" onClick={handleDecrease}>-</button>
            <div className="productPage-quantity">{quantity}</div>
            <button className="productPage-increase" onClick={handleIncrease}>+</button>
          </div>
          <div className="productPage-action-buttons">
            <button
              className="productPage-cancel-item"
              onClick={() => navigate("/pc-customized", { state: { selectedCategory: previousCategory } })}
            >
              Cancel Item
            </button>
            <button className="productPage-add-to-order" onClick={addToCart}>Add to Order</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductPageCustom;
