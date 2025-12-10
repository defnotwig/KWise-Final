import React, { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiAlertTriangle, FiCode } from 'react-icons/fi';

/**
 * RulePreview - Real-time rule syntax display
 * Shows how the rule will be evaluated and any potential conflicts
 */
const RulePreview = ({ rule, component1, component2, conditions, conflicts }) => {
  const [activeCodeTab, setActiveCodeTab] = useState('sql');

  const getActionIcon = () => {
    switch (rule.action) {
      case 'block':
        return <FiAlertCircle color="#ef4444" />;
      case 'warn':
        return <FiAlertTriangle color="#f59e0b" />;
      case 'allow':
        return <FiCheckCircle color="#10b981" />;
      default:
        return <FiCode />;
    }
  };

  const getActionColor = () => {
    switch (rule.action) {
      case 'block':
        return '#ef4444';
      case 'warn':
        return '#f59e0b';
      case 'allow':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const generateRuleSQL = () => {
    return `INSERT INTO compatibility_rules (
  component1_category, component2_category,
  component1_id, component2_id,
  rule_type, priority, enabled,
  name, description, conditions
) VALUES (
  '${component1?.category || 'ANY'}',
  '${component2?.category || 'ANY'}',
  ${component1?.id || 'NULL'},
  ${component2?.id || 'NULL'},
  '${rule.action}',
  ${rule.priority},
  ${rule.enabled},
  '${rule.name}',
  '${rule.description}',
  '${JSON.stringify(conditions)}'
);`;
  };

  const generateRuleJSON = () => {
    return {
      name: rule.name,
      description: rule.description,
      category: rule.category,
      component1: {
        id: component1?.id,
        name: component1?.name,
        category: component1?.category
      },
      component2: {
        id: component2?.id,
        name: component2?.name,
        category: component2?.category
      },
      conditions: conditions,
      action: rule.action,
      priority: rule.priority,
      enabled: rule.enabled
    };
  };

  return (
    <div className="rule-preview">
      <h2>Rule Preview</h2>
      <p className="section-description">
        Preview how this rule will be processed and stored
      </p>

      {/* Visual Rule Summary */}
      <div className="visual-preview">
        <div className="preview-header" style={{ borderColor: getActionColor() }}>
          {getActionIcon()}
          <h3>{rule.name || 'Untitled Rule'}</h3>
          <span className={`action-badge action-${rule.action}`}>
            {rule.action.toUpperCase()}
          </span>
        </div>

        <div className="preview-body">
          <div className="preview-section">
            <h4>Components:</h4>
            <div className="component-pair">
              <div className="component-badge">
                {component1?.name || 'Component 1'}
                <span className="category">{component1?.category}</span>
              </div>
              <span className="separator">↔</span>
              <div className="component-badge">
                {component2?.name || 'Component 2'}
                <span className="category">{component2?.category}</span>
              </div>
            </div>
          </div>

          <div className="preview-section">
            <h4>Conditions:</h4>
            <div className="conditions-preview">
              {conditions.length === 0 ? (
                <p className="no-conditions">No conditions defined</p>
              ) : (
                <ul className="condition-list">
                  {conditions.map((condition, index) => (
                    <li key={condition.id}>
                      {index > 0 && <span className="logic-op">{condition.logic}</span>}
                      <code>
                        {condition.field} {condition.operator} {condition.value}
                      </code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {rule.description && (
            <div className="preview-section">
              <h4>Description:</h4>
              <p>{rule.description}</p>
            </div>
          )}

          <div className="preview-metadata">
            <span><strong>Priority:</strong> {rule.priority}/10</span>
            <span><strong>Status:</strong> {rule.enabled ? 'Enabled ✅' : 'Disabled ❌'}</span>
            <span><strong>Category:</strong> {rule.category || 'Auto-detect'}</span>
          </div>
        </div>
      </div>

      {/* Conflicts Warning */}
      {conflicts && conflicts.length > 0 && (
        <div className="conflicts-warning">
          <div className="warning-header">
            <FiAlertTriangle color="#f59e0b" />
            <h4>Conflicting Rules Detected ({conflicts.length})</h4>
          </div>
          <div className="conflicts-list">
            {conflicts.map((conflict, index) => (
              <div key={index} className="conflict-item">
                <div className="conflict-name">{conflict.name}</div>
                <div className="conflict-reason">{conflict.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Preview Tabs */}
      <div className="code-preview">
        <div className="code-tabs">
          <button 
            className={`tab ${activeCodeTab === 'sql' ? 'active' : ''}`}
            onClick={() => setActiveCodeTab('sql')}
          >
            SQL
          </button>
          <button 
            className={`tab ${activeCodeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveCodeTab('json')}
          >
            JSON
          </button>
        </div>

        <div className="code-content">
          <div className="code-block">
            <pre>
              <code>
                {activeCodeTab === 'sql' 
                  ? generateRuleSQL() 
                  : JSON.stringify(generateRuleJSON(), null, 2)
                }
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulePreview;
