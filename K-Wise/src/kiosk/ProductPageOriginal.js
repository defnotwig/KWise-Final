import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./ProductPage.css"; // Ensure you have the correct CSS file
import { menuItems } from "./PCCustomized.js";
import { stockAPI } from "../services/api"; // Import stockAPI for database access

// Import default images
import CPU1 from "../assets/CPU1.webp";
import GPU1 from "../assets/GPU1.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import PSU1 from "../assets/PSU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";



// Default category images mapping
const defaultCategoryImages = {
  cpu: CPU1,
  gpu: GPU1,
  motherboard: Motherboard1,
  memory: Ram,
  ram: Ram,
  storage: Storage1,
  monitor: GPU1,
  keyboard: CPU1,
  mouse: CPU1,
  headphones: CPU1,
  speakers: CPU1,
  webcam: CPU1,
  peripherals: GPU1,
  default: CPU1
};


function ProductPage() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);

  // Helper function to safely render specifications
  const renderSpecifications = (specs) => {
    if (!specs) return 'No specifications available';
    
    if (typeof specs === 'string') {
      return specs;
    }
    
    if (typeof specs === 'object') {
      // Helper function to format nested values
      const formatValue = (value) => {
        if (value == null || value === '') return '';
        
        // Handle nested objects (like {eps: 8, main: 24})
        if (typeof value === 'object' && !Array.isArray(value)) {
          return Object.entries(value)
            .filter(([k, v]) => v != null && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        
        return String(value);
      };
      
      // Convert object to readable string
      return Object.entries(specs)
        .filter(([key, value]) => value != null && value !== '')
        .map(([key, value]) => {
          const formattedValue = formatValue(value);
          return formattedValue ? `${key.replace(/_/g, ' ')}: ${formattedValue}` : '';
        })
        .filter(entry => entry !== '')
        .join(' | ');
    }
    
    return 'No specifications available';
  };

  // Get product data from navigation state (from PC-Parts.js)
  const stateProduct = location.state?.product;
  const stateCategory = location.state?.category;

  // Get previous category index from state (default to 0 if undefined)
  const previousCategory = location.state?.previousCategory ?? 0

  // Extract category and index from productId only if productId exists
  let category = stateCategory || 'unknown';
  let index = 0;
  
  if (productId && typeof productId === 'string' && productId.length > 0) {
    try {
      const lastHyphen = productId.lastIndexOf("-");
      if (lastHyphen !== -1) {
        category = productId.slice(0, lastHyphen);
        index = productId.slice(lastHyphen + 1);
      } else {
        // No hyphen found, use entire productId as category
        category = productId;
      }
    } catch (error) {
      console.warn("Error parsing productId:", productId, error);
      category = stateCategory || 'unknown';
    }
  }

  // Normalize category keys from other sources
  if (category === 'cpucooler') category = 'cpu-cooler';

  // Find the category in menuItems
  const categoryData = menuItems.find((item) => item.category === category);

  // Get the product details based on index or from navigation state
  const product = categoryData?.products?.[Number(index)];

  // Use state data from PC-Parts navigation if available, otherwise use legacy product data
  const stateData = stateProduct ? {
    name: stateProduct.name,
    price: stateProduct.price,
    image: stateProduct.imageUrl || stateProduct.image,
    details: stateProduct.description || "No details available.",
    specifications: stateProduct.specifications || "No specifications provided.",
    brand: stateProduct.brand,
    stock: stateProduct.stock,
    onSale: stateProduct.onSale,
    salePrice: stateProduct.salePrice,
    saleInfo: stateProduct.saleInfo
  } : (location.state ? {
      name: location.state.productName ?? location.state.name,
      price: location.state.productPrice ?? location.state.price,
      image: location.state.productImage ?? location.state.image,
      details: location.state.details,
      specifications: location.state.specifications
    } : null);

  const productDetails = product || stateData || {
    name: "Unknown Product",
    price: "₱0.00",
    image: CPU1,
    details: "No details available.",
    specifications: "No specifications provided."
  };


  // Track which product is currently displayed without changing compatibility list
  // const [displayedProduct, setDisplayedProduct] = useState(productDetails); // ✅ Disabled - using productDetails directly




  //Function for every time they add-to-cart it will count
  // Convert price from string (e.g., "₱1000") to number
  const productPrice = typeof productDetails.price === 'number'
    ? productDetails.price
    : parseFloat(String(productDetails.price || '').replace(/[^0-9.]/g, "")) || 0;

  // Manage quantity state
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(productPrice);

  // Keep total price in sync when product or quantity changes
  useEffect(() => {
    setTotalPrice(productPrice * quantity);
  }, [productPrice, quantity]);

  // Handle quantity change
  const handleIncrease = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    setTotalPrice(newQuantity * productPrice);
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      setTotalPrice(newQuantity * productPrice);
    }
  };

  // Function for adding item to cart
  const addToCart = () => {
    const newItem = {
      ...productDetails,
      quantity: quantity || 1,
      totalPrice: totalPrice || (productDetails.price * (quantity || 1)),
      uniqueId: Date.now() // Unique identifier for each cart item
    };

    let updatedCart = [...cart];

    // Check if the product already exists in the cart (filter out null items)
    const existingIndex = updatedCart.findIndex(item => item && item.name === newItem.name);
    if (existingIndex !== -1) {
      // Update existing item quantity and total price
      updatedCart[existingIndex].quantity += quantity;
      updatedCart[existingIndex].totalPrice += totalPrice;
    } else {
      updatedCart.push(newItem);
    }

    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    // Cart icon will update automatically via React state management

    navigate("/pc-parts", { state: { selectedCategory: previousCategory } });
  };




  // ✅ AI-POWERED COMPATIBLE WITH SECTION 
  // Uses Ollama Deepseek R1 for intelligent hardware compatibility analysis
  const [compatibleProducts, setCompatibleProducts] = useState([]);
  const [loadingCompatible, setLoadingCompatible] = useState(false);
  const [aiCompatibilityEnabled, setAiCompatibilityEnabled] = useState(false);

  // Category mapping for database queries (stable objects to avoid useEffect re-runs)
  const categoryMapping = React.useMemo(() => ({
    cpu: 'CPU',
    graphcard: 'GPU', 
    gpu: 'GPU',
    motherboard: 'Motherboard',
    ram: 'RAM',
    memory: 'RAM',
    storage: 'Storage',
    'power supply': 'PSU',
    psu: 'PSU',
    case: 'Case'
  }), []);

  // Default images for categories (stable object)
  const categoryImages = React.useMemo(() => ({
    CPU: CPU1,
    GPU: GPU1,
    Motherboard: Motherboard1,
    RAM: Ram,
    Storage: Storage1,
    PSU: PSU1,
    Case: SystemUnit1
  }), []);

  // Generate compatible products from database
  useEffect(() => {
    const loadCompatibleProducts = async () => {
      try {
        setLoadingCompatible(true);
        console.log('🔧 Loading AI-Powered Compatible With products for:', productDetails.name);
        
        // Prepare current product data for AI analysis
        const currentProduct = {
          id: stateProduct?.id || productDetails.id || 1,
          name: productDetails.name,
          category: categoryMapping[category.toLowerCase()] || category.toUpperCase(),
          brand: productDetails.brand || stateProduct?.brand || 'Unknown',
          price: parseFloat(String(productDetails.price || '').replace(/[^0-9.]/g, '')) || 0,
          specifications: productDetails.specifications || stateProduct?.specifications || {}
        };

        console.log('🤖 Current product for AI analysis:', currentProduct);

        let compatibleItems = [];

        try {
          // Try AI-powered compatibility analysis first
          const aiResponse = await stockAPI.analyzeCompatibility(currentProduct);
          console.log('🤖 AI Compatibility Response:', aiResponse.data);
          
          if (aiResponse.data.success && aiResponse.data.data.length > 0) {
            setAiCompatibilityEnabled(true);
            compatibleItems = aiResponse.data.data.map(product => ({
              id: `ai-${product.category.toLowerCase()}-${product.id}`,
              name: product.name,
              price: `₱${parseFloat(product.price).toLocaleString()}`,
              image: product.image_url || categoryImages[product.category] || CPU1,
              category: product.category,
              dbProduct: product,
              stock_quantity: product.stock_quantity,
              compatibility_score: product.compatibility_score || 85,
              compatibility_reason: product.compatibility_reason || 'AI verified compatibility'
            }));
            
            console.log('✅ AI Analysis: Found', compatibleItems.length, 'compatible products');
          } else {
            throw new Error('AI analysis returned no results');
          }
        } catch (aiError) {
          console.warn('⚠️ AI compatibility analysis failed, using fallback:', aiError.message);
          setAiCompatibilityEnabled(false);
          
          // Fallback to original database-driven approach
          // All possible PC component categories
          const allCategories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case'];
          
          // Get current product's category in database format
          const currentDbCategory = categoryMapping[category.toLowerCase()] || category.toUpperCase();
          
          // Filter out current product's category (don't show same category in compatible)
          const compatibleCategories = allCategories.filter(cat => cat !== currentDbCategory);
          
          console.log(`🎯 Current category: ${currentDbCategory}, Compatible categories:`, compatibleCategories);
          
          // Fetch products for each compatible category
          for (const dbCategory of compatibleCategories) {
            try {
              const response = await stockAPI.getAll({
                category: dbCategory,
                page: 1,
                limit: 50, // Get enough to find the best one
                inStock: true, // Only available items
                sort: 'price',
                order: 'DESC' // Most expensive first
              });
              
              const products = response.data?.data || response.data || [];
              console.log(`📦 Found ${products.length} products in ${dbCategory}`);
              
              if (products.length > 0) {
                // Get the most expensive available item from this category
                const bestProduct = products[0]; // First item (most expensive due to DESC sort)
                
                compatibleItems.push({
                  id: `db-${dbCategory.toLowerCase()}-${bestProduct.id}`,
                  name: bestProduct.name,
                  price: `₱${parseFloat(bestProduct.price).toLocaleString()}`,
                  image: bestProduct.image_url || categoryImages[dbCategory] || CPU1,
                  category: dbCategory,
                  dbProduct: bestProduct, // Store original DB product for navigation
                  stock_quantity: bestProduct.stock_quantity
                });
                
                console.log(`✅ Added ${dbCategory}: ${bestProduct.name} - ${bestProduct.price}`);
              } else {
                console.log(`⚠️ No products found in ${dbCategory}`);
              }
            } catch (error) {
              console.error(`❌ Error loading ${dbCategory} products:`, error);
            }
          }
          
          console.log(`🎉 Loaded ${compatibleItems.length} compatible products from database`);
        }
        
        setCompatibleProducts(compatibleItems);
        
      } catch (error) {
        console.error('❌ Error loading compatible products:', error);
        setCompatibleProducts([]); // Fallback to empty array
      } finally {
        setLoadingCompatible(false);
      }
    };

    // Only load if we have a valid category
    if (category && category !== 'unknown' && category !== 'home') {
      loadCompatibleProducts();
    }
  }, [category, categoryMapping, categoryImages]); // Include dependencies

  // Handle compatible product click - navigate to actual product page
  const handleCompatibleProductClick = (compatibleItem) => {
    if (!compatibleItem.dbProduct) {
      console.error('❌ No database product data available');
      return;
    }

    console.log('🔗 Compatible product clicked:', compatibleItem.name);
    
    // Create product ID for navigation (category-productId format expected by routing)
    const dbCategory = compatibleItem.category.toLowerCase();
    const productId = `${dbCategory}-${compatibleItem.dbProduct.id}`;
    
    // Navigate to product page with database product data
    navigate(`/product/${productId}`, {
      state: {
        product: {
          name: compatibleItem.dbProduct.name,
          price: compatibleItem.dbProduct.price,
          image: compatibleItem.dbProduct.image_url,
          imageUrl: compatibleItem.dbProduct.image_url,
          description: compatibleItem.dbProduct.description || "No description available.",
          specifications: compatibleItem.dbProduct.specifications || "No specifications provided.",
          brand: compatibleItem.dbProduct.brand,
          stock: compatibleItem.dbProduct.stock_quantity,
          category: compatibleItem.category
        },
        category: dbCategory,
        previousCategory: previousCategory
      }
    });
  };

  const compatibleItems = compatibleProducts;


  return (
    <div className="product-page-container">
      <img
        src={productDetails.image || defaultCategoryImages[productDetails.category?.toLowerCase()] || CPU1}
        alt={productDetails.name}
        className="product-image"
        onError={(e) => {
          e.target.src = defaultCategoryImages[productDetails.category?.toLowerCase()] || CPU1;
        }}
      />
      <div className="product-container">
        <div className="product-info">
          <h1 className="product-title">{productDetails.name}</h1>
          <p className="product-price">
            ₱{(() => {
              const val = typeof productDetails.price === 'number'
                ? productDetails.price
                : parseFloat(String(productDetails.price || '').replace(/[^\d.]/g, '')) || 0;
              return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            })()}
          </p>
        </div>
        <div className="details-specs">
          <p className="details">➤ {productDetails.details}</p>
          <p className="details-text"></p>
          <p className="specifications">➤ {renderSpecifications(productDetails.specifications)}</p>
          <p className="specs-text"></p>
        </div>
      </div>

      {/* Compatible Components Section */}
      <div className="compatible-section">
        <h2 className="compatible-title">Compatible With</h2>
        <div className="compatible-container">
          {loadingCompatible ? (
            <div className="compatible-loading">Loading compatible products...</div>
          ) : compatibleItems.length > 0 ? (
            compatibleItems.map((component, index) => (
              <div
                key={component.id}
                className="compatible-item"
                onClick={() => handleCompatibleProductClick(component)}
                style={{ cursor: "pointer" }}
              >
                <img 
                  src={component.image} 
                  alt={component.name} 
                  className="compatible-image"
                  onError={(e) => {
                    // Fallback to category default image
                    e.target.src = categoryImages[component.category] || CPU1;
                  }}
                />
                <p className="compatible-name">{component.name}</p>
                <p className="compatible-price">{component.price}</p>
                {component.stock_quantity && (
                  <p className="compatible-stock">Stock: {component.stock_quantity}</p>
                )}
              </div>
            ))
          ) : (
            <div className="compatible-empty">No compatible products available</div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="productPage-bottom-section">
        <div className="productPage-process-container">
          <div className="productPage-quantity-selector">
            <button className="productPage-decrease" onClick={handleDecrease}>-</button>
            <div className="productPage-quantity">{quantity}</div>
            <button className="productPage-increase" onClick={handleIncrease}>+</button>
          </div>

          <div className="productPage-action-buttons">
            <button
              className="productPage-cancel-item"
              onClick={() =>
                navigate("/pc-parts", {
                  state: { selectedCategory: previousCategory },
                })
              }
            >
              Cancel Item
            </button>

            <button className="productPage-add-to-order" onClick={addToCart}>
              Add to Order
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ProductPage;