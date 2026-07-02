import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowDown from "../assets/ArrowDown.webp";
import "./QueuingDisplay.css";
import thermalPrinter from "../services/thermalPrinter";
import kioskAPI from "../api/kioskAPI";
import queuepcwiselogo from "../assets/QueuingDisplay/queuepcwiselogo.svg";
import queuenumber from "../assets/QueuingDisplay/queuenumber.svg";

const baseConsole = globalThis.console || { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
const verboseQueueLogs = process.env.VITE_KWISE_VERBOSE_LOGS === "true"
  || process.env.REACT_APP_KWISE_VERBOSE_LOGS === "true";
const console = {
  ...baseConsole,
  log: (...args) => {
    if (verboseQueueLogs) baseConsole.log(...args);
  },
  debug: (...args) => {
    if (verboseQueueLogs) baseConsole.debug(...args);
  },
  warn: (...args) => {
    if (verboseQueueLogs) baseConsole.warn(...args);
  }
};

// Helper functions moved outside component to prevent recreation on every render
const getPrice = (item) => {
  if (!item?.price) return 0;
  if (typeof item.price === "number") return item.price;
  if (typeof item.price === "string") {
    const cleaned = item.price
      .toString()
      .replaceAll(/[^0-9.,]/g, "") // keep digits, dot, comma
      .replaceAll(',', "");        // remove thousands separators
    const n = Number.parseFloat(cleaned);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
};

const formatCurrency = (value) => value.toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// Calculate total from order data
const calculateTotal = (data) => {
  if (!data || data.length === 0) return 0;
  
  // Check if data has totalAmount in wrapper
  if (data.length === 1 && data[0].totalAmount !== undefined) {
    return data[0].totalAmount;
  }
  
  // Extract items array if wrapped
  let items = data;
  if (data.length === 1 && data[0].items) {
    items = data[0].items;
  }
  
  // Calculate from items
  return items.reduce((sum, item) => {
    const price = Number.parseFloat(item.price || item.totalPrice || 0);
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);
};

const getFooterMessage = (txType) => {
  if (txType.includes('Diagnostic')) return 'Please wait for your diagnosis results';
  if (txType.includes('Cleaning')) return 'Service will be completed shortly';
  return 'Thank you for choosing PC-Wise!';
};

const playNotificationSound = () => {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.play().catch((playError) => {
      console.debug('Audio play failed, using Web Audio API fallback:', playError.message);
      // Fallback beep using Web Audio API
      const audioContext = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    });
  } catch (error) {
    console.warn('Audio notification not available:', error.message);
  }
};

/* ❌ DEPRECATED: Receipt generators removed - thermal printer uses backend API
  }
};

/* ❌ DEPRECATED: Receipt generator functions removed - thermal printer uses backend API
 * These functions were used by handlePopupReceipt which has been removed
 */

/* eslint-disable no-unused-vars */
const generateDiagnosticReceipt = (data) => {
  console.log('🔍 Generating diagnostic receipt with data:', JSON.stringify(data, null, 2));

  // Handle both old format (categories with issues array) and new format (individual items)
  let items = data;
  let backendTotal = null;

  // If data has nested items array (from backend order), extract it
  if (data.length === 1 && data[0].items) {
    items = data[0].items;
    backendTotal = data[0].totalAmount || data[0].backendOrder?.totalAmount;
    console.log('📦 Extracted items from order object:', items);
    console.log('Backend total:', backendTotal);
  }

  // Group items by category for better display
  const groupedByCategory = items.reduce((acc, item) => {
    if (item.category) {
      // New format: individual diagnostic items with category
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item.name || item.service || 'Diagnostic Service');
    } else if (item.issues) {
      // Old format: category with issues array
      const categoryName = item.category || 'General Diagnostic';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(...item.issues);
    } else {
      // Fallback: ungrouped item
      if (!acc['General Diagnostic']) {
        acc['General Diagnostic'] = [];
      }
      acc['General Diagnostic'].push(item.name || item.service || 'Diagnostic Service');
    }
    return acc;
  }, {});

  console.log('📋 Grouped diagnostic issues:', groupedByCategory);

  // Use backend total if available, otherwise default to 200
  const serviceFee = backendTotal !== null && backendTotal !== undefined ? backendTotal : 200;

  return `
    <div style="margin: 10px 0;">
      <h4>Diagnostic Services:</h4>
      ${Object.entries(groupedByCategory).map(([category, issues]) => `
        <div style="margin-bottom: 10px;">
          <strong>${category}</strong>
          <ul>
            ${issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
      <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
        <p style="margin: 5px 0;"><strong>Service Fee:</strong> ₱${formatCurrency(serviceFee)}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #666; font-style: italic;">
          Note: Labor and other charges will vary based on PC problems found
      </p>
      </div>
    </div>
  `;
};

const generateCleaningReceipt = (data) => {
  console.log('🧹 Generating cleaning receipt with data:', JSON.stringify(data, null, 2));

  // Extract items and backend total if wrapped
  let items = data;
  let backendTotal = null;
  
  if (data.length === 1 && data[0].items) {
    items = data[0].items;
    backendTotal = data[0].totalAmount || data[0].backendOrder?.totalAmount;
    console.log('📦 Extracted items from order object');
    console.log('Backend total:', backendTotal);
  }

  // Calculate total from items
  const calculatedTotal = items.reduce((sum, entry) => {
    const hasTier = entry?.tier;
    let price = 0;
    if (hasTier) {
      if (entry.tier.priceNumeric) {
        price = Number.parseFloat(entry.tier.priceNumeric);
      } else if (entry.tier.price) {
        price = Number.parseFloat(String(entry.tier.price).replaceAll(/[₱,]/g, ''));
      }
    } else if (entry.priceNumeric) {
      price = Number.parseFloat(entry.priceNumeric);
    } else if (entry.price) {
      price = Number.parseFloat(String(entry.price).replaceAll(/[₱,]/g, ''));
    }
    const qty = entry?.quantity || 1;
    return sum + (price * qty);
  }, 0);

  // Use backend total if available
  const totalAmount = backendTotal !== null && backendTotal !== undefined ? backendTotal : calculatedTotal;

  return `
  <div style="margin: 10px 0;">
    <h4>Cleaning Services:</h4>
    ${items.map(entry => {
    // Check multiple possible data structures
    const hasTier = entry?.tier;

    // Extract tier name
    let name = 'PC Cleaning';
    if (hasTier && entry.tier.name) {
      name = entry.tier.name;
    } else if (entry.name) {
      name = entry.name;
    }

    // Extract price - check priceNumeric first, then price
    let price = 0;
    if (hasTier) {
      if (entry.tier.priceNumeric) {
        price = Number.parseFloat(entry.tier.priceNumeric);
      } else if (entry.tier.price) {
        // Handle formatted price strings like "₱1,000.00"
        price = Number.parseFloat(String(entry.tier.price).replaceAll(/[₱,]/g, ''));
      }
    } else if (entry.priceNumeric) {
      price = Number.parseFloat(entry.priceNumeric);
    } else if (entry.price) {
      price = Number.parseFloat(String(entry.price).replaceAll(/[₱,]/g, ''));
    }

    const qty = entry?.quantity || 1;
    const subtotal = price * qty;

    // 🔥 FIX: Get description from entry.description (persisted from PaymentWindow)
    // This contains the complete assessment data and PC re-case info
    const description = entry?.description || '';
    const hasDescription = description.trim().length > 0;

    console.log(`Receipt item: ${name}, price: ${price}, qty: ${qty}, subtotal: ${subtotal}, description: ${description}`);

    return `
        <div style="margin-bottom: 12px; padding: 10px; background: #f9f9f9; border-radius: 5px; border-left: 3px solid #00E083;">
          <p style="margin: 0 0 4px 0;"><strong style="font-size: 14px; color: #002024;">${name}</strong></p>
          <p style="margin: 0 0 8px 0; font-size: 13px;">Qty: ${qty} × ₱${formatCurrency(price)} = <strong>₱${formatCurrency(subtotal)}</strong></p>
          
          ${hasDescription ? `
            <div style="margin-top: 8px; padding: 8px; background: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #2e7d32;">📋 Order Details:</p>
              <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #1b5e20;">${description}</p>
            </div>
          ` : ''}
        </div>
      `;
  }).join('')}
    <p style="margin-top: 10px; padding-top: 10px; border-top: 2px dotted #ccc; font-weight: bold; font-size: 16px;">
      Total Service Fee: ₱${formatCurrency(totalAmount)}
    </p>
  </div>
`;
};

const generateCustomizedReceipt = (data) => {
  const isOrders = Array.isArray(data) && data.length > 0 && data[0].items;
  if (isOrders) {
    return `
      <div style="margin: 10px 0;">
        <h4>Custom PC Builds:</h4>
        ${data.map((order, idx) => {
      const items = Array.isArray(order.items) ? order.items.filter(Boolean) : [];
      const qty = order.quantity || 1;
      const subtotal = items.reduce((sum, it) => sum + getPrice(it), 0);
      const total = subtotal * qty;
      return `
            <div style="margin-bottom: 10px; border: 1px solid #ddd; padding: 8px; border-radius: 4px;">
              <p><strong>Custom PC Build #${idx + 1}</strong></p>
              ${items.length ? `
                <ul style="margin: 6px 0 8px 16px;">
                  ${items.map(it => `<li>${(it.name || it.component || 'Item')}</li>`).join('')}
                </ul>
              ` : ''}
              <p>Qty: ${qty}</p>
              <p><strong>Subtotal: ₱${formatCurrency(total)}</strong></p>
            </div>
          `;
    }).join('')}
        <p style="margin-top: 12px; font-weight: bold;">
          TOTAL CUSTOM BUILD COST: ₱${formatCurrency(data.reduce((sum, order) => {
      const items = Array.isArray(order.items) ? order.items.filter(Boolean) : [];
      const qty = order.quantity || 1;
      const sub = items.reduce((s, it) => s + getPrice(it), 0);
      return sum + (sub * qty);
    }, 0))}
        </p>
      </div>
    `;
  }

  // Fallback: data is already a flat list of items
  return `
    <div style="margin: 10px 0;">
      <h4>Custom PC Build Components:</h4>
      ${data.filter(Boolean).map((item, index) => {
    const quantity = item.quantity || 1;
    return `
          <div style="margin-bottom: 8px; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
            <p><strong>${item.name || `Component ${index + 1}`}</strong></p>
            <p>Qty: ${quantity} </p>
          </div>
        `;
  }).join('')}
      <p style="margin-top: 15px; font-weight: bold; font-size: 16px;">
        TOTAL BUILD COST: ₱${formatCurrency(data.filter(item => item && typeof item === 'object').reduce((sum, item) => sum + (getPrice(item) * (item.quantity || 1)), 0))}
      </p>
    </div>
  `;
};

const generateUpgradeReceipt = (data) => {
  console.log('🔧 Generating Upgrade receipt with data:', JSON.stringify(data, null, 2));

  // Extract backend total if available
  let backendTotal = null;
  let items = data;

  // Check if data is wrapped with totalAmount
  if (data && data.length > 0 && data[0] && typeof data[0] === 'object') {
    if (data[0].totalAmount !== undefined) {
      backendTotal = data[0].totalAmount;
      items = data[0].items || data;
    }
  }

  console.log('🔍 DEBUG Upgrade receipt:');
  console.log('  - Raw data:', data);
  console.log('  - Extracted items:', items);
  console.log('  - Items length:', items?.length);
  console.log('  - First item:', items?.[0]);
  console.log('  - Backend total:', backendTotal);

  // Check if items are already flattened (from PaymentWindow)
  // Flattened structure: [{id, name, price, quantity, totalPrice, category: 'upgrade'}, ...]
  const isFlattened = Array.isArray(items) && items.length > 0 && 
                      items[0] && !items[0].items && items[0].category === 'upgrade';

  console.log('Upgrade receipt - isFlattened:', isFlattened, 'items count:', items.length);

  if (isFlattened) {
    // Items are already flattened from PaymentWindow
    // Group them as a single upgrade package
    const totalCalculated = items.reduce((sum, item) => {
      const price = Number.parseFloat(item.price || 0);
      const quantity = item.quantity || 1;
      const itemTotal = price * quantity;
      console.log(`  - Item: ${item.name}, price: ${price}, qty: ${quantity}, total: ${itemTotal}`);
      return sum + itemTotal;
    }, 0);

    const total = backendTotal !== null && backendTotal !== undefined ? backendTotal : totalCalculated;

    console.log('Upgrade total:', { backendTotal, totalCalculated, final: total });

    return `
      <div style="margin: 10px 0;">
        <h4>PC Upgrade Services:</h4>
        <div style="margin-bottom: 10px; border: 1px solid #ddd; padding: 8px; border-radius: 4px;">
          <p><strong>Upgrade Package</strong></p>
          ${items.length ? `
            <ul style="margin: 6px 0 8px 16px;">
              ${items.map(item => {
                const itemName = item.name || item.component || 'Upgrade Component';
                const itemPrice = Number.parseFloat(item.price || 0);
                const itemQty = item.quantity || 1;
                const itemTotal = itemPrice * itemQty;
                return `<li>${itemName} - ₱${formatCurrency(itemPrice)} × ${itemQty} = ₱${formatCurrency(itemTotal)}</li>`;
              }).join('')}
            </ul>
          ` : '<p>No items</p>'}
          <p><strong>Subtotal: ₱${formatCurrency(total)}</strong></p>
        </div>
        <p style="margin-top: 12px; font-weight: bold; font-size: 16px;">
          TOTAL UPGRADE COST: ₱${formatCurrency(total)}
        </p>
      </div>
    `;
  } else {
    // Legacy structure: data is array of order objects with nested items
    // Structure: [{items: [...], quantity: 1}, ...]
    return `
      <div style="margin: 10px 0;">
        <h4>PC Upgrade Services:</h4>
        ${items.map((order, idx) => {
          const orderItems = Array.isArray(order.items) ? order.items : [];
          const qty = order.quantity || 1;
          const subtotal = orderItems.reduce((sum, it) => sum + getPrice(it), 0);
          const total = subtotal * qty;
          return `
            <div style="margin-bottom: 10px; border: 1px solid #ddd; padding: 8px; border-radius: 4px;">
              <p><strong>Upgrade Package ${idx + 1}</strong></p>
              ${orderItems.length ? `
                <ul style="margin: 6px 0 8px 16px;">
                  ${orderItems.map(it => `<li>${(it.name || it.component || 'Item')}</li>`).join('')}
                </ul>
              ` : ''}
              <p>Qty: ${qty}</p>
              <p><strong>Subtotal: ₱${formatCurrency(total)}</strong></p>
            </div>
          `;
        }).join('')}
        <p style="margin-top: 12px; font-weight: bold; font-size: 16px;">
          TOTAL UPGRADE COST: ₱${formatCurrency(items.reduce((sum, order) => {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const qty = order.quantity || 1;
            const subtotal = orderItems.reduce((s, it) => s + getPrice(it), 0);
            return sum + (subtotal * qty);
          }, 0))}
        </p>
      </div>
    `;
  }
};

const generatePrebuiltReceipt = (data) => {
  console.log('🏗️ Generating PreBuilt receipt with data:', JSON.stringify(data, null, 2));
  
  // Reconstruct Pre-Built orders from items
  // Items structure after extraction: [mainProduct, ...components, addon?]
  const reconstructedOrders = [];

  // Check if data is already in the right format (array of items from backend)
  if (Array.isArray(data) && data.length > 0) {
    // Data is a flat array of items from PaymentWindow
    // Find main Pre-Built product (has isMainProduct flag or category==='prebuilt')
    const mainProductItem = data.find(item => item.isMainProduct || item.category === 'prebuilt');

    // Find addon (has isAddon flag or category includes 'addon')
    const addonItem = data.find(item => item.isAddon || item.category?.includes('addon'));

    // Find components (category==='prebuilt-component')
    const componentItems = data.filter(item => item.category === 'prebuilt-component');

    console.log('Found items:', {
      mainProduct: mainProductItem?.name,
      components: componentItems.length,
      addon: addonItem?.name
    });

    if (mainProductItem) {
      // Reconstruct as Pre-Built order structure
      const productPrice = getPrice({ price: mainProductItem.price });
      const addonPrice = addonItem ? getPrice({ price: addonItem.price }) : 0;
      const quantity = mainProductItem.quantity || 1;
      const totalPrice = (productPrice + addonPrice) * quantity;

      // Build components array from component items
      const components = componentItems.map(comp => {
        // Extract component type and value from the structured name
        // Format: "[Elite Build C] CPU: AMD RYZEN 7 9700X"
        let componentType = comp.componentType || '';
        let componentValue = comp.componentValue || '';

        // If not already parsed, extract from name
        if (!componentType && comp.name) {
          // Remove parent product prefix if exists: "[Elite Build C] CPU: AMD..."
          let cleanName = comp.name.replace(/^\[.*?\]\s*/, '');
          
          if (cleanName.includes(':')) {
            const parts = cleanName.split(':');
            componentType = parts[0].trim();
            componentValue = parts.slice(1).join(':').trim();
          } else {
            componentType = cleanName;
          }
        }

        return {
          name: componentType,
          value: componentValue
        };
      });

      reconstructedOrders.push({
        product: {
          name: mainProductItem.name,
          price: productPrice,
          components: components
        },
        addon: addonItem ? {
          name: addonItem.name,
          price: addonPrice
        } : null,
        quantity: quantity,
        totalPrice: totalPrice
      });
    }
  } else if (data && typeof data === 'object' && !Array.isArray(data)) {
    // Legacy: Data might be wrapped in order object
    const items = data.items || [];
    
    const mainProductItem = items.find(item => item.isMainProduct || item.category === 'prebuilt');
    const addonItem = items.find(item => item.isAddon || item.category?.includes('addon'));
    const componentItems = items.filter(item => item.category === 'prebuilt-component');

    if (mainProductItem) {
      const productPrice = getPrice({ price: mainProductItem.price });
      const addonPrice = addonItem ? getPrice({ price: addonItem.price }) : 0;
      const quantity = mainProductItem.quantity || 1;
      const totalPrice = (productPrice + addonPrice) * quantity;

      const components = componentItems.map(comp => ({
        name: comp.componentType || comp.name.split(':')[0],
        value: comp.componentValue || comp.name.split(':')[1]?.trim() || ''
      }));

      reconstructedOrders.push({
        product: {
          name: mainProductItem.name,
          price: productPrice,
          components: components
        },
        addon: addonItem ? {
          name: addonItem.name,
          price: addonPrice
        } : null,
        quantity: quantity,
        totalPrice: totalPrice
      });
    }
  }

  console.log('Reconstructed orders:', reconstructedOrders.length);

  // Generate receipt from reconstructed orders
  return `
    <div style="margin: 10px 0;">
      <h4>PreBuilt PC Order:</h4>
      ${reconstructedOrders.map((order) => `
        <div style="margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
          <p><strong>${order.product.name}</strong></p>
          <p>Base Price: ₱${formatCurrency(order.product.price)}</p>
          ${order.product.components && order.product.components.length > 0 ? `
            <div style="margin: 8px 0; padding-left: 10px;">
              <p><em>Components:</em></p>
              ${order.product.components
        .filter(comp => comp?.value && typeof comp.value === 'string' && comp.value.trim())
        .map(component => `<p style="font-size: 12px; margin: 2px 0;">• ${component.name}: ${component.value}</p>`)
        .join('')}
            </div>
          ` : ''}
          ${order.addon ? `
            <p>Add-on: ${order.addon.name} (+₱${formatCurrency(order.addon.price)})</p>
          ` : ''}
          <p>Quantity: ${order.quantity}</p>
          <p><strong>Subtotal: ₱${formatCurrency(order.totalPrice)}</strong></p>
        </div>
      `).join('')}
      <p style="margin-top: 15px; font-weight: bold; font-size: 16px;">
        TOTAL ORDER COST: ₱${formatCurrency(reconstructedOrders.reduce((sum, order) => sum + order.totalPrice, 0))}
      </p>
    </div>
  `;
};

const generatePcPartsReceipt = (data, orderWrapper = null) => {
  console.log('Receipt generation - PC Parts data:', JSON.stringify(data, null, 2));
  console.log('Receipt generation - Order wrapper:', orderWrapper);

  if (!data || data.length === 0) {
    return `
      <div style="margin: 10px 0;">
        <h4>Items Ordered:</h4>
        <p style="text-align: center; color: #666; font-style: italic;">No items found</p>
      </div>
    `;
  }

  // Check if data is wrapped in order object from PaymentWindow
  let items = data;
  let backendTotal = null;
  
  if (data.length === 1 && data[0].items) {
    items = data[0].items; // Extract items array from order object
    backendTotal = data[0].totalAmount || data[0].backendOrder?.totalAmount;
    console.log('Extracted items from order object:', JSON.stringify(items, null, 2));
    console.log('Backend total from wrapper:', backendTotal);
  }

  if (!items || items.length === 0) {
    console.log('No items found in extracted data');
    return `
      <div style="margin: 10px 0;">
        <h4>Items Ordered:</h4>
        <p style="text-align: center; color: #666; font-style: italic;">No items found in order</p>
      </div>
    `;
  }

  // Use backend total if available, otherwise calculate
  const calculatedTotal = items.reduce((sum, item) => {
    const quantity = item.quantity || 1;
    const price = Number.parseFloat(item.price || item.totalPrice || 0);
    return sum + (price * quantity);
  }, 0);
  
  const total = backendTotal !== null && backendTotal !== undefined ? backendTotal : calculatedTotal;

  console.log('Total calculation:', { backendTotal, calculatedTotal, finalTotal: total });

  return `
    <div style="margin: 10px 0;">
      <h4>Items Ordered:</h4>
      ${items.map((item, index) => {
    const quantity = item.quantity || 1;
    const price = Number.parseFloat(item.price || item.totalPrice || 0);
    const subtotal = item.totalPrice || (price * quantity);
    const itemName = item.name || item.item_name || item.component_name || `Component ${index + 1}`;

    console.log(`Receipt item ${index}:`, {
      itemName,
      price,
      quantity,
      subtotal,
      originalItem: item
    });

    return `
          <div style="margin-bottom: 8px; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
            <p><strong>${itemName}</strong></p>
            <p>₱${formatCurrency(price)} × ${quantity} = ₱${formatCurrency(subtotal)}</p>
          </div>
        `;
  }).join('')}
      <p style="margin-top: 15px; font-weight: bold; font-size: 16px;">
        TOTAL: ₱${formatCurrency(total)}
      </p>
    </div>
  `;
};
/* eslint-enable no-unused-vars */

const parsePrebuiltComponent = (comp) => {
  let componentType = comp.componentType || '';
  let componentValue = comp.componentValue || '';
  if (!componentType && comp.name) {
    let cleanName = comp.name.replace(/^\[.*?\]\s*/, '');
    if (cleanName.includes(':')) {
      const parts = cleanName.split(':');
      componentType = parts[0].trim();
      componentValue = parts.slice(1).join(':').trim();
    } else {
      componentType = cleanName;
    }
  }
  return { name: componentType, value: componentValue };
};

// eslint-disable-next-line no-unused-vars
const reconstructPrebuiltOrder = (items) => {
  const mainProductItem = items.find(item => item.isMainProduct || item.category === 'prebuilt');
  const addonItem = items.find(item => item.isAddon || item.category?.includes('addon'));
  const componentItems = items.filter(item => item.category === 'prebuilt-component');
  if (!mainProductItem) return [];
  const productPrice = getPrice({ price: mainProductItem.price });
  const addonPrice = addonItem ? getPrice({ price: addonItem.price }) : 0;
  const quantity = mainProductItem.quantity || 1;
  const totalPrice = (productPrice + addonPrice) * quantity;
  const components = componentItems.map(parsePrebuiltComponent);
  return [{
    product: { name: mainProductItem.name, price: productPrice, components },
    addon: addonItem ? { name: addonItem.name, price: addonPrice } : null,
    quantity,
    totalPrice
  }];
};

const originToLabel = (origin) => {
  switch (origin) {
    case "pc-diagnostic":
      return "PC Diagnostic Service";
    case "pc-cleaning":
      return "PC Cleaning Service";
    case "pc-upgrade":
      return "PC Upgrade Service";
    case "pc-customized":
      return "PC Customized Build";
    case "prebuilt-pc":
      return "PreBuilt PC Order";
    case "pc-parts":
      return "PC Parts Order";
    default:
      return (typeof origin === 'string' && origin.toLowerCase().includes('pc')) ? origin : "PC Order";
  }
};

const normalizeOriginSlug = (origin) => {
  switch (origin) {
    case "PC Diagnostic Service":
      return "pc-diagnostic";
    case "PC Cleaning Service":
      return "pc-cleaning";
    case "PC Upgrade Service":
      return "pc-upgrade";
    case "PC Customized Build":
      return "pc-customized";
    case "PreBuilt PC Order":
      return "prebuilt-pc";
    case "PC Parts Order":
      return "pc-parts";
    default:
      if (typeof origin === 'string' && origin.startsWith('pc-')) return origin;
      if (origin === 'PreBuilt PC' || origin === 'Pre-Built PC') return 'prebuilt-pc';
      return 'pc-parts';
  }
};

const receiptModelToOrderWrapper = (receipt, fallback = {}) => {
  if (!receipt) return null;

  return [{
    orderIdFormatted: receipt.orderIdFormatted || receipt.orderNumber || fallback.orderIdFormatted || '',
    transactionIdFormatted: receipt.transactionIdFormatted || fallback.transactionIdFormatted || '',
    queueNumber: receipt.queueNumber || fallback.queueNumber || '',
    customerName: receipt.customerName || '',
    totalAmount: receipt.totalAmount || 0,
    items: (receipt.items || []).map((item) => ({
      id: item.id,
      name: item.name || item.componentName || 'Order Item',
      component_name: item.componentName || item.name || 'Order Item',
      category: item.category || '',
      price: item.price || item.amount || 0,
      quantity: item.quantity || 1,
      amount: item.amount,
      status: item.status,
      description: item.description
    })),
    paymentMethod: receipt.paymentMethod || fallback.paymentMethod || '',
    transactionOrigin: normalizeOriginSlug(receipt.serviceType || fallback.transactionType || fallback.from || 'pc-parts'),
    backendOrder: receipt
  }];
};

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
const initFromBackendData = (state) => {
  const lastOrderData = JSON.parse(localStorage.getItem("lastOrder")) || [];
  const result = {
    queueNumber: state.queueNumber.toString(),
    orderIdFormatted: state.orderIdFormatted,
    transactionIdFormatted: state.transactionIdFormatted || '',
    transactionType: originToLabel(state.from || 'pc-parts'),
    orderData: [],
    paymentMethod: ''
  };

  if (lastOrderData && lastOrderData.length > 0 && lastOrderData[0]) {
    console.log('📦 Extracted order wrapper from localStorage:', lastOrderData[0]);
    result.orderData = lastOrderData;
    if (lastOrderData[0].paymentMethod) {
      result.paymentMethod = lastOrderData[0].paymentMethod;
    }
  } else {
    console.warn('⚠️ No order data found in localStorage, using empty array');
  }

  console.log('QueueingDisplay: Using backend queue data:', {
    queueNumber: state.queueNumber,
    orderIdFormatted: state.orderIdFormatted,
    transactionIdFormatted: state.transactionIdFormatted,
    hasOrderData: lastOrderData && lastOrderData.length > 0
  });

  return result;
};

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
const loadLegacyQueueInfo = () => {
  const storedQueueNumber = localStorage.getItem("queueNumber");
  const storedOrderId = localStorage.getItem("orderIdFormatted");
  const storedTransactionId = localStorage.getItem("transactionIdFormatted");
  if (storedQueueNumber && storedOrderId) {
    return {
      queueNumber: storedQueueNumber,
      orderIdFormatted: storedOrderId,
      transactionIdFormatted: storedTransactionId || ''
    };
  }
  console.warn('QueueingDisplay: Using legacy queue generation - this should not happen with new backend integration');
  const lastQueueNumber = Number.parseInt(localStorage.getItem("lastQueueNumber") || "0", 10);
  const newQueueNumber = lastQueueNumber + 1;
  localStorage.setItem("lastQueueNumber", newQueueNumber);
  localStorage.setItem("queueNumber", String(newQueueNumber));
  return {
    queueNumber: String(newQueueNumber),
    orderIdFormatted: '',
    transactionIdFormatted: ''
  };
};

// eslint-disable-next-line no-unused-vars
const determineTransactionFromState = (stateFrom, sources) => {
  const { cartItems, customOrders, cleaningOrders, cleaningOrder, upgradeOrders, diagnosticIssues, lastOrder } = sources;
  let transactionData = null;
  let transactionOrigin = "";
  const originSlug = stateFrom;
  switch (stateFrom) {
    case "pc-parts":
      transactionData = cartItems;
      transactionOrigin = "PC Parts Order";
      break;
    case "pc-customized":
      transactionData = customOrders.length > 0 ? customOrders : cartItems;
      transactionOrigin = "PC Customized Build";
      break;
    case "prebuilt-pc":
      transactionData = cartItems;
      transactionOrigin = "PreBuilt PC Order";
      break;
    case "pc-cleaning":
      transactionData = cleaningOrders.length > 0 ? cleaningOrders : cleaningOrder;
      transactionOrigin = "PC Cleaning Service";
      break;
    case "pc-upgrade":
      transactionData = lastOrder.length > 0 ? lastOrder : upgradeOrders;
      transactionOrigin = "PC Upgrade Service";
      break;
    case "pc-diagnostic":
      transactionData = lastOrder.length > 0 ? lastOrder : diagnosticIssues;
      transactionOrigin = "PC Diagnostic Service";
      break;
    default:
      transactionData = cartItems;
      transactionOrigin = "PC Order";
  }
  return { transactionData, transactionOrigin, originSlug };
};

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
const determineTransactionFromStorage = (sources) => {
  const { cartItems, customOrders, cleaningOrders, cleaningOrder, upgradeOrders, diagnosticIssues, lastOrder } = sources;
  let transactionData = null;
  let transactionOrigin = "";
  let originSlug = "";
  if (cartItems.length > 0 && cartItems[0]?.product) {
    transactionData = cartItems;
    transactionOrigin = "PreBuilt PC Order";
    originSlug = "prebuilt-pc";
  } else if (cartItems.length > 0) {
    transactionData = cartItems;
    transactionOrigin = "PC Parts Order";
    originSlug = "pc-parts";
  } else if (customOrders.length > 0) {
    transactionData = customOrders;
    transactionOrigin = "PC Customized Build";
    originSlug = "pc-customized";
  } else if (cleaningOrders.length > 0) {
    transactionData = cleaningOrders;
    transactionOrigin = "PC Cleaning Service";
    originSlug = "pc-cleaning";
  } else if (cleaningOrder.length > 0) {
    transactionData = cleaningOrder;
    transactionOrigin = "PC Cleaning Service";
    originSlug = "pc-cleaning";
  } else if (upgradeOrders.length > 0) {
    transactionData = upgradeOrders;
    transactionOrigin = "PC Upgrade Service";
    originSlug = "pc-upgrade";
  } else if (diagnosticIssues.length > 0) {
    transactionData = diagnosticIssues;
    transactionOrigin = "PC Diagnostic Service";
    originSlug = "pc-diagnostic";
  } else if (lastOrder.length > 0) {
    transactionData = lastOrder;
    const storedOrigin = localStorage.getItem("orderOrigin") || "";
    transactionOrigin = originToLabel(storedOrigin);
    originSlug = normalizeOriginSlug(storedOrigin);
  }
  return { transactionData, transactionOrigin, originSlug };
};

// eslint-disable-next-line no-unused-vars
const printViaIframe = (printContent) => {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        iframe.remove();
        playNotificationSound();
      }, 1000);
    }, 500);
  } catch (iframeError) {
    console.error('❌ Iframe print also failed:', iframeError);
    alert('Unable to print receipt. Please allow popups or use thermal printer.');
  }
};

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
const attemptPrinterConnection = async () => {
  try {
    await thermalPrinter.autoConnect();
  } catch (autoConnectError) {
    console.warn('Auto-connect failed, attempting manual connect:', autoConnectError.message);
    await thermalPrinter.connect();
  }
};

function QueuingDisplay() {
  const [queueNumber, setQueueNumber] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [transactionType, setTransactionType] = useState("");
  const [orderIdFormatted, setOrderIdFormatted] = useState("");
  const [transactionIdFormatted, setTransactionIdFormatted] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); // NEW: Track payment method for receipt
  const [isLoadingData, setIsLoadingData] = useState(true); // NEW: Track loading state
  const [receiptPreviewHtml, setReceiptPreviewHtml] = useState("");
  const [_countdown, setCountdown] = useState(10); // eslint-disable-line no-unused-vars
  const navigate = useNavigate();
  const location = useLocation();
  const printedRef = useRef(false);

  // Initialize queue display with backend data
  useEffect(() => {
    console.log('QueueingDisplay: Initializing with state:', location.state);

    // Check if we have real backend order data from PaymentWindow
    if (location.state?.queueNumber && location.state?.orderIdFormatted) {
      // Use real backend queue data
      setQueueNumber(location.state.queueNumber.toString());
      setOrderIdFormatted(location.state.orderIdFormatted);
      setTransactionIdFormatted(location.state.transactionIdFormatted || '');
      setTransactionType(originToLabel(location.state.from || 'pc-parts'));

      // Get order data from localStorage (set by PaymentWindow)
      const lastOrderData = JSON.parse(localStorage.getItem("lastOrder")) || [];
      
      // 🔥 FIX: Properly extract order data structure
      // lastOrder structure: [{ items: [...], totalAmount: ..., orderIdFormatted: ..., ... }]
      if (lastOrderData && lastOrderData.length > 0 && lastOrderData[0]) {
        console.log('📦 Extracted order wrapper from localStorage:', lastOrderData[0]);
        setOrderData(lastOrderData); // Keep the full structure for receipt generation
        
        // Extract payment method if available
        if (lastOrderData[0].paymentMethod) {
          setPaymentMethod(lastOrderData[0].paymentMethod);
        }
      } else {
        console.warn('⚠️ No order data found in localStorage, using empty array');
        setOrderData([]);
      }

      setIsLoadingData(false); // Data is now loaded

      console.log('QueueingDisplay: Using backend queue data:', {
        queueNumber: location.state.queueNumber,
        orderIdFormatted: location.state.orderIdFormatted,
        transactionIdFormatted: location.state.transactionIdFormatted,
        hasOrderData: lastOrderData && lastOrderData.length > 0
      });

      return; // Skip legacy localStorage logic
    }

    // Legacy fallback for old localStorage-based orders
    let storedQueueNumber = localStorage.getItem("queueNumber");
    let storedOrderId = localStorage.getItem("orderIdFormatted");
    let storedTransactionId = localStorage.getItem("transactionIdFormatted");

    // Use stored queue data if available
    if (storedQueueNumber && storedOrderId) {
      setQueueNumber(storedQueueNumber);
      setOrderIdFormatted(storedOrderId);
      setTransactionIdFormatted(storedTransactionId || '');
    } else {
      // Legacy queue number generation (for backward compatibility)
      console.warn('QueueingDisplay: Using legacy queue generation - this should not happen with new backend integration');
      const lastQueueNumber = Number.parseInt(localStorage.getItem("lastQueueNumber") || "0", 10);
      const newQueueNumber = lastQueueNumber + 1;
      localStorage.setItem("lastQueueNumber", newQueueNumber);
      localStorage.setItem("queueNumber", String(newQueueNumber));
      setQueueNumber(String(newQueueNumber));
    }

    // Get transaction data from various sources
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    const lastOrder = JSON.parse(localStorage.getItem("lastOrder")) || [];
    const diagnosticIssues = JSON.parse(localStorage.getItem("diagnosticIssues")) || [];
    const cleaningOrder = JSON.parse(localStorage.getItem("cleaningOrder")) || [];
    const cleaningOrders = JSON.parse(localStorage.getItem("cleaningOrders")) || [];
    const upgradeOrders = JSON.parse(localStorage.getItem("upgradeOrders")) || [];
    const customOrders = JSON.parse(localStorage.getItem("customOrders")) || [];

    // Determine transaction type and data
    let transactionData = null;
    let transactionOrigin = ""; // display label
    let originSlug = "";

    // Check location state first (most reliable)
    if (location.state?.from) {
      transactionOrigin = location.state.from;
      originSlug = location.state.from;
      switch (location.state.from) {
        case "pc-parts":
          transactionData = cartItems;
          transactionOrigin = "PC Parts Order";
          break;
        case "pc-customized":
          transactionData = customOrders.length > 0 ? customOrders : cartItems;
          transactionOrigin = "PC Customized Build";
          break;
        case "prebuilt-pc":
          transactionData = cartItems;
          transactionOrigin = "PreBuilt PC Order";
          break;
        case "pc-cleaning":
          transactionData = cleaningOrders.length > 0 ? cleaningOrders : cleaningOrder;
          transactionOrigin = "PC Cleaning Service";
          break;
        case "pc-upgrade":
          // Use lastOrder if available (has flattened items from PaymentWindow)
          // Otherwise fall back to upgradeOrders (legacy structure)
          transactionData = lastOrder.length > 0 ? lastOrder : upgradeOrders;
          transactionOrigin = "PC Upgrade Service";
          break;
        case "pc-diagnostic":
          transactionData = lastOrder.length > 0 ? lastOrder : diagnosticIssues;
          transactionOrigin = "PC Diagnostic Service";
          break;
        default:
          transactionData = cartItems;
          transactionOrigin = "PC Order";
      }
    } else if (cartItems.length > 0 && cartItems[0]?.product) {
        // PreBuilt PC has grouped structure with product property
        transactionData = cartItems;
        transactionOrigin = "PreBuilt PC Order";
        originSlug = "prebuilt-pc";
      } else if (cartItems.length > 0) {
        // Regular PC Parts (flat structure)
        transactionData = cartItems;
        transactionOrigin = "PC Parts Order";
        originSlug = "pc-parts";
      } else if (customOrders.length > 0) {
        transactionData = customOrders;
        transactionOrigin = "PC Customized Build";
        originSlug = "pc-customized";
      } else if (cleaningOrders.length > 0) {
        transactionData = cleaningOrders;
        transactionOrigin = "PC Cleaning Service";
        originSlug = "pc-cleaning";
      } else if (cleaningOrder.length > 0) {
        transactionData = cleaningOrder;
        transactionOrigin = "PC Cleaning Service";
        originSlug = "pc-cleaning";
      } else if (upgradeOrders.length > 0) {
        transactionData = upgradeOrders;
        transactionOrigin = "PC Upgrade Service";
        originSlug = "pc-upgrade";
      } else if (diagnosticIssues.length > 0) {
        transactionData = diagnosticIssues;
        transactionOrigin = "PC Diagnostic Service";
        originSlug = "pc-diagnostic";
      } else if (lastOrder.length > 0) {
        transactionData = lastOrder;
        const storedOrigin = localStorage.getItem("orderOrigin") || "";
        transactionOrigin = originToLabel(storedOrigin);
        originSlug = normalizeOriginSlug(storedOrigin);
      }

    setOrderData(transactionData);
    setTransactionType(transactionOrigin);
    setIsLoadingData(false); // Mark data as loaded for legacy path

    // Extract payment method from location.state or lastOrder
    let extractedPaymentMethod = '';
    if (location.state?.paymentMethod) {
      extractedPaymentMethod = location.state.paymentMethod;
    } else if (lastOrder.length > 0 && lastOrder[0].paymentMethod) {
      extractedPaymentMethod = lastOrder[0].paymentMethod;
    }
    setPaymentMethod(extractedPaymentMethod);

    // Store for receipt generation
    if (transactionData && transactionData.length > 0) {
      localStorage.setItem("lastOrder", JSON.stringify(transactionData));
      localStorage.setItem("orderOrigin", originSlug || normalizeOriginSlug(transactionOrigin));
    }

  }, [location.state]);

  useEffect(() => {
    const receiptLookupId = orderIdFormatted || location.state?.orderIdFormatted;
    if (!receiptLookupId) return undefined;

    let cancelled = false;
    const loadBackendReceipt = async () => {
      try {
        const receipt = await kioskAPI.getOrderReceipt(receiptLookupId);
        if (cancelled || !receipt) return;

        const wrappedOrder = receiptModelToOrderWrapper(receipt, {
          queueNumber,
          orderIdFormatted,
          transactionIdFormatted,
          paymentMethod,
          from: location.state?.from,
          transactionType
        });

        if (!wrappedOrder) return;

        setOrderData(wrappedOrder);
        if (receipt.queueNumber) setQueueNumber(String(receipt.queueNumber));
        if (receipt.orderIdFormatted || receipt.orderNumber) {
          setOrderIdFormatted(receipt.orderIdFormatted || receipt.orderNumber);
        }
        if (receipt.transactionIdFormatted) setTransactionIdFormatted(receipt.transactionIdFormatted);
        if (receipt.paymentMethod) setPaymentMethod(receipt.paymentMethod);
        if (receipt.serviceType) setTransactionType(originToLabel(receipt.serviceType));
        setReceiptPreviewHtml("");
      } catch (error) {
        console.warn('Backend receipt fetch failed; using local receipt data:', error.message);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    loadBackendReceipt();

    return () => {
      cancelled = true;
    };
  }, [orderIdFormatted, location.state, queueNumber, paymentMethod, transactionIdFormatted, transactionType]);

  // Single unified countdown timer to redirect to kiosk start
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Schedule navigation after state update completes
          setTimeout(() => {
            navigate("/app");
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  // Popup receipt fallback when thermal printer fails
  const handlePopupReceipt = useCallback((options = {}) => {
    if (!orderData || orderData.length === 0) {
      console.error('❌ Cannot print receipt: orderData is empty or null');
      return;
    }

    const now = new Date().toLocaleString();

    // Receipt content generation is modularized via helper functions above.
    const getReceiptContentByType = () => {
      // 🔥 FIX: Extract items array from lastOrder structure if present
      // lastOrder structure: [{ items: [...], orderIdFormatted: "...", totalAmount: ..., ... }]
      // We need to pass just the items array to receipt generators
      let receiptData = orderData;
      
      console.log('📦 Raw orderData structure:', JSON.stringify(orderData, null, 2));
      
      // For PC Upgrade, pass the full lastOrder structure to preserve totalAmount
      if (transactionType === "PC Upgrade Service" && orderData && orderData.length > 0 && orderData[0].items) {
        console.log('🔧 PC Upgrade: Passing full lastOrder structure for proper price detection');
        receiptData = orderData; // Keep full structure [{items: [...], totalAmount: ...}]
        return generateUpgradeReceipt(receiptData);
      }
      
      if (orderData && orderData.length > 0 && orderData[0].items) {
        console.log('✅ Extracting items array from lastOrder structure');
        console.log('Items found:', orderData[0].items.length, 'items');
        receiptData = orderData[0].items;
      } else if (orderData && Array.isArray(orderData)) {
        console.log('✅ Using orderData as-is (already items array)');
        receiptData = orderData;
      } else {
        console.error('❌ Invalid orderData structure:', orderData);
        return '<p style="color: red;">Error: Invalid receipt data</p>';
      }

      switch (transactionType) {
        case "PC Diagnostic Service":
          return generateDiagnosticReceipt(receiptData);
        case "PC Cleaning Service":
          console.log('🧹 Generating cleaning receipt with data:', receiptData);
          return generateCleaningReceipt(receiptData);
        case "PC Upgrade Service":
          return generateUpgradeReceipt(receiptData);
        case "PC Customized Build":
          return generateCustomizedReceipt(receiptData);
        case "PreBuilt PC Order":
          return generatePrebuiltReceipt(receiptData);
        default:
          return generatePcPartsReceipt(receiptData);
      }
    };

    const printContent = `
      <html>
        <head>
          <title>PC-Wise Receipt</title>
          <style>
            @page { size: 58mm 210mm; margin: 0; }
            body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; width: 58mm; }
            .receipt { max-width: 58mm; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .content { margin: 15px 0; }
            .footer { text-align: center; border-top: 1px solid #000; padding-top: 10px; margin-top: 15px; }
            h1 { font-size: 16px; margin: 5px 0; }
            h3 { font-size: 13px; margin: 5px 0; }
            p { font-size: 11px; margin: 3px 0; }
            ul { margin: 5px 0; padding-left: 15px; }
            li { font-size: 10px; }
            .order-info { font-weight: bold; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>PC-WISE</h1>
              <h3>${transactionType} Receipt</h3>
              <p>Date: ${now}</p>
              ${orderIdFormatted ? `<p class="order-info">Order ID: ${orderIdFormatted}</p>` : ''}
              ${transactionIdFormatted ? `<p class="order-info">Transaction ID: ${transactionIdFormatted}</p>` : ''}
              <p class="order-info">Queue No: <strong>#${queueNumber}</strong></p>
              ${paymentMethod ? `<p class="order-info">Payment Method: <strong>${paymentMethod}</strong></p>` : ''}
            </div>
            <div class="content">
              ${getReceiptContentByType()}
            </div>
            <div class="footer">
              <p>${getFooterMessage(transactionType)}</p>
              <p style="font-size: 10px; margin-top: 10px;">
                Keep this receipt for your records
              </p>
              <p style="font-size: 10px; margin-top: 5px;">
                Please wait for Queue #${queueNumber} to be called
              </p>
              <div style="margin-top: 10px; padding: 15px; text-align: center; background-color: #f0f0f0; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <p style="font-weight: bold; font-size: 14px; margin: 0; margin-bottom: 5px;">QUEUE NUMBER</p>
                <p style="font-size: 64px; font-weight: 900; margin: 10px 0; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.4); color: #000;">${queueNumber}</p>
                <p style="font-size: 12px; font-weight: bold; margin: 0;">Please keep this receipt</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // ✅ FIX: Open print window IMMEDIATELY (before async operations) to avoid popup blockers
    setReceiptPreviewHtml(printContent);
    if (options.print === false) {
      return;
    }
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (!printWindow) {
      console.error("❌ Print window blocked. Please allow popups for receipt printing.");
      // Try alternative: create iframe and print
      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();
        
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            iframe.remove();
            playNotificationSound();
          }, 1000);
        }, 500);
      } catch (iframeError) {
        console.error('❌ Iframe print also failed:', iframeError);
        alert('Unable to print receipt. Please allow popups or use thermal printer.');
      }
      return;
    }

    // Print window opened successfully
    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          // Play notification sound
          playNotificationSound();
        }, 1000);
      }, 500);
    };
  }, [orderData, transactionType, queueNumber, orderIdFormatted, transactionIdFormatted, paymentMethod]);

  // Manual print receipt function - NOW USES THERMAL PRINTER WITH POPUP FALLBACK
  const handlePrintReceipt = useCallback(async ({ allowManualConnect = true } = {}) => {
    if (!orderData || orderData.length === 0) {
      console.error('❌ Cannot print receipt: orderData is empty or null');
      return;
    }

    console.log('🖨️ Starting thermal print process...');

    try {
      // Check printer status and platform compatibility
      const printerStatus = thermalPrinter.getStatus();
      console.log('📊 Printer status:', printerStatus);

      // Try to auto-connect if not connected
      if (!printerStatus.isConnected) {
        if (!allowManualConnect) {
          console.log('Printer is not connected; showing receipt fallback instead of prompting from auto-print.');
          handlePopupReceipt();
          return;
        }
        console.log('🔄 Printer not connected, attempting auto-connect...');
        try {
          await thermalPrinter.autoConnect();
        } catch (autoConnectError) {
          console.warn('Auto-connect failed, attempting manual connect:', autoConnectError.message);
          if (!allowManualConnect) {
            console.log('Printer is not pre-authorized; falling back to popup receipt.');
            handlePopupReceipt();
            return;
          }
          try {
            await thermalPrinter.connect();
          } catch (connectError) {
            console.error('❌ Failed to connect to thermal printer:', connectError);
            
            // ✅ FALLBACK: Use popup receipt when thermal printer fails
            console.log('📋 Falling back to popup receipt...');
            handlePopupReceipt();
            return;
          }
        }
      }

      // Prepare order data for thermal printer
      const thermalOrderData = {
        orderIdFormatted: orderIdFormatted || 'N/A',
        transactionIdFormatted: transactionIdFormatted || 'N/A',
        queueNumber: queueNumber || '0',
        customerName: 'Kiosk Customer',
        totalAmount: calculateTotal(orderData),
        paymentMethod: paymentMethod || 'Cash',
        orderType: transactionType,
        createdAt: new Date()
      };

      // Extract items array from order data
      let items = [];
      if (orderData && orderData.length > 0 && orderData[0].items) {
        items = orderData[0].items;
      } else if (Array.isArray(orderData)) {
        items = orderData;
      }

      console.log('📦 Thermal order data:', thermalOrderData);
      console.log('📋 Items:', items.length, 'items');

      // Print to thermal printer
      await thermalPrinter.printReceipt(thermalOrderData, items);

      console.log('✅ Thermal receipt printed successfully!');

      // Play notification sound immediately
      playNotificationSound();

    } catch (error) {
      console.error('❌ Thermal print failed:', error);
      
      // ✅ FALLBACK: Use popup receipt when thermal printer fails
      console.log('📋 Falling back to popup receipt...');
      handlePopupReceipt();
    }
  }, [orderData, transactionType, queueNumber, orderIdFormatted, transactionIdFormatted, paymentMethod, handlePopupReceipt]);

  useEffect(() => {
    if (!orderData || orderData.length === 0 || receiptPreviewHtml) return;
    handlePopupReceipt({ print: false });
  }, [orderData, receiptPreviewHtml, handlePopupReceipt]);

  // Auto-print receipt on load
  useEffect(() => {
    if (printedRef.current) return;
    if (!orderData || orderData.length === 0) return;
    // Auto-print immediately after component loads once data is available
    printedRef.current = true;
    const id = setTimeout(() => {
      handlePrintReceipt({ allowManualConnect: false });
    }, 1000);
    return () => clearTimeout(id);
  }, [orderData, handlePrintReceipt]);

  // Cleanup localStorage after successful transaction
  useEffect(() => {
    const cleanup = setTimeout(() => {
      // Clear transaction-specific data
      localStorage.removeItem("cart");
      localStorage.removeItem("customOrders");
      localStorage.removeItem("diagnosticIssues");
      localStorage.removeItem("cleaningOrder");
      localStorage.removeItem("cleaningOrders");
      localStorage.removeItem("upgradeOrders");

      // Reset counters
      localStorage.setItem("cartCount", "0");
      localStorage.setItem("cartTotal", "0.00");

      // Dispatch reset event
      globalThis.dispatchEvent(new Event("cartReset"));

      // Keep lastOrder and orderOrigin for potential reprints
      // These will be cleared on next transaction
    }, 10000); // Wait 10 seconds before cleanup

    return () => clearTimeout(cleanup);
  }, []);

  return (
    <div className="queuing-display-container">
      <div className="bottom-container">
        <img src={queuepcwiselogo} alt="Logo" className="queue-logo" />
        <h1 className="status-text">Order Complete</h1>

        <div className="queue-number-container">
          <img src={queuenumber} alt="Queue Number" className="queue-number-svg" />
          <div className="queue-number-overlay">
            <h1 className="queue-get">Get your Queue number</h1>
            {isLoadingData ? (
              <h1 className="queue-display-number loading">Loading...</h1>
            ) : (
              <h1 className="queue-display-number">{queueNumber || "---"}</h1>
            )}
          </div>
          <div className="queue-bottom-bar"></div>
        </div>

        <h1 className="waiting-turn">
          {isLoadingData ? "Processing your order..." : "Wait for your turn"}
        </h1>

        {receiptPreviewHtml && (
          <iframe
            title="Receipt preview"
            srcDoc={receiptPreviewHtml}
            style={{
              width: "260px",
              height: "320px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "#ffffff",
              marginTop: "12px"
            }}
          />
        )}

        <div className="getting-content">
          <h1>GET YOUR NO.</h1>
          <img src={ArrowDown} alt="Arrow" className="get-queue" />
        </div>
      </div>
    </div>
  );
}

export default QueuingDisplay;
