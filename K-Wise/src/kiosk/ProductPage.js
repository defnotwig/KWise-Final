import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./ProductPage.css"; // Ensure you have the correct CSS file
import { menuItems } from "./PCCustomized.js";
import { stockAPI } from "../services/api"; // Import stockAPI for database access
import { getFullImageUrl, getServerBaseUrl } from "../utils/networkConfig"; // Network-aware image URLs
import Chest from "../assets/Chest.webp";
import glowingdiamond from "../assets/ProductPage/glowingdiamond.svg";
import deleteIcon from "../assets/PCParts/delete.svg";
import minusIcon from "../assets/PCParts/minus.svg";
import addIcon from "../assets/PCParts/add.svg";
import lightning from "../assets/ProductPage/lightning.svg";

// PHASE 2 ENHANCEMENT: Import enhanced compatibility helper and styles
import {
  loadEnhancedCompatibleProducts,
  formatCompatibilityTooltip,
  getCompatibilityBadgeClass,
  sortByCompatibilityScore,
  getCompatibilitySummary
} from '../utils/enhancedCompatibilityHelper';
import '../styles/EnhancedCompatibility.css';

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

//Function for a notification in cart-icon
export const updateCartIcon = () => {
  console.log(document.querySelector(".cart-icon"))
  const cartIcon = document.querySelector(".cart-icon");
  if (!cartIcon) return; // Prevent errors if cart icon is not found

  const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
  // Filter out null/undefined items before reducing
  const cartCount = cartItems
    .filter(item => item && typeof item === 'object')
    .reduce((acc, item) => acc + (item.quantity || 0), 0);
  cartIcon.setAttribute("data-count", cartCount);
};


