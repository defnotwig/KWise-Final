/**
 * Product Comparison Component
 * TASK 5: 2-Product Vertical Split Screen Comparison
 * For PC-Parts.js kiosk page only
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrophy, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import api from '../api/api';
import './CompareProducts.css';

import comparison from "../assets/PCParts/comparison.svg";
import pricediff from "../assets/CompareProducts/pricediff.svg";
import tiercomparison from "../assets/CompareProducts/tiercomparison.svg";
import recommend from "../assets/CompareProducts/recommend.svg";

const normalizeSpecs = (specs) => {
  if (!specs) return {};
  if (typeof specs === 'string') {
    if (specs === 'No specifications provided' || specs === '') return {};
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  }
  return typeof specs === 'object' && !Array.isArray(specs) ? specs : {};
};

const CompareProducts = ({ products, onClose, onAddToCart }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const [product1, product2] = products || [];

  const getPrice = (product) => {
    if (!product?.price) return 0;
    const priceStr = product.price.toString();
    return Number.parseFloat(priceStr.replaceAll(/[^\d.]/g, '') || 0);
  };

  const formatSpecValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (value === 'N/A' || value === '') return '-';

    if (typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value);
      if (entries.length === 0) return '-';

      return entries
        .map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v}`)
        .join(', ');
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value);
  };

  const getSpecifications = (product) => {
    const specs = normalizeSpecs(product?.specifications);
    const specArray = [];

    Object.keys(specs).forEach(key => {
      const value = specs[key];
      if (value !== null && value !== undefined && value !== 'N/A' && value !== '') {
        specArray.push({
          label: key.replaceAll('_', ' ').toUpperCase(),
          value: formatSpecValue(value)
        });
      }
    });

    return specArray;
  };

  const analyzeComparison = React.useCallback(async () => {
    setLoading(true);

    try {
      const price1 = getPrice(product1);
      const price2 = getPrice(product2);
      const specs1 = getSpecifications(product1);
      const specs2 = getSpecifications(product2);
      const score1 = specs1.length * 5 - (price1 / 10000);
      const score2 = specs2.length * 5 - (price2 / 10000);
      const winner = Math.abs(score1 - score2) < 1
        ? (price1 <= price2 ? 'product1' : 'product2')
        : (score1 >= score2 ? 'product1' : 'product2');
      const winnerName = winner === 'product1' ? product1.name : product2.name;

      setAnalysis({
        summary: 'Local comparison complete',
        winner,
        valueAnalysis: `${winnerName} is the better value based on available specifications and price.`,
        recommendation: `Based on available specifications and value, ${winnerName} is recommended.`
      });
    } catch (err) {
      console.error('Error getting local comparison:', err);
      setAnalysis({
        winner: getPrice(product1) <= getPrice(product2) ? 'product1' : 'product2',
        summary: 'Local comparison unavailable. Compare specifications manually.',
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

  const getAllSpecKeys = () => {
    const specs1 = normalizeSpecs(product1?.specifications);
    const specs2 = normalizeSpecs(product2?.specifications);
    const allKeys = new Set([...Object.keys(specs1), ...Object.keys(specs2)]);
    return Array.from(allKeys).filter(key => {
      const val1 = specs1[key];
      const val2 = specs2[key];
      return (val1 && val1 !== 'N/A' && val1 !== '') || (val2 && val2 !== 'N/A' && val2 !== '');
    });
  };

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
          <h2>Comparison Error</h2>
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
  const normalizedSpecs1 = normalizeSpecs(product1.specifications);
  const normalizedSpecs2 = normalizeSpecs(product2.specifications);

  return (
    <div className="compare-modal-overlay">
      <div className="compare-modal">
        <div className="compare-header">
          <h1 className="compare-title">Comparison</h1>
          <button className="compare-close-btn-icon" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {loading ? (
          <div className="compare-ai-loading">
            <div className="loading-spinner"></div>
            <p>Comparing products...</p>
          </div>
        ) : analysis && (
          <div className="compare-ai-analysis">
            <div className="ai-analysis-header">
              <img src={comparison} alt="Value Analysis" className="comparison-icon" />
              <h2>Value Analysis</h2>
            </div>
          </div>
        )}

        <div className="compare-price-banner">
          <FontAwesomeIcon icon={faDollarSign} />
          <span>
            Price Difference:<br /><strong>₱{priceDiff.diff.toLocaleString()}</strong>
            {priceDiff.percentage > 0 && ` (${priceDiff.percentage}% ${priceDiff.cheaper === 'left' ? 'cheaper on left' : 'cheaper on right'})`}
          </span>
        </div>

        <div className="compare-grid">
          <div className={`compare-product-card ${analysis?.winner === 'product1' ? 'winner' : ''}`}>
            {analysis?.winner === 'product1' && (
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
                  {specs1.map((spec) => (
                    <li key={`spec1-${spec.label}`}>
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

          <div className="compare-divider">
            <span>VS</span>
          </div>

          <div className={`compare-product-card ${analysis?.winner === 'product2' ? 'winner' : ''}`}>
            {analysis?.winner === 'product2' && (
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
                  {specs2.map((spec) => (
                    <li key={`spec2-${spec.label}`}>
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

        {allSpecKeys.length > 0 && (
          <div className="compare-table-section">
            <div className="compare-table-wrapper">
              <div className="compare-table">
                {allSpecKeys.map((key) => {
                  const spec1 = formatSpecValue(normalizedSpecs1[key]);
                  const spec2 = formatSpecValue(normalizedSpecs2[key]);
                  return (
                    <div key={`compare-${key}`} className="compare-table-row">
                      <div className="spec-label">{key.replaceAll('_', ' ')}</div>
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

        {!loading && analysis && (
          <div className="compare-ai-analysis-content-section">
            <div className="ai-analysis-content">
              <div className="ai-value">
                {analysis.priceComparison && typeof analysis.priceComparison === 'object' ? (
                  <>
                    <strong className="ai-title">
                      <img src={pricediff} alt="Price Difference" className="ai-price-icon" /> Price Difference: </strong>
                    ₱{analysis.priceComparison.difference?.toLocaleString() || 0}
                    <br />
                  </>
                ) : analysis.priceComparison && typeof analysis.priceComparison === 'string' ? (
                  <>
                    <strong>Price Difference:</strong>
                    <br />
                    {analysis.priceComparison}
                    <br /><br />
                  </>
                ) : null}
                {analysis.tierComparison && typeof analysis.tierComparison === 'object' ? (
                  <>
                    <strong className="ai-title">
                      <img src={tiercomparison} alt="Tier Comparison" className="ai-tier-icon" /> Tier Comparison: </strong>
                    {analysis.tierComparison.product1Tier || 'N/A'} vs {analysis.tierComparison.product2Tier || 'N/A'}
                  </>
                ) : analysis.tierComparison && typeof analysis.tierComparison === 'string' ? (
                  <>
                    <strong>Tier Comparison:</strong>
                    <br />
                    {analysis.tierComparison}
                  </>
                ) : null}
                {!analysis.priceComparison && !analysis.tierComparison && analysis.valueAnalysis && (
                  analysis.valueAnalysis
                )}
              </div>
              <div className="ai-recommendation">
                <strong>
                  <img src={recommend} alt="recommendation" /> Recommendation:</strong>
                <br />
                {analysis.recommendation || 'Choose based on your specific needs and budget.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

CompareProducts.propTypes = {
  products: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func.isRequired,
  onAddToCart: PropTypes.func.isRequired
};

export default CompareProducts;
