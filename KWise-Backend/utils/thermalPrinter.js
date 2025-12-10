/**
 * Thermal Printer Integration for GEZHI micro-printer (58MM)
 * Supports USB and Bluetooth connectivity
 * ESC/POS command formatting for thermal receipt printers
 */

// ESC/POS Commands for thermal printers
const ESC = '\x1B';
const GS = '\x1D';

const ThermalCommands = {
    // Initialize printer
    INIT: ESC + '@',
    
    // Text formatting
    BOLD_ON: ESC + 'E' + '\x01',
    BOLD_OFF: ESC + 'E' + '\x00',
    DOUBLE_HEIGHT_ON: ESC + '!' + '\x10',
    DOUBLE_HEIGHT_OFF: ESC + '!' + '\x00',
    DOUBLE_WIDTH_ON: ESC + '!' + '\x20',
    DOUBLE_WIDTH_OFF: ESC + '!' + '\x00',
    DOUBLE_SIZE_ON: ESC + '!' + '\x30',  // Both width and height
    DOUBLE_SIZE_OFF: ESC + '!' + '\x00',
    QUAD_SIZE_ON: ESC + '!' + '\x38',    // Quadruple size for queue numbers
    
    // Alignment
    ALIGN_LEFT: ESC + 'a' + '\x00',
    ALIGN_CENTER: ESC + 'a' + '\x01',
    ALIGN_RIGHT: ESC + 'a' + '\x02',
    
    // Line feeds
    LINE_FEED: '\n',
    DOUBLE_LINE_FEED: '\n\n',
    
    // Cut paper
    CUT_PAPER: GS + 'V' + '\x41' + '\x00',
    CUT_PAPER_PARTIAL: GS + 'V' + '\x42' + '\x00',
    
    // Character sets
    CHAR_SET_USA: ESC + 'R' + '\x00',
    
    // Barcode/QR (optional for future)
    BARCODE_HEIGHT: GS + 'h' + '\x64',
    
    // Drawer kick (if connected)
    OPEN_DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA'
};

/**
 * Format currency for receipt
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

/**
 * Format date for receipt
 */
function formatDate(date = new Date()) {
    // ✅ FIX: Convert string dates from database to Date objects
    let dateObj = date;
    if (typeof date === 'string') {
        dateObj = new Date(date);
    }
    
    // Validate date object
    if (!dateObj || isNaN(dateObj.getTime())) {
        dateObj = new Date(); // Fallback to current date
    }
    
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(dateObj);
}

/**
 * Pad string to center it in 48mm width (32 characters for 58mm paper)
 */
function centerText(text, width = 32) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
}

/**
 * Create a line separator
 */
function separator(char = '-', width = 32) {
    return char.repeat(width);
}

/**
 * Format item line with proper alignment
 */
function formatItemLine(name, qty, price, width = 32) {
    // Format: "Item name...     x2  P100.00"
    const qtyText = `x${qty}`;
    const priceText = formatCurrency(price);
    const nameWidth = width - qtyText.length - priceText.length - 2;
    
    let truncatedName = name.substring(0, nameWidth);
    if (truncatedName.length < nameWidth) {
        truncatedName = truncatedName + ' '.repeat(nameWidth - truncatedName.length);
    }
    
    return truncatedName + ' ' + qtyText + ' ' + priceText;
}

/**
 * Generate ESC/POS formatted receipt for thermal printer
 * @param {Object} orderData - Order information
 * @param {Array} items - Order items
 * @returns {string} ESC/POS formatted receipt data
 */
