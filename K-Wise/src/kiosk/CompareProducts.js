/**
 * Product Comparison Component
 * TASK 5: 2-Product Vertical Split Screen Comparison with AI Analysis
 * For PC-Parts.js kiosk page only
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrophy, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import aiService from '../api/aiService';
import api from '../api/api';
import './CompareProducts.css';

import comparison from "../assets/PCParts/comparison.svg";
import pricediff from "../assets/CompareProducts/pricediff.svg";
import tiercomparison from "../assets/CompareProducts/tiercomparison.svg";
import recommend from "../assets/CompareProducts/recommend.svg";

const CompareProducts = ({ products, onClose, onAddToCart }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ensure we have exactly 2 products
  const [product1, product2] = products || [];

  /**
   * Get AI-powered comparison analysis
   */
  const analyzeComparison = React.useCallback(async () => {
    setLoading(true);

    try {
      console.log('🤖 Requesting AI comparison analysis...');

      // Call AI comparison API
      const response = await aiService.compareProducts({
        product1Id: product1.id,
        product2Id: product2.id,
        sessionId: sessionStorage.getItem('sessionId') || null
      });

      if (response.success && response.data) {
        // Extract the comparison data
        const comparisonData = response.data;

        // Format for component state
        setAiAnalysis({
          summary: comparisonData.aiSummary || 'Comparison complete',
          winner: comparisonData.winner === comparisonData.product1.id ? 'product1' : 'product2',
          valueAnalysis: comparisonData.comparisonDetails?.valueAnalysis || '',
          recommendation: `Based on specifications and value, ${comparisonData.winner === comparisonData.product1.id ? product1.name : product2.name
            } is recommended.`,
          priceComparison: comparisonData.comparisonDetails?.priceComparison,
          tierComparison: comparisonData.comparisonDetails?.tierComparison
        });

        console.log('✅ AI comparison analysis received:', comparisonData);
      } else {
        throw new Error('Failed to get AI analysis');
      }
    } catch (err) {
      console.error('❌ Error getting AI comparison:', err);
      // Provide basic fallback comparison
      setAiAnalysis({
        winner: product1.price < product2.price ? 'product1' : 'product2',
        summary: 'AI analysis unavailable. Compare specifications manually.',
        valueAnalysis: 'Unable to generate value analysis.',
        recommendation: 'Choose based on your budget and requirements.'
      });
    } finally {
      setLoading(false);
    }
  }, [product1, product2]);

  useEffect(() => {
    if (product1 && product2) {
      analyzeComparison();
    }
  }, [product1, product2, analyzeComparison]);

  /**
   * Parse price to number
   */
  const getPrice = (product) => {
    if (!product || !product.price) return 0;
    const priceStr = product.price.toString();
    return parseFloat(priceStr.replace(/[^\d.]/g, '') || 0);
  };

  /**
   * Helper function to format specification values for display
   * Converts objects to readable strings
   */
  const formatSpecValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (value === 'N/A' || value === '') return '-';
    
    // Handle objects - convert to readable string
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Format common nested object patterns
      const entries = Object.entries(value);
      if (entries.length === 0) return '-';
      
      // Format as "key1: value1, key2: value2"
      return entries
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(', ');
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value);
  };

  /**
   * Format specifications for display
   */
  const getSpecifications = (product) => {
    if (!product) {
      console.log('❌ getSpecifications: No product provided');
      return [];
    }

    console.log('🔍 getSpecifications called for:', product.name);
    console.log('🔍 Raw specifications:', product.specifications);
    console.log('🔍 Specifications type:', typeof product.specifications);

    // Handle specifications as string or object
    let specs = product.specifications || {};
    
    // If specifications is a string, try to parse it
    if (typeof specs === 'string') {
      if (specs === 'No specifications provided' || specs === '') {
        console.log('⚠️ Empty or placeholder specifications string');
        return [];
      }
      try {
        specs = JSON.parse(specs);
        console.log('✅ Parsed JSON specifications:', specs);
      } catch (e) {
        console.warn('❌ Failed to parse specifications:', specs, e);
        return [];
      }
    }

    // Ensure specs is an object
    if (typeof specs !== 'object' || Array.isArray(specs)) {
      console.log('❌ Specifications is not a valid object:', specs);
      return [];
    }

    const specArray = [];

    // Extract specifications
    Object.keys(specs).forEach(key => {
      const value = specs[key];
      if (value !== null && value !== undefined && value !== 'N/A' && value !== '') {
        specArray.push({
          label: key.replace(/_/g, ' ').toUpperCase(),
          value: formatSpecValue(value)
        });
      }
    });

    console.log('✅ Extracted specifications array:', specArray);
    return specArray;
  };

  /**
   * Get all unique spec keys from both products
   */
  const getAllSpecKeys = () => {
    const specs1 = product1.specifications || {};
    const specs2 = product2.specifications || {};
    const allKeys = new Set([...Object.keys(specs1), ...Object.keys(specs2)]);
    return Array.from(allKeys).filter(key => {
      const val1 = specs1[key];
      const val2 = specs2[key];
      return (val1 && val1 !== 'N/A' && val1 !== '') || (val2 && val2 !== 'N/A' && val2 !== '');
    });
  };

  /**
   * Calculate price difference
   */
  const getPriceDifference = () => {
    const price1 = getPrice(product1);
    const price2 = getPrice(product2);
    const diff = Math.abs(price1 - price2);
    const cheaper = price1 < price2 ? 'left' : 'right';
    const percentage = price1 > 0 && price2 > 0
      ? Math.round((diff / Math.max(price1, price2)) * 100)
      : 0;

    return { diff, cheaper, percentage };
  };

  if (!product1 || !product2) {
    return (
      <div className="compare-modal-overlay">
        <div className="compare-error">
          <h2>⚠️ Comparison Error</h2>
          <p>Please select exactly 2 products to compare</p>
          <button onClick={onClose} className="compare-close-btn">Close</button>
        </div>
      </div>
    );
  }

  const priceDiff = getPriceDifference();
  const specs1 = getSpecifications(product1);
  const specs2 = getSpecifications(product2);
  const allSpecKeys = getAllSpecKeys();

  return (
    <div className="compare-modal-overlay">
      <div className="compare-modal">
        {/* Header */}
        <div className="compare-header">
          <h1 className="compare-title">Comparison</h1>
          <button className="compare-close-btn-icon" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* AI Analysis Header */}
        {loading ? (
          <div className="compare-ai-loading">
            <div className="loading-spinner"></div>
            <p>AI analyzing products...</p>
          </div>
        ) : aiAnalysis && (
          <div className="compare-ai-analysis">
            <div className="ai-analysis-header">
              <img src={comparison} alt="AI Analysis" className="comparison-icon" />
              <h2>AI Value Analysis</h2>
            </div>
          </div>
        )}

        {/* Price Difference Banner */}
        <div className="compare-price-banner">
          <FontAwesomeIcon icon={faDollarSign} />
          <span>
            Price Difference:<br /><strong>₱{priceDiff.diff.toLocaleString()}</strong>
            {priceDiff.percentage > 0 && ` (${priceDiff.percentage}% ${priceDiff.cheaper === 'left' ? 'cheaper on left' : 'cheaper on right'})`}
          </span>
        </div>

        {/* Comparison Grid - Vertical Split */}
        <div className="compare-grid">
          {/* Left Product */}
          <div className={`compare-product-card ${aiAnalysis?.winner === 'product1' ? 'winner' : ''}`}>
            {aiAnalysis?.winner === 'product1' && (
              <div className="winner-badge">
                <FontAwesomeIcon icon={faTrophy} /> Best Value
              </div>
            )}

            <div className="compare-product-image">
              <img
                src={api.utils.getFullImageUrl(product1.imageUrl || product1.image_url || product1.image)}
                alt={product1.name}
                onError={(e) => {
                  e.target.src = '/assets/placeholder.png';
                }}
              />
            </div>

            <h3 className="compare-product-name">{product1.name}</h3>

            <div className="compare-price">
              ₱{getPrice(product1).toLocaleString()}
            </div>

            <div className="compare-specs">
              <h4>Specifications</h4>
              {specs1.length > 0 ? (
                <ul>
                  {specs1.map((spec, idx) => (
                    <li key={idx}>
                      <span className="spec-label">{spec.label}:</span>
                      <span className="spec-value">{spec.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-specs">No detailed specifications available</p>
              )}
            </div>

            <button
              className="compare-add-btn"
              onClick={() => {
                onAddToCart(product1);
                onClose();
              }}
            > Add to order
            </button>
          </div>

          {/* Divider */}
          <div className="compare-divider">
            <span>VS</span>
          </div>

          {/* Right Product */}
          <div className={`compare-product-card ${aiAnalysis?.winner === 'product2' ? 'winner' : ''}`}>
            {aiAnalysis?.winner === 'product2' && (
              <div className="winner-badge">
                <FontAwesomeIcon icon={faTrophy} /> Best Value
              </div>
            )}

            <div className="compare-product-image">
              <img
                src={api.utils.getFullImageUrl(product2.imageUrl || product2.image_url || product2.image)}
                alt={product2.name}
                onError={(e) => {
                  e.target.src = '/assets/placeholder.png';
                }}
              />
            </div>

            <h3 className="compare-product-name">{product2.name}</h3>

            <div className="compare-price">
              ₱{getPrice(product2).toLocaleString()}
            </div>

            <div className="compare-specs">
              <h4>Specifications</h4>
              {specs2.length > 0 ? (
                <ul>
                  {specs2.map((spec, idx) => (
                    <li key={idx}>
                      <span className="spec-label">{spec.label}:</span>
                      <span className="spec-value">{spec.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-specs">No detailed specifications available</p>
              )}
            </div>

            <button
              className="compare-add-btn"
              onClick={() => {
                onAddToCart(product2);
                onClose();
              }}
            > Add to order
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        {allSpecKeys.length > 0 && (
          <div className="compare-table-section">
            <div className="compare-table-wrapper">
              <div className="compare-table">
                {allSpecKeys.map((key, idx) => {
                  const rawSpec1 = product1.specifications?.[key];
                  const rawSpec2 = product2.specifications?.[key];
                  const spec1 = formatSpecValue(rawSpec1);
                  const spec2 = formatSpecValue(rawSpec2);
                  return (
                    <div key={idx} className="compare-table-row">
                      <div className="spec-label">{key.replace(/_/g, ' ')}</div>
                      <div className="spec-values">
                        <div className="spec-value-item">{spec1}</div>
                        <div className="spec-value-item">{spec2}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Content */}
        {!loading && aiAnalysis && (
          <div className="compare-ai-analysis-content-section">
            <div className="ai-analysis-content">
              <div className="ai-value">
                {aiAnalysis.priceComparison && typeof aiAnalysis.priceComparison === 'object' ? (
                  <>
                    <strong className="ai-title">
                      <img src={pricediff} alt="Price Difference" className="ai-price-icon"/> Price Difference: </strong>
                    ₱{aiAnalysis.priceComparison.difference?.toLocaleString() || 0}
                    <br />
                  </>
                ) : aiAnalysis.priceComparison && typeof aiAnalysis.priceComparison === 'string' ? (
                  <>
                    <strong>Price Difference:</strong>
                    <br />
                    {aiAnalysis.priceComparison}
                    <br /><br />
                  </>
                ) : null}
                {aiAnalysis.tierComparison && typeof aiAnalysis.tierComparison === 'object' ? (
                  <>
                    <strong className="ai-title">
                    <img src={tiercomparison} alt="Tier Comparison" className="ai-tier-icon"/> Tier Comparison: </strong>
                    
                    {aiAnalysis.tierComparison.product1Tier || 'N/A'} vs {aiAnalysis.tierComparison.product2Tier || 'N/A'}
                  </>
                ) : aiAnalysis.tierComparison && typeof aiAnalysis.tierComparison === 'string' ? (
                  <>
                    <strong>Tier Comparison:</strong>
                    <br />
                    {aiAnalysis.tierComparison}
                  </>
                ) : null}
                {!aiAnalysis.priceComparison && !aiAnalysis.tierComparison && aiAnalysis.valueAnalysis && (
                  aiAnalysis.valueAnalysis
                )}
              </div>
              <div className="ai-recommendation">
                <strong>
                <img src={recommend} alt="recommendation" /> Recommendation:</strong>
                <br />
                {aiAnalysis.recommendation || 'Choose based on your specific needs and budget.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareProducts;
