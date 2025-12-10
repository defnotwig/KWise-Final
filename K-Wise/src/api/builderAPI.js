/**
 * Builder API Module for K-Wise Frontend
 * Handles PC Builder guided flow with compatibility checks
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BUILDER_BASE = `${API_BASE_URL}/builder`;

/**
 * PC Builder API endpoints
 */
const builderAPI = {
    /**
     * Get available compatible options for the next build step
     * @param {string} category - Component category (CPU, Cooling, Motherboard, etc.)
     * @param {object} selectedParts - Previously selected components
     * @returns {Promise} - Array of compatible products
     */
    getAvailableOptions: async (category, selectedParts = {}) => {
        try {
            const response = await axios.get(`${BUILDER_BASE}/available/${category}`, {
                params: {
                    selectedParts: JSON.stringify(selectedParts)
                },
                timeout: 15000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error(`Error fetching available ${category}:`, error);
            throw error;
        }
    },

    /**
     * Check complete build compatibility with scoring
     * @param {object} build - Object containing all selected components
     * @returns {Promise} - Compatibility report with score, warnings, recommendations
     */
    checkCompatibility: async (build) => {
        try {
            const response = await axios.post(`${BUILDER_BASE}/check-compatibility`, {
                build
            }, {
                timeout: 15000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Error checking compatibility:', error);
            throw error;
        }
    },

    /**
     * Get build steps order and current progress
     * @param {array} completedSteps - Array of completed step names
     * @returns {Promise} - Steps information with progress
     */
    getBuildSteps: async (completedSteps = []) => {
        try {
            const response = await axios.get(`${BUILDER_BASE}/steps`, {
                params: {
                    completed: JSON.stringify(completedSteps)
                },
                timeout: 15000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Error fetching build steps:', error);
            throw error;
        }
    },

    /**
     * Filter products by compatibility with selected components
     * This is a client-side utility that uses the backend API
     * @param {string} category - Category to filter
     * @param {array} products - Products to filter
     * @param {object} selectedParts - Selected components
     * @returns {Promise} - Filtered products with compatibility info
     */
    filterByCompatibility: async (category, products, selectedParts) => {
        try {
            // Get compatible products from backend
            const compatibleProducts = await builderAPI.getAvailableOptions(category, selectedParts);
            
            // Map to include full product info from original products array
            const compatibleIds = new Set(compatibleProducts.map(p => p.id));
            
            return products
                .filter(p => compatibleIds.has(p.id))
                .map(product => {
                    const backendInfo = compatibleProducts.find(cp => cp.id === product.id);
                    return {
                        ...product,
                        ...backendInfo,
                        isCompatible: true,
                        compatibilityChecked: true
                    };
                });
        } catch (error) {
            console.error('Error filtering by compatibility:', error);
            // Return original products on error
            return products.map(p => ({
                ...p,
                isCompatible: null,
                compatibilityChecked: false
            }));
        }
    },

    /**
     * Check available RAM slots based on motherboard and existing RAM
     * @param {object} motherboard - Motherboard component with specifications
     * @param {array} existingRAM - Array of currently selected RAM components
     * @returns {Promise} - Available RAM slots information
     */
    checkRAMSlots: async (motherboard, existingRAM = []) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/compatibility/ram-slots`, {
                motherboard,
                existingRAM
            }, {
                timeout: 15000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Error checking RAM slots:', error);
            throw error;
        }
    },

    /**
     * Check available Storage slots (M.2 and SATA) based on motherboard
     * @param {object} motherboard - Motherboard component with specifications
     * @param {array} existingStorage - Array of currently selected Storage components
     * @returns {Promise} - Available storage slots information
     */
    checkStorageSlots: async (motherboard, existingStorage = []) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/compatibility/storage-slots`, {
                motherboard,
                existingStorage
            }, {
                timeout: 15000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Error checking storage slots:', error);
            throw error;
        }
    },

    /**
     * Perform detailed compatibility check with physical clearances and power requirements
     * @param {object} product - Product to check compatibility for
     * @param {object} currentBuild - Current build configuration with all components
     * @returns {Promise} - Detailed compatibility result with score, issues, warnings
     */
    detailedCompatibilityCheck: async (product, currentBuild) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/compatibility/detailed-check`, {
                product,
                currentBuild
            }, {
                timeout: 15000
            });
            return response.data.data || response.data;
        } catch (error) {
            console.error('Error performing detailed compatibility check:', error);
            throw error;
        }
    }
};

export default builderAPI;