function generateThermalReceipt(orderData, items = []) {
    const {
        orderIdFormatted,
        transactionIdFormatted,
        queueNumber,
        customerName,
        totalAmount,
        paymentMethod = 'Cash',
        orderType = 'PC Parts Order',
        createdAt = new Date()
    } = orderData;

    let receipt = '';
    
    // Initialize printer
    receipt += ThermalCommands.INIT;
    receipt += ThermalCommands.CHAR_SET_USA;
    
    // Header - Store Name (Bold, Centered)
    receipt += ThermalCommands.ALIGN_CENTER;
    receipt += ThermalCommands.BOLD_ON;
    receipt += ThermalCommands.DOUBLE_HEIGHT_ON;
    receipt += 'K-WISE COMPUTER';
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.DOUBLE_HEIGHT_OFF;
    receipt += ThermalCommands.LINE_FEED;
    
    // Tagline
    receipt += 'Your Technology Partner';
    receipt += ThermalCommands.DOUBLE_LINE_FEED;
    
    // Order Type
    receipt += ThermalCommands.BOLD_ON;
    receipt += orderType;
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.LINE_FEED;
    
    receipt += ThermalCommands.ALIGN_LEFT;
    receipt += separator('=');
    receipt += ThermalCommands.LINE_FEED;
    
    // Date
    receipt += 'Date: ' + formatDate(createdAt);
    receipt += ThermalCommands.LINE_FEED;
    
    receipt += separator('-');
    receipt += ThermalCommands.LINE_FEED;
    
    // Queue Number (HUGE, Centered, Bold)
    receipt += ThermalCommands.ALIGN_CENTER;
    receipt += ThermalCommands.LINE_FEED;
    receipt += ThermalCommands.BOLD_ON;
    receipt += 'YOUR QUEUE NUMBER';
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.LINE_FEED;
    receipt += separator('=');
    receipt += ThermalCommands.LINE_FEED;
    
    receipt += ThermalCommands.QUAD_SIZE_ON;
    receipt += ThermalCommands.BOLD_ON;
    receipt += `  ${queueNumber}  `;
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.QUAD_SIZE_OFF;
    receipt += ThermalCommands.LINE_FEED;
    
    receipt += separator('=');
    receipt += ThermalCommands.LINE_FEED;
    receipt += ThermalCommands.LINE_FEED;
    
    // Important instruction (Centered)
    receipt += ThermalCommands.BOLD_ON;
    receipt += 'PLEASE KEEP THIS RECEIPT';
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.LINE_FEED;
    receipt += 'Wait for your number';
    receipt += ThermalCommands.LINE_FEED;
    receipt += 'to be called';
    receipt += ThermalCommands.DOUBLE_LINE_FEED;
    
    // Order Information (Left-aligned)
    receipt += ThermalCommands.ALIGN_LEFT;
    receipt += separator('-');
    receipt += ThermalCommands.LINE_FEED;
    receipt += ThermalCommands.BOLD_ON;
    receipt += 'ORDER INFORMATION';
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.LINE_FEED;
    receipt += separator('-');
    receipt += ThermalCommands.LINE_FEED;
    
    receipt += `Order ID: ${orderIdFormatted}`;
    receipt += ThermalCommands.LINE_FEED;
    receipt += `Transaction: ${transactionIdFormatted}`;
    receipt += ThermalCommands.LINE_FEED;
    receipt += `Customer: ${customerName}`;
    receipt += ThermalCommands.LINE_FEED;
    receipt += `Payment: ${paymentMethod}`;
    receipt += ThermalCommands.LINE_FEED;
    
    // Items section
    if (items && items.length > 0) {
        receipt += ThermalCommands.LINE_FEED;
        receipt += separator('-');
        receipt += ThermalCommands.LINE_FEED;
        receipt += ThermalCommands.BOLD_ON;
        receipt += 'ITEMS ORDERED';
        receipt += ThermalCommands.BOLD_OFF;
        receipt += ThermalCommands.LINE_FEED;
        receipt += separator('-');
        receipt += ThermalCommands.LINE_FEED;
        
        items.forEach(item => {
            const name = item.name || item.product_name || 'Unknown Item';
            const qty = item.quantity || 1;
            const price = item.totalPrice || item.total_price || item.price || 0;
            
            // Item name (truncate if too long)
            const truncatedName = name.length > 32 ? name.substring(0, 29) + '...' : name;
            receipt += truncatedName;
            receipt += ThermalCommands.LINE_FEED;
            
            // Quantity and price on next line, right-aligned
            const qtyPriceText = `  x${qty}  ${formatCurrency(price)}`;
            receipt += qtyPriceText;
            receipt += ThermalCommands.LINE_FEED;
            receipt += ThermalCommands.LINE_FEED;
        });
    }
    
    // Total
    receipt += separator('=');
    receipt += ThermalCommands.LINE_FEED;
    receipt += ThermalCommands.BOLD_ON;
    receipt += ThermalCommands.DOUBLE_HEIGHT_ON;
    receipt += 'TOTAL: ' + formatCurrency(totalAmount);
    receipt += ThermalCommands.DOUBLE_HEIGHT_OFF;
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.LINE_FEED;
    receipt += separator('=');
    receipt += ThermalCommands.DOUBLE_LINE_FEED;
    
    // Footer (Centered)
    receipt += ThermalCommands.ALIGN_CENTER;
    receipt += ThermalCommands.BOLD_ON;
    receipt += 'Queue Status: ASSIGNED';
    receipt += ThermalCommands.BOLD_OFF;
    receipt += ThermalCommands.DOUBLE_LINE_FEED;
    
    receipt += 'Thank you for choosing';
    receipt += ThermalCommands.LINE_FEED;
    receipt += 'K-Wise Computer!';
    receipt += ThermalCommands.DOUBLE_LINE_FEED;
    
    receipt += 'Keep this receipt for';
    receipt += ThermalCommands.LINE_FEED;
    receipt += 'order verification';
    receipt += ThermalCommands.DOUBLE_LINE_FEED;
    
    receipt += separator('=');
    receipt += ThermalCommands.LINE_FEED;
    
    // Feed paper and cut
    receipt += ThermalCommands.LINE_FEED;
    receipt += ThermalCommands.LINE_FEED;
    receipt += ThermalCommands.LINE_FEED;
    receipt += ThermalCommands.CUT_PAPER;
    
    return receipt;
}

/**
 * Convert ESC/POS commands to Uint8Array for USB/Bluetooth transmission
 */
function stringToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

/**
 * Generate receipt data as bytes for direct printer communication
 */
function generateThermalReceiptBytes(orderData, items = []) {
    const receiptString = generateThermalReceipt(orderData, items);
    return stringToBytes(receiptString);
}

module.exports = {
    generateThermalReceipt,
    generateThermalReceiptBytes,
    ThermalCommands,
    formatCurrency,
    formatDate,
    stringToBytes
};
