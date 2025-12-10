import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiAlertCircle } from 'react-icons/fi';

/**
 * ConditionBuilder - Rule condition creator
 * Allows users to build complex conditional logic for compatibility rules
 */
const ConditionBuilder = ({ component1, component2, conditions, onConditionsChange }) => {
  const [newCondition, setNewCondition] = useState({
    field: '',
    operator: '==',
    value: '',
    logic: 'AND'
  });

  // Available operators
  const operators = [
    { value: '==', label: 'Equals' },
    { value: '!=', label: 'Not Equals' },
    { value: '>', label: 'Greater Than' },
    { value: '<', label: 'Less Than' },
    { value: '>=', label: 'Greater or Equal' },
    { value: '<=', label: 'Less or Equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'in', label: 'In List' },
    { value: 'not_in', label: 'Not In List' }
  ];

  // Get available fields from components
  const getAvailableFields = () => {
    const fields = new Set();
    
    // Add component1 fields
    if (component1?.specifications) {
      Object.keys(component1.specifications).forEach(key => {
        fields.add(`component1.${key}`);
      });
    }
    fields.add('component1.category');
    fields.add('component1.brand');
    fields.add('component1.model');
    fields.add('component1.price');

    // Add component2 fields
    if (component2?.specifications) {
      Object.keys(component2.specifications).forEach(key => {
        fields.add(`component2.${key}`);
      });
    }
    fields.add('component2.category');
    fields.add('component2.brand');
    fields.add('component2.model');
    fields.add('component2.price');

    return Array.from(fields).sort();
  };

  const availableFields = getAvailableFields();

  const handleAddCondition = () => {
    if (!newCondition.field || !newCondition.value) {
      return;
    }

    const conditionToAdd = {
      id: Date.now(),
      field: newCondition.field,
      operator: newCondition.operator,
      value: newCondition.value,
      logic: conditions.length === 0 ? null : newCondition.logic
    };

    onConditionsChange([...conditions, conditionToAdd]);

    // Reset form
    setNewCondition({
      field: '',
      operator: '==',
      value: '',
      logic: 'AND'
    });
  };

  const handleRemoveCondition = (id) => {
    const updated = conditions.filter(c => c.id !== id);
    
    // If removing first condition, set second condition's logic to null
    if (updated.length > 0 && conditions[0].id === id) {
      updated[0] = { ...updated[0], logic: null };
    }
    
    onConditionsChange(updated);
  };

  const handleUpdateCondition = (id, field, value) => {
    const updated = conditions.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    );
    onConditionsChange(updated);
  };

  const getConditionPreview = (condition) => {
    const fieldName = condition.field.split('.').pop();
    const operatorLabel = operators.find(op => op.value === condition.operator)?.label || condition.operator;
    return `${fieldName} ${operatorLabel} ${condition.value}`;
  };

  return (
    <div className="condition-builder">
      <h2>Build Conditions</h2>
      <p className="section-description">
        Define conditions that determine when this rule applies. Multiple conditions can be combined with AND/OR logic.
      </p>

      {/* Existing Conditions */}
      {conditions.length > 0 && (
        <div className="conditions-list">
          <h3>Current Conditions ({conditions.length})</h3>
          {conditions.map((condition, index) => (
            <div key={condition.id} className="condition-item">
              {index > 0 && (
                <div className="logic-operator">
                  <select
                    value={condition.logic}
                    onChange={(e) => handleUpdateCondition(condition.id, 'logic', e.target.value)}
                    className="logic-select"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
              )}
              
              <div className="condition-content">
                <div className="condition-field">
                  <label>Field</label>
                  <select
                    value={condition.field}
                    onChange={(e) => handleUpdateCondition(condition.id, 'field', e.target.value)}
                  >
                    {availableFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>

                <div className="condition-operator">
                  <label>Operator</label>
                  <select
                    value={condition.operator}
                    onChange={(e) => handleUpdateCondition(condition.id, 'operator', e.target.value)}
                  >
                    {operators.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>

                <div className="condition-value">
                  <label>Value</label>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => handleUpdateCondition(condition.id, 'value', e.target.value)}
                    placeholder="Enter value..."
                  />
                </div>

                <button
                  className="btn-remove-condition"
                  onClick={() => handleRemoveCondition(condition.id)}
                  title="Remove condition"
                >
                  <FiTrash2 />
                </button>
              </div>

              <div className="condition-preview">
                <span className="preview-label">Preview:</span>
                <code>{getConditionPreview(condition)}</code>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Condition */}
      <div className="add-condition-form">
        <h3>Add New Condition</h3>
        
        <div className="form-row">
          {conditions.length > 0 && (
            <div className="form-group">
              <label>Logic</label>
              <select
                value={newCondition.logic}
                onChange={(e) => setNewCondition({ ...newCondition, logic: e.target.value })}
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Field *</label>
            <select
              value={newCondition.field}
              onChange={(e) => setNewCondition({ ...newCondition, field: e.target.value })}
            >
              <option value="">Select field...</option>
              {availableFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Operator *</label>
            <select
              value={newCondition.operator}
              onChange={(e) => setNewCondition({ ...newCondition, operator: e.target.value })}
            >
              {operators.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Value *</label>
            <input
              type="text"
              value={newCondition.value}
              onChange={(e) => setNewCondition({ ...newCondition, value: e.target.value })}
              placeholder="Enter value..."
            />
          </div>

          <div className="form-group">
            <button
              className="btn btn-primary"
              onClick={handleAddCondition}
              disabled={!newCondition.field || !newCondition.value}
            >
              <FiPlus /> Add Condition
            </button>
          </div>
        </div>

        {newCondition.field && newCondition.value && (
          <div className="new-condition-preview">
            <span className="preview-label">Preview:</span>
            <code>
              {conditions.length > 0 && `${newCondition.logic} `}
              {getConditionPreview(newCondition)}
            </code>
          </div>
        )}
      </div>

      {/* Helper Info */}
      <div className="condition-helper">
        <FiAlertCircle />
        <div className="helper-content">
          <h4>Condition Tips:</h4>
          <ul>
            <li><strong>Equals (==):</strong> Exact match (case-sensitive)</li>
            <li><strong>Contains:</strong> Checks if field contains the value</li>
            <li><strong>In List:</strong> Use comma-separated values (e.g., "Intel,AMD")</li>
            <li><strong>AND:</strong> All conditions must be true</li>
            <li><strong>OR:</strong> At least one condition must be true</li>
            <li><strong>Numeric comparisons:</strong> Use &gt;, &lt;, &gt;=, &lt;= for numbers</li>
          </ul>
        </div>
      </div>

      {/* Condition Summary */}
      {conditions.length > 0 && (
        <div className="condition-summary">
          <h4>Condition Logic Summary:</h4>
          <div className="logic-summary">
            <code>
              {conditions.map((condition, index) => (
                <span key={condition.id}>
                  {index > 0 && <span className="logic-op"> {condition.logic} </span>}
                  <span className="condition-part">
                    ({getConditionPreview(condition)})
                  </span>
                </span>
              ))}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionBuilder;
