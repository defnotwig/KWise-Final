import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiWifi, FiWifiOff } from 'react-icons/fi';
import { queueAPI, sseAPI, handleAPIError } from '../../services/api';
import './OrderQueueDisplay.css';

const OrderQueueDisplay = () => {
    const [queueData, setQueueData] = useState([]);
    const [currentQueue, setCurrentQueue] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Fetch queue data from new queue management API
    const fetchQueueData = useCallback(async () => {
        try {
            setError('');
            const response = await queueAPI.getActive();
            
            if (response.data && response.data.success) {
                const activeQueue = response.data.data || [];
                
                // Filter for display (active queues with orders) - ONLY PENDING for the queue list
                const displayQueues = activeQueue.filter(item => 
                    item.queue_number && 
                    ['pending', 'processing', 'ready'].includes(item.queue_status)
                );

                // Separate serving queue (processing or ready) from pending queues
                const servingQueues = displayQueues.filter(item => 
                    item.queue_status === 'processing' || item.queue_status === 'ready'
                );
                
                // Only show PENDING queues in the queue list (ascending order)
                const pendingQueues = displayQueues.filter(item => 
                    item.queue_status === 'pending'
                );

                // Sort pending queues by queue number (ascending)
                pendingQueues.sort((a, b) => a.queue_number - b.queue_number);

                setQueueData(pendingQueues); // Only pending queues shown in list

                // Find current serving (processing or ready)
                const serving = servingQueues[0] || null;

                setCurrentQueue(serving);
                setLastUpdated(new Date());
                setIsConnected(true);
            }
        } catch (error) {
            const errorInfo = handleAPIError(error);
            setError(errorInfo.message || 'Failed to fetch queue data');
            setIsConnected(false);
            console.error('Error fetching queue data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Set up real-time updates
    useEffect(() => {
        fetchQueueData();

        // Connect to real-time queue updates
        const eventSource = sseAPI.connectToQueueUpdates(
            (data) => {
                console.log('Queue update received:', data);
                // Refresh queue data when updates come in
                fetchQueueData();
            },
            (error) => {
                console.error('Queue SSE error:', error);
                setIsConnected(false);
            },
            () => {
                console.log('Queue SSE connected');
                setIsConnected(true);
            }
        );

        // Fallback polling every 30 seconds if SSE fails
        const pollInterval = setInterval(() => {
            fetchQueueData();
        }, 30000);

        // Update current time every second
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            clearInterval(pollInterval);
            clearInterval(timeInterval);
        };
    }, [fetchQueueData]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ready':
                return <FiCheckCircle className="status-icon ready" />;
            case 'processing':
                return <FiClock className="status-icon preparing" />;
            case 'pending':
                return <FiAlertCircle className="status-icon waiting" />;
            default:
                return <FiClock className="status-icon" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ready':
                return 'ready';
            case 'processing':
                return 'preparing';
            case 'pending':
                return 'waiting';
            default:
                return '';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'ready':
                return 'Ready for Pickup';
            case 'processing':
                return 'Preparing';
            case 'pending':
                return 'In Queue';
            default:
                return status?.toUpperCase() || 'WAITING';
        }
    };

    // const getEstimatedTime = (queueItem, position) => {
    //     if (queueItem.queue_status === 'ready') {
    //         return 'Ready';
    //     }
    //     if (queueItem.queue_status === 'processing') {
    //         return '5-10 min';
    //     }
    //     // For pending queues, estimate based on position
    //     const baseTime = 10; // Base time for first order
    //     const timePerOrder = 5; // Additional time per order ahead
    //     const estimatedMinutes = baseTime + (position * timePerOrder);
    //     return `~${estimatedMinutes} min`;
    // };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    if (isLoading) {
        return (
            <div className="queue-display-container">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <h2>Loading Queue Display...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="queue-display-container">
            <div className="queue-header">
                <div className="store-info">
                    <h1>K-WISE</h1>
                    <p>Real-Time Queue Display</p>
                </div>
                <div className="header-status">
                    <div className="connection-status">
                        {isConnected ? (
                            <FiWifi className="connection-icon connected" />
                        ) : (
                            <FiWifiOff className="connection-icon disconnected" />
                        )}
                        <span className={`connection-text ${isConnected ? 'connected' : 'disconnected'}`}>
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                    <div className="current-time">
                        {currentTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        })}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <FiRefreshCw className="error-icon" />
                    <span>Connection issues detected. Retrying...</span>
                </div>
            )}

            <div className="current-order-section">
                <h2>Now Serving</h2>
                {currentQueue ? (
                    <div className={`current-order ${getStatusColor(currentQueue.queue_status)}`}>
                        <div className="order-number-large">
                            Queue #{currentQueue.queue_number}
                        </div>
                        <div className="order-id">
                            {currentQueue.order_id_formatted || `Order #${currentQueue.order_id}`}
                        </div>
                        <div className="order-status">
                            {getStatusIcon(currentQueue.queue_status)}
                            <span>{getStatusText(currentQueue.queue_status)}</span>
                        </div>
                        <div className="order-time">
                            {formatTime(currentQueue.created_at)}
                        </div>
                        <div className="customer-name">
                            {currentQueue.customer_name || 'Customer'}
                        </div>
                    </div>
                ) : (
                    <div className="no-current-order">
                        <div className="empty-message">
                            <h3>No Active Queue</h3>
                            <p>Queue is currently empty</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="queue-list-section">
                <h3>Active Queues</h3>
                <div className="queue-list">
                    {queueData.length > 0 ? (
                        queueData.map((item, index) => (
                            <div key={item.queue_number} className={`queue-item ${getStatusColor(item.queue_status)}`}>
                                <div className="queue-position">
                                    #{item.queue_number}
                                </div>
                                <div className="order-details">
                                    <div className="queue-number">
                                        Queue #{item.queue_number}
                                    </div>
                                    <div className="customer-name">
                                        {item.customer_name || 'Customer'}
                                    </div>
                                    <div className="order-id-small">
                                        {item.order_id_formatted || `Order #${item.order_id}`}
                                    </div>
                                    <div className="order-status-small">
                                        {getStatusIcon(item.queue_status)}
                                        <span>{item.queue_status?.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-queue">
                            <p>No pending orders in queue</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="queue-footer">
                <div className="status-legend">
                    <div className="legend-item">
                        <FiCheckCircle className="legend-icon ready" />
                        <span>Ready for Pickup</span>
                    </div>
                    <div className="legend-item">
                        <FiClock className="legend-icon preparing" />
                        <span>Preparing</span>
                    </div>
                    <div className="legend-item">
                        <FiAlertCircle className="legend-icon waiting" />
                        <span>In Queue</span>
                    </div>
                </div>
                <div className="footer-info">
                    <div className="footer-message">
                        <p>Thank you for choosing K-WISE!</p>
                        <p>Please wait for your queue number to be called</p>
                    </div>
                    {lastUpdated && (
                        <div className="last-update">
                            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderQueueDisplay;
