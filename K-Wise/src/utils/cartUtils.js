/**
 * Cart Utilities - Helper functions for cart operations
 * Ensures cart data integrity and null safety
 */

/**
 * Clean cart items by removing null, undefined, and invalid entries
 * @param {Array} cartItems - Array of cart items that may contain null/invalid values
 * @returns {Array} - Cleaned array with only valid cart items
 */
export const cleanCartItems = (cartItems) => {
    if (!Array.isArray(cartItems)) {
        console.warn('⚠️  cleanCartItems: Input is not an array, returning empty array');
        return [];
    }
    
    return cartItems.filter(item => {
        // Must be an object
        if (!item || typeof item !== 'object') {
            return false;
        }
        
        // Must have an id (at minimum)
        if (!item.id) {
            console.warn('⚠️  cleanCartItems: Item missing id, removing:', item);
            return false;
        }
        
        return true;
    });
};

/**
 * Get cart items from localStorage with automatic cleaning
 * @returns {Array} - Cleaned array of cart items
 */
export const getCartItems = () => {
    try {
        const cartData = localStorage.getItem('cart');
        if (!cartData) return [];
        
        const cartItems = JSON.parse(cartData);
        const cleanedItems = cleanCartItems(cartItems);
        
        // If items were removed, update localStorage
        if (cleanedItems.length !== cartItems.length) {
            console.log(`🧹 Cart cleaned: Removed ${cartItems.length - cleanedItems.length} invalid items`);
            localStorage.setItem('cart', JSON.stringify(cleanedItems));
        }
        
        return cleanedItems;
    } catch (error) {
        console.error('❌ Error reading cart from localStorage:', error);
        return [];
    }
};

/**
 * Save cart items to localStorage with automatic cleaning
 * @param {Array} cartItems - Cart items to save
 * @returns {boolean} - Success status
 */
export const saveCartItems = (cartItems) => {
    try {
        const cleanedItems = cleanCartItems(cartItems);
        localStorage.setItem('cart', JSON.stringify(cleanedItems));
        console.log(`💾 Cart saved: ${cleanedItems.length} items`);
        return true;
    } catch (error) {
        console.error('❌ Error saving cart to localStorage:', error);
        return false;
    }
};

/**
 * Calculate total quantity of items in cart
 * @param {Array} cartItems - Cart items array
 * @returns {number} - Total quantity
 */
export const calculateCartCount = (cartItems) => {
    const cleanedItems = cleanCartItems(cartItems);
    return cleanedItems.reduce((acc, item) => acc + (Number.parseInt(item.quantity, 10) || 0), 0);
};

/**
 * Calculate total price of items in cart
 * @param {Array} cartItems - Cart items array
 * @returns {number} - Total price
 */
export const calculateCartTotal = (cartItems) => {
    const cleanedItems = cleanCartItems(cartItems);
    return cleanedItems.reduce((acc, item) => {
        const price = Number.parseFloat(item.price) || 0;
        const quantity = Number.parseInt(item.quantity, 10) || 0;
        return acc + (price * quantity);
    }, 0);
};

/**
 * Add item to cart with duplicate checking
 * @param {object} item - Item to add
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Array} - Updated cart items
 */
export const addToCart = (item, quantity = 1) => {
    if (!item || typeof item !== 'object' || !item.id) {
        console.error('❌ Invalid item passed to addToCart:', item);
        return getCartItems();
    }
    
    const cartItems = getCartItems();
    const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex === -1) {
        // New item, add to cart
        cartItems.push({
            ...item,
            quantity: quantity
        });
        console.log(`📦 Added "${item.name}" to cart: ${quantity}x`);
    } else {
        // Item exists, update quantity
        cartItems[existingItemIndex].quantity = (cartItems[existingItemIndex].quantity || 0) + quantity;
        console.log(`📦 Updated quantity for "${item.name}": ${cartItems[existingItemIndex].quantity}`);
    }
    
    saveCartItems(cartItems);
    return cartItems;
};

/**
 * Remove item from cart by ID
 * @param {number|string} itemId - ID of item to remove
 * @returns {Array} - Updated cart items
 */
export const removeFromCart = (itemId) => {
    const cartItems = getCartItems();
    const filteredItems = cartItems.filter(item => item.id !== itemId);
    
    if (filteredItems.length < cartItems.length) {
        console.log(`🗑️  Removed item ${itemId} from cart`);
        saveCartItems(filteredItems);
    }
    
    return filteredItems;
};

/**
 * Update item quantity in cart
 * @param {number|string} itemId - ID of item to update
 * @param {number} quantity - New quantity
 * @returns {Array} - Updated cart items
 */
export const updateCartItemQuantity = (itemId, quantity) => {
    const cartItems = getCartItems();
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            return removeFromCart(itemId);
        }
        
        cartItems[itemIndex].quantity = quantity;
        console.log(`📦 Updated quantity for item ${itemId}: ${quantity}`);
        saveCartItems(cartItems);
    }
    
    return cartItems;
};

/**
 * Clear entire cart
 * @returns {boolean} - Success status
 */
export const clearCart = () => {
    try {
        localStorage.removeItem('cart');
        console.log('🧹 Cart cleared');
        return true;
    } catch (error) {
        console.error('❌ Error clearing cart:', error);
        return false;
    }
};

const cartUtils = {
    cleanCartItems,
    getCartItems,
    saveCartItems,
    calculateCartCount,
    calculateCartTotal,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart
};

export default cartUtils;