function ProductPage() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  //Fucntion to notify the products being added to cart
  const [cartCount, setCartCount] = useState(0);
  const [expandedCompatibleProducts, setExpandedCompatibleProducts] = useState({}); // Track which compatible products show full controls
  const [expandTimers, setExpandTimers] = useState({}); // Track timers for auto-collapse
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false); // Track if details section is expanded
  
  // Stock validation modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMessage, setStockModalMessage] = useState('');

  useEffect(() => {
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    // Filter out null/undefined items before reducing
    const cartCount = cartItems
      .filter(item => item && typeof item === 'object')
      .reduce((acc, item) => acc + (item.quantity || 0), 0);
    setCartCount(cartCount); // ✅ Use cartCount instead of totalItems
  }, [cart]);


  // Helper function to check if text has more than 15 words
  const hasMoreThanTwoSentences = (text) => {
    if (!text || typeof text !== 'string') return false;
    // Split by whitespace to count words
    const words = text.trim().split(/\s+/);
    // Show "more..." if there are more than 15 words
    return words.length > 15;
  };

  // Helper function to get first 15 words
  const getFirstTwoSentences = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Split by whitespace to count words
    const words = text.trim().split(/\s+/);
    if (words.length <= 15) return text;
    // Return only the first 15 words
    return words.slice(0, 15).join(' ') + '';
  };

  // Helper function to safely render specifications as a table
  const renderSpecifications = (specs) => {
    if (!specs) {
      return (
        <div className="specs-empty">No specifications available</div>
      );
    }
    
    if (typeof specs === 'string') {
      return (
        <div className="specs-string">{specs}</div>
      );
    }
    
    if (typeof specs === 'object') {
      // Helper function to convert value to string
      const formatValue = (value) => {
        if (value == null || value === '') return '';
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        if (typeof value === 'object') {
          // Handle nested objects (like {eps: 8, main: 24})
          if (Array.isArray(value)) {
            return value.join(', ');
          }
          // Convert object to readable string
          return Object.entries(value)
            .filter(([k, v]) => v != null && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        }
        return String(value);
      };
      
      const entries = Object.entries(specs)
        .filter(([key, value]) => value != null && value !== '');
      
      if (entries.length === 0) {
        return (
          <div className="specs-empty">No specifications available</div>
        );
      }
      
      return (
        <table className="specs-table">
          <tbody>
            {entries.map(([key, value], index) => {
              const formattedValue = formatValue(value);
              if (!formattedValue) return null;
              
              return (
                <tr key={index}>
                  <td className="specs-label">{key.replace(/_/g, ' ')}</td>
                  <td className="specs-value">{formattedValue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    
    return (
      <div className="specs-empty">No specifications available</div>
    );
  };

  // Basic compatibility checking for fallback scenarios
  // eslint-disable-next-line no-unused-vars
  const checkBasicCompatibility = (currentProduct, candidateProduct, currentCategory, candidateCategory) => {
    // Same category products are never compatible
    if (currentCategory === candidateCategory) return { compatible: false, reason: 'Same category' };
    
    // Handle specifications - could be string or object (jsonb)
    const getSpecString = (specs) => {
      if (!specs) return '';
      if (typeof specs === 'string') return specs.toLowerCase();
      if (typeof specs === 'object') {
        return JSON.stringify(specs).toLowerCase();
      }
      return String(specs).toLowerCase();
    };
    
    const currentSpecs = getSpecString(currentProduct.specifications);
    const candidateSpecs = getSpecString(candidateProduct.specifications);
    const currentName = (currentProduct.name || '').toLowerCase();
    const candidateName = (candidateProduct.name || '').toLowerCase();
    
    // Basic compatibility rules with scoring
    switch (`${currentCategory}-${candidateCategory}`) {
      case 'CPU-Motherboard':
      case 'Motherboard-CPU':
        // Check socket compatibility
        if ((currentSpecs.includes('lga1700') || currentName.includes('12th') || currentName.includes('13th')) && 
            (candidateSpecs.includes('lga1700') || candidateName.includes('lga1700'))) {
          return { compatible: true, reason: 'Socket match: LGA1700', score: 95 };
        }
        if ((currentSpecs.includes('am5') || currentName.includes('7000') || currentName.includes('ryzen 7')) && 
            (candidateSpecs.includes('am5') || candidateName.includes('am5'))) {
          return { compatible: true, reason: 'Socket match: AM5', score: 95 };
        }
        if ((currentSpecs.includes('am4') || currentName.includes('3000') || currentName.includes('5000')) && 
            (candidateSpecs.includes('am4') || candidateName.includes('am4') || candidateName.includes('b550') || candidateName.includes('x570'))) {
          return { compatible: true, reason: 'Socket match: AM4', score: 90 };
        }
        // General motherboard/CPU compatibility
        return { compatible: true, reason: 'General CPU/Motherboard compatibility', score: 75 };
        
      case 'CPU-RAM':
      case 'RAM-CPU':
      case 'Motherboard-RAM':
      case 'RAM-Motherboard':
        // Check memory type compatibility
        if ((currentSpecs.includes('ddr5') || currentName.includes('ddr5')) && 
            (candidateSpecs.includes('ddr5') || candidateName.includes('ddr5'))) {
          return { compatible: true, reason: 'Memory type match: DDR5', score: 95 };
        }
        if ((currentSpecs.includes('ddr4') || currentName.includes('ddr4')) && 
            (candidateSpecs.includes('ddr4') || candidateName.includes('ddr4'))) {
          return { compatible: true, reason: 'Memory type match: DDR4', score: 90 };
        }
        // Default memory compatibility
        return { compatible: true, reason: 'General memory compatibility', score: 80 };
        
      case 'GPU-PSU':
      case 'PSU-GPU':
        // Power compatibility - look for wattage
        const psuWattageMatch = candidateSpecs.match(/(\d+)w/) || candidateName.match(/(\d+)w/);
        if (psuWattageMatch && parseInt(psuWattageMatch[1]) >= 650) {
          return { compatible: true, reason: `Power supply: ${psuWattageMatch[1]}W (sufficient)`, score: 90 };
        }
        return { compatible: true, reason: 'General power compatibility', score: 75 };
        
      case 'Motherboard-Case':
      case 'Case-Motherboard':
        // Form factor compatibility
        if ((currentSpecs.includes('atx') || currentName.includes('atx')) && 
            (candidateSpecs.includes('atx') || candidateName.includes('atx'))) {
          return { compatible: true, reason: 'Form factor: ATX compatible', score: 85 };
        }
        return { compatible: true, reason: 'General case compatibility', score: 75 };
        
      case 'CPU-Storage':
      case 'Motherboard-Storage':
      case 'Storage-CPU':
      case 'Storage-Motherboard':
        // Storage is generally compatible with all systems
        if (candidateSpecs.includes('nvme') || candidateName.includes('nvme') || candidateName.includes('ssd')) {
          return { compatible: true, reason: 'High-speed storage (NVMe/SSD)', score: 85 };
        }
        return { compatible: true, reason: 'General storage compatibility', score: 80 };
        
      default:
        // General compatibility for other combinations
        return { compatible: true, reason: 'General component compatibility', score: 75 };
    }
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
    id: stateProduct.id, // ✅ CRITICAL: Include product ID for filtering similar products
    name: stateProduct.name,
    price: stateProduct.price,
    image: stateProduct.imageUrl || stateProduct.image,
    // 🔥 CRITICAL FIX: Handle NULL/empty descriptions properly
    details: (stateProduct.description && stateProduct.description !== '') 
      ? stateProduct.description 
      : "No details available.",
    // 🔥 CRITICAL FIX: Handle NULL/empty specifications properly
    specifications: (stateProduct.specifications != null && stateProduct.specifications !== '') 
      ? (typeof stateProduct.specifications === 'object' && Object.keys(stateProduct.specifications).length === 0
          ? "No specifications provided."
          : stateProduct.specifications)
      : "No specifications provided.",
    brand: stateProduct.brand,
    stock: stateProduct.stock,
    onSale: stateProduct.onSale,
    salePrice: stateProduct.salePrice,
    saleInfo: stateProduct.saleInfo,
    category: stateCategory // ✅ Also include category for proper identification
  } : (location.state ? {
      id: location.state.id, // ✅ CRITICAL FIX: Include product ID for Future Upgrade API
      name: location.state.productName ?? location.state.name,
      price: location.state.productPrice ?? location.state.price,
      image: location.state.productImage ?? location.state.image,
      // 🔥 CRITICAL FIX: Add stock field from location.state
      stock: location.state.stock || 0,
      brand: location.state.brand,
      category: location.state.category,
      // 🔥 CRITICAL FIX: Handle NULL/empty data from location.state
      details: (location.state.details && location.state.details !== '') 
        ? location.state.details 
        : "No details available.",
      specifications: (location.state.specifications != null && location.state.specifications !== '') 
        ? (typeof location.state.specifications === 'object' && Object.keys(location.state.specifications).length === 0
            ? "No specifications provided."
            : location.state.specifications)
        : "No specifications provided."
    } : null);

  const productDetails = product || stateData || {
    name: "Unknown Product",
    price: "₱0.00",
    image: CPU1,
    details: "No details available.",
    specifications: "No specifications provided."
  };

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

  // ⏱️ AUTO-COLLAPSE TIMER CLEANUP - Clear all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(expandTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [expandTimers]);

  // ⏱️ START AUTO-COLLAPSE TIMER - Automatically collapse quantity controls after 5 seconds
  const startAutoCollapseTimer = (productId) => {
    // Clear existing timer for this product
    if (expandTimers[productId]) {
      clearTimeout(expandTimers[productId]);
    }

    // Set new timer
    const timerId = setTimeout(() => {
      setExpandedCompatibleProducts(prev => ({ ...prev, [productId]: false }));
      setExpandTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[productId];
        return newTimers;
      });
    }, 60000); // 5 seconds

    // Store timer ID
    setExpandTimers(prev => ({ ...prev, [productId]: timerId }));
  };

  // 🎯 SAVE COMPATIBILITY CONTEXT FOR PC-PARTS COMPATIBLE-FIRST SORTING
  useEffect(() => {
    if (stateProduct && stateCategory) {
      const context = {
        componentId: stateProduct.id,
        componentName: stateProduct.name,
        category: stateCategory,
        specs: stateProduct.specifications,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('selectedComponentContext', JSON.stringify(context));
      console.log('✅ Saved compatibility context:', context);
    }
  }, [stateProduct, stateCategory]);

  // Handle quantity change
  const handleIncrease = () => {
    // 🔒 STOCK VALIDATION: Check stock before increasing quantity
    const productStock = productDetails.stock || stateProduct?.stock || 0;
    let updatedCart = [...cart];
    const existingIndex = updatedCart.findIndex(item => item && item.name === productDetails.name);
    const currentCartQuantity = existingIndex !== -1 ? updatedCart[existingIndex].quantity : 0;
    const totalAfterIncrease = currentCartQuantity + quantity + 1;
    
    if (totalAfterIncrease > productStock) {
      setStockModalMessage(`Cannot increase quantity. Maximum available stock is ${productStock}.`);
      setShowStockModal(true);
      console.warn('⚠️ Cannot increase - stock limit:', { productStock, currentCartQuantity, currentQuantity: quantity });
      return;
    }
    
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
    // 🚨 CRITICAL FIX: Ensure ID is always present for compatibility API
    const productId = stateProduct?.id || productDetails.id || product?.id;
    
    if (!productId || productId < 1) {
      console.error('❌ Cannot add to cart: Product missing valid ID');
      setStockModalMessage('Error: This product cannot be added to cart. Please try again or contact support.');
      setShowStockModal(true);
      return;
    }
    
    // 🔒 STOCK VALIDATION: Check if product has enough stock available
    const productStock = productDetails.stock || stateProduct?.stock || 0;
    let updatedCart = [...cart];
    const existingIndex = updatedCart.findIndex(item => item && item.name === productDetails.name);
    const currentCartQuantity = existingIndex !== -1 ? updatedCart[existingIndex].quantity : 0;
    const totalRequestedQuantity = currentCartQuantity + quantity;
    
    if (totalRequestedQuantity > productStock) {
      const remaining = productStock - currentCartQuantity;
      if (remaining <= 0) {
        setStockModalMessage(`Cannot add more items. This product has no more stock available.`);
        setShowStockModal(true);
        console.warn('❌ Stock limit reached:', { productStock, currentCartQuantity, requested: quantity });
        return;
      } else {
        setStockModalMessage(`Cannot add ${quantity} items. Only ${remaining} more available in stock.`);
        setShowStockModal(true);
        console.warn('⚠️ Insufficient stock:', { productStock, currentCartQuantity, requested: quantity, remaining });
        return;
      }
    }
    
    // ✅ CRITICAL FIX: Include category and ID in cart item for compatibility analysis
    const newItem = {
      ...productDetails,
      id: productId, // Ensure ID is always present and valid
      category: stateCategory || category || productDetails.category, // Ensure category is always present
      quantity: quantity || 1,
      totalPrice: totalPrice || (productDetails.price * (quantity || 1)),
      uniqueId: Date.now(), // Unique identifier for each cart item
      stock: productStock // Store stock info for validation
    };
    
    console.log('✅ Adding to cart with ID:', productId, 'Category:', newItem.category, 'Stock:', productStock);

    // Check if the product already exists in the cart (filter out null items)
    if (existingIndex !== -1) {
      // Update existing item quantity and total price
      updatedCart[existingIndex].quantity += quantity;
      updatedCart[existingIndex].totalPrice += totalPrice;
    } else {
      updatedCart.push(newItem);
    }

    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('cartUpdated'));

    // 🎬 TRIGGER CHEST ANIMATION
    setIsAnimating(true);
    setShowDiamond(true);

    // Animation sequence
    setTimeout(() => {
      // After 2 seconds, make diamond fall into chest
      setShowDiamond(false);
    }, 2000);

    setTimeout(() => {
      // After 2.5 seconds, close chest and stay on ProductPage
      setIsAnimating(false);
    }, 2500);
  };

  // 🎬 CHEST ANIMATION STATE
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDiamond, setShowDiamond] = useState(false);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      setCart(JSON.parse(localStorage.getItem("cart")) || []);
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  // ✅ ENHANCED COMPATIBLE WITH SECTION - OPTIMIZED FOR SPEED
  const [compatibleProducts, setCompatibleProducts] = useState([]);
  const [loadingCompatible, setLoadingCompatible] = useState(false);
  const [isPeripheralProduct, setIsPeripheralProduct] = useState(false);

  // Hardware compatibility rules - FAST AND ACCURATE
  // ✅ FIX: Backend schema uses 'Cooling', not 'CPU Cooler'
  const hardwareCompatibilityRules = React.useMemo(() => ({
    'CPU': ['Cooling', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case'],
    'Cooling': ['CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case'],
    'Motherboard': ['CPU', 'Cooling', 'GPU', 'RAM', 'Storage', 'PSU', 'Case'],
    'GPU': ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case'],
    'RAM': ['CPU', 'Cooling', 'Motherboard', 'GPU', 'Storage', 'PSU', 'Case'],
    'Storage': ['CPU', 'Cooling', 'Motherboard', 'GPU', 'RAM', 'PSU', 'Case'],
    'PSU': ['CPU', 'Cooling', 'Motherboard', 'GPU', 'RAM', 'Storage', 'Case'],
    'Case': ['CPU', 'Cooling', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU']
  }), []);

  // Peripheral categories for similar items
  const peripheralCategories = React.useMemo(() => [
    'Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam', 
    'Peripherals', 'PERIPHERALS', 'peripherals' // 🔥 FIX: Add generic peripheral category names
  ], []);

  // Category mapping for database queries (stable objects to avoid useEffect re-runs)
  const categoryMapping = React.useMemo(() => ({
    cpu: 'CPU',
    'cpu-cooler': 'Cooling', // ✅ FIX: Backend schema requires 'Cooling', not 'CPU Cooler'
    'cpu cooler': 'Cooling',
    cooling: 'Cooling',
    graphcard: 'GPU', 
    gpu: 'GPU',
    motherboard: 'Motherboard',
    ram: 'RAM',
    memory: 'RAM',
    storage: 'Storage',
    'power supply': 'PSU',
    psu: 'PSU',
    case: 'Case',
    monitor: 'Monitor',
    keyboard: 'Keyboard',
    mouse: 'Mouse',
    headphones: 'Headphones',
    speakers: 'Speakers',
    webcam: 'Webcam'
    // ❌ REMOVED: peripherals: 'Peripherals' - Not a valid database category
    // Database has specific categories: Monitor, Keyboard, Mouse, Headphones, Speakers, Webcam
  }), []);

  // Default images for categories (stable object)
  const categoryImages = React.useMemo(() => ({
    CPU: CPU1,
    Cooling: CPU1, // ✅ FIX: Added Cooling category (uses CPU image as fallback)
    GPU: GPU1,
    Motherboard: Motherboard1,
    RAM: Ram,
    Storage: Storage1,
    PSU: PSU1,
    Case: SystemUnit1
  }), []);

  // FAST COMPATIBLE/SIMILAR PRODUCTS LOADING - OPTIMIZED WITH PHASE 2 ENHANCEMENT
  useEffect(() => {
    const loadCompatibleOrSimilarProducts = async () => {
      try {
        setLoadingCompatible(true);
        console.log('🚀 PHASE 2 ENHANCED: Loading compatible/similar products for:', productDetails.name);
        console.log('📋 Current product details:', {
          id: stateProduct?.id || productDetails.id,
          name: productDetails.name,
          urlCategory: category,
          stateCategory: stateProduct?.category,
          productDetailsCategory: productDetails.category
        });
        
        // 🔥 FIX: Determine current product category with improved detection
        // Priority: 1) Product category from state, 2) Product category from details, 3) URL category mapping
        let currentCategory = stateProduct?.category || productDetails.category;
        
        console.log('🔍 Initial currentCategory:', currentCategory);
        
        // If category is generic "Peripherals", try to get specific category from product name or fallback to URL
        if (!currentCategory || currentCategory === 'Peripherals' || currentCategory === 'PERIPHERALS' || currentCategory === 'peripherals') {
          // Try categoryMapping first (for PC parts)
          const mappedCategory = categoryMapping[category?.toLowerCase()];
          if (mappedCategory) {
            currentCategory = mappedCategory;
          } else {
            // For peripherals, keep the generic category (will be detected as peripheral)
            currentCategory = 'Peripherals';
          }
          console.log('🔄 Remapped currentCategory to:', currentCategory);
        }
        
        console.log('🎯 Final currentCategory:', currentCategory);
        
        // 🔥 FIX: Enhanced peripheral detection - check both specific and generic categories
        // Peripheral products can have specific categories (Monitor, Keyboard) OR generic (Peripherals)
        const isPeripheral = peripheralCategories.includes(currentCategory);
        
        console.log('🔍 Peripheral check:', {
          currentCategory,
          peripheralCategories,
          isPeripheral
        });
        
        setIsPeripheralProduct(isPeripheral);
        
        let compatibleItems = [];
        
        // 🚀 PHASE 2 ENHANCEMENT: Try enhanced compatibility API first for PC parts
        if (!isPeripheral && productDetails.id && productDetails.specifications) {
          const enhancedItems = await loadEnhancedCompatibleProducts(
            productDetails,
            currentCategory,
            categoryImages,
            CPU1
          );
          
          if (enhancedItems && enhancedItems.length > 0) {
            console.log(`✅ PHASE 2: Using ${enhancedItems.length} enhanced compatible products`);
            setCompatibleProducts(sortByCompatibilityScore(enhancedItems));
            setLoadingCompatible(false);
            
            // Log compatibility summary
            const summary = getCompatibilitySummary(enhancedItems);
            console.log('📊 Compatibility Summary:', summary);
            
            return; // Exit early - enhanced API succeeded
          }
          
          console.log('ℹ️ Enhanced API not available, using fallback');
        }
        
        if (isPeripheral) {
          // FOR PERIPHERALS: Show similar items from same/related peripheral categories
          console.log('🖥️ Loading similar peripheral items...');
          
          // 🔥 FIX: Determine the specific peripheral category for querying
          // If currentCategory is generic "Peripherals", try to detect specific category from product
          let queryCategory = currentCategory;
          if (currentCategory === 'Peripherals' || currentCategory === 'PERIPHERALS' || currentCategory === 'peripherals') {
            // Try to detect specific category from product name
            const productName = (productDetails.name || '').toLowerCase();
            if (productName.includes('monitor')) queryCategory = 'Monitor';
            else if (productName.includes('keyboard')) queryCategory = 'Keyboard';
            else if (productName.includes('mouse')) queryCategory = 'Mouse';
            else if (productName.includes('headphone') || productName.includes('headset')) queryCategory = 'Headphones';
            else if (productName.includes('speaker')) queryCategory = 'Speakers';
            else if (productName.includes('webcam') || productName.includes('camera')) queryCategory = 'Webcam';
            else queryCategory = 'Monitor'; // Default fallback
            
            console.log(`🔍 Detected specific peripheral category from product: ${queryCategory}`);
          }
          
          try {
            // STEP 1: Load MORE products from the SAME category (5-6 items)
            console.log(`🎯 Loading similar items from category: ${queryCategory}`);
            console.log(`🔍 Current product ID to exclude: ${stateProduct?.id || productDetails.id}`);
            try {
              const sameCategoryResponse = await stockAPI.getItems({
                category: queryCategory, // 🔥 FIX: Use specific category for query
                page: 1,
                limit: 12, // Get more items to filter from
                inStock: true,
                sort: 'price', // Sort by price for variety
                order: 'ASC'
              });
              
              const sameCategoryProducts = sameCategoryResponse.data?.data || sameCategoryResponse.data || [];
              console.log(`📦 Found ${sameCategoryProducts.length} products in same category: ${queryCategory}`);
              console.log(`📦 Sample products:`, sameCategoryProducts.slice(0, 3).map(p => ({ id: p.id, name: p.name })));
              
              if (sameCategoryProducts.length > 0) {
                // Get current product ID for filtering
                const currentProductId = stateProduct?.id || productDetails.id;
                
                if (!currentProductId) {
                  console.warn('⚠️ Warning: Current product ID is missing! Showing all products without filtering.');
                  console.warn('⚠️ This may cause the current product to appear in similar items.');
                } else {
                  console.log(`🔍 Filtering out current product with ID: ${currentProductId}`);
                }
                
                // Filter out current product and add up to 6 products from same category
                const filteredSameCategory = sameCategoryProducts
                  .filter(product => {
                    // If no current product ID, include all products
                    if (!currentProductId) return true;
                    
                    const shouldInclude = product.id !== currentProductId;
                    if (!shouldInclude) {
                      console.log(`🚫 Filtered out current product: ${product.name} (ID: ${product.id})`);
                    }
                    return shouldInclude;
                  })
                  .slice(0, 6);
                
                filteredSameCategory.forEach(product => {
                  const item = {
                    id: `similar-${queryCategory.toLowerCase()}-${product.id}`,
                    name: product.name,
                    price: `₱${parseFloat(product.price).toLocaleString()}`,
                    image: product.image_url ? getFullImageUrl(product.image_url) : categoryImages[queryCategory] || CPU1,
                    category: queryCategory,
                    dbProduct: product,
                    stock_quantity: product.stock || product.stock_quantity || 0,
                    compatibility_score: 95, // Higher score for same category
                    compatibility_reason: `Similar ${queryCategory} product`
                  };
                  compatibleItems.push(item);
                  console.log(`✅ Added similar product: ${item.name} (${item.id})`);
                });
                
                console.log(`✅ Total added ${filteredSameCategory.length} products from same category`);
                console.log(`📊 Compatible items array now has ${compatibleItems.length} items`);
              }
            } catch (error) {
              console.error(`❌ Error loading same category products:`, error);
            }
            
            // STEP 2: Add related peripheral categories for more variety (2 items per category)
            const relatedCategories = [];
            
            // 🔥 FIX: Use queryCategory for determining related categories
            if (queryCategory === 'Monitor') {
              relatedCategories.push('Webcam', 'Speakers');
            } else if (queryCategory === 'Keyboard') {
              relatedCategories.push('Mouse', 'Headphones');
            } else if (queryCategory === 'Mouse') {
              relatedCategories.push('Keyboard', 'Headphones');
            } else if (queryCategory === 'Headphones') {
              relatedCategories.push('Speakers', 'Mouse');
            } else if (queryCategory === 'Speakers') {
              relatedCategories.push('Headphones', 'Monitor');
            } else if (queryCategory === 'Webcam') {
              relatedCategories.push('Monitor', 'Headphones');
            }
            
            console.log('🎯 Loading from related categories:', relatedCategories);
            
            for (const cat of relatedCategories) {
              try {
                const response = await stockAPI.getItems({
                  category: cat,
                  page: 1,
                  limit: 6,
                  inStock: true,
                  sort: 'price',
                  order: 'ASC'
                });
                
                const products = response.data?.data || response.data || [];
                console.log(`📦 Found ${products.length} products in related category: ${cat}`);
                
                if (products.length > 0) {
                  // Add up to 2 products per related category for variety
                  const filteredProducts = products.slice(0, 2);
                  
                  // eslint-disable-next-line no-loop-func
                  filteredProducts.forEach(product => {
                    compatibleItems.push({
                      id: `related-${cat.toLowerCase()}-${product.id}`,
                      name: product.name,
                      price: `₱${parseFloat(product.price).toLocaleString()}`,
                      image: product.image_url ? getFullImageUrl(product.image_url) : categoryImages[cat] || CPU1,
                      category: cat,
                      dbProduct: product,
                      stock_quantity: product.stock || product.stock_quantity || 0,
                      compatibility_score: 85, // Slightly lower for related categories
                      compatibility_reason: `Related ${cat} product`
                    });
                  });
                }
              } catch (error) {
                console.error(`❌ Error loading ${cat} products:`, error);
              }
            }
            
          } catch (error) {
            console.error('❌ Error loading similar peripheral items:', error);
          }
          
        } else {
          // FOR PC COMPONENTS: Use AI-powered cached compatibility analysis
          console.log('🤖 Loading AI-powered compatible PC components (CACHED)...');
          
          try {
            // 🔧 FIX: Prepare current product with ALL required fields for backend validation
            // Extract image URL properly
            const imageUrl = productDetails.image || stateProduct?.image || '';
            
            const currentProductData = {
              id: stateProduct?.id || productDetails.id || 1,
              name: productDetails.name || 'Unknown Product',
              category: currentCategory,
              brand: productDetails.brand || stateProduct?.brand || '',
              price: parseFloat(String(productDetails.price || '0').replace(/[^0-9.]/g, "")) || 0,
              stock: stateProduct?.stock || productDetails.stock || 0,
              specifications: typeof productDetails.specifications === 'string' 
                ? productDetails.specifications 
                : (productDetails.specifications || {}),
              // Only include image_url if it's a valid non-empty string (backend validates as URI)
              ...(imageUrl && imageUrl.trim() ? { image_url: imageUrl } : {}),
              description: productDetails.description || stateProduct?.description || '',
              performance_index: productDetails.performance_index || stateProduct?.performance_index || 0,
              quantity: 1
            };

            console.log('🔍 Analyzing compatibility for:', currentProductData.name);
            console.log('📦 Sending currentProductData:', JSON.stringify(currentProductData, null, 2));

            // Use the AI-powered compatibility endpoint (with intelligent caching!)
            const aiResponse = await stockAPI.analyzeCompatibility(currentProductData);
            console.log('✅ AI Compatibility Response:', aiResponse.data);

            if (aiResponse.data.success && aiResponse.data.data.length > 0) {
              // Map AI response to compatible items format
              compatibleItems = aiResponse.data.data.map(product => ({
                id: `ai-${product.category.toLowerCase()}-${product.id}`,
                name: product.name,
                price: `₱${parseFloat(product.price).toLocaleString()}`,
                image: product.image_url ? getFullImageUrl(product.image_url) : categoryImages[product.category] || CPU1,
                category: product.category,
                dbProduct: product,
                stock_quantity: product.stock || product.stock_quantity || 0,
                compatibility_score: product.compatibility_score || 85,
                compatibility_reason: product.compatibility_reason || 'AI verified compatibility'
              }));

              console.log(`🎯 AI Analysis: Found ${compatibleItems.length} compatible products (from ${aiResponse.data.aiAnalysis?.totalCategories || 0} categories)`);
            } else {
              throw new Error('AI analysis returned no results');
            }
          } catch (aiError) {
            console.warn('⚠️ AI compatibility failed, using fallback:', aiError.message);
            
            // FALLBACK: Load exactly 1 product from each compatible category
            const compatibleCategories = hardwareCompatibilityRules[currentCategory] || [];
            console.log(`🔄 Fallback: Loading from ${compatibleCategories.length} categories`);
            
            if (compatibleCategories.length === 0) {
              console.warn('⚠️ No compatibility rules found for category:', currentCategory);
              setCompatibleProducts([]);
              setLoadingCompatible(false);
              return;
            }
            
            for (const compatCat of compatibleCategories) {
              try {
                const response = await stockAPI.getItems({
                  category: compatCat,
                  page: 1,
                  limit: 5,
                  inStock: true,
                  sort: 'price',
                  order: 'ASC'
                });
                
                const products = response.data?.data || response.data || [];
                console.log(`📦 Found ${products.length} products in ${compatCat}`);
                
                if (products.length > 0) {
                  // Get the best product from this category (first one since sorted by price)
                  const bestProduct = products[0];
                  
                  // Add the best compatible product from this category
                  compatibleItems.push({
                    id: `compat-${compatCat.toLowerCase().replace(/\s+/g, '-')}-${bestProduct.id}`,
                    name: bestProduct.name,
                    price: `₱${parseFloat(bestProduct.price).toLocaleString()}`,
                    image: bestProduct.image_url ? getFullImageUrl(bestProduct.image_url) : categoryImages[compatCat] || CPU1,
                    category: compatCat,
                    dbProduct: bestProduct,
                    stock_quantity: bestProduct.stock || bestProduct.stock_quantity || 0,
                    compatibility_score: 85, // Good compatibility score
                    compatibility_reason: `Compatible ${compatCat} for ${currentCategory}`
                  });
                  
                  console.log(`✅ Added compatible ${compatCat}: ${bestProduct.name}`);
                }
              } catch (error) {
                console.error(`❌ Error loading ${compatCat} products:`, error);
              }
            }
          }
        }
        
        console.log(`🎉 Loaded ${compatibleItems.length} ${isPeripheral ? 'similar' : 'compatible'} products`);
        console.log(`📊 Setting compatibleProducts state with:`, compatibleItems.map(item => ({ id: item.id, name: item.name })));
        setCompatibleProducts(compatibleItems);
        
      } catch (error) {
        console.error('❌ Error loading compatible/similar products:', error);
        setCompatibleProducts([]);
      } finally {
        setLoadingCompatible(false);
      }
    };

    // Only load if we have a valid category and product details
    if (category && category !== 'unknown' && category !== 'home' && productDetails.name) {
      loadCompatibleOrSimilarProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, productDetails.name, categoryMapping, categoryImages, stateProduct, hardwareCompatibilityRules, peripheralCategories]);

  // Function to get product quantity in cart
  const getProductQuantityInCart = (productName) => {
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    const item = cartItems.find(item => item && item.name === productName);
    return item ? item.quantity : 0;
  };

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
          id: compatibleItem.dbProduct.id, // 🔥 CRITICAL FIX: Include product ID for add to cart functionality
          name: compatibleItem.dbProduct.name,
          price: compatibleItem.dbProduct.price,
          image: compatibleItem.dbProduct.image_url ? getFullImageUrl(compatibleItem.dbProduct.image_url) : categoryImages[compatibleItem.category] || CPU1,
          imageUrl: compatibleItem.dbProduct.image_url ? getFullImageUrl(compatibleItem.dbProduct.image_url) : categoryImages[compatibleItem.category] || CPU1,
          description: compatibleItem.dbProduct.description || "No description available.",
          specifications: compatibleItem.dbProduct.specifications || "No specifications provided.",
          brand: compatibleItem.dbProduct.brand,
          stock: compatibleItem.dbProduct.stock || compatibleItem.dbProduct.stock_quantity || 0,
          category: compatibleItem.category
        },
        category: dbCategory,
        previousCategory: previousCategory
      }
    });
  };

  return (
    <div className="product-page-container">
      <div className="product-image-background">
      <img
        src={(() => {
          // Use getFullImageUrl for network-aware image loading
          const imageUrl = productDetails.image || productDetails.image_url;
          return imageUrl ? getFullImageUrl(imageUrl) : defaultCategoryImages[productDetails.category?.toLowerCase()] || CPU1;
        })()}
        alt={productDetails.name}
        className="product-image"
        onError={(e) => {
          // First fallback: try the image_url field with network config
          const fallbackImageUrl = productDetails.image_url || productDetails.image;
          if (fallbackImageUrl && e.target.src !== getFullImageUrl(fallbackImageUrl)) {
            e.target.src = getFullImageUrl(fallbackImageUrl);
          } else {
            // Final fallback: use category default
            e.target.src = defaultCategoryImages[productDetails.category?.toLowerCase()] || CPU1;
          }
        }}
      />
      </div>
      <div className="product-container">
        <div className="product-info">
          <p className="product-price">
            {/* Show sale price if on sale */}
            {productDetails.on_sale || productDetails.onSale || (productDetails.sale_price && parseFloat(productDetails.sale_price) > 0) ? (
              <span className="sale-price-container">
                <span className="original-price">
                  ₱{(() => {
                    const val = typeof productDetails.price === 'number'
                      ? productDetails.price
                      : parseFloat(String(productDetails.price || '').replace(/[^\d.]/g, '')) || 0;
                    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
                <span className="sale-price">
                  ₱{(() => {
                    const salePrice = productDetails.sale_price || productDetails.salePrice || productDetails.price;
                    const val = typeof salePrice === 'number'
                      ? salePrice
                      : parseFloat(String(salePrice || '').replace(/[^\d.]/g, '')) || 0;
                    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
                <span className="discount-badge">
                  {(() => {
                    const originalPrice = typeof productDetails.price === 'number'
                      ? productDetails.price
                      : parseFloat(String(productDetails.price || '').replace(/[^\d.]/g, '')) || 0;
                    const salePrice = productDetails.sale_price || productDetails.salePrice || productDetails.price;
                    const sale = typeof salePrice === 'number'
                      ? salePrice
                      : parseFloat(String(salePrice || '').replace(/[^\d.]/g, '')) || 0;
                    
                    if (originalPrice > 0 && sale > 0 && sale < originalPrice) {
                      const discount = Math.round(((originalPrice - sale) / originalPrice) * 100);
                      return `${discount}% OFF`;
                    }
                    return '';
                  })()}
                </span>
              </span>
            ) : (
              <span>
                ₱{(() => {
                  const val = typeof productDetails.price === 'number'
                    ? productDetails.price
                    : parseFloat(String(productDetails.price || '').replace(/[^\d.]/g, '')) || 0;
                  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}
              </span>
            )}
          </p>
          <h1 className="product-title">{productDetails.name}</h1>
        </div>
        <div className="details-specs">
          <p className="details">
            {hasMoreThanTwoSentences(productDetails.details) && !isDetailsExpanded
              ? getFirstTwoSentences(productDetails.details)
              : productDetails.details}
            {hasMoreThanTwoSentences(productDetails.details) && (
              <span 
                className="details-toggle"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              >
                {isDetailsExpanded ? ' ...less' : ' more...'}
              </span>
            )}
          </p>
          <p className="details-text"></p>
          <p className="specs-text">Specifications</p>
          <div className="specifications">
            {renderSpecifications(productDetails.specifications)}
          </div>
        </div>
      

      {/* Compatible/Similar Components Section */}
      <div className="compatible-section">
        <h2 className="compatible-title">
          {isPeripheralProduct ? (
            <>
              Similar Items you may like! 
              
            </>
          ) : (
            <>
              Compatible With 
              <span className=""></span>
            </>
          )}
        </h2>
        
        {/* 🚀 PHASE 2 ENHANCEMENT: Compatibility Summary Panel */}
        {!isPeripheralProduct && compatibleProducts.length > 0 && compatibleProducts.some(p => p.enhanced) && (
          <div className="compatibility-summary-panel">
            <h3 className="compatibility-summary-title">
              📊 Compatibility Analysis
              <span className="enhanced-ai-badge">🤖 AI Powered</span>
            </h3>
            {(() => {
              const summary = getCompatibilitySummary(compatibleProducts);
              return (
                <div className="compatibility-summary-grid">
                  <div className="summary-stat">
                    <span className="stat-label">Total Products:</span>
                    <span className="stat-value">{summary.total}</span>
                  </div>
                  <div className="summary-stat excellent">
                    <span className="stat-label">✅ Excellent:</span>
                    <span className="stat-value">{summary.excellent}</span>
                  </div>
                  <div className="summary-stat good">
                    <span className="stat-label">🟢 Good:</span>
                    <span className="stat-value">{summary.good}</span>
                  </div>
                  <div className="summary-stat fair">
                    <span className="stat-label">🟡 Fair:</span>
                    <span className="stat-value">{summary.fair}</span>
                  </div>
                  <div className="summary-stat warning">
                    <span className="stat-label">🟠 Warning:</span>
                    <span className="stat-value">{summary.warning}</span>
                  </div>
                  {summary.biosRequired > 0 && (
                    <div className="summary-stat bios">
                      <span className="stat-label">⚠️ BIOS Update:</span>
                      <span className="stat-value">{summary.biosRequired}</span>
                    </div>
                  )}
                  <div className="summary-stat average">
                    <span className="stat-label">Average Score:</span>
                    <span className="stat-value">{summary.averageScore.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        <div className="compatible-container">
          {loadingCompatible ? (
            <div className="compatible-loading">
              🔍 {isPeripheralProduct ? 'Finding similar items...' : 'Loading compatible components...'}
            </div>
          ) : compatibleProducts.length > 0 ? (
            compatibleProducts.map((component, index) => (
              <div
                key={component.id}
                className="compatible-item"
                onClick={() => handleCompatibleProductClick(component)}
                style={{ cursor: "pointer" }}
                title={isPeripheralProduct ? component.name : `${component.compatibility_reason} (Score: ${component.compatibility_score}%)`}
              >
                <img 
                  src={component.image} 
                  alt={component.name} 
                  className="compatible-image"
                  onError={(e) => {
                    console.log(`🖼️ Image failed to load: ${e.target.src}, using fallback`);
                    // First try with server prefix if not already there
                    if (!e.target.src.includes(getServerBaseUrl()) && component.dbProduct && component.dbProduct.image_url) {
                      e.target.src = getFullImageUrl(component.dbProduct.image_url);
                    } else {
                      // Fallback to category default image
                      e.target.src = categoryImages[component.category] || CPU1;
                    }
                  }}
                />
                <div className="compatible-info">
                <div className="compatible-details">
                <p className="compatible-name">{component.name}</p>
                <p className="compatible-price">{component.price}</p>
                
                {/* 🚀 PHASE 2 ENHANCEMENT: Enhanced compatibility display - HIDE FOR SIMILAR ITEMS (PERIPHERALS) */}
                {!isPeripheralProduct && component.compatibility_score && (
                  <div className="compatibility-display">
                    {component.enhanced ? (
                      // Enhanced AI-analyzed product with detailed badge
                      <>
                        <span 
                          className={`compatibility-badge ${getCompatibilityBadgeClass(component.compatibility_score)}`}
                          title={formatCompatibilityTooltip(component)}
                        >
                          {component.badge} {component.compatibility_score}%
                        </span>
                        
                        {component.bios_warning && (
                          <span className="bios-warning-badge" title={component.bios_warning}>
                            ⚠️ BIOS
                          </span>
                        )}
                        
                        {component.ai_analyzed && (
                          <span className="enhanced-ai-badge" title="Analyzed by DeepSeek R1 AI">
                            🤖 AI
                          </span>
                        )}
                      </>
                    ) : (
                      // Fallback to basic compatibility display
                      <p className="compatibility-score">
                        <img src={lightning} alt="Compatible" style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                        {component.compatibility_score}%
                      </p>
                    )}
                  </div>
                )}
                </div>
                {getProductQuantityInCart(component.name) > 0 ? (
                  expandedCompatibleProducts[component.id || component.name] ? (
                    // STATE 2: Show full controls (delete - quantity - +)
                    <div className="pc-parts-quantity-controls">
                      <button 
                        className="pc-parts-quantity-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const productId = component.id || component.name;
                          const qty = getProductQuantityInCart(component.name);
                          if (qty === 1) {
                            // Remove from cart
                            const updatedCart = cart.filter(item => item.name !== component.name);
                            setCart(updatedCart);
                            localStorage.setItem("cart", JSON.stringify(updatedCart));
                            window.dispatchEvent(new Event('cartUpdated'));
                            // Collapse after deletion
                            setExpandedCompatibleProducts(prev => ({ ...prev, [productId]: false }));
                            // Clear timer since we're collapsing manually
                            if (expandTimers[productId]) {
                              clearTimeout(expandTimers[productId]);
                              setExpandTimers(prev => {
                                const newTimers = { ...prev };
                                delete newTimers[productId];
                                return newTimers;
                              });
                            }
                          } else {
                            // Decrease quantity
                            const updatedCart = cart.map(item => {
                              if (item.name === component.name) {
                                const newQty = item.quantity - 1;
                                const itemPrice = item.totalPrice / item.quantity;
                                return { ...item, quantity: newQty, totalPrice: itemPrice * newQty };
                              }
                              return item;
                            });
                            setCart(updatedCart);
                            localStorage.setItem("cart", JSON.stringify(updatedCart));
                            window.dispatchEvent(new Event('cartUpdated'));
                            // ⏱️ Restart timer on interaction
                            startAutoCollapseTimer(productId);
                          }
                        }}
                      >
                        {getProductQuantityInCart(component.name) === 1 ? (
                          <img src={deleteIcon} alt="Delete" style={{ width: '13px', height: '14px' }} />
                        ) : (
                          <img src={minusIcon} alt="Minus" style={{ width: '14px', height: '2px' }} />
                        )}
                      </button>
                      <span className="pc-parts-quantity-number">{getProductQuantityInCart(component.name)}</span>
                      <button 
                        className="pc-parts-quantity-btn add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const productId = component.id || component.name;
                          
                          // 🔒 STOCK VALIDATION: Check stock before increasing quantity
                          const componentStock = component.stock_quantity || component.dbProduct?.stock || 0;
                          const currentQuantity = getProductQuantityInCart(component.name);
                          
                          if (currentQuantity + 1 > componentStock) {
                            setStockModalMessage(`Cannot add more. Maximum available stock is ${componentStock}.`);
                            setShowStockModal(true);
                            console.warn('⚠️ Stock limit reached for compatible product:', { 
                              name: component.name, 
                              stock: componentStock, 
                              currentQuantity 
                            });
                            return;
                          }
                          
                          // Increase quantity of existing item in cart
                          const updatedCart = cart.map(item => {
                            if (item.name === component.name) {
                              const newQty = item.quantity + 1;
                              const itemPrice = item.totalPrice / item.quantity;
                              return { ...item, quantity: newQty, totalPrice: itemPrice * newQty };
                            }
                            return item;
                          });
                          setCart(updatedCart);
                          localStorage.setItem("cart", JSON.stringify(updatedCart));
                          window.dispatchEvent(new Event('cartUpdated'));
                          
                          // 🎬 TRIGGER CHEST ANIMATION
                          setIsAnimating(true);
                          setShowDiamond(true);

                          setTimeout(() => {
                            setShowDiamond(false);
                          }, 2000);

                          setTimeout(() => {
                            setIsAnimating(false);
                          }, 2500);

                          // ⏱️ Restart timer on interaction
                          startAutoCollapseTimer(productId);
                        }}
                      >
                        <img src={addIcon} alt="Add" style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  ) : (
                    // STATE 1: Show just quantity number (clickable to expand)
                    <div 
                      className="pc-parts-add-product in-cart-collapsed"
                      onClick={(e) => {
                        e.stopPropagation();
                        const productId = component.id || component.name;
                        setExpandedCompatibleProducts(prev => ({ ...prev, [productId]: true }));
                        startAutoCollapseTimer(productId); // ⏱️ Start 5-second timer
                      }}
                    >
                      {getProductQuantityInCart(component.name)}
                    </div>
                  )
                ) : (
                  // Show add button when not in cart - ADD TO CART directly with animation
                  <div 
                    className="pc-parts-add-product"
                    onClick={(e) => {
                      e.stopPropagation();
                      
                      // 🔒 STOCK VALIDATION: Check stock before adding to cart
                      const componentStock = component.stock_quantity || component.dbProduct?.stock || 0;
                      if (componentStock <= 0) {
                        setStockModalMessage('This product is currently out of stock.');
                        setShowStockModal(true);
                        console.warn('⚠️ Out of stock:', component.name);
                        return;
                      }
                      
                      // Extract price from component (remove ₱ and commas)
                      const componentPrice = typeof component.price === 'number'
                        ? component.price
                        : parseFloat(String(component.price || '').replace(/[^\d.]/g, '')) || 0;
                      
                      // Add compatible item to cart
                      const newItem = {
                        name: component.name,
                        price: componentPrice,
                        image: component.image,
                        category: component.category,
                        quantity: 1,
                        totalPrice: componentPrice,
                        uniqueId: Date.now(),
                        stock: componentStock, // Store stock info
                        id: component.dbProduct?.id || component.id // Store product ID
                      };
                      
                      const updatedCart = [...cart, newItem];
                      setCart(updatedCart);
                      localStorage.setItem("cart", JSON.stringify(updatedCart));
                      window.dispatchEvent(new Event('cartUpdated'));
                      
                      // 🎬 TRIGGER CHEST ANIMATION
                      setIsAnimating(true);
                      setShowDiamond(true);

                      // Animation sequence
                      setTimeout(() => {
                        setShowDiamond(false);
                      }, 2000);

                      setTimeout(() => {
                        setIsAnimating(false);
                      }, 2500);
                    }}
                  >
                    +
                  </div>
                )}
                </div>
                
              </div>
            ))
          ) : (
            <div className="compatible-empty">
              {isPeripheralProduct ? 'No similar items available' : 'No compatible products available'}
            </div>
          )}
        </div>
      </div>
</div>
      {/* Bottom Section */}
      <div className="productPage-bottom-section">
            <div 
              className={`pc-parts-cart-icon ${isAnimating ? 'chest-opening' : ''}`} 
              data-count="0"
              onClick={() => navigate('/order-summary')}
              style={{ cursor: 'pointer' }}
            >
              <img src={Chest} alt="Cart Icon" className="chest-image" />
              {(showDiamond || isAnimating) && (
                <img 
                  src={glowingdiamond} 
                  alt="Diamond" 
                  className={`diamond-animation ${!showDiamond && isAnimating ? 'diamond-falling' : ''}`}
                  style={{ display: showDiamond || isAnimating ? 'block' : 'none' }}
                />
              )}
              <span className="pc-parts-notification">{cartCount}</span>
            </div>
            <div className="rectangle"></div>
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
              Back to menu
            </button>

            <button className="productPage-add-to-order" onClick={addToCart}>
              Add to Order
            </button>
          </div>
        </div>
      </div>

      {/* Stock Validation Modal - Matches PC-Parts.js showStartOverModal design */}
      {showStockModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              <span>{stockModalMessage}</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn yes"
                onClick={() => setShowStockModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ProductPage;