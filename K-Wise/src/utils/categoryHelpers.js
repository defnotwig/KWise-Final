/**
 * Category Helper Functions
 * Utilities for formatting and handling category data in kiosk components
 */

/**
 * Format category name for display
 * @param {string} category - Raw category name from database
 * @returns {string} Formatted display name
 */
export const formatCategoryName = (category) => {
    const categoryMap = {
        'cpu': 'Central Processing Unit',
        'motherboard': 'Motherboard',
        'ram': 'Memory (RAM)',
        'memory': 'Memory (RAM)',
        'storage': 'Storage',
        'gpu': 'Graphics Processing Unit',
        'graphcard': 'Graphics Card',
        'psu': 'Power Supply Unit',
        'case': 'PC Case',
        'cooling': 'CPU Cooler',
        'cpu-cooler': 'CPU Cooler',
        'monitor': 'Monitor',
        'keyboard': 'Keyboard',
        'mouse': 'Mouse',
        'headphones': 'Headphones',
        'speakers': 'Speakers',
        'webcam': 'Webcam',
        'peripherals': 'Peripherals'
    };

    return categoryMap[category.toLowerCase()] || category.charAt(0).toUpperCase() + category.slice(1);
};

/**
 * Format product specifications for display
 * @param {Object} specifications - Raw specifications object
 * @returns {string} Formatted specifications string
 */
export const formatSpecifications = (specifications) => {
    if (!specifications || typeof specifications !== 'object') {
        return "Specifications not available";
    }

    // Helper function to format nested values
    const formatValue = (value, key) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        // Handle nested objects (like {eps: 8, main: 24})
        if (typeof value === 'object' && !Array.isArray(value)) {
            const nestedEntries = Object.entries(value)
                .filter(([k, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => `${k}: ${v}`);
            return nestedEntries.length > 0 ? nestedEntries.join(', ') : null;
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.join(', ');
        }

        // Handle boolean
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        // Handle numbers with units
        if (typeof value === 'number') {
            if (key.includes('clock') || key.includes('speed')) {
                return `${value} MHz`;
            } else if (key.includes('watt') || key.includes('tdp')) {
                return `${value}W`;
            } else if (key.includes('gb') || key.includes('memory') || key.includes('capacity')) {
                return `${value}GB`;
            }
            return value.toString();
        }

        return String(value);
    };

    // Convert object to readable format
    const specEntries = Object.entries(specifications)
        .map(([key, value]) => {
            const formattedValue = formatValue(value, key);
            if (formattedValue === null) {
                return null;
            }

            // Format key name
            const formattedKey = key
                .replaceAll('_', ' ')
                .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return `${formattedKey}: ${formattedValue}`;
        })
        .filter(entry => entry !== null);

    return specEntries.join(' | ') || "Specifications not available";
};

/**
 * Get default category image mapping
 * @returns {Object} Category to default image mapping
 */
export const getDefaultCategoryImages = () => {
    // This will be imported dynamically to avoid circular dependencies
    return {};
};

/**
 * Map frontend category names to backend category names
 * @param {string} frontendCategory - Category name from frontend
 * @returns {string} Backend category name
 */
export const mapCategoryToBackend = (frontendCategory) => {
    const mapping = {
        'cpu': 'CPU',
        'motherboard': 'Motherboard',
        'ram': 'RAM',
        'memory': 'RAM',
        'storage': 'Storage',
        'gpu': 'GPU',
        'graphcard': 'GPU',
        'psu': 'PSU',
        'case': 'Case',
        'cooling': 'Cooling',
        'cpu-cooler': 'Cooling',
        'monitor': 'Monitor',
        'keyboard': 'Keyboard',
        'mouse': 'Mouse',
        'headphones': 'Headphones',
        'speakers': 'Speakers',
        'webcam': 'Webcam'
    };

    return mapping[frontendCategory.toLowerCase()] || frontendCategory;
};

/**
 * Generate product availability status
 * @param {number} stock - Stock quantity
 * @param {boolean} isActive - Whether product is active
 * @returns {Object} Availability status
 */
export const getProductAvailability = (stock, isActive = true) => {
    if (!isActive) {
        return {
            available: false,
            status: 'discontinued',
            message: 'Product discontinued'
        };
    }

    if (stock <= 0) {
        return {
            available: false,
            status: 'out_of_stock',
            message: 'Out of stock'
        };
    }

    if (stock <= 5) {
        return {
            available: true,
            status: 'low_stock',
            message: `Only ${stock} left in stock`
        };
    }

    return {
        available: true,
        status: 'in_stock',
        message: 'In stock'
    };
};
