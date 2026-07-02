import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./ProductPage.css"; // Ensure you have the correct CSS file
import { menuItems } from "./PCCustomized.js";
import kioskAPI from "../api/kioskAPI";
import { getFullImageUrl } from "../utils/networkConfig"; // Network-aware image URLs
import { canonicalCategory, normalizeKioskProduct } from "../utils/kioskContracts";
import KioskProductImage from "../components/KioskProductImage";
import Chest from "../assets/Chest.webp";
import glowingdiamond from "../assets/ProductPage/glowingdiamond.svg";
import deleteIcon from "../assets/PCParts/delete.svg";
import minusIcon from "../assets/PCParts/minus.svg";
import addIcon from "../assets/PCParts/add.svg";
import lightning from "../assets/ProductPage/lightning.svg";

// PHASE 2 ENHANCEMENT: Import enhanced compatibility helper and styles
import {
  formatCompatibilityTooltip,
  getCompatibilityBadgeClass,
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

const VERBOSE_KIOSK_LOGS = process.env.VITE_KWISE_VERBOSE_LOGS === 'true'
  || process.env.REACT_APP_KWISE_VERBOSE_LOGS === 'true';
const browserConsole = globalThis.console || {};
const console = VERBOSE_KIOSK_LOGS
  ? browserConsole
  : {
      log: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: (...args) => browserConsole.error?.(...args)
    };

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

// Parse productId URL param into category and index
const parseProductId = (productId, stateCategory) => {
  let category = stateCategory || 'unknown';
  let index = 0;
  if (productId && typeof productId === 'string' && productId.length > 0) {
    try {
      const lastHyphen = productId.lastIndexOf("-");
      if (lastHyphen >= 0) {
        category = productId.slice(0, lastHyphen);
        index = productId.slice(lastHyphen + 1);
      } else {
        category = productId;
      }
    } catch (error) {
      console.warn("Error parsing productId:", productId, error);
      category = stateCategory || 'unknown';
    }
  }
  return { category, index };
};

// Map related peripheral categories for "similar items"
const RELATED_PERIPHERAL_CATEGORIES = {
  Monitor: ['Webcam', 'Speakers'],
  Keyboard: ['Mouse', 'Headphones'],
  Mouse: ['Keyboard', 'Headphones'],
  Headphones: ['Speakers', 'Mouse'],
  Speakers: ['Headphones', 'Monitor'],
  Webcam: ['Monitor', 'Headphones']
};

// Detect specific peripheral category from generic "Peripherals" using product name
const detectPeripheralQueryCategory = (currentCategory, productName) => {
  const isGenericPeripheral = currentCategory === 'Peripherals' || currentCategory === 'PERIPHERALS' || currentCategory === 'peripherals';
  if (!isGenericPeripheral) return currentCategory;
  const name = (productName || '').toLowerCase();
  if (name.includes('monitor')) return 'Monitor';
  if (name.includes('keyboard')) return 'Keyboard';
  if (name.includes('mouse')) return 'Mouse';
  if (name.includes('headphone') || name.includes('headset')) return 'Headphones';
  if (name.includes('speaker')) return 'Speakers';
  if (name.includes('webcam') || name.includes('camera')) return 'Webcam';
  return 'Monitor';
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
  cartIcon.dataset.count = cartCount;
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
  const [remoteProduct, setRemoteProduct] = useState(null);

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
  const formatSpecValue = (value) => {
    if (value == null || value === '') return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.join(', ');
      return Object.entries(value)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    return String(value);
  };

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
      const entries = Object.entries(specs)
        .filter(([, value]) => value != null && value !== '');

      if (entries.length === 0) {
        return (
          <div className="specs-empty">No specifications available</div>
        );
      }

      return (
        <table className="specs-table">
          <tbody>
            {entries.map(([key, value]) => {
              const formattedValue = formatSpecValue(value);
              if (!formattedValue) return null;

              return (
                <tr key={`spec-${key}`}>
                  <td className="specs-label">{key.replaceAll('_', ' ')}</td>
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

  // Get product data from navigation state (from PC-Parts.js)
  const stateProduct = location.state?.product;
  const stateCategory = location.state?.category;

  // Get previous category index from state (default to 0 if undefined)
  const previousCategory = location.state?.previousCategory ?? 0

  // Extract category and index from productId
  const parsed = parseProductId(productId, stateCategory);
  let category = parsed.category;
  let index = parsed.index;

  // Normalize category keys from other sources
  if (category === 'cpucooler') category = 'cpu-cooler';

  // Find the category in menuItems
  const categoryData = menuItems.find((item) => item.category === category);

  // Get the product details based on index or from navigation state
  const product = categoryData?.products?.[Number(index)];

  const resolveSpecifications = (specs) => {
    if (specs == null || specs === '') return "No specifications provided.";
    if (typeof specs === 'object' && Object.keys(specs).length === 0) return "No specifications provided.";
    return specs;
  };

  const resolveDetails = (desc) => (desc && desc !== '') ? desc : "No details available.";

  const buildStateData = () => {
    if (stateProduct) {
      const normalizedStateProduct = normalizeKioskProduct(stateProduct, { category: stateCategory });
      return {
        id: normalizedStateProduct.id,
        name: normalizedStateProduct.name,
        price: normalizedStateProduct.price,
        image: normalizedStateProduct.image,
        imageUrl: normalizedStateProduct.imageUrl,
        image_url: normalizedStateProduct.image_url,
        imagePath: normalizedStateProduct.imagePath,
        details: resolveDetails(normalizedStateProduct.description),
        specifications: resolveSpecifications(normalizedStateProduct.specifications),
        brand: normalizedStateProduct.brand,
        stock: normalizedStateProduct.stock,
        onSale: normalizedStateProduct.onSale,
        salePrice: normalizedStateProduct.salePrice,
        saleInfo: stateProduct.saleInfo,
        category: normalizedStateProduct.category || stateCategory,
        categoryKey: normalizedStateProduct.categoryKey
      };
    }
    if (location.state) {
      const normalizedLocationProduct = normalizeKioskProduct({
        ...location.state,
        name: location.state.productName ?? location.state.name,
        price: location.state.productPrice ?? location.state.price,
        image: location.state.productImage ?? location.state.image
      }, { category: location.state.category });
      return {
        id: normalizedLocationProduct.id,
        name: normalizedLocationProduct.name,
        price: normalizedLocationProduct.price,
        image: normalizedLocationProduct.image,
        imageUrl: normalizedLocationProduct.imageUrl,
        image_url: normalizedLocationProduct.image_url,
        imagePath: normalizedLocationProduct.imagePath,
        stock: normalizedLocationProduct.stock || 0,
        brand: normalizedLocationProduct.brand,
        category: normalizedLocationProduct.category,
        categoryKey: normalizedLocationProduct.categoryKey,
        details: resolveDetails(location.state.details || normalizedLocationProduct.description),
        specifications: resolveSpecifications(normalizedLocationProduct.specifications)
      };
    }
    return null;
  };

  // Use state data from PC-Parts navigation if available, otherwise use legacy product data
  const stateData = buildStateData();

  useEffect(() => {
    if (!productId) {
      setRemoteProduct(null);
      return undefined;
    }

    let cancelled = false;
    const loadRemoteProduct = async () => {
      try {
        const apiCategory = canonicalCategory(category || stateCategory || '');
        const selectedProduct = await kioskAPI.getProductById(productId);

        if (!cancelled && selectedProduct) {
          const normalizedProduct = normalizeKioskProduct(selectedProduct, { category: apiCategory });
          setRemoteProduct({
            ...normalizedProduct,
            details: resolveDetails(normalizedProduct.description),
            specifications: resolveSpecifications(normalizedProduct.specifications),
            category: normalizedProduct.category || apiCategory
          });
        }
      } catch (error) {
        console.warn('Product detail fallback load failed:', error);
      }
    };

    loadRemoteProduct();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, category, stateCategory]);

  const productDetails = remoteProduct || stateData || product || {
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
    : Number.parseFloat(String(productDetails.price || '').replaceAll(/[^0-9.]/g, "")) || 0;

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
    const currentCartQuantity = existingIndex >= 0 ? updatedCart[existingIndex].quantity : 0;
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
    const currentCartQuantity = existingIndex >= 0 ? updatedCart[existingIndex].quantity : 0;
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
    if (existingIndex >= 0) {
      // Update existing item quantity and total price
      updatedCart[existingIndex].quantity += quantity;
      updatedCart[existingIndex].totalPrice += totalPrice;
    } else {
      updatedCart.push(newItem);
    }

    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));

    // Dispatch custom event to notify other components
    globalThis.dispatchEvent(new Event('cartUpdated'));

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

    globalThis.addEventListener('cartUpdated', handleCartUpdate);
    globalThis.addEventListener('storage', handleCartUpdate);

    return () => {
      globalThis.removeEventListener('cartUpdated', handleCartUpdate);
      globalThis.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  // ✅ ENHANCED COMPATIBLE WITH SECTION - OPTIMIZED FOR SPEED
  const [compatibleProducts, setCompatibleProducts] = useState([]);
  const [loadingCompatible, setLoadingCompatible] = useState(false);
  const [isPeripheralProduct, setIsPeripheralProduct] = useState(false);
  const compatibleLoadKeyRef = useRef(null);

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

  const getCategoryFallbackImage = (cat) => (
    categoryImages[cat]
    || defaultCategoryImages[String(cat || '').toLowerCase()]
    || CPU1
  );

  const getImageOrFallback = (imageUrl, cat) => (
    getFullImageUrl(imageUrl) || getCategoryFallbackImage(cat)
  );

  // --- Compatible/Similar product loading helpers ---
  const loadBootstrapProducts = async (queryCategory, limit = 6) => {
    const bootstrap = await kioskAPI.getCatalogBootstrap({
      category: queryCategory,
      page: 1,
      limit,
      sort: 'price',
      order: 'ASC',
      includeSpecRanges: false
    });

    return bootstrap.products || [];
  };

  const buildCompatibleItem = (product, cat, idPrefix, score, reason) => ({
    id: `${idPrefix}-${cat.toLowerCase().replaceAll(/\s+/g, '-')}-${product.id}`,
    name: product.name,
    price: `₱${Number.parseFloat(product.price).toLocaleString()}`,
    image: getImageOrFallback(product.imageUrl || product.image_url || product.file_path || product.image, cat),
    imageVariants: product.imageVariants || product.image_variants || {},
    category: cat,
    dbProduct: product,
    stock_quantity: product.stock || product.stock_quantity || 0,
    compatibility_score: score,
    compatibility_reason: reason
  });

  const resolveProductCategory = () => {
    let cur = stateProduct?.category || productDetails.category;
    if (!cur || cur === 'Peripherals' || cur === 'PERIPHERALS' || cur === 'peripherals') {
      const mapped = categoryMapping[category?.toLowerCase()];
      cur = mapped || 'Peripherals';
    }
    return cur;
  };

  const loadSameCategoryPeripherals = async (queryCategory) => {
    const items = [];
    try {
      const products = await loadBootstrapProducts(queryCategory, 12);
      if (products.length > 0) {
        const currentProductId = stateProduct?.id || productDetails.id;
        const filtered = products
          .filter(p => !currentProductId || p.id !== currentProductId)
          .slice(0, 6);
        for (const p of filtered) {
          items.push(buildCompatibleItem(p, queryCategory, 'similar', 95, `Similar ${queryCategory} product`));
        }
      }
    } catch (error) {
      console.error('❌ Error loading same category products:', error);
    }
    return items;
  };

  const loadRelatedCategoryProducts = async (relatedCategories) => {
    const items = [];
    for (const cat of relatedCategories) {
      try {
        const products = await loadBootstrapProducts(cat, 6);
        for (const p of products.slice(0, 2)) {
          items.push(buildCompatibleItem(p, cat, 'related', 85, `Related ${cat} product`));
        }
      } catch (error) {
        console.error(`❌ Error loading ${cat} products:`, error);
      }
    }
    return items;
  };

  const loadPeripheralSimilarItems = async (queryCategory) => {
    const sameItems = await loadSameCategoryPeripherals(queryCategory);
    const relatedCats = RELATED_PERIPHERAL_CATEGORIES[queryCategory] || [];
    const relatedItems = await loadRelatedCategoryProducts(relatedCats);
    return [...sameItems, ...relatedItems];
  };

  const loadRuleCompatibleProducts = async (currentCategory) => {
    const compatibleCategories = hardwareCompatibilityRules[currentCategory] || [];
    const currentProductId = stateProduct?.id || productDetails.id;
    const items = [];

    for (const compatCat of compatibleCategories) {
      try {
        const products = await loadBootstrapProducts(compatCat, 5);
        const product = products.find((item) => !currentProductId || item.id !== currentProductId) || products[0];
        if (product) {
          items.push(buildCompatibleItem(product, compatCat, 'compat', 85, `Compatible ${compatCat} for ${currentCategory}`));
        }
      } catch (error) {
        console.error(`Error loading ${compatCat} products:`, error);
      }
    }

    if (items.length === 0) {
      throw new Error('No compatible products available');
    }

    return items;
  };

  const loadFallbackCompatibleProducts = async (currentCategory) => {
    const items = [];
    const compatibleCategories = hardwareCompatibilityRules[currentCategory] || [];
    for (const compatCat of compatibleCategories) {
      try {
        const products = await loadBootstrapProducts(compatCat, 5);
        if (products.length > 0) {
          items.push(buildCompatibleItem(products[0], compatCat, 'compat', 85, `Compatible ${compatCat} for ${currentCategory}`));
        }
      } catch (error) {
        console.error(`❌ Error loading ${compatCat} products:`, error);
      }
    }
    return items;
  };

  // FAST COMPATIBLE/SIMILAR PRODUCTS LOADING - OPTIMIZED WITH PHASE 2 ENHANCEMENT
  useEffect(() => {
    const loadCompatibleOrSimilarProducts = async () => {
      try {
        setLoadingCompatible(true);
        const currentCategory = resolveProductCategory();
        const isPeripheral = peripheralCategories.includes(currentCategory);
        setIsPeripheralProduct(isPeripheral);

        const compatibleResponse = await kioskAPI.getProductCompatibleProducts(
          productDetails.id || productId,
          { limitPerCategory: 3 }
        );
        let compatibleItems = (compatibleResponse.products || []).slice(0, 18).map((item) => (
          buildCompatibleItem(
            item,
            item.category || currentCategory,
            isPeripheral ? 'similar' : 'compat',
            item.compatibility_score || item.score || 80,
            item.compatibility_reason || item.status || `Compatible ${item.category || currentCategory}`
          )
        ));

        if (compatibleItems.length === 0 && isPeripheral) {
          const queryCategory = detectPeripheralQueryCategory(currentCategory, productDetails.name);
          compatibleItems = await loadPeripheralSimilarItems(queryCategory);
        }

        setCompatibleProducts(compatibleItems);
      } catch (error) {
        console.error('❌ Error loading compatible/similar products:', error);
        setCompatibleProducts([]);
      } finally {
        setLoadingCompatible(false);
      }
    };

    const hasResolvedProduct = Boolean(stateData || remoteProduct || product);

    if (hasResolvedProduct && category && category !== 'unknown' && category !== 'home' && productDetails.name) {
      const loadKey = `${category}:${productDetails.id || stateProduct?.id || productDetails.name}`;
      if (compatibleLoadKeyRef.current === loadKey) {
        return;
      }
      compatibleLoadKeyRef.current = loadKey;
      const scheduleLoad = globalThis.requestIdleCallback || ((callback) => globalThis.setTimeout(callback, 250));
      const cancelLoad = globalThis.cancelIdleCallback || globalThis.clearTimeout;
      const scheduledLoad = scheduleLoad(() => {
        loadCompatibleOrSimilarProducts();
      });
      return () => {
        cancelLoad(scheduledLoad);
      };
    } else {
      compatibleLoadKeyRef.current = null;
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
    const productId = compatibleItem.dbProduct.id;

    // Navigate to product page with database product data
    navigate(`/product/${productId}`, {
      state: {
        product: {
          id: compatibleItem.dbProduct.id, // 🔥 CRITICAL FIX: Include product ID for add to cart functionality
          name: compatibleItem.dbProduct.name,
          price: compatibleItem.dbProduct.price,
          image: getImageOrFallback(compatibleItem.dbProduct.imageUrl || compatibleItem.dbProduct.image_url || compatibleItem.dbProduct.file_path || compatibleItem.dbProduct.image, compatibleItem.category),
          imageUrl: getImageOrFallback(compatibleItem.dbProduct.imageUrl || compatibleItem.dbProduct.image_url || compatibleItem.dbProduct.file_path || compatibleItem.dbProduct.image, compatibleItem.category),
          imageVariants: compatibleItem.dbProduct.imageVariants || compatibleItem.dbProduct.image_variants || {},
          image_variants: compatibleItem.dbProduct.imageVariants || compatibleItem.dbProduct.image_variants || {},
          description: compatibleItem.dbProduct.description || "No description available.",
          specifications: compatibleItem.dbProduct.specifications || "No specifications provided.",
          brand: compatibleItem.dbProduct.brand,
          stock: compatibleItem.dbProduct.stock || compatibleItem.dbProduct.stock_quantity || 0,
          category: compatibleItem.category
        },
        category: compatibleItem.category,
        previousCategory: previousCategory
      }
    });
  };

  const renderCompatibleContent = () => {
    if (loadingCompatible) {
      return (
        <div className="compatible-loading">
          🔍 {isPeripheralProduct ? 'Finding similar items...' : 'Loading compatible components...'}
        </div>
      );
    }
    if (compatibleProducts.length === 0) {
      return (
        <div className="compatible-empty">
          {isPeripheralProduct ? 'No similar items available' : 'No compatible products available'}
        </div>
      );
    }
    return (<>{compatibleProducts.map((component) => (
      <div
        role="button"
        key={component.id}
        className="compatible-item"
        tabIndex={0}
        onClick={() => handleCompatibleProductClick(component)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCompatibleProductClick(component);
          }
        }}
        style={{ cursor: "pointer" }}
        title={isPeripheralProduct ? component.name : `${component.compatibility_reason} (Score: ${component.compatibility_score}%)`}
      >
        <KioskProductImage
          product={component.dbProduct || component}
          alt={component.name}
          className="compatible-image"
          fallbackSrc={getCategoryFallbackImage(component.category)}
          sizes="120px"
          width="120"
          height="120"
        />
        <div className="compatible-info">
          <div className="compatible-details">
            <p className="compatible-name">{component.name}</p>
            <p className="compatible-price">{component.price}</p>
            {renderCompatibilityDisplay(component)}
          </div>
          {renderCompatibleCartControls(component)}
        </div>
      </div>
    ))}</>);
  };

  const renderCompatibilityDisplay = (component) => {
    if (isPeripheralProduct || !component.compatibility_score) return null;
    return (
      <div className="compatibility-display">
        {component.enhanced ? (
          <>
            <span
              className={`compatibility-badge ${getCompatibilityBadgeClass(component.compatibility_score)}`}
              title={formatCompatibilityTooltip(component)}
            >
              {component.badge} {component.compatibility_score}%
            </span>
            {component.bios_warning && (
              <span className="bios-warning-badge" title={component.bios_warning}>⚠️ BIOS</span>
            )}
            {component.ai_analyzed && (
              <span className="enhanced-ai-badge" title="Analyzed by local compatibility rules">Rules</span>
            )}
          </>
        ) : (
          <p className="compatibility-score">
            <img src={lightning} alt="Compatible" style={{ width: '16px', height: '16px', marginRight: '4px' }} />
            {component.compatibility_score}%
          </p>
        )}
      </div>
    );
  };

  const handleCompatibleDecrease = (component, e) => {
    e.stopPropagation();
    const productId = component.id || component.name;
    const qty = getProductQuantityInCart(component.name);
    if (qty === 1) {
      const updatedCart = cart.filter(item => item.name !== component.name);
      setCart(updatedCart);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      globalThis.dispatchEvent(new Event('cartUpdated'));
      setExpandedCompatibleProducts(prev => ({ ...prev, [productId]: false }));
      if (expandTimers[productId]) {
        clearTimeout(expandTimers[productId]);
        setExpandTimers(prev => {
          const newTimers = { ...prev };
          delete newTimers[productId];
          return newTimers;
        });
      }
    } else {
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
      globalThis.dispatchEvent(new Event('cartUpdated'));
      startAutoCollapseTimer(productId);
    }
  };

  const handleCompatibleIncrease = (component, e) => {
    e.stopPropagation();
    const productId = component.id || component.name;
    const componentStock = component.stock_quantity || component.dbProduct?.stock || 0;
    const currentQuantity = getProductQuantityInCart(component.name);
    if (currentQuantity + 1 > componentStock) {
      setStockModalMessage(`Cannot add more. Maximum available stock is ${componentStock}.`);
      setShowStockModal(true);
      return;
    }
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
    globalThis.dispatchEvent(new Event('cartUpdated'));
    setIsAnimating(true);
    setShowDiamond(true);
    setTimeout(() => setShowDiamond(false), 2000);
    setTimeout(() => setIsAnimating(false), 2500);
    startAutoCollapseTimer(productId);
  };

  const handleCompatibleAdd = (component, e) => {
    e.stopPropagation();
    const componentStock = component.stock_quantity || component.dbProduct?.stock || 0;
    if (componentStock <= 0) {
      setStockModalMessage('This product is currently out of stock.');
      setShowStockModal(true);
      return;
    }
    const componentPrice = typeof component.price === 'number'
      ? component.price
      : Number.parseFloat(String(component.price || '').replaceAll(/[^\d.]/g, '')) || 0;
    const newItem = {
      name: component.name,
      price: componentPrice,
      image: component.image,
      category: component.category,
      quantity: 1,
      totalPrice: componentPrice,
      uniqueId: Date.now(),
      stock: componentStock,
      id: component.dbProduct?.id || component.id
    };
    const updatedCart = [...cart, newItem];
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    globalThis.dispatchEvent(new Event('cartUpdated'));
    setIsAnimating(true);
    setShowDiamond(true);
    setTimeout(() => setShowDiamond(false), 2000);
    setTimeout(() => setIsAnimating(false), 2500);
  };

  const renderCompatibleCartControls = (component) => {
    const qty = getProductQuantityInCart(component.name);
    if (qty > 0) {
      const isExpanded = expandedCompatibleProducts[component.id || component.name];
      if (isExpanded) {
        return (
          <div className="pc-parts-quantity-controls">
            <button className="pc-parts-quantity-btn delete-btn" onClick={(e) => handleCompatibleDecrease(component, e)}>
              {qty === 1 ? (
                <img src={deleteIcon} alt="Delete" style={{ width: '13px', height: '14px' }} />
              ) : (
                <img src={minusIcon} alt="Minus" style={{ width: '14px', height: '2px' }} />
              )}
            </button>
            <span className="pc-parts-quantity-number">{qty}</span>
            <button className="pc-parts-quantity-btn add-btn" onClick={(e) => handleCompatibleIncrease(component, e)}>
              <img src={addIcon} alt="Add" style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        );
      }
      return (
        <button type="button" className="pc-parts-add-product in-cart-collapsed"
          onClick={(e) => {
            e.stopPropagation();
            const productId = component.id || component.name;
            setExpandedCompatibleProducts(prev => ({ ...prev, [productId]: true }));
            startAutoCollapseTimer(productId);
          }}
        >
          {qty}
        </button>
      );
    }
    return (
      <button type="button" className="pc-parts-add-product" onClick={(e) => handleCompatibleAdd(component, e)}>
        +
      </button>
    );
  };

  return (
    <div className="product-page-container">
      <div className="product-image-background">
      <KioskProductImage
        product={productDetails}
        alt={productDetails.name}
        className="product-image"
        variant="detail"
        fallbackSrc={getCategoryFallbackImage(productDetails.category)}
        sizes="(max-width: 768px) 90vw, 520px"
        width="520"
        height="520"
      />
      </div>
      <div className="product-container">
        <div className="product-info">
          <p className="product-price">
            {/* Show sale price if on sale */}
            {productDetails.on_sale || productDetails.onSale || (productDetails.sale_price && Number.parseFloat(productDetails.sale_price) > 0) ? (
              <span className="sale-price-container">
                <span className="original-price">
                  ₱{(() => {
                    const val = typeof productDetails.price === 'number'
                      ? productDetails.price
                      : Number.parseFloat(String(productDetails.price || '').replaceAll(/[^\d.]/g, '')) || 0;
                    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
                <span className="sale-price">
                  ₱{(() => {
                    const salePrice = productDetails.sale_price || productDetails.salePrice || productDetails.price;
                    const val = typeof salePrice === 'number'
                      ? salePrice
                      : Number.parseFloat(String(salePrice || '').replaceAll(/[^\d.]/g, '')) || 0;
                    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
                <span className="discount-badge">
                  {(() => {
                    const originalPrice = typeof productDetails.price === 'number'
                      ? productDetails.price
                      : Number.parseFloat(String(productDetails.price || '').replaceAll(/[^\d.]/g, '')) || 0;
                    const salePrice = productDetails.sale_price || productDetails.salePrice || productDetails.price;
                    const sale = typeof salePrice === 'number'
                      ? salePrice
                      : Number.parseFloat(String(salePrice || '').replaceAll(/[^\d.]/g, '')) || 0;

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
                    : Number.parseFloat(String(productDetails.price || '').replaceAll(/[^\d.]/g, '')) || 0;
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
              <button
                type="button"
                className="details-toggle"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              >
                {isDetailsExpanded ? ' ...less' : ' more...'}
              </button>
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
            </>
          )}
        </h2>

        {/* 🚀 PHASE 2 ENHANCEMENT: Compatibility Summary Panel */}
        {!isPeripheralProduct && compatibleProducts.some(p => p.enhanced) && (
          <div className="compatibility-summary-panel">
            <h3 className="compatibility-summary-title">
              📊 Compatibility Analysis{' '}
              <span className="enhanced-ai-badge">Offline Rules</span>
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
          {renderCompatibleContent()}
        </div>
      </div>
</div>
      {/* Bottom Section */}
      <div className="productPage-bottom-section">
            <button
              type="button"
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
            </button>
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
