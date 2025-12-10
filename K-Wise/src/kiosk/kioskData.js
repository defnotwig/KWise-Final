/**
 * DEPRECATED: Kiosk Data Compatibility Layer
 * ⚠️  This file is deprecated and should no longer be used.
 * All kiosk components should now use kioskAPI.js for real-time data.
 * This file remains only for backward compatibility during migration.
 * 
 * Migration Guide:
 * - Replace menuItems with kioskAPI.getCategories()
 * - Replace getProductById with kioskAPI.getCategoryProducts()
 * - Use api.utils.formatSpecifications() for specifications
 * - Use api.utils.getFullImageUrl() for image URLs
 */

console.warn('⚠️  kioskData.js is deprecated. Please migrate to kioskAPI.js for real-time data.');

// DEPRECATED - Use kioskAPI.getCategories() instead
export const menuItems = [];

// DEPRECATED - Use api.utils functions instead
export const updateCartIcon = (count) => {
    console.error('❌ updateCartIcon is deprecated. Use proper cart state management instead.');
};

// DEPRECATED - Use API-driven image handling instead
export const defaultCategoryImages = {};

// DEPRECATED - Use kioskAPI.getCategoryProducts() instead
export const getProductById = (id, category) => {
    console.error('❌ getProductById is deprecated. Use kioskAPI for real-time data instead.');
    return null;
};

// Export empty object to prevent app crashes during migration
export default {
    menuItems: [],
    updateCartIcon: () => console.error('❌ Deprecated function called'),
    defaultCategoryImages: {},
    getProductById: () => null
};
