/**
 * Receipt Template Generator
 * Creates formatted receipts with large queue numbers, order IDs, and transaction IDs
 */

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
};

const formatDate = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(date);
};

/**
 * Generate receipt HTML with queue management
 * @param {Object} orderData - Order information
 * @param {Array} items - Order items
 * @returns {string} HTML receipt
 */
function generateReceiptHTML(orderData, items = []) {
    const {
        orderId,
        orderNumber,
        orderIdFormatted,
        transactionIdFormatted,
        queueNumber,
        customerName,
        customerEmail,
        totalAmount,
        paymentMethod = 'Cash',
        createdAt = new Date()
    } = orderData;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K-Wise Receipt - Queue #${queueNumber}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: #333;
        }
        
        .receipt {
            border: 2px dashed #333;
            padding: 20px;
            background: #fff;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        
        .store-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .store-tagline {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .queue-number {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
            font-size: 48px;
            font-weight: bold;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: 3px solid #15803d;
        }
        
        .queue-text {
            font-size: 16px;
            font-weight: normal;
            margin-bottom: 5px;
        }
        
        .order-info {
            margin: 20px 0;
            font-size: 12px;
        }
        
        .order-info table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .order-info td {
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
        }
        
        .order-info td:first-child {
            font-weight: bold;
            width: 40%;
        }
        
        .items-section {
            margin: 20px 0;
        }
        
        .items-header {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
            text-align: center;
            border-top: 1px solid #333;
            border-bottom: 1px solid #333;
            padding: 5px 0;
        }
        
        .item {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 12px;
        }
        
        .item-name {
            flex: 1;
            margin-right: 10px;
        }
        
        .item-qty {
            margin: 0 10px;
            min-width: 30px;
            text-align: center;
        }
        
        .item-price {
            min-width: 60px;
            text-align: right;
        }
        
        .total-section {
            margin-top: 20px;
            border-top: 2px solid #333;
            padding-top: 10px;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }
        
        .total-final {
            font-size: 16px;
            font-weight: bold;
            border-top: 1px solid #333;
            padding-top: 10px;
            margin-top: 10px;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px dashed #333;
            font-size: 11px;
            color: #666;
        }
        
        .instructions {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            text-align: center;
        }
        
        .instructions-title {
            font-weight: bold;
            color: #0c4a6e;
            margin-bottom: 5px;
        }
        
        .instructions-text {
            font-size: 11px;
            color: #0c4a6e;
            line-height: 1.4;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 10px;
            }
            
            .receipt {
                border: 1px solid #333;
            }
            
            .queue-number {
                background: #333 !important;
                color: white !important;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="store-name">K-WISE COMPUTER</div>
            <div class="store-tagline">Your Technology Partner</div>
            <div style="font-size: 11px; margin-top: 5px;">${formatDate(createdAt)}</div>
        </div>
        
        <div class="queue-number">
            <div class="queue-text">YOUR QUEUE NUMBER</div>
            <div>${queueNumber}</div>
        </div>
        
        <div class="instructions">
            <div class="instructions-title">📋 PLEASE KEEP THIS RECEIPT</div>
            <div class="instructions-text">
                Please wait for your queue number to be called.<br>
                Show this receipt when collecting your order.
            </div>
        </div>
        
        <div class="order-info">
            <table>
                <tr>
                    <td>Order ID:</td>
                    <td>${orderIdFormatted}</td>
                </tr>
                <tr>
                    <td>Transaction ID:</td>
                    <td>${transactionIdFormatted}</td>
                </tr>
                <tr>
                    <td>Legacy Order #:</td>
                    <td>${orderNumber}</td>
                </tr>
                <tr>
                    <td>Customer:</td>
                    <td>${customerName}</td>
                </tr>
                ${customerEmail ? `<tr><td>Email:</td><td>${customerEmail}</td></tr>` : ''}
                <tr>
                    <td>Payment:</td>
                    <td>${paymentMethod}</td>
                </tr>
            </table>
        </div>
        
        ${items.length > 0 ? `
        <div class="items-section">
            <div class="items-header">ORDER ITEMS</div>
            ${items.map(item => `
                <div class="item">
                    <span class="item-name">${item.name || item.product_name || 'Unknown Item'}</span>
                    <span class="item-qty">x${item.quantity || 1}</span>
                    <span class="item-price">${formatCurrency(item.totalPrice || item.total_price || item.price || 0)}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="total-section">
            <div class="total-line total-final">
                <span>TOTAL AMOUNT:</span>
                <span>${formatCurrency(totalAmount)}</span>
            </div>
        </div>
        
        <div class="footer">
            <div style="margin-bottom: 10px;">
                <strong>Queue Status: ASSIGNED</strong>
            </div>
            <div>Thank you for choosing K-Wise Computer!</div>
            <div>Please keep this receipt for order verification</div>
            <div style="margin-top: 10px; font-size: 10px;">
                Receipt generated on ${formatDate()}<br>
                Internal ID: ${orderId}
            </div>
        </div>
    </div>
    
    <script>
        // Auto-print functionality
        window.onload = function() {
            if (window.location.search.includes('print=true')) {
                setTimeout(() => {
                    window.print();
                    // Close window after printing (if opened in new window)
                    setTimeout(() => {
                        if (window.opener) {
                            window.close();
                        }
                    }, 1000);
                }, 500);
            }
        };
        
        // Add print button functionality
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
        });
    </script>
</body>
</html>`;
}

/**
 * Generate simple text receipt for thermal printers
 */
function generateReceiptText(orderData, items = []) {
    const {
        orderIdFormatted,
        transactionIdFormatted,
        queueNumber,
        customerName,
        totalAmount,
        paymentMethod = 'Cash',
        createdAt = new Date()
    } = orderData;

    let receipt = '';
    receipt += '================================\n';
    receipt += '         K-WISE COMPUTER        \n';
    receipt += '      Your Technology Partner  \n';
    receipt += '================================\n';
    receipt += `Date: ${formatDate(createdAt)}\n`;
    receipt += '--------------------------------\n';
    receipt += '\n';
    receipt += '      YOUR QUEUE NUMBER\n';
    receipt += '    =====================\n';
    receipt += `         >>> ${queueNumber} <<<\n`;
    receipt += '    =====================\n';
    receipt += '\n';
    receipt += '📋 PLEASE KEEP THIS RECEIPT\n';
    receipt += 'Wait for your number to be called\n';
    receipt += '\n';
    receipt += '--------------------------------\n';
    receipt += 'ORDER INFORMATION\n';
    receipt += '--------------------------------\n';
    receipt += `Order ID: ${orderIdFormatted}\n`;
    receipt += `Transaction: ${transactionIdFormatted}\n`;
    receipt += `Customer: ${customerName}\n`;
    receipt += `Payment: ${paymentMethod}\n`;
    receipt += '\n';
    
    if (items.length > 0) {
        receipt += '--------------------------------\n';
        receipt += 'ITEMS ORDERED\n';
        receipt += '--------------------------------\n';
        items.forEach(item => {
            const name = (item.name || item.product_name || 'Unknown').substring(0, 20);
            const qty = item.quantity || 1;
            const price = formatCurrency(item.totalPrice || item.total_price || item.price || 0);
            receipt += `${name.padEnd(20)} x${qty.toString().padStart(2)} ${price.padStart(10)}\n`;
        });
        receipt += '\n';
    }
    
    receipt += '================================\n';
    receipt += `TOTAL: ${formatCurrency(totalAmount).padStart(22)}\n`;
    receipt += '================================\n';
    receipt += '\n';
    receipt += 'Queue Status: ASSIGNED\n';
    receipt += '\n';
    receipt += 'Thank you for choosing K-Wise!\n';
    receipt += 'Keep this receipt for verification\n';
    receipt += '\n';
    receipt += '================================\n';
    
    return receipt;
}

module.exports = {
    generateReceiptHTML,
    generateReceiptText,
    formatCurrency,
    formatDate
};