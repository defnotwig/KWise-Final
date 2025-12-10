import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FiCheck, FiX, FiRefreshCw, FiClock, FiUser, FiHash, FiPlus, FiMinus, FiTrash2, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom'; // TASK 7: Navigation
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import { queueAPI, sseAPI, handleAPIError, stockAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './OrderQueue.css';

const OrderQueue = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate(); // TASK 7: Navigation hook
    const [queueData, setQueueData] = useState([]);
    const [queueStats, setQueueStats] = useState(null);
    const [currentQueue, setCurrentQueue] = useState(null); // For viewing details
    const [servingQueue, setServingQueue] = useState(null); // For "now serving" display
    const [servingQueueLeft, setServingQueueLeft] = useState(null); // LEFT station (station 1)
    const [servingQueueRight, setServingQueueRight] = useState(null); // RIGHT station (station 2)
    const [showStationModal, setShowStationModal] = useState(false);
    const [selectedQueueForStation, setSelectedQueueForStation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [selectedQueueForAction, setSelectedQueueForAction] = useState(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState(''); // ✅ FIX: Store customer name for cancel/complete
    
    // ✅ FIX: Add fetch state to prevent duplicate simultaneous requests
    const [isFetching, setIsFetching] = useState(false);
    const fetchTimeoutRef = useRef(null);
    const errorCountRef = useRef(0); // ✅ FIX: Track consecutive errors to prevent infinite loops
    const maxConsecutiveErrors = 5; // ✅ INCREASED: Stop fetching after 5 consecutive errors
    const operationLockRef = useRef(false); // ✅ NEW: Lock polling during operations
    
    // Enhanced admin functionality states
    const [availableStock, setAvailableStock] = useState([]);
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [showStockModal, setShowStockModal] = useState(false);
    // const [editingOrder, setEditingOrder] = useState(null); // Reserved for future use
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showUpdateCustomerModal, setShowUpdateCustomerModal] = useState(false);
    const [updateCustomerName, setUpdateCustomerName] = useState('');

    // Initialize Notyf for professional notifications
    const notyf = useRef(new Notyf({
        duration: 3000,
        position: { x: 'right', y: 'top' },
        dismissible: true,
        types: [
            {
                type: 'success',
                background: '#10b981',
                icon: { className: 'notyf__icon--success', tagName: 'i' }
            },
            {
                type: 'error',
                background: '#ef4444',
                icon: { className: 'notyf__icon--error', tagName: 'i' }
            },
            {
                type: 'warning',
                background: '#f59e0b',
                icon: { className: 'notyf__icon--warning', tagName: 'i' }
            }
        ]
    })).current;

    // RBAC permissions
    const canViewOrders = useMemo(() =>
        currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'developer',
        [currentUser?.role]
    );

    const canModifyOrders = useMemo(() =>
        currentUser?.role === 'admin' || currentUser?.role === 'superadmin',
        [currentUser?.role]
    );

    // Enhanced admin functions for editing order items
    const handleIncreaseQuantity = async (itemId) => {
        if (!canModifyOrders || !currentQueue) return;
        
        try {
            // Update item quantity in the local state first for UI responsiveness
            const updatedItems = currentQueue.order_items.map(item =>
                item.id === itemId 
                    ? { ...item, quantity: item.quantity + 1, amount: (item.quantity + 1) * item.price }
                    : item
            );
            
            setCurrentQueue(prev => ({ ...prev, order_items: updatedItems }));
            
            // TODO: Add API call to update item quantity in database
            notyf.success('Item quantity increased');
        } catch (error) {
            notyf.error('Failed to update item quantity');
        }
    };

    const handleDecreaseQuantity = async (itemId) => {
        if (!canModifyOrders || !currentQueue) return;
        
        const item = currentQueue.order_items.find(i => i.id === itemId);
        if (!item) return;
        
        if (item.quantity <= 1) {
            // Remove item if quantity becomes 0
            handleRemoveItem(itemId);
            return;
        }
        
        try {
            const updatedItems = currentQueue.order_items.map(item =>
                item.id === itemId 
                    ? { ...item, quantity: item.quantity - 1, amount: (item.quantity - 1) * item.price }
                    : item
            );
            
            setCurrentQueue(prev => ({ ...prev, order_items: updatedItems }));
            
            // TODO: Add API call to update item quantity in database
            notyf.success('Item quantity decreased');
        } catch (error) {
            notyf.error('Failed to update item quantity');
        }
    };

    const handleRemoveItem = async (itemId) => {
        if (!canModifyOrders || !currentQueue) return;
        
        try {
            const updatedItems = currentQueue.order_items.filter(item => item.id !== itemId);
            setCurrentQueue(prev => ({ ...prev, order_items: updatedItems }));
            
            // TODO: Add API call to remove item from database
            notyf.success('Item removed from order');
        } catch (error) {
            notyf.error('Failed to remove item');
        }
    };
    
    // 🔄 RESET QUEUE CYCLE HANDLER  
    const handleResetQueueCycle = async () => {
        if (!canModifyOrders) {
            notyf.error('You do not have permission to reset queue cycle');
            return;
        }
        
        // Get current stats for confirmation message
        const hoursUntilAuto = queueStats?.hoursUntilReset || 0;
        const autoResetTime = Math.floor(hoursUntilAuto) > 0 
            ? `Auto-reset scheduled in ${Math.floor(hoursUntilAuto)}h ${Math.floor((hoursUntilAuto % 1) * 60)}m (12:00 AM)`
            : 'Auto-reset will occur at 12:00 AM tonight';
        
        const confirmed = window.confirm(
            '🔄 MANUAL QUEUE RESET (1-99)\\n\\n' +
            'This will:\\n' +
            '• Reset all queue numbers back to 1-99 immediately\\n' +
            '• Start a new queue cycle\\n' +
            '• Allow previously used numbers to be assigned again\\n' +
            '• Override the scheduled auto-reset\\n\\n' +
            `Current Status:\\n` +
            `• Used: ${queueStats?.usedQueues || 0}/99\\n` +
            `• Available: ${queueStats?.availableQueues || 0}/99\\n` +
            `• ${autoResetTime}\\n\\n` +
            'Current orders will NOT be affected.\\n\\n' +
            'Are you sure you want to proceed with MANUAL RESET?'
        );
        
        if (!confirmed) return;
        
        try {
            setIsRefreshing(true);
            console.log('🔄 Resetting queue cycle manually...');
            
            const response = await queueAPI.resetQueueCycle();
            
            if (response.data.success) {
                const resetData = response.data.data;
                notyf.success(
                    `✅ Queue cycle reset successfully!\\n` +
                    `Cycle ${resetData.oldCycle} → ${resetData.newCycle}\\n` +
                    `All queue numbers (1-99) are now available.\\n` +
                    `Next auto-reset: Tomorrow at 12:00 AM`
                );
                
                await fetchQueueData();
            } else {
                throw new Error(response.data.message || 'Failed to reset queue cycle');
            }
        } catch (error) {
            console.error('Error resetting queue cycle:', error);
            notyf.error(error.response?.data?.message || error.message || 'Failed to reset queue cycle');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddStockItem = async (stockItem) => {
        if (!canModifyOrders || !currentQueue) return;
        
        try {
            const newItem = {
                id: `temp_${Date.now()}`,
                item_name: stockItem.name,
                component_name: stockItem.category || 'Additional Item',
                price: stockItem.price || 0,
                quantity: 1,
                amount: stockItem.price || 0,
                status: 'pending'
            };
            
            const updatedItems = [...currentQueue.order_items, newItem];
            setCurrentQueue(prev => ({ ...prev, order_items: updatedItems }));
            
            setShowStockModal(false);
            setStockSearchTerm('');
            
            // TODO: Add API call to add item to database
            notyf.success('Item added to order');
        } catch (error) {
            notyf.error('Failed to add item to order');
        }
    };

    const handleCancelOrder = async (queueNumber, customerName) => {
        // ✅ CRITICAL FIX: Add validation to block cancellation without valid customer name
        const cleanCustomerName = customerName?.trim();
        
        // ✅ ENHANCED: Check if it's a default/invalid name with comprehensive pattern matching
        const isDefaultName = !cleanCustomerName || 
            cleanCustomerName === 'Kiosk Customer' || 
            cleanCustomerName === 'Customer' ||
            /^Customer\s*\d+$/i.test(cleanCustomerName) || // Matches "Customer 1", "Customer 111", etc.
            cleanCustomerName.toUpperCase() === 'CUSTOMER' ||
            /^CUSTOMER\s*\d+$/i.test(cleanCustomerName); // Matches "CUSTOMER 1", "CUSTOMER 111", etc.
        
        // ✅ CRITICAL DEBUG: Log the validation check with detailed info
        console.log('🔍 Cancel Order Validation:', {
            queueNumber,
            rawCustomerName: customerName,
            cleanCustomerName,
            isDefaultName,
            willBlock: isDefaultName,
            testResults: {
                isEmpty: !cleanCustomerName,
                isKiosk: cleanCustomerName === 'Kiosk Customer',
                isCustomer: cleanCustomerName === 'Customer',
                matchesPattern: /^Customer\s*\d+$/i.test(cleanCustomerName || ''),
                matchesUpperPattern: /^CUSTOMER\s*\d+$/i.test(cleanCustomerName || '')
            }
        });
        
        if (isDefaultName) {
            // ❌ BLOCK cancellation - force customer name update first
            notyf.error('❌ Please update the customer name first before cancelling the order.');
            
            // Automatically open update name modal instead
            setSelectedQueueForAction(queueNumber);
            setUpdateCustomerName(cleanCustomerName || 'Customer');
            setShowUpdateCustomerModal(true);
            return; // ✅ EXIT EARLY - Don't open cancellation modal - NO STATE CHANGES BELOW
        }
        
        // ✅ Validation passed - proceed with cancellation
        console.log('✅ Validation passed! Opening cancellation modal for:', cleanCustomerName);
        
        // ✅ CRITICAL FIX: Only set modal state if validation passed
        // DO NOT set showCancelModal=true unless customer name is valid
        setSelectedQueueForAction(queueNumber);
        setSelectedCustomerName(cleanCustomerName); // ✅ SMOKING GUN FIX: Store customer name!
        setShowCancelModal(true); // This modal ONLY opens after validation passes
    };

    const confirmCancelOrder = async () => {
        if (!selectedQueueForAction) return;
        
        try {
            // ✅ FIX: Lock polling during operation
            operationLockRef.current = true;
            
            // ✅ FIX: Update UI state immediately for better UX
            const queueNumberToCancel = selectedQueueForAction;
            
            // ✅ CRITICAL FIX: DO NOT manually clear station - cancelOrder() handles this atomically
            // The backend's cancelOrder() will clear all station fields in a transaction
            const isOnLeftStation = servingQueueLeft?.queue_number === queueNumberToCancel;
            const isOnRightStation = servingQueueRight?.queue_number === queueNumberToCancel;
            
            if (isOnLeftStation) {
                console.log('ℹ️ Queue on LEFT station - backend will handle atomic clearing');
            } else if (isOnRightStation) {
                console.log('ℹ️ Queue on RIGHT station - backend will handle atomic clearing');
            }
            
            // ✅ SMOKING GUN FIX: Clear ALL local state first to force complete refresh
            console.log('📥 FORCE CLEARING all queue state before cancel...');
            setQueueData([]);  // Clear immediately
            setCurrentQueue(null);
            setServingQueue(null);
            localStorage.removeItem('servingQueue');
            
            // Close modal immediately
            setShowCancelModal(false);
            setSelectedQueueForAction(null);
            
            // ✅ SMOKING GUN FIX: Pass customer name to backend (required for validation!)
            console.log('📤 Sending cancel request with customer name:', selectedCustomerName);
            await updateQueueStatus(queueNumberToCancel, 'cancelled', selectedCustomerName);
            setSelectedCustomerName(''); // Clear after use
            
            // ✅ FIX: Show success notification AFTER backend confirms
            notyf.success(`✅ Queue #${queueNumberToCancel} cancelled and moved to transaction history`);
            
            // ✅ FIX: Reset error count on successful operation
            errorCountRef.current = 0;
            
            // ✅ SMOKING GUN FIX: Force IMMEDIATE refresh without lock
            // The backend query excludes NULL order_ids, so we MUST refresh to get clean state
            console.log('🔄 FORCE IMMEDIATE refresh after cancel (no lock)...');
            operationLockRef.current = false; // Unlock BEFORE refresh
            await fetchQueueData(); // Immediate refresh
            
            // ✅ SECOND REFRESH: After 2 seconds to ensure backend fully synced
            setTimeout(async () => {
                console.log('🔄 Second refresh to verify backend sync...');
                await fetchQueueData();
            }, 2000);
        } catch (error) {
            const errorInfo = handleAPIError(error);
            notyf.error('K-Wise: ' + (errorInfo.message || 'Error cancelling order'));
            console.error('Error cancelling order:', error);
            
            // ✅ FIX: Revert by forcing refresh
            setTimeout(async () => {
                await fetchQueueData();
            }, 500);
        } finally {
            // ✅ FIX: Set lock AFTER second refresh (3 seconds total)
            setTimeout(() => {
                operationLockRef.current = false;
                console.log('🔓 Operation lock released (cancel), polling resumed');
            }, 3000);
        }
    };

    // New Update Customer functionality
    const handleUpdateCustomer = async (queueNumber, currentCustomerName) => {
        setSelectedQueueForAction(queueNumber);
        setUpdateCustomerName(currentCustomerName || '');
        setShowUpdateCustomerModal(true);
    };

    const confirmUpdateCustomer = async () => {
        if (!selectedQueueForAction || !updateCustomerName.trim()) {
            notyf.error('K-Wise: Customer name is required');
            return;
        }

        try {
            const trimmedName = updateCustomerName.trim();
            const queueNum = selectedQueueForAction;
            
            // Update customer name via API and get the updated queue object
            const response = await queueAPI.updateCustomer(queueNum, trimmedName);
            
            // ✅ CRITICAL FIX: Use the actual queue data returned from backend
            const updatedQueue = response.data?.data?.queue;
            const confirmedCustomerName = updatedQueue?.customer_name || trimmedName;
            
            // ✅ CRITICAL: Update selectedCustomerName immediately for next operations!
            setSelectedCustomerName(confirmedCustomerName);
            
            // ✅ FIX: Update ALL state locations atomically using confirmed backend data
            const updateCustomerNameInState = (item) => 
                item.queue_number === queueNum 
                    ? { ...item, customer_name: confirmedCustomerName }
                    : item;
            
            // Update main queue data (for pending queues sidebar)
            setQueueData(prevData => prevData.map(updateCustomerNameInState));
            
            // ✅ FIX ISSUE #2: FORCE immediate currentQueue update with backend data
            if (currentQueue && currentQueue.queue_number === queueNum) {
                const updatedCurrentQueue = {
                    ...currentQueue,
                    customer_name: confirmedCustomerName
                };
                setCurrentQueue(updatedCurrentQueue);
                console.log('✅ IMMEDIATELY updated currentQueue.customer_name from backend:', confirmedCustomerName);
            }
            
            // ✅ FIX ISSUE #2: Update ALL serving queue states with backend data
            if (servingQueue && servingQueue.queue_number === queueNum) {
                const updatedServingQueue = {
                    ...servingQueue,
                    customer_name: confirmedCustomerName
                };
                setServingQueue(updatedServingQueue);
                
                // ✅ CRITICAL FIX: Always update localStorage with confirmed backend data
                localStorage.setItem('servingQueue', JSON.stringify({
                    queue_number: updatedServingQueue.queue_number,
                    order_id: updatedServingQueue.order_id,
                    customer_name: confirmedCustomerName,
                    timestamp: new Date().toISOString()
                }));
                console.log('✅ Updated localStorage with backend-confirmed customer name:', confirmedCustomerName);
            }
            
            // ✅ FIX ISSUE #2: Update servingQueueLeft if it matches
            if (servingQueueLeft && servingQueueLeft.queue_number === queueNum) {
                setServingQueueLeft(prev => ({
                    ...prev,
                    customer_name: confirmedCustomerName
                }));
                console.log('✅ Updated servingQueueLeft customer_name from backend:', confirmedCustomerName);
            }
            
            // ✅ FIX ISSUE #2: Update servingQueueRight if it matches
            if (servingQueueRight && servingQueueRight.queue_number === queueNum) {
                setServingQueueRight(prev => ({
                    ...prev,
                    customer_name: confirmedCustomerName
                }));
                console.log('✅ Updated servingQueueRight customer_name from backend:', confirmedCustomerName);
            }
            
            // Close modal and clear state
            setShowUpdateCustomerModal(false);
            setSelectedQueueForAction(null);
            setUpdateCustomerName('');
            
            // ✅ FIX: Show single success notification AFTER all updates
            notyf.success(`✅ Customer name updated to "${confirmedCustomerName}" for Queue #${queueNum}`);
            
            // ✅ FIX ISSUE #2: No need for delayed refresh - UI already updated with backend data
            // The backend now returns the actual updated row, ensuring consistency
            
            // Reset error count on successful operation
            errorCountRef.current = 0;
        } catch (error) {
            const errorInfo = handleAPIError(error);
            notyf.error('K-Wise: ' + (errorInfo.message || 'Error updating customer name'));
            console.error('Error updating customer name:', error);
            
            // ✅ FIX: On error, revert local state by fetching fresh data
            setTimeout(() => {
                fetchQueueData();
            }, 500);
        }
    };

    // Fetch available stock items for adding to orders
    const fetchAvailableStock = async () => {
        try {
            const response = await stockAPI.getAllStockItems();
            console.log('Stock API response:', response);
            if (response.data && response.data.success) {
                const stockItems = response.data.data || [];
                console.log('Stock items received:', stockItems);
                setAvailableStock(stockItems);
            } else {
                console.log('Stock API response not successful:', response.data);
                setAvailableStock([]);
            }
        } catch (error) {
            console.error('Error fetching stock:', error);
            notyf.error('Failed to load stock items');
            setAvailableStock([]);
        }
    };

    // Filter stock items based on search term
    const filteredStock = useMemo(() => {
        console.log('Filtering stock items. Search term:', stockSearchTerm, 'Available stock count:', availableStock.length);
        
        if (!availableStock || availableStock.length === 0) {
            return [];
        }
        
        if (!stockSearchTerm || stockSearchTerm.trim() === '') {
            // Show first 20 items when no search term
            console.log('No search term, showing first 20 items');
            return availableStock.slice(0, 20);
        }
        
        const filtered = availableStock.filter(item =>
            item.name?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
            item.brand?.toLowerCase().includes(stockSearchTerm.toLowerCase())
        );
        
        console.log('Filtered items:', filtered.length);
        return filtered;
    }, [availableStock, stockSearchTerm]);

    // ✅ CRITICAL: Restore serving queues from backend
    useEffect(() => {
        const restoreServingQueues = async () => {
            try {
                console.log('🔄 Fetching NOW SERVING stations from backend...');
                const nowServingResponse = await queueAPI.getNowServing();
                
                if (nowServingResponse.data.success && nowServingResponse.data.data) {
                    const { station1, station2 } = nowServingResponse.data.data;
                    
                    if (station1) {
                        console.log('✅ LEFT station (1) synced from backend:', station1);
                        setServingQueueLeft({
                            queue_number: station1.queue_number,
                            order_id: station1.order_id,
                            customer_name: station1.customer_name
                        });
                    }
                    
                    if (station2) {
                        console.log('✅ RIGHT station (2) synced from backend:', station2);
                        setServingQueueRight({
                            queue_number: station2.queue_number,
                            order_id: station2.order_id,
                            customer_name: station2.customer_name
                        });
                    }
                    
                    // Set servingQueue to station1 for backwards compatibility
                    if (station1) {
                        setServingQueue({
                            queue_number: station1.queue_number,
                            order_id: station1.order_id,
                            customer_name: station1.customer_name
                        });
                    }
                    
                    return;
                }
                
                console.log('ℹ️ No queues currently being served (backend says none)');
            } catch (backendError) {
                console.warn('Failed to fetch NOW SERVING from backend:', backendError.message);
            }
        };
        
        restoreServingQueues();
    }, []);

    // Fetch queue data and statistics
    const fetchQueueData = useCallback(async () => {
        // ✅ FIX: Skip fetch if operation in progress (cancel/complete)
        if (operationLockRef.current) {
            console.log('🔒 Operation in progress, skipping fetch...');
            return;
        }
        
        // ✅ FIX: Prevent duplicate simultaneous fetches
        if (isFetching) {
            console.log('⏳ Fetch already in progress, skipping...');
            return;
        }
        
        if (!canViewOrders) {
            setError('Access denied. You do not have permission to view queue.');
            setIsLoading(false);
            return;
        }

        try {
            setIsFetching(true);
            setError(null);
            
            // ✅ FIX: Save current queue number before refresh to restore updated state
            const currentQueueNumber = currentQueue?.queue_number;
            const currentQueueCustomerName = currentQueue?.customer_name;
            
                // ✅ CRITICAL FIX: Only call /status endpoint (contains both stats AND activeQueue)
                // Previously called both /status and /active which DOUBLED all API requests
                // /status returns: { stats, activeQueue, timestamp }
                // /active returns: activeQueue only (redundant!)
                const statusResponse = await queueAPI.getStatus();

                if (statusResponse.data && statusResponse.data.success) {
                    // Set statistics
                    setQueueStats(statusResponse.data.data.stats);
                    
                    // ✅ CRITICAL FIX: Get active queue and filter out completed/cancelled orders
                    const activeQueue = statusResponse.data.data.activeQueue || [];
                    
                    // ✅ FIX: Filter out completed and cancelled orders from pending queues
                    // CRITICAL: Check both queue_status and order status fields
                    const filteredActiveQueue = activeQueue.filter(item => {
                        const queueStatus = (item.queue_status || item.order_queue_status || '').toLowerCase();
                        const orderStatus = (item.status || item.display_status || '').toLowerCase();
                        
                        // ✅ CRITICAL: Filter out if EITHER status is completed/cancelled
                        const isCompleted = queueStatus === 'completed' || orderStatus === 'completed';
                        const isCancelled = queueStatus === 'cancelled' || orderStatus === 'cancelled';
                        
                        // ✅ EXTRA CHECK: Also filter if status is 'serving' but marked as completed
                        const shouldShow = !isCompleted && !isCancelled;
                        
                        if (!shouldShow) {
                            console.log(`🗑️ Filtering out queue #${item.queue_number}: queueStatus=${queueStatus}, orderStatus=${orderStatus}`);
                        }
                        
                        return shouldShow;
                    });
                    
                    console.log(`✅ Filtered queue data: ${activeQueue.length} -> ${filteredActiveQueue.length} (removed completed/cancelled)`);
                    
                    setQueueData(filteredActiveQueue);                // ✅ FIX: Restore current queue with preserved customer name if it was updated
                if (currentQueueNumber) {
                    const refreshedCurrentQueue = filteredActiveQueue.find(item => 
                        item.queue_number === currentQueueNumber
                    );
                    
                    if (refreshedCurrentQueue) {
                        // ✅ CRITICAL: If customer name was updated locally, preserve it
                        if (currentQueueCustomerName && currentQueueCustomerName !== refreshedCurrentQueue.customer_name) {
                            refreshedCurrentQueue.customer_name = currentQueueCustomerName;
                        }
                        setCurrentQueue(refreshedCurrentQueue);
                    } else {
                        // Queue no longer exists (completed/cancelled), clear it
                        setCurrentQueue(null);
                    }
                }

                // ✅ CRITICAL FIX: Always restore serving queue from localStorage first
                // This ensures customer name updates persist across refreshes
                const savedServingQueue = localStorage.getItem('servingQueue');
                let restoredServingQueue = null;
                
                if (savedServingQueue) {
                    try {
                        const parsed = JSON.parse(savedServingQueue);
                        // Check if the saved queue still exists and is valid (within last 24 hours)
                        const savedTime = new Date(parsed.timestamp);
                        const now = new Date();
                        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
                        
                        if (hoursDiff < 24) {
                            restoredServingQueue = filteredActiveQueue.find(item => 
                                item.queue_number === parsed.queue_number && 
                                item.order_id === parsed.order_id
                            );
                            
                            // ✅ CRITICAL FIX: ALWAYS use customer name from localStorage
                            // This ensures updates persist and aren't overwritten by stale backend data
                            if (restoredServingQueue && parsed.customer_name) {
                                console.log('✅ Restoring customer name from localStorage:', parsed.customer_name);
                                restoredServingQueue.customer_name = parsed.customer_name;
                                
                                // ✅ FIX: Also update in queueData array for consistency
                                const queueDataIndex = filteredActiveQueue.findIndex(item => 
                                    item.queue_number === parsed.queue_number
                                );
                                if (queueDataIndex !== -1) {
                                    filteredActiveQueue[queueDataIndex].customer_name = parsed.customer_name;
                                }
                            }
                        } else {
                            // Expired, clear it
                            localStorage.removeItem('servingQueue');
                        }
                    } catch (e) {
                        console.warn('Failed to parse saved serving queue:', e);
                        localStorage.removeItem('servingQueue');
                    }
                }

                // ✅ SMOKING GUN FIX: Always sync NOW SERVING from backend (dual-station support)
                // Backend preserves is_now_serving flag even after order completion
                try {
                    const nowServingResponse = await queueAPI.getNowServing();
                    if (nowServingResponse.data.success && nowServingResponse.data.data) {
                        const { station1, station2 } = nowServingResponse.data.data;
                        
                        console.log('✅ Backend now serving:', { station1, station2 });
                        
                        // Update LEFT station (station 1)
                        if (station1) {
                            setServingQueueLeft({
                                queue_number: station1.queue_number,
                                order_id: station1.order_id,
                                customer_name: station1.customer_name || 'Customer'
                            });
                            // Backwards compatibility: set servingQueue to station1
                            setServingQueue({
                                queue_number: station1.queue_number,
                                order_id: station1.order_id,
                                customer_name: station1.customer_name || 'Customer'
                            });
                            console.log(`✅ Synced LEFT station: Queue #${station1.queue_number}`);
                        } else {
                            setServingQueueLeft(null);
                        }
                        
                        // Update RIGHT station (station 2)
                        if (station2) {
                            setServingQueueRight({
                                queue_number: station2.queue_number,
                                order_id: station2.order_id,
                                customer_name: station2.customer_name || 'Customer'
                            });
                            console.log(`✅ Synced RIGHT station: Queue #${station2.queue_number}`);
                        } else {
                            setServingQueueRight(null);
                        }
                        
                        // Clear servingQueue if both stations are empty
                        if (!station1 && !station2) {
                            setServingQueue(null);
                            console.log('🗑️ Backend has no serving queue, clearing local state...');
                        }
                    } else {
                        // Backend says NO queue is serving - clear all stations
                        setServingQueueLeft(null);
                        setServingQueueRight(null);
                        setServingQueue(null);
                        console.log('🗑️ Backend has no serving queues, clearing all stations...');
                    }
                } catch (syncError) {
                    console.warn('Failed to sync now serving from backend:', syncError.message);
                    // Don't clear local state on sync error - keep what we have
                }

                if (restoredServingQueue) {
                    // ✅ SMOKING GUN FIX: Use restored serving queue regardless of active status
                    // The "now serving" display should persist even if order is completed
                    // Backend preserves is_now_serving flag for this purpose
                    setServingQueue(restoredServingQueue);
                    if (!currentQueue) {
                        setCurrentQueue(restoredServingQueue);
                    }
                    console.log(`✅ Restored serving queue #${restoredServingQueue.queue_number} from localStorage`);
                }
            }

            setLastUpdated(new Date());
            
            // ✅ FIX: Reset error count on successful fetch
            errorCountRef.current = 0;
        } catch (error) {
            const errorInfo = handleAPIError(error);
            
            // ✅ FIX: Only count non-429 errors toward consecutive error limit
            if (error.response?.status === 429) {
                console.warn('⚠️ Rate limit hit, will retry after cooldown');
                setError(null); // Clear error to prevent "An error occurred" display
                // DON'T increment errorCountRef for 429 - it's temporary
            } else {
                // Count other errors
                errorCountRef.current += 1;
                setError(errorInfo.message || 'Failed to fetch queue data');
                console.error('Error fetching queue data:', error);
                
                // ✅ FIX: If too many consecutive NON-429 errors, stop auto-refresh
                if (errorCountRef.current >= maxConsecutiveErrors) {
                    console.error('❌ Too many consecutive errors, stopping auto-refresh');
                    setError('Connection issues detected. Please refresh manually.');
                }
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsFetching(false); // ✅ FIX: Reset fetch flag
        }
    }, [canViewOrders, currentQueue, isFetching]);

    // ✅ FIX: Add debounced fetch function to prevent rapid successive calls
    const debouncedFetchQueueData = useCallback(() => {
        // Clear any pending fetch
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }
        
        // Schedule new fetch with 1500ms delay
        fetchTimeoutRef.current = setTimeout(() => {
            fetchQueueData();
        }, 1500); // ✅ INCREASED: 1.5 seconds to drastically reduce API call frequency
    }, [fetchQueueData]);

    // Queue Management Functions
    const updateQueueStatus = async (queueNumber, status, customerName = '') => {
        if (!canModifyOrders) {
            notyf.error('K-Wise: Access denied. You do not have permission to modify queue status.');
            return;
        }

        try {
            await queueAPI.updateStatus(queueNumber, status, customerName);
            // ✅ FIX: Remove notification here - caller will show it
            // ✅ FIX: Remove fetchQueueData() call - caller handles refresh to prevent double-fetch
        } catch (error) {
            // ✅ FIX: Only log error, let caller handle notifications
            console.error('Error updating queue status:', error);
            throw error; // Re-throw so caller can handle
        }
    };

    const handleProcessQueue = async (queueNumber) => {
        await updateQueueStatus(queueNumber, 'processing');
    };

    const handleReadyQueue = async (queueNumber) => {
        await updateQueueStatus(queueNumber, 'ready');
    };

    const handleCompleteQueue = async (queueNumber, customerName) => {
        // ✅ FIX: CRITICAL - Validate customer name BEFORE any state changes
        const cleanCustomerName = customerName?.trim();
        
        // ✅ ENHANCED: Check if it's a default/invalid name with comprehensive pattern matching
        const isDefaultName = !cleanCustomerName || 
            cleanCustomerName === 'Kiosk Customer' || 
            cleanCustomerName === 'Customer' ||
            /^Customer\s*\d+$/i.test(cleanCustomerName) || // Matches "Customer 1", "Customer 111", etc.
            cleanCustomerName.toUpperCase() === 'CUSTOMER' ||
            /^CUSTOMER\s*\d+$/i.test(cleanCustomerName); // Matches "CUSTOMER 1", "CUSTOMER 111", etc.
        
        // ✅ CRITICAL DEBUG: Log the validation check with detailed info
        console.log('🔍 Complete Order Validation:', {
            queueNumber,
            rawCustomerName: customerName,
            cleanCustomerName,
            isDefaultName,
            willBlock: isDefaultName,
            testResults: {
                isEmpty: !cleanCustomerName,
                isKiosk: cleanCustomerName === 'Kiosk Customer',
                isCustomer: cleanCustomerName === 'Customer',
                matchesPattern: /^Customer\s*\d+$/i.test(cleanCustomerName || ''),
                matchesUpperPattern: /^CUSTOMER\s*\d+$/i.test(cleanCustomerName || '')
            }
        });
        
        if (isDefaultName) {
            // ❌ BLOCK completion - force customer name update first
            notyf.error('❌ Please update the customer name first before completing the order.');
            
            // Automatically open update name modal instead
            setSelectedQueueForAction(queueNumber);
            setUpdateCustomerName(cleanCustomerName || 'Customer');
            setShowUpdateCustomerModal(true);
            return; // ✅ EXIT EARLY - Don't open completion modal - NO STATE CHANGES BELOW
        }
        
        // ✅ Validation passed - proceed with completion
        console.log('✅ Validation passed! Opening completion modal for:', cleanCustomerName);
        
        // ✅ CRITICAL FIX: Only set modal states if validation passed
        // DO NOT set showCustomerModal=true unless customer name is valid
        setSelectedQueueForAction(queueNumber);
        setSelectedCustomerName(cleanCustomerName); // ✅ SMOKING GUN FIX: Store customer name!
        setCustomerName(cleanCustomerName);
        setShowCustomerModal(true); // This modal ONLY opens after validation passes
    };

    const confirmCompleteQueue = async () => {
        if (!selectedQueueForAction) return;

        // ✅ FIX: CRITICAL SAFETY CHECK - Re-validate customer name before proceeding
        const cleanCustomerName = customerName?.trim();
        const isDefaultName = !cleanCustomerName || 
            cleanCustomerName === 'Kiosk Customer' || 
            cleanCustomerName === 'Customer' ||
            /^Customer\s*\d+$/i.test(cleanCustomerName) ||
            cleanCustomerName.toUpperCase() === 'CUSTOMER' ||
            /^CUSTOMER\s*\d+$/i.test(cleanCustomerName);
            
        if (isDefaultName) {
            notyf.error('❌ Please update the customer name first before completing the order.');
            setShowCustomerModal(false);
            // Open update modal
            setUpdateCustomerName(cleanCustomerName || 'Customer');
            setShowUpdateCustomerModal(true);
            return; // ✅ BLOCK completion
        }

        try {
            // ✅ FIX: Lock polling during operation
            operationLockRef.current = true;
            
            // ✅ FIX: Update UI state immediately for better UX
            const queueNumberToComplete = selectedQueueForAction;
            
            // ✅ FIX ISSUE #1: Clear now_serving BEFORE completing to prevent stale display
            // Determine which station this queue is on
            // ✅ CRITICAL FIX: DO NOT manually clear station - completeOrder() handles this atomically
            // The backend's completeOrder() will clear all station fields in a transaction
            const isOnLeftStation = servingQueueLeft?.queue_number === queueNumberToComplete;
            const isOnRightStation = servingQueueRight?.queue_number === queueNumberToComplete;
            
            if (isOnLeftStation) {
                console.log('ℹ️ Queue on LEFT station - backend will handle atomic clearing');
            } else if (isOnRightStation) {
                console.log('ℹ️ Queue on RIGHT station - backend will handle atomic clearing');
            }
            
            // ✅ SMOKING GUN FIX: Clear ALL local state first to force complete refresh
            console.log('📥 FORCE CLEARING all queue state before complete...');
            setQueueData([]);  // Clear immediately
            setCurrentQueue(null);
            setServingQueue(null);
            localStorage.removeItem('servingQueue');
            
            // Close modal immediately
            setShowCustomerModal(false);
            setSelectedQueueForAction(null);
            setCustomerName('');
            
            // ✅ SMOKING GUN FIX: Use stored customer name (already validated!)
            console.log('📤 Sending complete request with customer name:', selectedCustomerName);
            await updateQueueStatus(queueNumberToComplete, 'completed', selectedCustomerName);
            setSelectedCustomerName(''); // Clear after use
            
            // ✅ FIX: Show success notification AFTER backend confirms
            notyf.success(`✅ Queue #${queueNumberToComplete} completed and moved to transaction history`);
            
            // ✅ FIX: Reset error count on successful operation
            errorCountRef.current = 0;
            
            // ✅ SMOKING GUN FIX: Force IMMEDIATE refresh without lock
            console.log('🔄 FORCE IMMEDIATE refresh after complete (no lock)...');
            operationLockRef.current = false; // Unlock BEFORE refresh
            await fetchQueueData(); // Immediate refresh
            
            // ✅ SECOND REFRESH: After 2 seconds to ensure backend fully synced
            setTimeout(async () => {
                console.log('🔄 Second refresh to verify backend sync...');
                await fetchQueueData();
            }, 2000);
        } catch (error) {
            const errorInfo = handleAPIError(error);
            notyf.error('K-Wise: ' + (errorInfo.message || 'Error completing queue'));
            console.error('Error completing queue:', error);
            
            // ✅ FIX: Revert by forcing refresh
            setTimeout(async () => {
                await fetchQueueData();
            }, 500);
        } finally {
            // ✅ FIX: Set lock AFTER second refresh (3 seconds total)
            setTimeout(() => {
                operationLockRef.current = false;
                console.log('🔓 Operation lock released (complete), polling resumed');
            }, 3000);
        }
    };

    // ✅ FIX: Listen for localStorage changes (cross-browser sync)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'servingQueue' && e.newValue) {
                const newServingQueue = JSON.parse(e.newValue);
                setServingQueue(newServingQueue);
                console.log('🔄 Serving queue synced from another tab:', newServingQueue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Set up real-time updates
    useEffect(() => {
        fetchQueueData();

        // ✅ FIX: DISABLE SSE callback to reduce API calls
        // SSE events trigger fetchQueueData() every 1-2 seconds
        // This causes excessive load combined with polling
        const eventSource = sseAPI.connectToQueueUpdates(
            (data) => {
                // ❌ DISABLED: Don't fetch on every SSE event
                // console.log('Queue update received:', data);
                // fetchQueueData(); // REMOVED - too many calls
            },
            (error) => {
                console.error('Queue SSE error:', error);
            },
            () => {
                console.log('Queue SSE connected');
            }
        );

        // Fallback polling every 15 seconds (optimized for rate limiting)
        const interval = setInterval(() => {
            // ✅ FIX: Stop polling if too many consecutive errors OR operation in progress
            if (errorCountRef.current < maxConsecutiveErrors && !operationLockRef.current) {
                debouncedFetchQueueData();
            }
        }, 15000); // ✅ INCREASED: 15 seconds to drastically reduce rate limit pressure

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            clearInterval(interval);
            // ✅ FIX: Clean up debounce timeout
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ✅ FIX: Empty dependencies - only run once on mount

    // ✅ NEW: Listen for localStorage changes (cross-browser/cross-tab sync for "Now Serving")
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'servingQueue' && e.newValue) {
                try {
                    const newServingQueue = JSON.parse(e.newValue);
                    setServingQueue(newServingQueue);
                    console.log('🔄 Now Serving synced from another browser/tab:', newServingQueue);
                } catch (err) {
                    console.error('❌ Failed to parse serving queue from storage:', err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleQueueSelect = (queueItem) => {
        setCurrentQueue(queueItem);
    };

    const handleSetNowServing = async (queueItem) => {
        // Show modal to select station (LEFT or RIGHT)
        setSelectedQueueForStation(queueItem);
        setShowStationModal(true);
    };

    const handleSetNowServingStation = async (station) => {
        try {
            const queueItem = selectedQueueForStation;
            if (!queueItem) return;
            
            console.log(`🎯 Setting queue #${queueItem.queue_number} to ${station.toUpperCase()} station...`);
            
            // ⚡ CRITICAL FIX: Temporarily clear operation lock to allow immediate refresh
            const wasLocked = operationLockRef.current;
            operationLockRef.current = false;
            
            try {
                // Call backend API to set specific station
                if (station === 'left') {
                    await queueAPI.setNowServingLeft(queueItem.queue_number);
                    
                    // ✅ IMMEDIATE STATE UPDATE: Update serving queue state instantly
                    const updatedQueue = {
                        ...queueItem,
                        is_now_serving: true,
                        now_serving_station: 1
                    };
                    setServingQueueLeft(updatedQueue);
                    setServingQueue(updatedQueue); // Backwards compatibility
                    
                    notyf.success(`Queue #${queueItem.queue_number} is now being served at LEFT station!`);
                } else if (station === 'right') {
                    await queueAPI.setNowServingRight(queueItem.queue_number);
                    
                    // ✅ IMMEDIATE STATE UPDATE: Update serving queue state instantly
                    const updatedQueue = {
                        ...queueItem,
                        is_now_serving: true,
                        now_serving_station: 2
                    };
                    setServingQueueRight(updatedQueue);
                    
                    notyf.success(`Queue #${queueItem.queue_number} is now being served at RIGHT station!`);
                }
                
                // Close modal
                setShowStationModal(false);
                setSelectedQueueForStation(null);
                
                // ✅ CRITICAL FIX: Force immediate refresh with lock cleared
                console.log('🔄 Forcing immediate refresh to sync UI with backend state...');
                await fetchQueueData();
                
                console.log(`✅ Now serving set at ${station.toUpperCase()} station:`, queueItem);
            } finally {
                // Restore lock state if it was locked before
                if (wasLocked) {
                    operationLockRef.current = true;
                }
            }
        } catch (error) {
            console.error('Failed to set now serving:', error);
            notyf.error(`Failed to set now serving at ${station} station`);
            // Ensure lock is released on error
            operationLockRef.current = false;
        }
    };

    const handleExportMonitor = async () => {
        try {
            notyf.success('Downloading queue monitor data...');
            const response = await queueAPI.exportMonitor();
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `queue-monitor-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            
            notyf.success('Queue monitor data exported successfully!');
        } catch (error) {
            console.error('Failed to export monitor data:', error);
            notyf.error('Failed to export monitor data');
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchQueueData();
    };

    if (isLoading) {
        return <div className="loading">Loading queue...</div>;
    }

    if (!canViewOrders) {
        return (
            <div className="access-denied">
                <h1>Access Denied</h1>
                <p>You do not have permission to view the queue management.</p>
            </div>
        );
    }

    return (
        <div className="order-queue">
            <div className="order-header">
                <div className="header-left">
                    <h1>Queue Management</h1>
                    <span className="user-role">({currentUser?.role})</span>
                    {queueStats && (
                        <div className="queue-stats">
                            <span className="stat">Pending: {queueStats.pendingCount || 0}</span>
                            <span className="stat">Cancelled: {queueStats.cancelledToday || 0}</span>
                            <span className="stat">Completed: {queueStats.completedToday || 0}</span>
                            <span className="stat" title="Available queue numbers in current cycle">
                                Available: {queueStats.availableQueues || 0}/{queueStats.totalQueues || 99}
                            </span>
                            <span className="stat" title="Current queue cycle number">
                                Cycle: #{queueStats.currentCycle || 1}
                            </span>
                            {/* ⏰ NEW: Auto-reset countdown */}
                            <span className="stat stat-reset" title={`Auto-reset at 12:00 AM (Asia/Manila). Last reset: ${queueStats.lastResetDate || 'N/A'}`}>
                                🕐 Reset in: {queueStats.hoursUntilReset ? `${Math.floor(queueStats.hoursUntilReset)}h ${Math.floor((queueStats.hoursUntilReset % 1) * 60)}m` : 'N/A'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="header-right">
                    {/* 🔄 RESET BUTTON - Shows when all queue numbers are exhausted OR admin wants manual reset */}
                    {queueStats && canModifyOrders && (
                        <button 
                            className={`btn-reset-queue ${queueStats.needsReset ? 'urgent' : ''}`}
                            onClick={handleResetQueueCycle}
                            title={queueStats.needsReset 
                                ? "⚠️ All queue numbers (1-99) are used. Click to reset and start a new cycle."
                                : `Manual reset available. Current: ${queueStats.usedQueues}/99 used. Auto-reset in ${Math.floor(queueStats.hoursUntilReset || 0)}h ${Math.floor(((queueStats.hoursUntilReset || 0) % 1) * 60)}m`
                            }
                        >
                            <FiRefreshCw /> {queueStats.needsReset ? '⚠️ RESET REQUIRED' : 'MANUAL RESET'} (1-99)
                        </button>
                    )}
                    {lastUpdated && (
                        <span className="last-updated">
                            <FiClock /> Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    {/* TASK 7: Auto-Generate Orders Button */}
                    {canModifyOrders && (
                        <button
                            className="auto-generate-btn"
                            onClick={() => navigate('/admin/auto-generate-orders')}
                            title="Generate Test Orders"
                        >
                            🤖 Test Orders
                        </button>
                    )}
                    <button
                        className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <FiRefreshCw />
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="queue-container">
                <div className="queue-detail">
                    {currentQueue ? (
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">
                                    <FiHash /> Queue #{currentQueue.queue_number}
                                </h2>
                                <div className="queue-status">
                                    <span className={`status-badge ${currentQueue.queue_status}`}>
                                        {currentQueue.queue_status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="queue-info">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="label">Order ID:</span>
                                        <span className="value">{currentQueue.order_id_formatted || `#${currentQueue.order_id}`}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Customer:</span>
                                        <span className="value">{currentQueue.customer_name || 'Customer'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Total Amount:</span>
                                        <span className="value">₱{Number(currentQueue.total_amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Created:</span>
                                        <span className="value">{new Date(currentQueue.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Transaction ID:</span>
                                        <span className="value">{currentQueue.transaction_id_formatted || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Payment Method:</span>
                                        <span className="value">{currentQueue.payment_method || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Enhanced Order Items Section */}
                            {currentQueue.order_items && currentQueue.order_items.length > 0 && (
                                <div className="order-items-section">
                                    <div className="section-header">
                                        <h3 className="section-title">Order Items</h3>
                                    </div>
                                    <div className="order-items-list">
                                        {currentQueue.order_items.map((item, index) => (
                                            <div key={item.id || index} className="order-item editable">
                                                <div className="item-info">
                                                    <div className="item-main">
                                                        <span className="item-name">{item.item_name}</span>
                                                        <span className="item-component">({item.component_name})</span>
                                                        {item.component_name === 'prebuilt-component' && (
                                                            <span className="prebuilt-badge" style={{
                                                                marginLeft: '8px',
                                                                padding: '2px 8px',
                                                                backgroundColor: '#00E083',
                                                                color: 'white',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                PreBuilt Component
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.description && (
                                                        <div className="item-description" style={{
                                                            fontSize: '12px',
                                                            color: '#666',
                                                            marginTop: '4px',
                                                            fontStyle: 'italic',
                                                            padding: '4px 8px',
                                                            backgroundColor: '#f5f5f5',
                                                            borderRadius: '4px',
                                                            borderLeft: '3px solid #00E083'
                                                        }}>
                                                            {item.description}
                                                        </div>
                                                    )}
                                                    <div className="item-details">
                                                        <span className="item-price">
                                                            {item.component_name === 'prebuilt-component' 
                                                                ? 'Included' 
                                                                : `₱${Number(item.price).toLocaleString()}`
                                                            }
                                                        </span>
                                                        <div className="quantity-controls">
                                                            {canModifyOrders && (
                                                                <button 
                                                                    className="qty-btn minus"
                                                                    onClick={() => handleDecreaseQuantity(item.id)}
                                                                    title="Decrease quantity"
                                                                >
                                                                    <FiMinus />
                                                                </button>
                                                            )}
                                                            <span className="item-quantity">{item.quantity}</span>
                                                            {canModifyOrders && (
                                                                <button 
                                                                    className="qty-btn plus"
                                                                    onClick={() => handleIncreaseQuantity(item.id)}
                                                                    title="Increase quantity"
                                                                >
                                                                    <FiPlus />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <span className="item-amount">
                                                            {item.component_name === 'prebuilt-component'
                                                                ? 'Included in PreBuilt'
                                                                : `= ₱${Number(item.amount).toLocaleString()}`
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="item-actions">
                                                    <div className="item-status">
                                                        <span className={`status-badge ${item.status}`}>
                                                            {item.status?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    {canModifyOrders && (
                                                        <button 
                                                            className="btn-remove-item"
                                                            onClick={() => handleRemoveItem(item.id)}
                                                            title="Remove item"
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Add Item Button - moved below items list */}
                                    {canModifyOrders && (
                                        <div className="add-item-section">
                                            <button 
                                                className="btn btn-add-item"
                                                onClick={() => {
                                                    fetchAvailableStock();
                                                    setShowStockModal(true);
                                                }}
                                            >
                                                <FiPlus /> Add Item
                                            </button>
                                        </div>
                                    )}
                                    
                                    <div className="items-summary">
                                        <div className="summary-row">
                                            <span className="summary-label">Total Items:</span>
                                            <span className="summary-value">{currentQueue.order_items.length}</span>
                                        </div>
                                        <div className="summary-row total">
                                            <span className="summary-label">Order Total:</span>
                                            <span className="summary-value">
                                                ₱{currentQueue.order_items.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="card-footer">
                                <div className="queue-actions">
                                    {/* ✅ FIX BUG #1: Check BOTH dual stations (LEFT and RIGHT) */}
                                    {canModifyOrders && 
                                        servingQueueLeft?.queue_number !== currentQueue.queue_number && 
                                        servingQueueRight?.queue_number !== currentQueue.queue_number && (
                                        <button
                                            className="btn btn-now-serving"
                                            onClick={() => handleSetNowServing(currentQueue)}
                                        >
                                            <FiUser /> Set as Now Serving
                                        </button>
                                    )}
                                    {currentQueue.queue_status === 'pending' && canModifyOrders && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleProcessQueue(currentQueue.queue_number)}
                                        >
                                            <FiClock /> Start Processing
                                        </button>
                                    )}
                                    {currentQueue.queue_status === 'processing' && canModifyOrders && (
                                        <button
                                            className="btn btn-success"
                                            onClick={() => handleReadyQueue(currentQueue.queue_number)}
                                        >
                                            <FiCheck /> Mark Ready
                                        </button>
                                    )}
                                    {currentQueue.queue_status === 'ready' && canModifyOrders && (
                                        <button
                                            className="btn btn-complete"
                                            onClick={() => handleCompleteQueue(currentQueue.queue_number, currentQueue.customer_name)}
                                        >
                                            <FiCheck /> Complete Order
                                        </button>
                                    )}
                                    <div className="action-group">
                                        {/* ✅ FIX BUG #1: Check BOTH dual stations for Update Name button */}
                                        {canModifyOrders && (
                                            servingQueueLeft?.queue_number === currentQueue.queue_number || 
                                            servingQueueRight?.queue_number === currentQueue.queue_number
                                        ) && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleUpdateCustomer(currentQueue.queue_number, currentQueue.customer_name)}
                                            >
                                                <FiUser /> Update Name
                                            </button>
                                        )}
                                        {/* ✅ FIX BUG #1: Check BOTH dual stations for Complete Order button */}
                                        {canModifyOrders && (
                                            servingQueueLeft?.queue_number === currentQueue.queue_number || 
                                            servingQueueRight?.queue_number === currentQueue.queue_number
                                        ) && (
                                            <button
                                                className="btn btn-complete"
                                                onClick={() => handleCompleteQueue(currentQueue.queue_number, currentQueue.customer_name)}
                                            >
                                                <FiCheck /> Complete Order
                                            </button>
                                        )}
                                        {/* ✅ FIX BUG #1: Check BOTH dual stations for Cancel button */}
                                        {canModifyOrders && (
                                            servingQueueLeft?.queue_number === currentQueue.queue_number || 
                                            servingQueueRight?.queue_number === currentQueue.queue_number
                                        ) && (
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleCancelOrder(currentQueue.queue_number, currentQueue.customer_name)}
                                            >
                                                <FiX /> Cancel Order
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-queue-message card">
                            <div className="empty-queue-content">
                                <FiClock className="empty-icon" />
                                <h3>No Active Queue</h3>
                                <p>There are no queues currently active.</p>
                                <p>Orders will automatically receive queue numbers when created.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="queue-sidebar">
                    <div className="card">
                        <h3 className="card-title">Queue Status</h3>

                        <div className="now-serving-container">
                            <div className="now-serving-header">
                                <p className="now-serving-label">Now Serving</p>
                                
                                {/* ISSUE #6: Export button for vertical monitor display */}
                                <div className="export-buttons">
                                    <button
                                        className="export-monitor-btn"
                                        onClick={() => {
                                            // Open queue display in new window optimized for 1920x1080 vertical monitor
                                            window.open(
                                                '/queue-display-monitor',
                                                'QueueMonitor',
                                                'width=1080,height=1920,menubar=no,toolbar=no,location=no,status=no'
                                            );
                                        }}
                                        title="Export to vertical monitor display"
                                    >
                                        📺 Display
                                    </button>
                                    <button
                                        className="export-monitor-btn"
                                        onClick={handleExportMonitor}
                                        title="Export queue data as CSV"
                                    >
                                        📥 Export CSV
                                    </button>
                                </div>
                            </div>

                            {servingQueue ? (
                                <div className="now-serving-number">
                                    #{servingQueue.queue_number}
                                </div>
                            ) : (
                                <div className="now-serving-number empty">
                                    -
                                </div>
                            )}
                            
                            {/* ISSUE #5: Display pending queue numbers below NOW SERVING */}
                            <div className="pending-queues-indicator">
                                <p className="pending-label">Pending Queues:</p>
                                <div className="pending-numbers">
                                    {queueData
                                        .filter(item => 
                                            item.queue_status === 'assigned' && 
                                            item.order_id &&
                                            (!servingQueue || item.queue_number !== servingQueue.queue_number)
                                        )
                                        .sort((a, b) => a.queue_number - b.queue_number)
                                        .slice(0, 10) // Show up to 10 pending queues
                                        .map((item) => (
                                            <span key={item.queue_number} className="pending-number">
                                                #{item.queue_number}
                                            </span>
                                        ))
                                    }
                                    {queueData.filter(item => 
                                        item.queue_status === 'assigned' && 
                                        item.order_id &&
                                        (!servingQueue || item.queue_number !== servingQueue.queue_number)
                                    ).length === 0 && (
                                        <span className="no-pending">No pending queues</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="queue-numbers">
                            {queueData
                                .filter(item => item.queue_status === 'pending') // Only show pending queues
                                .sort((a, b) => a.queue_number - b.queue_number) // Sort ascending
                                .slice(0, 6)
                                .map((item) => (
                                    <div
                                        key={item.queue_number}
                                        className={`queue-number ${currentQueue && currentQueue.queue_number === item.queue_number ? 'active' : ''} ${item.queue_status}`}
                                        onClick={() => handleQueueSelect(item)}
                                    >
                                        #{item.queue_number}
                                    </div>
                                ))}
                        </div>

                        {/* Pending Queues Section */}
                        <div className="pending-queues-section">
                            <h3 className="section-title">Pending Queues</h3>
                            <div className="pending-queues-list">
                                {queueData
                                    .filter(item => item.queue_status === 'assigned' && item.order_id) // Show assigned queues with orders
                                    .sort((a, b) => a.queue_number - b.queue_number) // Sort ascending
                                    .map((item) => (
                                        <div
                                            key={item.queue_number}
                                            className={`pending-queue-item ${currentQueue && currentQueue.queue_number === item.queue_number ? 'active' : ''}`}
                                            onClick={() => handleQueueSelect(item)}
                                        >
                                            <div className="pending-queue-number">#{item.queue_number}</div>
                                            <div className="pending-queue-info">
                                                <span className="customer-name">{item.customer_name || 'Customer'}</span>
                                                <span className="order-time">{new Date(item.created_at).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    ))
                                }
                                {queueData.filter(item => item.queue_status === 'assigned' && item.order_id).length === 0 && (
                                    <div className="no-pending-queues">
                                        No pending queues
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 className="section-title">Active Queues</h3>

                        <div className="queue-list-sidebar">
                            {queueData
                                .filter(item => item.queue_status !== 'completed')
                                .sort((a, b) => {
                                    // Sort by status priority (pending first), then by queue number
                                    const statusOrder = { 'pending': 1, 'processing': 2, 'ready': 3 };
                                    const statusDiff = (statusOrder[a.queue_status] || 4) - (statusOrder[b.queue_status] || 4);
                                    if (statusDiff !== 0) return statusDiff;
                                    return a.queue_number - b.queue_number;
                                })
                                .map((item) => (
                                    <div
                                        key={item.queue_number}
                                        className={`queue-item ${currentQueue && currentQueue.queue_number === item.queue_number ? 'active' : ''}`}
                                        onClick={() => handleQueueSelect(item)}
                                    >
                                        <div className="queue-info">
                                            <span className="queue-number">Queue #{item.queue_number}</span>
                                            <span className="queue-customer">{item.customer_name || 'Customer'}</span>
                                            <span className="queue-order">{item.order_id_formatted}</span>
                                        </div>
                                        <span className={`status-badge ${item.queue_status}`}>
                                            {item.queue_status?.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                            {queueData.filter(item => item.queue_status !== 'completed').length === 0 && (
                                <div className="no-orders-message">
                                    No active queues
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Name Modal - REQUIRED */}
            {showCustomerModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>Complete Order #{selectedQueueForAction}</h2>
                            <button className="close-btn" onClick={() => setShowCustomerModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="completion-confirmation">
                                <p><strong>Complete order for customer:</strong></p>
                                <p className="customer-name-display">{customerName}</p>
                                <small className="form-text">Click "Complete Order" to finish this order.</small>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setShowCustomerModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-success"
                                onClick={confirmCompleteQueue}
                            >
                                <FiCheck /> Complete Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Name Modal */}
            {showUpdateCustomerModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>Update Name for Queue #{selectedQueueForAction}</h2>
                            <button className="close-btn" onClick={() => setShowUpdateCustomerModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label htmlFor="updateCustomerName">Customer Name *</label>
                                <input
                                    type="text"
                                    id="updateCustomerName"
                                    className="form-control"
                                    value={updateCustomerName}
                                    onChange={(e) => setUpdateCustomerName(e.target.value)}
                                    placeholder="Enter customer name"
                                    required
                                />
                                <small className="form-text">Update the customer name for this order.</small>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setShowUpdateCustomerModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={confirmUpdateCustomer}
                                disabled={!updateCustomerName.trim()}
                            >
                                <FiCheck /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Items Modal */}
            {showStockModal && (
                <div className="modal-overlay">
                    <div className="modal-container large">
                        <div className="modal-header">
                            <h2>Add Stock Items to Order</h2>
                            <button className="close-btn" onClick={() => setShowStockModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="stock-search">
                                <div className="search-input-group">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search stock items..."
                                        value={stockSearchTerm}
                                        onChange={(e) => setStockSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="stock-list">
                                {filteredStock.length > 0 ? (
                                    filteredStock.map((item) => (
                                        <div key={item.id} className="stock-item">
                                            <div className="stock-info">
                                                <div className="stock-name">{item.name}</div>
                                                <div className="stock-details">
                                                    <span className="stock-category">{item.category}</span>
                                                    <span className="stock-price">₱{Number(item.price || 0).toLocaleString()}</span>
                                                    <span className="stock-quantity">Stock: {item.stock_quantity}</span>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleAddStockItem(item)}
                                                disabled={item.stock_quantity <= 0}
                                            >
                                                <FiPlus /> Add
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-results">
                                        <p>No stock items found matching your search.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setShowStockModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Order Modal */}
            {showCancelModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>Cancel Order</h2>
                            <button className="close-btn" onClick={() => setShowCancelModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="warning-message">
                                <p>Are you sure you want to cancel Queue #{selectedQueueForAction}?</p>
                                <p>This action cannot be undone. The order will be moved to transaction history with cancelled status.</p>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setShowCancelModal(false)}
                            >
                                Keep Order
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-danger"
                                onClick={confirmCancelOrder}
                            >
                                <FiX /> Cancel Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Station Selection Modal */}
            {showStationModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>Select Serving Station</h2>
                            <button className="close-btn" onClick={() => setShowStationModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="station-selection">
                                <p>Which station will serve Queue #{selectedQueueForStation?.queue_number}?</p>
                                <div className="station-buttons">
                                    <button 
                                        className="btn btn-station btn-station-left"
                                        onClick={() => handleSetNowServingStation('left')}
                                    >
                                        <div className="station-icon">◀</div>
                                        <div className="station-label">LEFT Station</div>
                                        {servingQueueLeft && (
                                            <div className="station-current">Current: #{servingQueueLeft.queue_number}</div>
                                        )}
                                    </button>
                                    <button 
                                        className="btn btn-station btn-station-right"
                                        onClick={() => handleSetNowServingStation('right')}
                                    >
                                        <div className="station-icon">▶</div>
                                        <div className="station-label">RIGHT Station</div>
                                        {servingQueueRight && (
                                            <div className="station-current">Current: #{servingQueueRight.queue_number}</div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setShowStationModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderQueue;