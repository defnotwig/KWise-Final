import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSave, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { getServerBaseUrl } from '../../../utils/networkConfig';
import ComponentSelector from './ComponentSelector';
import ConditionBuilder from './ConditionBuilder';
import RulePreview from './RulePreview';
import RuleTester from './RuleTester';
import RuleManager from './RuleManager';
import RuleImportExport from './RuleImportExport';
import './RuleBuilder.css';

/**
 * Visual Rule Builder - Main Container
 * Interactive drag-and-drop interface for building compatibility rules
 * Features: component selection, condition building, rule testing, conflict detection
 */
const RuleBuilder = () => {
  const [currentRule, setCurrentRule] = useState({
    id: null,
    name: '',
    description: '',
    category: '',
    component1: null,
    component2: null,
    conditions: [],
    action: 'block',
    priority: 5,
    enabled: true
  });

  const [selectedComponents, setSelectedComponents] = useState({
    component1: null,
    component2: null
  });

  const [conditions, setConditions] = useState([]);
  const [ruleList, setRuleList] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('builder');

  // Load existing rules on mount
  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-check for conflicts when conditions change
  useEffect(() => {
    if (conditions.length > 0 && selectedComponents.component1 && selectedComponents.component2) {
      checkConflicts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditions, selectedComponents]);

  /**
   * Load all existing rules from backend
   */
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getServerBaseUrl()}/api/rules`);
      if (!response.ok) throw new Error('Failed to load rules');
      const data = await response.json();
      setRuleList(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check for rule conflicts with existing rules
   */
  const checkConflicts = useCallback(async () => {
    if (!selectedComponents.component1 || !selectedComponents.component2) return;

    try {
      const response = await fetch(`${getServerBaseUrl()}/api/rules/conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component1_id: selectedComponents.component1.id,
          component2_id: selectedComponents.component2.id,
          conditions: conditions,
          exclude_rule_id: currentRule.id
        })
      });

      if (!response.ok) throw new Error('Failed to check conflicts');
      const data = await response.json();
      setConflicts(data.data || []);
    } catch (err) {
      console.error('Error checking conflicts:', err);
    }
  }, [selectedComponents, conditions, currentRule.id]);

  /**
   * Handle component selection from drag-drop
   */
  const handleComponentSelect = useCallback((slot, component) => {
    setSelectedComponents(prev => ({
      ...prev,
      [slot]: component
    }));
    setCurrentRule(prev => ({
      ...prev,
      [slot]: component,
      category: component?.category || prev.category
    }));
  }, []);

  /**
   * Handle condition changes from ConditionBuilder
   */
  const handleConditionsChange = useCallback((newConditions) => {
    setConditions(newConditions);
    setCurrentRule(prev => ({
      ...prev,
      conditions: newConditions
    }));
  }, []);

  /**
   * Validate rule before saving
   */
  const validateRule = () => {
    const errors = [];

    if (!currentRule.name?.trim()) {
      errors.push('Rule name is required');
    }

    if (!selectedComponents.component1) {
      errors.push('Component 1 is required');
    }

    if (!selectedComponents.component2) {
      errors.push('Component 2 is required');
    }

    if (conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    if (conflicts.length > 0) {
      errors.push(`${conflicts.length} conflicting rule(s) detected`);
    }

    return errors;
  };

  /**
   * Save or update rule
   */
  const handleSaveRule = async () => {
    const validationErrors = validateRule();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const ruleData = {
        name: currentRule.name,
        description: currentRule.description,
        category: currentRule.category,
        component1_id: selectedComponents.component1.id,
        component2_id: selectedComponents.component2.id,
        conditions: conditions,
        action: currentRule.action,
        priority: currentRule.priority,
        enabled: currentRule.enabled
      };

      const url = currentRule.id 
        ? `${getServerBaseUrl()}/api/rules/${currentRule.id}/update`
        : `${getServerBaseUrl()}/api/rules/create`;
      
      const method = currentRule.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });

      if (!response.ok) throw new Error('Failed to save rule');
      
      await response.json(); // Consume response
      setSuccess(currentRule.id ? 'Rule updated successfully!' : 'Rule created successfully!');
      
      // Reload rules list
      await loadRules();
      
      // Reset form after creation (keep form for updates)
      if (!currentRule.id) {
        handleResetForm();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error saving rule:', err);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete rule
   */
  const handleDeleteRule = async (ruleId) => {
    if (!globalThis.confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`${getServerBaseUrl()}/api/rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete rule');
      
      setSuccess('Rule deleted successfully!');
      await loadRules();
      
      // Reset form if currently editing this rule
      if (currentRule.id === ruleId) {
        handleResetForm();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting rule:', err);
    }
  };

  /**
   * Load rule into editor
   */
  const handleEditRule = (rule) => {
    setCurrentRule({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      component1: rule.component1,
      component2: rule.component2,
      conditions: rule.conditions,
      action: rule.action,
      priority: rule.priority,
      enabled: rule.enabled
    });

    setSelectedComponents({
      component1: rule.component1,
      component2: rule.component2
    });

    setConditions(rule.conditions);
    setActiveTab('builder');
  };

  /**
   * Reset form to create new rule
   */
  const handleResetForm = () => {
    setCurrentRule({
      id: null,
      name: '',
      description: '',
      category: '',
      component1: null,
      component2: null,
      conditions: [],
      action: 'block',
      priority: 5,
      enabled: true
    });
    setSelectedComponents({
      component1: null,
      component2: null
    });
    setConditions([]);
    setConflicts([]);
    setTestResults(null);
    setError(null);
    setSuccess(null);
  };

  /**
   * Test rule against sample data
   */
  const handleTestRule = async (testData) => {
    try {
      const response = await fetch(`${getServerBaseUrl()}/api/rules/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component1_id: selectedComponents.component1?.id,
          component2_id: selectedComponents.component2?.id,
          conditions: conditions,
          test_data: testData
        })
      });

      if (!response.ok) throw new Error('Failed to test rule');
      
      const data = await response.json();
      setTestResults(data.data);
    } catch (err) {
      setError(err.message);
      console.error('Error testing rule:', err);
    }
  };

  return (
    <div className="rule-builder">
      <div className="rule-builder-header">
        <div className="header-title">
          <h1>Visual Rule Builder</h1>
          <p>Create and manage compatibility rules with drag-and-drop interface</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleResetForm}
            title="Create new rule"
          >
            <FiPlus /> New Rule
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSaveRule}
            disabled={saving}
            title="Save current rule"
          >
            <FiSave /> {saving ? 'Saving...' : 'Save Rule'}
          </button>
          <button 
            className="btn btn-icon"
            onClick={loadRules}
            disabled={loading}
            title="Refresh rules list"
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle />
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>&times;</button>
        </div>
      )}

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="alert alert-warning">
          <FiAlertCircle />
          <span>
            <strong>Warning:</strong> {conflicts.length} conflicting rule(s) detected.
            This rule may override or conflict with existing rules.
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="rule-builder-tabs">
        <button 
          className={`tab ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          Rule Builder
        </button>
        <button 
          className={`tab ${activeTab === 'manager' ? 'active' : ''}`}
          onClick={() => setActiveTab('manager')}
        >
          Manage Rules ({ruleList.length})
        </button>
        <button 
          className={`tab ${activeTab === 'import-export' ? 'active' : ''}`}
          onClick={() => setActiveTab('import-export')}
        >
          Import/Export
        </button>
      </div>

      {/* Tab Content */}
      <div className="rule-builder-content">
        {activeTab === 'builder' && (
          <div className="builder-tab">
            {/* Rule Basic Info */}
            <div className="rule-info-section">
              <h2>Rule Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="rule-name-input">Rule Name *</label>
                  <input
                    id="rule-name-input"
                    type="text"
                    value={currentRule.name}
                    onChange={(e) => setCurrentRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Intel CPU with AMD Chipset Block"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rule-category-input">Category</label>
                  <input
                    id="rule-category-input"
                    type="text"
                    value={currentRule.category}
                    onChange={(e) => setCurrentRule(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Auto-detected from components"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rule-action-select">Action</label>
                  <select
                    id="rule-action-select"
                    value={currentRule.action}
                    onChange={(e) => setCurrentRule(prev => ({ ...prev, action: e.target.value }))}
                  >
                    <option value="block">Block (Incompatible)</option>
                    <option value="warn">Warn (Caution)</option>
                    <option value="allow">Allow (Compatible)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="rule-priority-input">Priority (1-10)</label>
                  <input
                    id="rule-priority-input"
                    type="number"
                    min="1"
                    max="10"
                    value={currentRule.priority}
                    onChange={(e) => setCurrentRule(prev => ({ ...prev, priority: Number.parseInt(e.target.value, 10) }))}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="rule-description-textarea">Description</label>
                  <textarea
                    id="rule-description-textarea"
                    value={currentRule.description}
                    onChange={(e) => setCurrentRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this rule does and why..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={currentRule.enabled}
                      onChange={(e) => setCurrentRule(prev => ({ ...prev, enabled: e.target.checked }))}
                    />
                    <span>Rule Enabled</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Component Selection */}
            <ComponentSelector
              selectedComponents={selectedComponents}
              onComponentSelect={handleComponentSelect}
            />

            {/* Condition Builder */}
            {selectedComponents.component1 && selectedComponents.component2 && (
              <ConditionBuilder
                component1={selectedComponents.component1}
                component2={selectedComponents.component2}
                conditions={conditions}
                onConditionsChange={handleConditionsChange}
              />
            )}

            {/* Rule Preview */}
            {conditions.length > 0 && (
              <RulePreview
                rule={currentRule}
                component1={selectedComponents.component1}
                component2={selectedComponents.component2}
                conditions={conditions}
                conflicts={conflicts}
              />
            )}

            {/* Rule Tester */}
            {selectedComponents.component1 && selectedComponents.component2 && (
              <RuleTester
                component1={selectedComponents.component1}
                component2={selectedComponents.component2}
                conditions={conditions}
                onTest={handleTestRule}
                testResults={testResults}
              />
            )}
          </div>
        )}

        {activeTab === 'manager' && (
          <RuleManager
            rules={ruleList}
            loading={loading}
            onEdit={handleEditRule}
            onDelete={handleDeleteRule}
            onRefresh={loadRules}
          />
        )}

        {activeTab === 'import-export' && (
          <RuleImportExport
            rules={ruleList}
            onImportComplete={loadRules}
          />
        )}
      </div>
    </div>
  );
};

export default RuleBuilder;
