import React, { useState } from 'react';
import './CorrectionForm.css';

const CorrectionForm = ({ suggestion, onSubmitSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    corrected_text: '',
    correction_reason: '',
    confidence_score: 3, // 1-5 scale
    tags: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validation
    if (!formData.corrected_text.trim()) {
      setError('Corrected suggestion text is required');
      setSubmitting(false);
      return;
    }

    if (!formData.correction_reason.trim()) {
      setError('Correction reason is required');
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin/ai-corrections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          suggestion_id: suggestion.id,
          original_text: suggestion.original_text,
          corrected_text: formData.corrected_text,
          correction_reason: formData.correction_reason,
          confidence_score: formData.confidence_score / 5, // Convert 1-5 to 0-1
          ai_response_metadata: {
            original_confidence: suggestion.confidence_score,
            original_reasoning: suggestion.reasoning,
            suggestion_type: suggestion.type
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit correction');
      }

      const result = await response.json();
      
      // Success!
      onSubmitSuccess(result);
    } catch (err) {
      console.error('Error submitting correction:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="correction-form-container">
      <div className="form-header">
        <h3>✏️ Submit AI Correction</h3>
        <p>Help improve the AI by providing the correct suggestion and explanation</p>
      </div>

      {/* Original Suggestion Display */}
      <div className="original-suggestion-display">
        <h4>Original AI Suggestion:</h4>
        <div className="original-content">
          <div className="original-text">
            <strong>Text:</strong>
            <p>{suggestion.original_text || 'No text provided'}</p>
          </div>
          
          <div className="original-reasoning">
            <strong>AI Reasoning:</strong>
            <p>{suggestion.reasoning || 'No reasoning provided'}</p>
          </div>
          
          <div className="original-metadata">
            <span className="metadata-item">
              <strong>Type:</strong> {suggestion.type}
            </span>
            <span className="metadata-item">
              <strong>Confidence:</strong> {(suggestion.confidence_score * 100).toFixed(0)}%
            </span>
            <span className="metadata-item">
              <strong>Priority:</strong> {suggestion.priority}
            </span>
          </div>
        </div>
      </div>

      {/* Correction Form */}
      <form onSubmit={handleSubmit} className="correction-form">
        {error && (
          <div className="form-error">
            ⚠️ {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="corrected_text">
            Corrected Suggestion Text *
            <span className="field-hint">Provide the correct suggestion that the AI should have given</span>
          </label>
          <textarea
            id="corrected_text"
            rows="4"
            value={formData.corrected_text}
            onChange={(e) => setFormData(prev => ({ ...prev, corrected_text: e.target.value }))}
            placeholder="Enter the correct suggestion text here..."
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="correction_reason">
            Correction Reason *
            <span className="field-hint">Explain why this correction is needed and what the AI missed</span>
          </label>
          <textarea
            id="correction_reason"
            rows="6"
            value={formData.correction_reason}
            onChange={(e) => setFormData(prev => ({ ...prev, correction_reason: e.target.value }))}
            placeholder="Explain what was wrong with the AI suggestion and why your correction is better..."
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confidence_score">
            Confidence in Correction: {formData.confidence_score}/5
            <span className="field-hint">How confident are you that this correction is accurate?</span>
          </label>
          <div className="confidence-slider-container">
            <input
              type="range"
              id="confidence_score"
              min="1"
              max="5"
              step="1"
              value={formData.confidence_score}
              onChange={(e) => setFormData(prev => ({ ...prev, confidence_score: parseInt(e.target.value) }))}
              disabled={submitting}
            />
            <div className="confidence-labels">
              <span>1 - Low</span>
              <span>2</span>
              <span>3 - Medium</span>
              <span>4</span>
              <span>5 - High</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : '✅ Submit Correction'}
          </button>
        </div>
      </form>

      {/* Guidelines */}
      <div className="correction-guidelines">
        <h4>📝 Correction Guidelines:</h4>
        <ul>
          <li>Be specific and detailed in your corrected suggestion</li>
          <li>Explain the technical reasons behind your correction</li>
          <li>Reference specific compatibility issues or performance concerns</li>
          <li>Use concrete examples when possible</li>
          <li>Consider real-world use cases and budget constraints</li>
        </ul>
      </div>
    </div>
  );
};

export default CorrectionForm;
