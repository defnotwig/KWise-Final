/**
 * TASK 10: QR CODE SERVICE
 * Generate QR codes for product sharing
 */

const QRCode = require('qrcode');
const logger = require('../utils/logger');

/**
 * Generate QR code for product
 * @param {Object} product - Product object
 * @param {string} baseUrl - Base URL for the application
 * @returns {Promise<string>} - QR code data URL
 */
async function generateProductQR(product, baseUrl = 'http://localhost:3000') {
    try {
        const productUrl = `${baseUrl}/kiosk/product/${product.id}`;
        
        const qrData = await QRCode.toDataURL(productUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            width: 300,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        logger.info(`Generated QR code for product: ${product.name}`);
        return qrData;
    } catch (error) {
        logger.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Generate vCard QR code for product info
 * @param {Object} product - Product object
 * @returns {Promise<string>} - QR code data URL
 */
async function generateProductVCard(product) {
    try {
        const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${product.name}
ORG:K-Wise PC Shop
NOTE:${product.category} - ₱${product.price}
URL:http://localhost:3000/kiosk/product/${product.id}
END:VCARD`;

        const qrData = await QRCode.toDataURL(vCard, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            width: 300
        });

        return qrData;
    } catch (error) {
        logger.error('Error generating vCard QR:', error);
        throw new Error('Failed to generate vCard QR code');
    }
}

module.exports = {
    generateProductQR,
    generateProductVCard
};
