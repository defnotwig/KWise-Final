import React, { useState, useEffect, useCallback } from 'react';
import { queueAPI } from '../../services/api';
import './QueueMonitorDisplay.css';
import Logo from '../../assets/QueueMonitorDisplay/logo.svg';
import QueueVector from '../../assets/QueueMonitorDisplay/queueVector.svg';

const QueueMonitorDisplay = () => {
    const [servingStation1, setServingStation1] = useState(null);
    const [servingStation2, setServingStation2] = useState(null);
    const [pendingQueues, setPendingQueues] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Fetch queue data
    const fetchQueueData = useCallback(async () => {
        try {
            // Fetch dual serving stations
            const servingResponse = await queueAPI.getNowServing();
            
            if (servingResponse.data?.success) {
                const { station1, station2 } = servingResponse.data.data;
                setServingStation1(station1);
                setServingStation2(station2);
                setLastUpdate(new Date());
            }

            // Fetch pending queues using unified view
            const response = await queueAPI.getUnifiedQueueView({
                status: 'assigned'
            });

            if (response.data?.success) {
                const queues = response.data.data || [];
                
                // Get all pending queues (assigned status, not currently being served)
                const pending = queues
                    .filter(q => 
                        q.status === 'assigned' && 
                        q.queue_number &&
                        !q.is_now_serving
                    )
                    .sort((a, b) => a.queue_number - b.queue_number)
                    .slice(0, 7); // Show up to 7 pending queues
                setPendingQueues(pending);
            }
        } catch (error) {
            console.error('❌ Error fetching queue data:', error);
            // Don't clear existing data on error, just log it
        }
    }, []);

    // Auto-refresh every 3 seconds for real-time updates
    useEffect(() => {
        console.log('🎯 QueueMonitorDisplay mounted - starting auto-refresh');
        fetchQueueData();
        const interval = setInterval(fetchQueueData, 3000);
        return () => {
            console.log('🎯 QueueMonitorDisplay unmounted - stopping auto-refresh');
            clearInterval(interval);
        };
    }, [fetchQueueData]);

    // Determine serving queue numbers (default to placeholder if none)
    const servingNumber1 = servingStation1?.queue_number || 0;
    const servingNumber2 = servingStation2?.queue_number || 0;

    // ✅ FIX BUG #2 & #4: Only show REAL assigned queues, no auto-generated placeholders
    const formattedPendingQueues = pendingQueues.map(q => ({
        number: `#${String(q.queue_number).padStart(2, '0')}`,
        customer: q.customer_name || 'Customer'
    }));
    
    // ❌ REMOVED: Auto-generation of placeholder queues that caused "#" display bug
    // Old code filled empty slots with fake queue numbers like "#01", "#02"
    // Now only showing actual assigned queues from database

    return (
        <div className="queue-monitor-display">
            {/* Background Vector */}

            {/* Header */}
            <div className="monitor-header">
                <div className="logo-section">
                    <img src={Logo} alt="K-Wise Logo" className="brand-logo"/>
                    <h1 className="brand-name">NOW SERVING</h1>
                    <p className="brand-tagline">Please wait for your queue number...</p>
                </div>
            </div>
            {/* Dual Serving Stations */}
            <div className='dual-serving-container'>
                <div className={`serving-station ${servingNumber1 > 0 ? 'active' : 'inactive'}`}>
                    <h1 className='serving-number'>
                        {servingNumber1 > 0 ? String(servingNumber1).padStart(2, '0') : '--'}
                    </h1>
                    {servingStation1 && (
                        <p className='customer-name-display-queue'>{servingStation1.customer_name || 'Customer'}</p>
                    )}
                </div>
                <div className={`serving-station ${servingNumber2 > 0 ? 'active' : 'inactive'}`}>
                    <h1 className='serving-number'>
                        {servingNumber2 > 0 ? String(servingNumber2).padStart(2, '0') : '--'}
                    </h1>
                    {servingStation2 && (
                        <p className='customer-name-display-queue'>{servingStation2.customer_name || 'Customer'}</p>
                    )}
                </div>
                <div className="queue-background">
                    <img src={QueueVector} alt="Queue Background" className="queue-vector" />
                </div>
            </div>

            {/* Pending Queue */}
                <div className='queue-list-container'>
                    <ul className='queue-container'>
                        <li className='on-queue-footer'><h3>On Queue:</h3></li>
                        {formattedPendingQueues.map((queue, index) => (
                            <li key={queue.number} className='queue-item'>
                                <span className='queue-number'>{queue.number}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Last Update Timestamp */}
                {lastUpdate && (
                    <div className='last-update'>
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                )}
        </div>
    );
};

export default QueueMonitorDisplay;
