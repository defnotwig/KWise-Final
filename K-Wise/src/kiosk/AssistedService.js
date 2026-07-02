import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getServerBaseUrl } from "../utils/networkConfig";
import "./AssistedService.css";
import Group6 from '../assets/Group 6.webp'; // Assisted Service Icon

function AssistedService() {
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const [assistanceRequestId, setAssistanceRequestId] = useState(null); // NOSONAR - setter used in async callback
  const [staffOnWay, setStaffOnWay] = useState(false);
  const [staffName, setStaffName] = useState('');
  const requestSentRef = React.useRef(false); // Prevent double submissions

  // Send assistance request ONCE when component mounts
  useEffect(() => {
    let statusCheckInterval = null;
    let isMounted = true; // Track if component is still mounted

    const requestAssistance = async () => {
      // ✅ Guard against double submission (React.StrictMode)
      if (requestSentRef.current) {
        console.log('⏭️ Request already sent, skipping duplicate');
        return;
      }
      requestSentRef.current = true;
      try {
        const response = await fetch(`${getServerBaseUrl()}/api/assistance/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            kiosk_id: 'KIOSK-001',
            request_type: 'assisted_service'
          })
        });

        if (response.ok) {
          const data = await response.json();
          const requestId = data.data.id;
          
          if (!isMounted) return; // Don't update state if unmounted
          
          setAssistanceRequestId(requestId);
          console.log('✅ Assistance request sent:', requestId);

          // Start polling for status AFTER getting the request ID
          statusCheckInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch(`${getServerBaseUrl()}/api/assistance/${requestId}/status`);
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.data.status === 'acknowledged') {
                  if (isMounted) { // Only update if still mounted
                    setStaffOnWay(true);
                    setStaffName(statusData.data.admin_name || 'Staff');
                  }
                  if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                    statusCheckInterval = null;
                  }
                }
              }
            } catch (error) {
              console.error('Error checking assistance status:', error);
            }
          }, 2000); // Check every 2 seconds
        } else {
          console.error('❌ Failed to send assistance request');
        }
      } catch (error) {
        console.error('❌ Error sending assistance request:', error);
      }
    };

    requestAssistance();

    // Cleanup: Stop polling when component unmounts
    return () => {
      console.log('🧹 AssistedService unmounting - cleaning up polling interval');
      isMounted = false; // Prevent state updates
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
      }
    };
  }, []); // Empty dependency array = runs ONCE on mount

  // Assisted Service screen stays in "waiting" state until a staff member assists.

  return (
    <div className="assisted-service-container">
      
      {/* 🔼 Transparent clickable box */}
      <button
        type="button"
        className="top-navigation-box"
        onClick={() => navigate("/transaction")}
        aria-label="Go to transaction page"
      />
  
      <div className="content">
        <img src={Group6} alt="Assisted Service" className="logo" />
        <h2>ASSISTED SERVICE</h2>
      </div>
      <div className="loading">
        {staffOnWay ? (
          <>
            <div className="staff-confirmed">✓</div>
            <p className="staff-message">{staffName} is on the way to assist you!</p>
          </>
        ) : (
          <>
            <div className="loader"></div>
            <p>wait for assistance...</p>
          </>
        )}
      </div>
    </div>
  );
  
}

export default AssistedService;
