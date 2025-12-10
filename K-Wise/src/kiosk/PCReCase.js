import React from 'react';
import { useNavigate } from 'react-router-dom';
import PCClean from '../assets/PCCleaning.webp';
import './PCReCase.css';

const PCReCase = () => {
  const navigate = useNavigate();

  // eslint-disable-next-line no-unused-vars
  const handleBack = () => {
    // Clean up pending order when going back
    localStorage.removeItem('pendingCleaningOrder');
    // Navigate back to tier selection with state preserved
    navigate('/pc-cleaning', { state: { from: 'pc-recase', preserveSelection: true } });
  };

  const handleYes = () => {
    // Finalize order WITH PC re-case
    const pendingOrder = JSON.parse(localStorage.getItem('pendingCleaningOrder') || 'null');
    
    if (pendingOrder) {
      const current = JSON.parse(localStorage.getItem("cleaningOrders")) || [];
      const finalizedOrder = {
        id: Date.now(),
        tier: pendingOrder.tier,
        quantity: pendingOrder.quantity || 1,
        createdAt: pendingOrder.createdAt,
        reCaseRequested: true // YES - PC re-case requested
      };
      
      const next = [...current, finalizedOrder];
      localStorage.setItem("cleaningOrders", JSON.stringify(next));
      localStorage.removeItem('pendingCleaningOrder');
      
      console.log('✅ Order finalized WITH PC re-case:', finalizedOrder);
    }
    
    // Navigate to order summary
    navigate('/ordersum-clean', { state: { from: 'pc-cleaning', hasReCase: true } });
  };

  const handleNo = () => {
    // Finalize order WITHOUT PC re-case
    const pendingOrder = JSON.parse(localStorage.getItem('pendingCleaningOrder') || 'null');
    
    if (pendingOrder) {
      const current = JSON.parse(localStorage.getItem("cleaningOrders")) || [];
      const finalizedOrder = {
        id: Date.now(),
        tier: pendingOrder.tier,
        quantity: pendingOrder.quantity || 1,
        createdAt: pendingOrder.createdAt,
        reCaseRequested: false // NO - No PC re-case
      };
      
      const next = [...current, finalizedOrder];
      localStorage.setItem("cleaningOrders", JSON.stringify(next));
      localStorage.removeItem('pendingCleaningOrder');
      
      console.log('✅ Order finalized WITHOUT PC re-case:', finalizedOrder);
    }
    
    // Navigate to order summary
    navigate('/ordersum-clean', { state: { from: 'pc-cleaning', hasReCase: false } });
  };

  return (
    <div className="pc-recase-container">
      <div className="pc-recase-content">
        <img src={PCClean} alt="PC Cleaning Logo" className="pc-recase-logo-image" />
        
        <div className="pc-recase-header">
          <h1 className="pc-recase-main-title">PC CLEANING</h1>
          <p className="pc-recase-tagline">Dust of the Lag</p>
        </div>

        <div className="pc-recase-question-container">
          <h3 className="pc-recase-question">
            Do you want to Recase?
            <span className="pc-recase-question-sub">
              Replace your old chasis
            </span>
          </h3>
          
          <div className="pc-recase-options">
            <button
              className="pc-recase-option-btn"
              onClick={handleYes}
            >
              Yes
            </button>
            <button
              className="pc-recase-option-btn"
              onClick={handleNo}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PCReCase;
