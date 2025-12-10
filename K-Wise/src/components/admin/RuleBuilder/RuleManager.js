import React, { useState } from 'react';
import { FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiSearch, FiFilter } from 'react-icons/fi';

/**
 * RuleManager - CRUD operations for rules
 * List, edit, delete, and manage existing compatibility rules
 */
const RuleManager = ({ rules, loading, onEdit, onDelete, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const categories = ['all', ...new Set(rules.map(r => r.category).filter(Boolean))];
  const actions = ['all', 'block', 'warn', 'allow'];
  const statuses = ['all', 'enabled', 'disabled'];

  // Filter rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch = !searchTerm || 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || rule.category === filterCategory;
    const matchesAction = filterAction === 'all' || rule.action === filterAction;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'enabled' && rule.enabled) ||
      (filterStatus === 'disabled' && !rule.enabled);

    return matchesSearch && matchesCategory && matchesAction && matchesStatus;
  });

  const getActionBadge = (action) => {
    const badges = {
      block: { label: 'BLOCK', color: '#ef4444' },
      warn: { label: 'WARN', color: '#f59e0b' },
      allow: { label: 'ALLOW', color: '#10b981' }
    };
    const badge = badges[action] || { label: action, color: '#6b7280' };
    return (
      <span className="action-badge" style={{ backgroundColor: badge.color }}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="rule-manager">
      <div className="manager-header">
        <h2>Manage Rules ({filteredRules.length}/{rules.length})</h2>
        <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rule-filters">
        <div className="filter-group">
          <FiSearch />
          <input
            type="text"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <FiFilter />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            {actions.map(action => (
              <option key={action} value={action}>
                {action === 'all' ? 'All Actions' : action.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Status' : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rules-table-container">
        {loading ? (
          <div className="loading-state">Loading rules...</div>
        ) : filteredRules.length === 0 ? (
          <div className="empty-state">
            <p>No rules found</p>
            {searchTerm && <button onClick={() => setSearchTerm('')}>Clear search</button>}
          </div>
        ) : (
          <table className="rules-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Components</th>
                <th>Action</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Conditions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map(rule => (
                <tr key={rule.id}>
                  <td>
                    <div className="rule-name">
                      <strong>{rule.name}</strong>
                      {rule.description && (
                        <small className="rule-description">{rule.description}</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="components-cell">
                      <div className="component-badge small">
                        {rule.component1?.name || rule.component1_category}
                      </div>
                      <span className="separator">↔</span>
                      <div className="component-badge small">
                        {rule.component2?.name || rule.component2_category}
                      </div>
                    </div>
                  </td>
                  <td>{getActionBadge(rule.action)}</td>
                  <td>
                    <span className="priority-badge">{rule.priority}/10</span>
                  </td>
                  <td>
                    {rule.enabled ? (
                      <FiToggleRight color="#10b981" size={24} title="Enabled" />
                    ) : (
                      <FiToggleLeft color="#6b7280" size={24} title="Disabled" />
                    )}
                  </td>
                  <td>
                    <span className="conditions-count">
                      {rule.conditions?.length || 0} condition(s)
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => onEdit(rule)}
                        title="Edit rule"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => onDelete(rule.id)}
                        title="Delete rule"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Stats */}
      <div className="manager-stats">
        <div className="stat-item">
          <span className="stat-label">Total Rules:</span>
          <span className="stat-value">{rules.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Enabled:</span>
          <span className="stat-value">{rules.filter(r => r.enabled).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Block Rules:</span>
          <span className="stat-value">{rules.filter(r => r.action === 'block').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Warn Rules:</span>
          <span className="stat-value">{rules.filter(r => r.action === 'warn').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Allow Rules:</span>
          <span className="stat-value">{rules.filter(r => r.action === 'allow').length}</span>
        </div>
      </div>
    </div>
  );
};

export default RuleManager;
