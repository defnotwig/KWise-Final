/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiShoppingCart, FiUsers, FiCheckCircle, FiRefreshCw, FiActivity, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { dashboardAPI, handleAPIError, ordersAPI, realtimeAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getApiBaseUrl } from '../../utils/networkConfig'; // Network-aware API URLs
import './Dashboard.css';
import '../../styles/pagination.css';
import activityLogger from '../../services/activityLogger';

const Dashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    // Unified stats shape (inventory instead of products to match backend mapping)
    const [stats, setStats] = useState({
        orders: { total: 0, completed: 0, pending: 0, cancelled: 0, today: 0, week: 0, monthlyGrowth: 0 },
        users: { total: 0, active: 0, byRole: {} },
        inventory: { totalProducts: 0, lowStock: 0, totalValue: 0 },
        revenue: { total: 0, monthly: 0 },
        system: { uptime: 0, timestamp: null, hasOrders: false }
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [showLowStockAnalytics, setShowLowStockAnalytics] = useState(false);
    const [lowStockData, setLowStockData] = useState(null);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    
    // Phase 1: Transaction History State
    const [transactions, setTransactions] = useState([]);
    const [transactionsPagination, setTransactionsPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0
    });

    // Phase 1: Fetch transaction history with enhanced error handling
    const fetchTransactionHistory = async (page = 1) => {
        try {
            console.log('Fetching transaction history for page:', page);
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 seconds instead of 45
            );
            
            const requestPromise = ordersAPI.getTransactionHistory({ page, limit: 20 });
            
            const response = await Promise.race([requestPromise, timeoutPromise]);

            if (response?.success && response.data) {
                const { transactions: txs, pagination } = response.data;
                console.log('Transaction history fetched successfully:', { count: txs.length });
                setTransactions(txs);
                setTransactionsPagination({
                    currentPage: pagination.currentPage,
                    totalPages: pagination.totalPages,
                    totalItems: pagination.totalItems
                });
            } else {
                // Handle timeout and error responses more gracefully
                console.warn('Transaction history request timed out - displaying empty state');
                setTransactions([]);
                setTransactionsPagination({ currentPage: 1, totalPages: 1, totalItems: 0 });
            }
        } catch (error) {
            // Reduce console spam for timeout errors
            if (error.message?.includes('timeout')) {
                console.warn('Transaction history timed out:', error.message);
            } else {
                console.error('Error fetching transaction history:', error);
            }
            setTransactions([]);
            setTransactionsPagination({ currentPage: 1, totalPages: 1, totalItems: 0 });
        }
    };

    // Phase 1: Updated API call using the new /api/admin/stats endpoint
    const fetchDashboardData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Issue 1: Fetch minimal summary first for quick render
            let summaryData = null;
            try {
                const summaryRes = await fetch(`${getApiBaseUrl()}/admin/stats/summary`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (summaryRes.ok) {
                    const sj = await summaryRes.json();
                    if (sj.success) summaryData = sj.data;
                }
            } catch (e) { console.warn('Summary stats fetch failed (non-blocking):', e.message); }

            // Detailed stats endpoint
            const response = await fetch(`${getApiBaseUrl()}/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success || !data.data) throw new Error(data.message || 'Failed to fetch dashboard data');

            // Phase 1: Use the exact format returned by /api/admin/stats (FIXED for real-time data)
            const d = data.data;
            console.log('📊 Dashboard: Raw admin stats data:', d); // Debug log
            
            // Fetch unified user stats overview in parallel (not failing dashboard if error)
            let usersOverview = null;
            try {
                const userStatsResp = await fetch(`${getApiBaseUrl()}/users/stats/overview`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (userStatsResp.ok) {
                    const userStatsJson = await userStatsResp.json();
                    if (userStatsJson.success) usersOverview = userStatsJson.data;
                }
            } catch (e) {
                console.warn('User stats overview fetch failed (non-blocking):', e.message);
            }

            setStats(prev => ({
                orders: {
                    total: d.totalOrders ?? prev.orders.total,
                    completed: d.completedOrders ?? prev.orders.completed,
                    pending: d.pendingOrders ?? prev.orders.pending,
                    cancelled: d.cancelledOrders ?? prev.orders.cancelled,
                    today: d.todayOrders ?? prev.orders.today,
                    week: d.weekOrders ?? prev.orders.week,
                    monthlyGrowth: d.monthlyGrowth ?? prev.orders.monthlyGrowth
                },
                users: {
                    total: (usersOverview?.totalUsers) ?? summaryData?.totalUsers ?? d.totalUsers ?? prev.users.total,
                    active: (usersOverview?.activeUsers) ?? summaryData?.activeUsers ?? d.activeUsers ?? prev.users.active,
                    online: (usersOverview?.onlineUsers) ?? summaryData?.activeUsers ?? d.activeUsers ?? prev.users.online,
                    byRole: usersOverview?.usersByRole || d.usersByRole || prev.users.byRole,
                    recent24h: usersOverview?.recent24h || usersOverview?.recentLogins || prev.users.recent24h,
                    superadmins: usersOverview?.superadminCount || prev.users.superadmins
                },
                inventory: {
                    totalProducts: summaryData?.totalProducts ?? d.totalProducts ?? prev.inventory.totalProducts,
                    lowStock: summaryData?.lowStockCount ?? d.lowStockProducts ?? prev.inventory.lowStock,
                    totalValue: summaryData?.totalStockValue ?? d.inventoryValue ?? prev.inventory.totalValue
                },
                revenue: {
                    total: d.totalRevenue ?? prev.revenue.total,
                    monthly: d.monthlyRevenue ?? prev.revenue.monthly
                },
                system: {
                    uptime: d.uptime ?? prev.system.uptime,
                    timestamp: d.timestamp || prev.system.timestamp,
                    hasOrders: d.hasOrders ?? prev.system.hasOrders
                }
            }));
            setLastUpdated(new Date());

            // Fetch recent activity
            const activityResponse = await fetch(`${getApiBaseUrl()}/dashboard-enhanced/activity?limit=10`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (activityResponse.ok) {
                const activityData = await activityResponse.json();
                if (activityData.success) {
                    setRecentActivity(activityData.data);
                }
            }

            // Fetch recent orders if available
            if (data.data.hasOrders) {
                const ordersResponse = await fetch(`${getApiBaseUrl()}/orders/recent?limit=5`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (ordersResponse.ok) {
                    const ordersData = await ordersResponse.json();
                    if (ordersData.success && ordersData.data) {
                        setRecentOrders(ordersData.data);
                    }
                }
            } else {
                // Set empty orders if no orders exist
                setRecentOrders([]);
            }

            // Set sales data based on monthly data or use defaults
            setSalesData([
                { name: 'Jan', sales: data.data.monthlySales?.jan || 4000 },
                { name: 'Feb', sales: data.data.monthlySales?.feb || 3000 },
                { name: 'Mar', sales: data.data.monthlySales?.mar || 2000 },
                { name: 'Apr', sales: data.data.monthlySales?.apr || 2780 },
                { name: 'May', sales: 1890 },
                { name: 'Jun', sales: 2390 }
            ]);

        } catch (error) {
            console.error('Dashboard data fetch error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Manual refresh control functions (not for auto-refresh)
    const startAutoRefresh = useCallback(() => {
        // Auto-refresh is handled by useEffect above
        // This function is kept for manual control if needed
        console.log('Manual auto-refresh requested');
    }, []);

    const stopAutoRefresh = useCallback(() => {
        // Auto-refresh is handled by useEffect above
        // This function is kept for manual control if needed
        console.log('Manual auto-refresh stop requested');
    }, []);
    useEffect(() => {
        fetchDashboardData();
        // Don't auto-fetch transaction history on dashboard load - only when explicitly requested
        // fetchTransactionHistory(); // This was causing the timeout issues
    }, [fetchDashboardData]);

    // Single auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboardData();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    // Realtime subscriptions: orders and logs (augment dashboard without breaking)
    useEffect(() => {
        const subs = [];
        try {
            // Orders realtime: update recent orders list opportunistically
            const ordersEs = realtimeAPI.subscribeToOrders();
            const upsertOrder = (order) => {
                if (!order) return;
                setRecentOrders((prev) => {
                    const existingIdx = prev.findIndex((o) => (o.id || o._id) === (order.id || order._id));
                    const normalized = {
                        id: order.id || order._id,
                        orderNumber: order.order_number || order.orderNumber,
                        customer: order.customer_name || order.customer || order.customerName,
                        email: order.customer_email || order.email,
                        amount: parseFloat(order.total_amount || order.amount || 0),
                        status: order.status,
                        paymentMethod: order.payment_method || order.paymentMethod,
                        createdAt: order.created_at || order.createdAt,
                        updatedAt: order.updated_at || order.updatedAt
                    };
                    if (existingIdx >= 0) {
                        const next = prev.slice();
                        next[existingIdx] = { ...next[existingIdx], ...normalized };
                        return next;
                    }
                    return [normalized, ...prev].slice(0, 5);
                });
            };
            const handlePayload = (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload?.data) upsertOrder(payload.data);
                } catch {}
            };
            ordersEs.addEventListener('order-updated', handlePayload);
            ordersEs.addEventListener('order-created', handlePayload);
            ordersEs.onopen = () => {
                console.log('📡 SSE Orders connection opened');
            };
            
            ordersEs.onerror = (error) => {
                console.error('❌ SSE Orders connection error:', error);
            };
            
            ordersEs.addEventListener('heartbeat', (e) => {
                // Heartbeat received - connection is alive (silent logging)
                // Only log heartbeats if debugging is needed
                // console.log('💓 Orders SSE heartbeat:', e.data);
            });
            
            ordersEs.addEventListener('order-completed', handlePayload);
            ordersEs.addEventListener('order-cancelled', handlePayload);
            // For progress, add a subtle activity marker (optional)
            ordersEs.addEventListener('order-progress', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    const p = payload?.data;
                    if (!p?.id) return;
                    setRecentActivity((prev) => [{
                        id: `progress-${p.id}-${Date.now()}`,
                        type: 'order-progress',
                        table_name: 'orders',
                        record_id: p.id,
                        description: p.message || `Order ${p.id} progress: ${p.status || ''} ${p.progress != null ? `(${p.progress}%)` : ''}`.trim(),
                        created_at: new Date().toISOString(),
                        user_name: currentUser?.name,
                        user_role: currentUser?.role
                    }, ...prev].slice(0, 20));
                } catch (err) {
                    console.error('Error processing order progress event:', err);
                }
            });
            subs.push(ordersEs);

            // Logs realtime: bump activity list when new log-entry appears
            const token = localStorage.getItem('token');
            const logsEs = new EventSource(`${getApiBaseUrl()}/realtime/logs${token ? `?token=${token}` : ''}`);
            
            
            logsEs.onopen = () => {
                console.log('📡 SSE Logs connection opened');
            };
            
            logsEs.onerror = (error) => {
                console.error('❌ SSE Logs connection error:', error);
            };
            
            logsEs.addEventListener('log-entry', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    const item = payload?.data;
                    if (!item) return;
                    setRecentActivity((prev) => [{
                        id: item.id,
                        type: item.action,
                        table_name: item.table_name || item.entity,
                        record_id: item.record_id || item.entity_id,
                        description: item.description,
                        created_at: item.created_at,
                        user_name: item.user_name,
                        user_role: item.user_role
                    }, ...prev].slice(0, 20));
                } catch (err) {
                    console.error('Error processing log event:', err);
                }
            });
            
            logsEs.addEventListener('heartbeat', (e) => {
                // Heartbeat received - connection is alive (silent logging)
                // console.log('💓 Logs SSE heartbeat:', e.data);
            });
            
            subs.push(logsEs);

            // NOTE: Presence tracking removed to simplify dashboard
            // Real-time user stats are handled through the main stats endpoint instead
        } catch {}
        return () => subs.forEach((es) => { try { es.close(); } catch {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    // =====================================================
    // 🤖 LOW STOCK ANALYTICS WITH AI
    // =====================================================
    const fetchLowStockAnalytics = async () => {
        setAiAnalyzing(true);
        setShowLowStockAnalytics(true);
        
        // Log this activity
        activityLogger.logButtonClick('Low Stock Analytics', 'Dashboard', {
            action: 'view_low_stock_analytics'
        });
        
        try {
            // Fetch low stock items
            const response = await fetch(`${getApiBaseUrl()}/stock/low-stock`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch low stock data');
            }

            const data = await response.json();
            const lowStockItems = data.data || [];

            // Get AI recommendations for each low stock item
            const aiResponse = await fetch(`${getApiBaseUrl()}/admin/ai/low-stock-recommendations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lowStockItems })
            });

            let aiRecommendations = {};
            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                aiRecommendations = aiData.recommendations || {};
            }

            setLowStockData({
                items: lowStockItems,
                recommendations: aiRecommendations,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Low Stock Analytics error:', error);
            alert('Failed to load Low Stock Analytics. Please try again.');
        } finally {
            setAiAnalyzing(false);
        }
    };
    
    // Function to get status badge class
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'completed':
                return 'badge badge-success';
            case 'processing':
                return 'badge badge-primary';
            case 'pending':
                return 'badge badge-warning';
            case 'cancelled':
                return 'badge badge-danger';
            default:
                return 'badge';
        }
    };
    // Function to format currency
    const formatCurrency = (amount) => {
        const safeAmount = Number(amount) || 0;
        return `₱${safeAmount.toLocaleString()}`;
    };

    if (isLoading) {
        return <div className="loading">Loading dashboard data...</div>;
    }

    return (
        <div className="dashboard">
            {/* Enhanced Header with real-time timestamp */}
            <div className="dashboard-header-enhanced">
                <div className="header-content">
                    <div className="header-main">
                        <h1>Dashboard</h1>
                        <div className="dashboard-subtitle">
                            K-Wise Admin System • Real-time Analytics
                        </div>
                    </div>
                    <div className="dashboard-controls-enhanced">
                        <div className="live-timestamp">
                            <div className="live-indicator"></div>
                            <span className="timestamp-label">Last Updated:</span>
                            <span className="timestamp-value">
                                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
                            </span>
                        </div>
                        <button
                            className="refresh-btn-enhanced"
                            onClick={fetchDashboardData}
                            disabled={isLoading}
                            title="Refresh Dashboard Data"
                        >
                            <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-dashboard-card" onClick={() => navigate('/admin/history')} style={{cursor: 'pointer'}} title="Click to view orders">
                    <div className="stat-icon">
                        <FiShoppingCart />
                    </div>
                    <div className="stat-content">
                    <div className="stat-badge">
                    <h3 className="stat-title">Total Orders:</h3>
                    <div className="stat-value">{stats.orders?.total || 0}</div>
                    </div>
                    <div className="stat-desc">
                        {stats.system?.hasOrders ? (
                            <>
                                <span onClick={(e) => { e.stopPropagation(); navigate('/admin/history', { state: { filterToday: true } }); }} style={{cursor: 'pointer'}}>Today: {stats.orders?.today || 0}</span> | <span onClick={(e) => { e.stopPropagation(); navigate('/admin/history', { state: { filterWeek: true } }); }} style={{cursor: 'pointer'}}>Week: {stats.orders?.week || 0}</span>
                            </>
                        ) : (
                            <span style={{color: '#ffa500'}}>No orders yet - Add some test orders!</span>
                        )}
                    
                    </div>
                    </div>
                </div>

                <div className="stat-dashboard-card" onClick={() => navigate('/admin/history', { state: { filterStatus: 'completed' } })} style={{cursor: 'pointer'}} title="Click to view completed orders">
                    <div className="stat-icon">
                        <FiCheckCircle />
                    </div>
                    <div className="stat-content">
                    <div className="stat-badge">
                    
                    <h3 className="stat-title">Completed Orders:</h3>
                    <div className="stat-value">{stats.orders.completed}</div>
                    </div>
                    <div className="stat-desc">
                        <span onClick={(e) => { e.stopPropagation(); navigate('/admin/history', { state: { filterStatus: 'pending' } }); }} style={{cursor: 'pointer'}}>Pending: {stats.orders.pending}</span> | <span onClick={(e) => { e.stopPropagation(); navigate('/admin/history', { state: { filterStatus: 'cancelled' } }); }} style={{cursor: 'pointer'}}>Cancelled: {stats.orders.cancelled}</span>
                    </div>
                    </div>
                    
                </div>

                <div className="stat-dashboard-card" style={{cursor: 'pointer'}} title="Click to view products">
                    <div className="stat-icon">
                        <FiPackage />
                    </div>
                    <div className="stat-content">
                    <div className="stat-badge">
                    
                    <h3 className="stat-title">Total Products:</h3>
                    <div className="stat-value" onClick={() => navigate('/admin/stock')}>{stats.inventory?.totalProducts || 0}</div>
                    </div>
                    <div className="stat-desc">
                        <span onClick={(e) => { e.stopPropagation(); fetchLowStockAnalytics(); }} style={{cursor: 'pointer', fontWeight: 'bold', color: stats.inventory?.lowStock > 0 ? '#ff6b6b' : 'inherit'}}>Low Stock: {stats.inventory?.lowStock || 0}</span> | <span onClick={(e) => { e.stopPropagation(); navigate('/admin/history', { state: { filterStatus: 'completed' } }); }} style={{cursor: 'pointer'}}>Value: ₱{(stats.inventory?.totalValue || 0).toLocaleString()}</span>
                    </div>
                    </div>
                    
                </div>

                <div className="stat-dashboard-card" onClick={() => navigate('/admin/accounts')} style={{cursor: 'pointer'}} title="Click to view accounts">
                    <div className="stat-icon">
                        <FiUsers />
                    </div>
                    <div className="stat-content">
                    <div className="stat-badge">
                    <h3 className="stat-title">Active Users:</h3>
                    <div className="stat-value">{stats.users?.active || 0}</div>
                   </div> 
                   <div className="stat-desc">
                        Total: {stats.users?.total || 0} | Revenue: ₱{(stats.revenue?.total || 0).toLocaleString()}
                    </div>
                    </div>
                    
                </div>
            </div>
            {/* Sales Chart */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Sales Overview</h2>
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={salesData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => ['₱' + value.toLocaleString(), 'Sales']} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="sales"
                                stroke="#006f51"
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Recent Orders */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Recent Orders</h2>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length > 0 ? (
                                recentOrders.map((order) => (
                                    <tr key={order._id || order.id}>
                                        <td>{order.orderNumber || order.id}</td>
                                        <td>{order.customerName || order.customer}</td>
                                        <td>{formatCurrency(order.totalAmount || order.amount || 0)}</td>
                                        <td>
                                        </td>
                                        <td>{new Date(order.createdAt || order.date).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center">No recent orders</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Phase 1: Transaction History */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        <FiActivity className="card-icon" /> 
                        Transaction History
                    </h2>
                    <span className="card-subtitle">
                        {transactionsPagination.totalItems} total transactions
                    </span>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Type</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? (
                                transactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td>#{transaction.order_number || transaction.id}</td>
                                        <td>
                                            <span className="transaction-type">
                                                {transaction.transaction_type || 'Order'}
                                            </span>
                                        </td>
                                        <td>{transaction.customer_name || 'N/A'}</td>
                                        <td>{formatCurrency(transaction.total_amount || 0)}</td>
                                        <td>
                                            <span className={getStatusBadgeClass(transaction.status || 'pending')}>
                                                {(transaction.status || 'pending').charAt(0).toUpperCase() + (transaction.status || 'pending').slice(1)}
                                            </span>
                                        </td>
                                        <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">No transactions found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {transactionsPagination.totalPages > 1 && (
                    <div className="card-footer">
                        <div className="pagination">
                            {/* Previous button - only show when page is 2 or higher */}
                            {transactionsPagination.currentPage > 1 && (
                                <button
                                    className="btn btn-secondary btn-sm page-btn"
                                    disabled={transactionsPagination.currentPage === 1}
                                    onClick={() => fetchTransactionHistory(transactionsPagination.currentPage - 1)}
                                >
                                    Previous
                                </button>
                            )}
                            
                            {/* Page numbers */}
                            {Array.from({ length: Math.min(transactionsPagination.totalPages, 5) }, (_, i) => {
                                let pageNum;
                                if (transactionsPagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (transactionsPagination.currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (transactionsPagination.currentPage >= transactionsPagination.totalPages - 2) {
                                    pageNum = transactionsPagination.totalPages - 4 + i;
                                } else {
                                    pageNum = transactionsPagination.currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => fetchTransactionHistory(pageNum)}
                                        className={`btn btn-sm page-btn ${transactionsPagination.currentPage === pageNum ? 'active' : ''}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            
                            {/* Next button - only show when current page is not the last page */}
                            {transactionsPagination.currentPage < transactionsPagination.totalPages && (
                                <button
                                    className="btn btn-secondary btn-sm page-btn"
                                    disabled={transactionsPagination.currentPage === transactionsPagination.totalPages}
                                    onClick={() => fetchTransactionHistory(transactionsPagination.currentPage + 1)}
                                >
                                    Next
                                </button>
                            )}
                            
                            <span className="pagination-info">
                                Page {transactionsPagination.currentPage} of {transactionsPagination.totalPages}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* =====================================================
                🤖 LOW STOCK ANALYTICS MODAL WITH AI RECOMMENDATIONS
                ===================================================== */}
            {showLowStockAnalytics && (
                <div className="modal-overlay" onClick={() => setShowLowStockAnalytics(false)}>
                    <div className="modal-content" style={{maxWidth: '900px', maxHeight: '80vh', overflow: 'auto'}} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📊 Low Stock Analytics & AI Recommendations</h2>
                            <button className="close-btn" onClick={() => setShowLowStockAnalytics(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {aiAnalyzing ? (
                                <div style={{textAlign: 'center', padding: '40px'}}>
                                    <div className="spinner"></div>
                                    <p>🤖 AI is analyzing your inventory and sales data...</p>
                                </div>
                            ) : lowStockData ? (
                                <div>
                                    <div style={{marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px'}}>
                                        <p style={{margin: 0}}>
                                            <strong>📅 Analysis Date:</strong> {new Date(lowStockData.timestamp).toLocaleString()}<br/>
                                            <strong>📦 Low Stock Items:</strong> {lowStockData.items.length}<br/>
                                            <strong>🤖 AI Model:</strong> Ollama Deepseek R1
                                        </p>
                                    </div>

                                    {lowStockData.items.length === 0 ? (
                                        <p style={{textAlign: 'center', padding: '40px', color: '#28a745'}}>
                                            ✅ All products are adequately stocked!
                                        </p>
                                    ) : (
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Current Stock</th>
                                                    <th>Sales (30d)</th>
                                                    <th>🤖 AI Recommendation</th>
                                                    <th>Suggested Sale %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lowStockData.items.map(item => {
                                                    const rec = lowStockData.recommendations[item.id] || {};
                                                    return (
                                                        <tr key={item.id}>
                                                            <td>
                                                                <strong>{item.name}</strong><br/>
                                                                <small>{item.category} - {item.brand}</small>
                                                            </td>
                                                            <td style={{color: item.stock < 5 ? '#dc3545' : '#ffc107'}}>
                                                                <strong>{item.stock}</strong> units
                                                            </td>
                                                            <td>{rec.sales30d || 0} sold</td>
                                                            <td>
                                                                {rec.recommendation || '🤖 Analyzing...'}
                                                            </td>
                                                            <td>
                                                                {rec.suggestedSalePercent !== undefined && rec.suggestedSalePercent !== null ? (
                                                                    <span style={{color: rec.suggestedSalePercent > 0 ? '#28a745' : '#6c757d', fontWeight: 'bold'}}>
                                                                        {rec.suggestedSalePercent > 0 ? `${rec.suggestedSalePercent}% OFF` : 'Restock Priority'}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{color: '#6c757d'}}>N/A</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}

                                    <div style={{marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px', borderLeft: '4px solid #007bff'}}>
                                        <strong>💡 AI Insights:</strong>
                                        <ul style={{marginTop: '10px', marginBottom: 0}}>
                                            <li>Items with low stock and high sales velocity should be restocked immediately</li>
                                            <li>Items with low stock and low sales velocity are recommended for promotional sales</li>
                                            <li>Suggested sale percentages are calculated based on market trends and competitor pricing</li>
                                            <li>AI continuously learns from your sales patterns to improve recommendations</li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <p style={{textAlign: 'center', padding: '40px'}}>
                                    No data available. Please try again.
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowLowStockAnalytics(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;