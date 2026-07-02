/**
 * Cross-Platform Thermal Printer Service for Frontend
 * Supports GEZHI micro-printer (Y58BT) via USB and Bluetooth
 * Uses WebUSB API (Windows/Linux Chrome/Edge) and Web Bluetooth API (Cross-platform)
 * Graceful fallback to network printing for unsupported platforms
 */

import { getServerBaseUrl } from '../utils/networkConfig';

class ThermalPrinterService {
    device = null;
    bluetoothDevice = null;
    bluetoothCharacteristic = null;
    isConnected = false;
    connectionType = null; // 'usb', 'bluetooth', or 'network'
    printerName = 'GEZHI micro-printer';
    
    // USB Vendor/Product IDs for thermal printers (including Bisofice 58mm)
    USB_FILTERS = [
        { vendorId: 0x0DD4, productId: 0x0205 }, // Common thermal printer IDs
        { vendorId: 0x0519, productId: 0x2013 },
        { vendorId: 0x04B8, productId: 0x0E03 }, // Epson TM series
        { vendorId: 0x067B, productId: 0x2305 }, // Generic POS printer
        { vendorId: 0x4348, productId: 0x5584 }, // Y58BT specific
        { vendorId: 0x0483, productId: 0x5743 }, // Bisofice/Generic STM32 based
        { vendorId: 0x1FC9, productId: 0x2016 }, // Bisofice USB printer
        { vendorId: 0x6868, productId: 0x0200 }, // Generic 58mm thermal
        { vendorId: 0x0525, productId: 0xA4A7 }  // Linux USB Gadget (some thermal printers)
    ];
    
    // Bluetooth Service/Characteristic UUIDs for Y58BT thermal printer
    BLUETOOTH_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'; // Printer service
    BLUETOOTH_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';    // Print characteristic
    
    ENDPOINT_IN = 1;  // Bulk IN endpoint (USB)
    ENDPOINT_OUT = 2; // Bulk OUT endpoint (USB)

    /**
     * Check if WebUSB is supported
     */
    isUSBSupported() {
        return 'usb' in navigator;
    }

    /**
     * Check if Web Bluetooth is supported
     */
    isBluetoothSupported() {
        return 'bluetooth' in navigator;
    }

    /**
     * Detect platform and recommend best connection method
     */
    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = (navigator.userAgentData?.platform || navigator.userAgent).toLowerCase();
        
        // iOS detection
        if (/iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && navigator.maxTouchPoints > 1)) {
            return {
                os: 'iOS',
                recommendedMethod: 'bluetooth',
                usbSupported: false,
                bluetoothSupported: this.isBluetoothSupported()
            };
        }
        
        // Android detection
        if (/android/.test(userAgent)) {
            return {
                os: 'Android',
                recommendedMethod: 'bluetooth',
                usbSupported: false,
                bluetoothSupported: this.isBluetoothSupported()
            };
        }
        
        // macOS detection
        if (/mac/.test(platform)) {
            return {
                os: 'macOS',
                recommendedMethod: this.isUSBSupported() ? 'usb' : 'bluetooth',
                usbSupported: this.isUSBSupported(),
                bluetoothSupported: this.isBluetoothSupported()
            };
        }
        
        // Windows detection
        if (/win/.test(platform)) {
            return {
                os: 'Windows',
                recommendedMethod: 'usb',
                usbSupported: this.isUSBSupported(),
                bluetoothSupported: this.isBluetoothSupported()
            };
        }
        
        // Linux/Other
        return {
            os: 'Linux/Other',
            recommendedMethod: this.isUSBSupported() ? 'usb' : 'bluetooth',
            usbSupported: this.isUSBSupported(),
            bluetoothSupported: this.isBluetoothSupported()
        };
    }

    /**
     * Reset connection state to defaults
     */
    _clearState() {
        this.isConnected = false;
        this.device = null;
        this.bluetoothDevice = null;
        this.bluetoothCharacteristic = null;
        this.connectionType = null;
    }

    /**
     * Safely release and close USB device
     */
    async _cleanupUSBDevice() {
        if (!this.device?.opened) return;
        try {
            await this.device.releaseInterface(0);
        } catch (error) {
            console.debug('Cleanup: releaseInterface failed', error.message);
        }
        try {
            await this.device.close();
        } catch (error) {
            console.debug('Cleanup: device close failed', error.message);
        }
    }

    /**
     * ✅ Shared USB device setup: open, configure, claim interface
     */
    async _setupUSBDevice() {
        if (this.device.opened) {
            console.log('ℹ️ Device already open, skipping open()');
        } else {
            try {
                await this.device.open();
                console.log('✅ Device opened');
            } catch (openError) {
                if (openError.name === 'SecurityError' && openError.message.includes('Access denied')) {
                    console.error('❌ Windows has locked the printer. Providing user guidance...');
                    const windowsError = new Error(
                        'Windows is using this printer. Please:\n' +
                        '1. Open Windows Settings → Printers & scanners\n' +
                        '2. Click on "Bisofice 58mm"\n' +
                        '3. Click "Remove device"\n' +
                        '4. Unplug and replug the USB cable\n' +
                        '5. Click Connect again in K-Wise\n\n' +
                        'Alternative: Restart your computer to release the device.'
                    );
                    windowsError.name = 'SecurityError';
                    throw windowsError;
                }
                throw openError;
            }
        }

        if (this.device.configuration === null) {
            await this.device.selectConfiguration(1);
            console.log('⚙️ Configuration selected');
        }

        try {
            await this.device.claimInterface(0);
            console.log('🔗 Interface claimed');
        } catch (error) {
            if (error.name === 'InvalidStateError' && error.message.includes('already claimed')) {
                console.log('ℹ️ Interface already claimed, continuing...');
            } else {
                throw error;
            }
        }
    }

    /**
     * ✅ Try connection with a specific method, return result or throw
     */
    async _tryMethodWithFallback(primaryMethod, fallbackMethod, platformInfo) {
        try {
            return primaryMethod === 'bluetooth'
                ? await this.connectBluetooth()
                : await this.connectUSB();
        } catch (error) {
            if (error.name === 'NotFoundError' && error.message.includes('cancelled')) {
                throw new Error('Connection cancelled by user');
            }
            if (primaryMethod === 'usb' && (error.name === 'SecurityError' || error.name === 'InvalidStateError' || error.message.includes('Windows is using'))) {
                throw error;
            }
            const fallbackSupported = primaryMethod === 'bluetooth' ? platformInfo.usbSupported : platformInfo.bluetoothSupported;
            if (fallbackSupported) {
                console.warn(`⚠️ ${primaryMethod} failed, trying ${fallbackMethod}...`, error.message);
                return fallbackMethod === 'bluetooth'
                    ? await this.connectBluetooth()
                    : await this.connectUSB();
            }
            throw error;
        }
    }

    /**
     * ✅ Force cleanup a specific device type
     */
    async _cleanupDevice(device, type) {
        if (!device) return;
        try {
            if (type === 'usb' && device.opened) {
                try { await device.releaseInterface(0); } catch (error) { console.debug('Cleanup: releaseInterface failed', error.message); }
                try { await device.close(); } catch (error) { console.debug('Cleanup: device close failed', error.message); }
            } else if (type === 'bluetooth' && device.gatt?.connected) {
                await device.gatt.disconnect();
            }
        } catch (error) {
            console.warn(`⚠️ ${type} cleanup warning:`, error.message);
        }
    }

    /**
     * Request permission and connect to printer via USB
     * ✅ ENHANCED: Supports Bisofice 58mm and any thermal printer
     */
    async connectUSB() {
        if (!this.isUSBSupported()) {
            throw new Error('WebUSB is not supported in this browser. Try Bluetooth or use Chrome/Edge on Windows/Linux.');
        }

        try {
            console.log('🖨️ Requesting USB printer access (including Bisofice 58mm)...');
            console.log('📋 Showing known thermal printers (or all USB devices if none match)...');
            
            // ✅ CRITICAL FIX: Try known filters first, then fallback to all devices
            let requestOptions;
            try {
                // First attempt: Show only known thermal printers
                requestOptions = { filters: this.USB_FILTERS };
                this.device = await navigator.usb.requestDevice(requestOptions);
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    console.log('⚠️ No known thermal printer found, showing ALL USB devices...');
                    // Fallback: Show all USB devices
                    requestOptions = { filters: [] };
                    this.device = await navigator.usb.requestDevice(requestOptions);
                } else {
                    throw error;
                }
            }

            if (!this.device) {
                throw new Error('No device selected');
            }

            console.log('📱 Device selected:', this.device.productName || this.device.manufacturerName || 'Unknown Printer');
            console.log(`   Vendor ID: 0x${this.device.vendorId.toString(16).padStart(4, '0').toUpperCase()}`);
            console.log(`   Product ID: 0x${this.device.productId.toString(16).padStart(4, '0').toUpperCase()}`);
            console.log(`   Manufacturer: ${this.device.manufacturerName || 'Unknown'}`);
            console.log(`   Product: ${this.device.productName || 'Unknown'}`);
            
            // ✅ Add this device to known filters for future auto-connect
            const newFilter = {
                vendorId: this.device.vendorId,
                productId: this.device.productId
            };
            
            // Check if already in filters
            const exists = this.USB_FILTERS.some(filter => 
                filter.vendorId === newFilter.vendorId && 
                filter.productId === newFilter.productId
            );
            
            if (!exists) {
                this.USB_FILTERS.push(newFilter);
                console.log('✅ Added new printer to known devices:', 
                    `VID=0x${newFilter.vendorId.toString(16).padStart(4, '0')}, PID=0x${newFilter.productId.toString(16).padStart(4, '0')}`);
            }

            // ✅ Setup device: open, configure, claim interface
            await this._setupUSBDevice();

            this.isConnected = true;
            this.connectionType = 'usb';
            console.log('🎉 USB Printer connected successfully!');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to connect via USB:', error);
            this.isConnected = false;
            this.connectionType = null;
            throw error;
        }
    }

    /**
     * Request permission and connect to printer via Bluetooth
     * ⚠️ MUST be called from user gesture (button click)
     */
    async connectBluetooth() {
        if (!this.isBluetoothSupported()) {
            throw new Error('Web Bluetooth is not supported in this browser.');
        }

        try {
            console.log('🔵 Requesting Bluetooth printer access...');
            
            // ✅ Request Bluetooth device with printer service
            // Note: This MUST be called from a user gesture (button click)
            this.bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Y58' },     // Y58BT model
                    { namePrefix: 'GEZHI' },   // GEZHI brand
                    { namePrefix: 'BT-' },     // Generic Bluetooth thermal printers
                    { namePrefix: 'Printer' }  // Fallback
                ],
                optionalServices: [
                    this.BLUETOOTH_SERVICE_UUID,
                    '000018f0-0000-1000-8000-00805f9b34fb', // Standard printer service
                    '0000fff0-0000-1000-8000-00805f9b34fb'  // Alternative service UUID
                ]
            });

            if (!this.bluetoothDevice) {
                throw new Error('No Bluetooth device selected');
            }

            console.log('📱 Bluetooth device selected:', this.bluetoothDevice.name);

            // Connect to GATT server
            const server = await this.bluetoothDevice.gatt.connect();
            console.log('✅ GATT server connected');

            // Get printer service
            let service;
            try {
                service = await server.getPrimaryService(this.BLUETOOTH_SERVICE_UUID);
            } catch (error) {
                console.log('⚠️ Default service not found, trying alternative...', error.message);
                // Try alternative service UUIDs
                try {
                    service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                } catch (error_) {
                    console.log('⚠️ Alternative service also failed, trying last fallback...', error_.message);
                    service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
                }
            }
            
            console.log('⚙️ Printer service found');

            // Get characteristic for printing
            try {
                this.bluetoothCharacteristic = await service.getCharacteristic(this.BLUETOOTH_CHAR_UUID);
            } catch (error) {
                console.log('⚠️ Default characteristic not found, trying alternative...', error.message);
                // Try alternative characteristic UUIDs
                const characteristics = await service.getCharacteristics();
                if (characteristics.length > 0) {
                    this.bluetoothCharacteristic = characteristics[0]; // Use first writable characteristic
                    console.log('📝 Using characteristic:', this.bluetoothCharacteristic.uuid);
                } else {
                    throw new Error('No writable characteristic found');
                }
            }

            console.log('🔗 Print characteristic found');

            this.isConnected = true;
            this.connectionType = 'bluetooth';
            console.log('🎉 Bluetooth Printer connected successfully!');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to connect via Bluetooth:', error);
            this.isConnected = false;
            this.connectionType = null;
            throw error;
        }
    }

    /**
     * Smart connect - automatically choose best method based on platform
     * ⚠️ MUST be called from user gesture (button click) due to browser security
     */
    async connect() {
        // ✅ CRITICAL FIX: Force complete reset to avoid "Access denied" errors
        if (this.isConnected || this.device || this.bluetoothDevice) {
            console.log('⚠️ Device state exists, performing force reset...');
            await this.forceReset();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const platformInfo = this.detectPlatform();
        
        console.log('🔍 Platform detected:', platformInfo);
        console.log('📋 Recommended method:', platformInfo.recommendedMethod);
        
        if (platformInfo.recommendedMethod === 'bluetooth' && platformInfo.bluetoothSupported) {
            return this._tryMethodWithFallback('bluetooth', 'usb', platformInfo);
        }
        if (platformInfo.recommendedMethod === 'usb' && platformInfo.usbSupported) {
            return this._tryMethodWithFallback('usb', 'bluetooth', platformInfo);
        }
        throw new Error(`No supported connection method available on ${platformInfo.os}. Please use Chrome/Edge or enable Bluetooth.`);
    }

    /**
     * Check if printer is already connected from previous session (USB)
     * ✅ ENHANCED: Try ANY USB device if known printer not found (supports Bisofice 58mm)
     * ⚠️ Only reconnects to previously authorized devices - does NOT trigger permission dialogs
     */
    async autoConnect() {
        const platformInfo = this.detectPlatform();
        
        // Try USB auto-connect if supported
        if (platformInfo.usbSupported) {
            try {
                // ✅ getDevices() returns previously authorized devices - NO user prompt
                const devices = await navigator.usb.getDevices();
                
                if (devices.length === 0) {
                    console.log('ℹ️ No previously authorized USB devices found - user needs to click Connect');
                    return false;
                }

                console.log(`📋 Found ${devices.length} authorized USB device(s)`);

                // First, try to find known thermal printer by VID/PID
                let printer = devices.find(device => 
                    this.USB_FILTERS.some(filter => 
                        device.vendorId === filter.vendorId && 
                        device.productId === filter.productId
                    )
                );

                // ✅ FIX: If no known printer found, try ANY authorized device (likely the Bisofice)
                if (!printer && devices.length > 0) {
                    console.log('⚠️ No known thermal printer found, trying first authorized USB device...');
                    printer = devices[0];
                    console.log(`📱 Attempting to connect: VID=0x${printer.vendorId.toString(16).padStart(4, '0')}, PID=0x${printer.productId.toString(16).padStart(4, '0')}`);
                }

                if (!printer) {
                    console.log('ℹ️ No USB devices available for auto-connect');
                    return false;
                }

                console.log('🔄 Reconnecting to previously authorized USB printer...');
                console.log(`📱 Device: ${printer.productName || 'Unknown'} (VID=0x${printer.vendorId.toString(16)}, PID=0x${printer.productId.toString(16)})`);                
                this.device = printer;

                // ✅ Setup device: open, configure, claim interface
                await this._setupUSBDevice();

                this.isConnected = true;
                this.connectionType = 'usb';
                console.log('✅ Auto-reconnected to USB printer successfully!');
                
                return true;
            } catch (error) {
                console.error('⚠️ USB auto-connect failed:', error);
                this.isConnected = false;
                this.connectionType = null;
                return false;
            }
        }
        
        // Note: Bluetooth auto-reconnect is not supported by Web Bluetooth API
        // Users must manually reconnect each session
        console.log('ℹ️ Bluetooth auto-reconnect not supported, manual connection required');
        return false;
    }

    /**
     * Send data to printer via USB or Bluetooth
     * ✅ ENHANCED: Auto-reconnect with better error handling for Bisofice 58mm
     */
    async sendData(data) {
        // ✅ ENHANCED: Auto-reconnect if not connected
        if (!this.isConnected) {
            console.warn('⚠️ Printer not connected, attempting auto-reconnect...');
            const reconnected = await this.autoConnect();
            
            if (!reconnected || !this.isConnected) {
                console.error('❌ Auto-reconnect failed. Printer needs manual connection.');
                throw new Error('Printer not connected. Please connect your Bisofice 58mm printer using the Connect button.');
            }
            
            console.log('✅ Auto-reconnect successful, proceeding with print...');
        }

        try {
            // Convert string to Uint8Array if needed
            let dataArray;
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                dataArray = encoder.encode(data);
            } else if (data instanceof Uint8Array) {
                dataArray = data;
            } else if (Array.isArray(data)) {
                dataArray = new Uint8Array(data);
            } else {
                throw new TypeError('Invalid data format. Must be string, Uint8Array, or Array');
            }

            console.log(`📤 Sending ${dataArray.length} bytes to printer via ${this.connectionType}...`);

            if (this.connectionType === 'usb') {
                // Send via USB
                const CHUNK_SIZE = 512;
                for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
                    const chunk = dataArray.slice(i, i + CHUNK_SIZE);
                    await this.device.transferOut(this.ENDPOINT_OUT, chunk);
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            } else if (this.connectionType === 'bluetooth') {
                // Send via Bluetooth (smaller chunks for Bluetooth MTU limit)
                const CHUNK_SIZE = 20; // Bluetooth MTU is typically 20-512 bytes
                for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
                    const chunk = dataArray.slice(i, i + CHUNK_SIZE);
                    await this.bluetoothCharacteristic.writeValue(chunk);
                    await new Promise(resolve => setTimeout(resolve, 50)); // Longer delay for Bluetooth
                }
            } else {
                throw new Error('Unknown connection type');
            }

            console.log('✅ Data sent successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to send data to printer:', error);
            throw error;
        }
    }

    /**
     * Print receipt using backend-generated ESC/POS commands
     */
    async printReceipt(orderData, items = []) {
        try {
            console.log('🖨️ Generating receipt data from backend...');
            
            // ✅ FIX: Use centralized API URL configuration
            const apiBaseUrl = getServerBaseUrl();
            
            // Get receipt data from backend
            const response = await fetch(`${apiBaseUrl}/api/receipts/thermal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderData,
                    items,
                    format: 'text' // Get ESC/POS commands as text
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to generate receipt');
            }

            console.log('✅ Receipt data received from backend');
            
            // Send to printer
            await this.sendData(result.data.receiptData);
            
            console.log(`🎉 Receipt printed successfully! Queue #${result.data.queueNumber}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to print receipt:', error);
            throw error;
        }
    }

    /**
     * Print test receipt
     */
    async printTest() {
        const testData = {
            orderIdFormatted: 'TEST-001',
            transactionIdFormatted: 'TEST-TXN-001',
            queueNumber: '99',
            customerName: 'Test Customer',
            totalAmount: 1000,
            paymentMethod: 'Cash',
            orderType: 'Test Print',
            createdAt: new Date()
        };

        const testItems = [
            {
                name: 'Test Item 1',
                quantity: 1,
                price: 500,
                totalPrice: 500
            },
            {
                name: 'Test Item 2',
                quantity: 2,
                price: 250,
                totalPrice: 500
            }
        ];

        await this.printReceipt(testData, testItems);
    }

    /**
     * Disconnect from printer
     */
    async disconnect() {
        try {
            if (this.connectionType === 'usb' && this.device) {
                console.log('👋 Disconnecting USB printer...');
                await this._cleanupUSBDevice();
                console.log('✅ USB device closed');
            } else if (this.connectionType === 'bluetooth' && this.bluetoothDevice) {
                console.log('👋 Disconnecting Bluetooth printer...');
                if (this.bluetoothDevice.gatt?.connected) {
                    await this.bluetoothDevice.gatt.disconnect();
                    console.log('✅ Bluetooth disconnected');
                }
            }
            
            this._clearState();
            console.log('✅ Printer disconnected completely');
        } catch (error) {
            console.error('⚠️ Error disconnecting printer:', error);
            this._clearState();
        }
    }

    /**
     * ✅ NEW: Force complete cleanup and reset
     * Use this when device is in a bad state
     */
    async forceReset() {
        console.log('🔄 Force resetting printer connection...');
        
        const usbDevice = this.device;
        const btDevice = this.bluetoothDevice;
        
        this._clearState();
        
        await this._cleanupDevice(usbDevice, 'usb');
        await this._cleanupDevice(btDevice, 'bluetooth');
        
        console.log('✅ Force reset complete - all resources released');
    }

    /**
     * Get list of paired/authorized devices (USB only - Bluetooth doesn't support this)
     * ⚠️ Does NOT trigger permission dialogs
     */
    async getPairedDevices() {
        const pairedDevices = [];
        
        if (this.isUSBSupported()) {
            try {
                const devices = await navigator.usb.getDevices();
                for (const device of devices) {
                    pairedDevices.push({
                        type: 'usb',
                        name: device.productName || device.manufacturerName || 'Unknown USB Device',
                        vendorId: `0x${device.vendorId.toString(16).padStart(4, '0').toUpperCase()}`,
                        productId: `0x${device.productId.toString(16).padStart(4, '0').toUpperCase()}`,
                        manufacturer: device.manufacturerName || 'Unknown',
                        serialNumber: device.serialNumber || 'N/A'
                    });
                }
            } catch (error) {
                console.warn('⚠️ Failed to get paired USB devices:', error);
            }
        }
        
        return pairedDevices;
    }

    /**
     * Get connection status
     */
    getStatus() {
        const platformInfo = this.detectPlatform();
        
        return {
            platform: platformInfo,
            isConnected: this.isConnected,
            connectionType: this.connectionType,
            deviceName: this.connectionType === 'usb' 
                ? (this.device?.productName || null)
                : (this.bluetoothDevice?.name || null),
            usbSupported: platformInfo.usbSupported,
            bluetoothSupported: platformInfo.bluetoothSupported
        };
    }
}

// Create singleton instance
const thermalPrinter = new ThermalPrinterService();

export default thermalPrinter;
