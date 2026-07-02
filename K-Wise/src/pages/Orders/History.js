/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiDownload, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { ordersAPI, handleAPIError } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import './History.css';
import '../../styles/pagination.css';

const History = () => {
    console.log("History component rendering");
    const location = useLocation();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [assistedBy, setAssistedBy] = useState(''); // new filter
    const [assistants, setAssistants] = useState([]); // dropdown data
    const [isExporting, setIsExporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalTransactions, setTotalTransactions] = useState(0);
    
    // View/Export modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Apply filters from navigation state
    useEffect(() => {
        if (location.state) {
            const { filterStatus: navFilterStatus, filterToday, filterWeek } = location.state;
            
            if (navFilterStatus) {
                setFilterStatus(navFilterStatus);
            }
            
            if (filterToday) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                setDateRange({
                    start: today.toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                });
            }
            
            if (filterWeek) {
                const today = new Date();
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setDateRange({
                    start: weekAgo.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                });
            }
        }
    }, [location.state]);

    // Load data when component mounts or filters change
    useEffect(() => {
        console.log("History - Initializing data fetch");
        fetchTransactionHistory(currentPage);
    }, [currentPage, searchTerm, filterStatus, dateRange.start, dateRange.end, assistedBy]);

    // Load assistants list once (or when user changes) for dropdown
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const list = await ordersAPI.getAssistants();
            if (!cancelled) setAssistants(list);
        })();
        return () => { cancelled = true; };
    }, []);

    // Auto-refresh every 30 seconds (only if no active filters to avoid disrupting user)
    useEffect(() => {
    const shouldAutoRefresh = !searchTerm && filterStatus === 'all' && !dateRange.start && !dateRange.end && !assistedBy;
        
        if (shouldAutoRefresh) {
            const interval = setInterval(() => {
                fetchTransactionHistory(currentPage);
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [currentPage, searchTerm, filterStatus, dateRange.start, dateRange.end]);

    const fetchTransactionHistory = async (page = 1) => {
        try {
            setIsDataLoading(true);
            setError(null);

            const params = {
                page: page,
                limit: 20
            };
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
            if (dateRange.start) params.from = dateRange.start;
            if (dateRange.end) params.to = dateRange.end;
            if (assistedBy) params.assistedBy = assistedBy;

            const result = await ordersAPI.getTransactionHistory(params);
            if (result.success) {
                const container = result.data;
                const rawList = Array.isArray(container.transactions) ? container.transactions : [];
                
                console.log('Raw transaction data:', rawList.slice(0, 3)); // Debug log
                
                const safeTransactions = rawList.map(t => ({
                    id: t.id,
                    transaction_id: t.transaction_id || t.id,
                    transaction_id_formatted: t.transaction_id_formatted || `TID${String(t.transaction_id || t.id).padStart(4, '0')}`,
                    order_id: t.order_id || t.orderId || t.id,
                    order_id_formatted: t.order_id_formatted || `OID-${String(t.order_id || t.orderId || t.id).padStart(4, '0')}`,
                    orderId: t.order_id_formatted || t.order_number || t.orderId || t.id,
                    customer: t.customer_name || t.customer || t.user_name || 'Unknown',
                    amount: Number.parseFloat(t.total_amount || t.amount || 0),
                    status: t.status || t.payment_status || 'pending',
                    paymentMethod: t.payment_method || t.paymentMethod || 'N/A',
                    date: t.created_at || t.date || new Date().toISOString(), // Keep for backward compatibility
                    date_created: t.created_at || t.date || new Date().toISOString(),
                    date_completed: t.completed_at || null,
                    assisted_by: t.assisted_by || t.completed_by_user_id || null,
                    assisted_by_name: t.assisted_by_name || t.completed_by_name || t.user_name || null,
                    assisted_by_username: t.assisted_by_username || t.completed_by_username || null,
                    order_items: t.order_items || []
                }));
                
                console.log('Processed transactions:', safeTransactions.slice(0, 3)); // Debug log
                
                setTransactions(safeTransactions);
                setFilteredTransactions(safeTransactions);
                const pg = container.pagination || {};
                setCurrentPage(pg.currentPage || pg.page || 1);
                setTotalPages(pg.totalPages || pg.pages || 1);
                setTotalTransactions(pg.totalItems || pg.total || safeTransactions.length);
            } else {
                setTransactions([]);
                setFilteredTransactions([]);
                setCurrentPage(1);
                setTotalPages(1);
                setTotalTransactions(0);
            }
            setLastUpdated(new Date());
        } catch (error) {
            const info = handleAPIError(error);
            setError('Failed to load transaction history: ' + (info.message || error.message));
            setTransactions([]);
            setFilteredTransactions([]);
            setCurrentPage(1);
            setTotalPages(1);
            setTotalTransactions(0);
        } finally {
            setIsDataLoading(false);
        }
    };

    // Handle view transaction details
    const handleViewTransaction = (transaction) => {
        setSelectedTransaction(transaction);
        setShowViewModal(true);
    };

    // Handle export/print transaction
    const handleExportTransaction = (transaction) => {
        const printContent = `
            <html>
                <head>
                    <title>PC-Wise Transaction Receipt</title>
                    <style>
                        body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
                        .receipt { max-width: 400px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                        .content { margin: 15px 0; }
                        .footer { text-align: center; border-top: 1px solid #000; padding-top: 10px; margin-top: 15px; }
                        h1 { font-size: 20px; margin: 5px 0; }
                        h3 { font-size: 16px; margin: 5px 0; }
                        p { font-size: 12px; margin: 3px 0; }
                        .detail-row { display: flex; justify-content: space-between; margin: 5px 0; }
                        .label { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        <div class="header">
                            <h1>PC-WISE</h1>
                            <h3>Transaction Receipt</h3>
                            <p>Date: ${formatDate(transaction.date)}</p>
                        </div>
                        <div class="content">
                            <div class="detail-row">
                                <span class="label">Transaction ID:</span>
                                <span>${transaction.transaction_id_formatted || transaction.id}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Order ID:</span>
                                <span>${transaction.order_id_formatted || transaction.orderId}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Customer:</span>
                                <span>${transaction.customer}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Total Amount:</span>
                                <span>${formatCurrency(transaction.amount)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Payment Method:</span>
                                <span>${transaction.paymentMethod}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Status:</span>
                                <span>${transaction.status?.toUpperCase()}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Assisted By:</span>
                                <span>${transaction.assisted_by_name || transaction.assisted_by || '-'}</span>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Thank you for choosing PC-Wise!</p>
                            <p style="font-size: 10px; margin-top: 10px;">Keep this receipt for your records</p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=500,height=700');
        if (printWindow) {
            printWindow.document.write(printContent); // NOSONAR - required for print window content injection
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    // Handle pagination
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Handle export to CSV
    const handleExport = async () => {
        try {
            setIsExporting(true);
            console.log("Exporting transactions to CSV");

            const params = {};
            if (filterStatus !== 'all') params.status = filterStatus;
            if (dateRange.start) params.from = dateRange.start;
            if (dateRange.end) params.to = dateRange.end;
            if (assistedBy) params.assistedBy = assistedBy;

            const response = await ordersAPI.exportOrdersCSV(params);

            // Create and download CSV file
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = globalThis.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            globalThis.URL.revokeObjectURL(url);

            console.log("Export completed successfully");
        } catch (error) {
            console.error("Error exporting to CSV:", error);
            const errorInfo = handleAPIError(error);
            setError(errorInfo.message || 'An error occurred while exporting transactions');
        } finally {
            setIsExporting(false);
        }
    };

    // Function to get status badge class
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'completed':
                return 'status-pill status-completed';
            case 'processing':
                return 'status-pill status-processing';
            case 'pending':
                return 'status-pill status-pending';
            case 'cancelled':
                return 'status-pill status-cancelled';
            default:
                return 'status-pill';
        }
    };

    // Phase 3: Safe rendering - check for empty/null responses to prevent runtime errors
    if (!transactions || !Array.isArray(transactions)) {
        if (isDataLoading) {
            return <div className="loading">Loading transaction history...</div>;
        }
        if (error) {
            return (
                <div className="error-container">
                    <p>Error: {error}</p>
                    <button onClick={fetchTransactionHistory} className="retry-btn">
                        Retry
                    </button>
                </div>
            );
        }
        return <div className="no-data">No transactions found</div>;
    }

    // If loading data, show loading
    if (isDataLoading) {
        console.log("History - Data loading");
        return <div className="loading">Loading transaction history...</div>;
    }

    console.log("History - Rendering transaction list:", filteredTransactions.length);
    return (
        <div className="history-page">
            <div className="history-header">
                <div className="header-left">
                    <h1>Transaction History</h1>
                    <p>View and manage all completed transactions</p>
                </div>
                <div className="header-right">
                    {lastUpdated && (
                        <span className="last-updated">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        className="refresh-btn"
                        onClick={() => fetchTransactionHistory(currentPage)}
                        disabled={isDataLoading}
                    >
                        <FiRefreshCw className={isDataLoading ? 'spinning' : ''} />
                    </button>
                    <button
                        className={`btn btn-primary ${isExporting ? 'btn-loading' : ''}`}
                        onClick={handleExport}
                        disabled={isExporting || filteredTransactions.length === 0}
                    >
                        <FiDownload /> {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="card">
                <div className="filters">
                    <div className="search-box">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by customer or order/transaction ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-options">
                        <div className="filter-group">
                            <label htmlFor="filter-status">Filter by Status:</label>
                            <select
                                id="filter-status"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="filter-assisted-by">Assisted By:</label>
                            <select
                                id="filter-assisted-by"
                                value={assistedBy}
                                onChange={(e) => setAssistedBy(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All</option>
                                {assistants.map(a => (
                                    <option key={a.id} value={a.id}>{a.name} (ID {a.id})</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="filter-start-date">Start Date:</label>
                            <input
                                id="filter-start-date"
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="date-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="filter-end-date">End Date:</label>
                            <input
                                id="filter-end-date"
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="date-input"
                            />
                        </div>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment Method</th>
                                <th>Assisted By</th>
                                <th>Date Created</th>
                                <th>Date Completed</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(filteredTransactions) && filteredTransactions.length > 0 ? (
                                filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td>{transaction.transaction_id_formatted || transaction.id}</td>
                                        <td>{transaction.order_id_formatted || transaction.orderId}</td>
                                        <td>{transaction.customer}</td>
                                        <td>{formatCurrency(transaction.amount)}</td>
                                        <td>
                                            <span className={getStatusBadgeClass(transaction.status)}>
                                                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>{transaction.paymentMethod}</td>
                                        <td>{transaction.assisted_by_name || transaction.assisted_by_username || transaction.assisted_by || '-'}</td>
                                        <td>{formatDate(transaction.date_created)}</td>
                                        <td>{transaction.date_completed ? formatDate(transaction.date_completed) : '-'}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-sm btn-view"
                                                    onClick={() => handleViewTransaction(transaction)}
                                                    title="View Details"
                                                >
                                                    👁️ View
                                                </button>
                                                <button
                                                    className="btn-sm btn-export"
                                                    onClick={() => handleExportTransaction(transaction)}
                                                    title="Export/Print"
                                                >
                                                    📄 Export
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="10" className="no-results">
                                        No transactions found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    {/* Combined pagination and stats section */}
                    <div className="table-footer">
                        <div className="transaction-stats">
                            <div className="stat-group">
                                <span className="stat-item">
                                    <strong>Total Transactions:</strong> {totalTransactions}
                                </span>
                                <span className="stat-item">
                                    <strong>Current Page:</strong> {currentPage} of {totalPages}
                                </span>
                                <span className="stat-item">
                                    <strong>Showing:</strong> {filteredTransactions.length} transactions
                                </span>
                            </div>
                        </div>
                        
                        {totalPages > 1 && (
                            <div className="pagination">
                                {/* Previous button - only show when page is 2 or higher */}
                                {currentPage > 1 && (
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="page-btn page-prev"
                                    >
                                        Previous
                                    </button>
                                )}

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                    <button
                                        key={number}
                                        onClick={() => handlePageChange(number)}
                                        className={`page-btn ${currentPage === number ? 'active' : ''}`}
                                    >
                                        {number}
                                    </button>
                                ))}

                                {/* Next button - only show when current page is not the last page */}
                                {currentPage < totalPages && (
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="page-btn page-next"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction View Modal */}
            {showViewModal && selectedTransaction && (
                <div className="modal-overlay">
                    <div className="modal-container large">
                        <div className="modal-header">
                            <h2>Transaction Details</h2>
                            <button className="close-btn" onClick={() => setShowViewModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="transaction-details">
                                <div className="detail-section">
                                    <h3>Transaction Information</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Transaction ID:</span>
                                            <span className="detail-value">{selectedTransaction.transaction_id_formatted || selectedTransaction.id}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Order ID:</span>
                                            <span className="detail-value">{selectedTransaction.order_id_formatted || selectedTransaction.orderId}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Customer Name:</span>
                                            <span className="detail-value">{selectedTransaction.customer}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Status:</span>
                                            <span className={`status-badge ${selectedTransaction.status}`}>
                                                {selectedTransaction.status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h3>Payment Information</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Total Amount:</span>
                                            <span className="detail-value amount">{formatCurrency(selectedTransaction.amount)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Payment Method:</span>
                                            <span className="detail-value">{selectedTransaction.paymentMethod}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Order Items in Payment Information */}
                                    {selectedTransaction.order_items && selectedTransaction.order_items.length > 0 && (
                                        <div className="order-items-section">
                                            <h4>Order Items</h4>
                                            <div className="items-list">
                                                {selectedTransaction.order_items.map((item, index) => (
                                                    <div key={`${item.item_name || item.name}-${index}`} className="item-row">
                                                        <div className="item-info">
                                                            <span className="item-name">{item.item_name || item.name}</span>
                                                            <span className="item-component">({item.component_name || item.category})</span>
                                                        </div>
                                                        <div className="item-pricing">
                                                            <span className="item-price">{formatCurrency(item.price)}</span>
                                                            <span className="item-qty">× {item.quantity}</span>
                                                            <span className="item-total">= {formatCurrency(item.amount || (item.price * item.quantity))}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="items-total">
                                                    <strong>Order Total: {formatCurrency(selectedTransaction.amount)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <h3>Service Information</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Assisted By:</span>
                                            <span className="detail-value">
                                                {selectedTransaction.assisted_by_name || selectedTransaction.assisted_by || 'System'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Date & Time:</span>
                                            <span className="detail-value">{formatDate(selectedTransaction.date)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setShowViewModal(false)}
                            >
                                Close
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={() => handleExportTransaction(selectedTransaction)}
                            >
                                <FiDownload /> Print/Export
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;