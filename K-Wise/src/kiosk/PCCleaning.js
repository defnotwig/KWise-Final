import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/api';
import aiService from '../api/aiService';
import PCClean from '../assets/PCCleaning.webp';
import BasicClean from '../assets/BasicClean.webp';
import ProClean from '../assets/ProClean.webp';
import PremiumClean from '../assets/PremiumClean.webp';
import Chest from '../assets/Chest.webp';
import './PCCleaning.css';
import './PCUpgrade.css';

// Map tier names to local icons
const tierIcons = {
  'BASIC TIER CLEAN': BasicClean,
  'PRO TIER CLEAN': ProClean,
  'PREMIUM TIER CLEAN': PremiumClean
};

const PCCleaning = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTier, setSelectedTier] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Real-time state for services data
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // AI Recommendation state
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  // Load cleaning services from API on component mount
  useEffect(() => {
    let isMounted = true;

    const loadCleaningServices = async () => {
      try {
        console.log('🧹 PCCleaning: Loading cleaning services from API...');
        setLoading(true);
        setError(null);
        
        const cleaningServices = await api.kiosk.getCleaningServices();
        
        if (isMounted) {
          // Transform API data to match component structure and add local icons
          const transformedTiers = cleaningServices.map(service => ({
            ...service,
            icon: tierIcons[service.name] || BasicClean,
            details: service.details || {
              inclusion: [],
              completion: "Service completion time not specified"
            }
          }));
          
          setTiers(transformedTiers);
          setLoading(false);
          console.log('✅ PCCleaning: Loaded', transformedTiers.length, 'cleaning service tiers');
        }
      } catch (err) {
        console.error('❌ PCCleaning: Error loading cleaning services:', err);
        if (isMounted) {
          setError('Failed to load cleaning services. Please try again.');
          setLoading(false);
        }
      }
    };

    loadCleaningServices();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load AI recommendation if coming from assessment
  useEffect(() => {
    let isMounted = true;

    const loadAIRecommendation = async () => {
      try {
        // Check if we came from assessment
        const assessmentData = location.state?.assessmentAnswers || 
                              JSON.parse(localStorage.getItem('cleaningAssessment') || 'null');
        
        if (!assessmentData) {
          console.log('ℹ️ No assessment data found - skipping AI recommendation');
          return;
        }

        console.log('🤖 Loading AI cleaning tier recommendation...', assessmentData);
        setLoadingRecommendation(true);

        const response = await aiService.getCleaningTierRecommendation(assessmentData);
        
        if (isMounted && response.success) {
          const recommendation = response.data;
          setAiRecommendation(recommendation);
          console.log('✅ AI Recommendation received:', recommendation);

          // Auto-select the recommended tier
          const recommendedIndex = tiers.findIndex(tier => 
            tier.tier?.toLowerCase() === recommendation.recommendedTier?.toLowerCase() ||
            tier.name?.toLowerCase().includes(recommendation.recommendedTier?.toLowerCase())
          );
          
          if (recommendedIndex !== -1) {
            setSelectedTier(recommendedIndex);
            console.log(`✅ Auto-selected tier: ${tiers[recommendedIndex].name}`);
          }
        }
      } catch (err) {
        console.error('❌ Failed to load AI recommendation:', err);
        // Don't show error to user - just proceed without recommendation
      } finally {
        if (isMounted) {
          setLoadingRecommendation(false);
        }
      }
    };

    // Only load recommendation after tiers are loaded
    if (tiers.length > 0) {
      loadAIRecommendation();
    }
  }, [tiers, location.state]);

  const handleBackClick = () => {
    if (location.state?.from === 'ordersum-clean') {
      setShowExitModal(true);
      return;
    }
    // KEEP assessment data when navigating - user might want to come back
    // Only clear when explicitly going back to assessment page
    // localStorage.removeItem('cleaningAssessment'); // REMOVED
    navigate("/pc-cleaning-assessment");
  };

  const handleAddClick = () => {
    if (selectedTier !== null && tiers[selectedTier]) {
      // DON'T add to cleaningOrders yet - wait for PC re-case page
      // Store the pending tier selection temporarily
      const pendingOrder = {
        tier: tiers[selectedTier],
        quantity: 1,
        createdAt: new Date().toISOString(),
      };
      
      // Store pending order temporarily (will be finalized in PCReCase)
      localStorage.setItem('pendingCleaningOrder', JSON.stringify(pendingOrder));
      
      // Navigate to PC Re-Case page
      navigate("/pc-recase");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className='cleaning-container'>
        <div className='cleaning-header'>
          <img src={PCClean} alt="PC Cleaning" className='cleaning-image' />
          <div className='cleaning-title'>
            <h1 className='cleaning-name'>PC CLEANING</h1>
            <p className='cleaning-subtitle'>Optimize your PC's Efficiency. Enhance your Computer's Lifespan.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <p>Loading cleaning services...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='cleaning-container'>
        <div className='cleaning-header'>
          <img src={PCClean} alt="PC Cleaning" className='cleaning-image' />
          <div className='cleaning-title'>
            <h1 className='cleaning-name'>PC CLEANING</h1>
            <p className='cleaning-subtitle'>Optimize your PC's Efficiency. Enhance your Computer's Lifespan.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#f44336' }}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              backgroundColor: '#2196F3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='cleaning-container'>
      <div className='cleaning-header'>
        <img src={PCClean} alt="PC Cleaning" className='cleaning-image' />
        <div className='cleaning-title'>
          <h1 className='cleaning-name'>PC CLEANING</h1>
          <p className='cleaning-subtitle'>Optimize your PC's Efficiency. Enhance your Computer's Lifespan.</p>
        </div>
      </div>

      <p className="cleaning-select-text">Select Tier</p>

      <div className="cleaning-tiers">
        {tiers.map((tier, idx) => {
          const isAiRecommended = aiRecommendation && 
            (tier.tier?.toLowerCase() === aiRecommendation.recommendedTier?.toLowerCase() ||
             tier.name?.toLowerCase().includes(aiRecommendation.recommendedTier?.toLowerCase()));

          return (
            <React.Fragment key={tier.id || tier.name}>
              <div
                className={`cleaning-tier-card${selectedTier === idx ? " active" : ""}${isAiRecommended ? " ai-recommended" : ""}`}
                onClick={() => setSelectedTier(idx)}
                style={{ opacity: selectedTier === idx ? 1 : 0.5 }}
              >
                {isAiRecommended && (
                  <div className="ai-recommended-badge">🤖 AI PICK</div>
                )}
                <img src={tier.icon} alt="tier icon" className="cleaning-tier-star" />
                <div className="cleaning-tier-details">
                  <h2 className="cleaning-tier-name">{tier.name}</h2>
                  <p className="cleaning-tier-price">{tier.price}</p>
                </div>
                {selectedTier === idx && (
                  <img
                    src={Chest}
                    alt="Chest"
                    className="cleaning-tier-chest"
                  />
                )}
              </div>
              {selectedTier === idx && tier.details && (
                <div className="cleaning-tier-extra-details">
                  <div className="cleaning-tier-inclusion">
                    <span className="cleaning-tier-inclusion-label">Inclusion:</span>
                    <ul>
                      {tier.details.inclusion && tier.details.inclusion.map((inc, i) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="cleaning-tier-completion">
                    {tier.details.completion}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* AI Recommendation Banner - Moved below tiers */}
      {aiRecommendation && !loadingRecommendation && (
        <div className="ai-recommendation-banner">
          <h3 className="ai-recommendation-title">
            {aiRecommendation.recommendedTier.toUpperCase()} TIER is best for you!
          </h3>
          <div className="ai-recommendation-reasons">
            {aiRecommendation.reasoning.map((reason, idx) => (
              <div key={idx} className="ai-reason">
                <span className="ai-reason-icon">✓</span> {reason}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="cleaning-display-actions">
        <button className="cleaning-back-button" onClick={handleBackClick}>
          Back
        </button>
        <button
          className="cleaning-add-button"
          onClick={handleAddClick}
          disabled={selectedTier === null}
          style={{ opacity: selectedTier === null ? 0.5 : 1 }}
        >
          Add
        </button>
      </div>

      {showExitModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <h2 className="pc-customized-modal-title">
              Going back may discard your changes.<br /><span>Continue?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => setShowExitModal(false)}
              >
                NO
              </button>
              <button
                className="pc-customized-modal-btn yes"
                onClick={() => {
                  try {
                    localStorage.removeItem('cleaningOrders');
                    localStorage.removeItem('cleaningOrder');
                  } catch (cleanupErr) {
                    console.error('❌ PCCleaning: Error cleaning localStorage:', cleanupErr);
                  }
                  setShowExitModal(false);
                  navigate('/pc-services');
                }}
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PCCleaning;