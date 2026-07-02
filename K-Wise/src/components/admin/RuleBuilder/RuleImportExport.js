import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiDownload, FiUpload, FiFile, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { getServerBaseUrl } from '../../../utils/networkConfig';

/**
 * RuleImportExport - Bulk import/export operations
 * Export rules as JSON/CSV and import from file
 */
const RuleImportExport = ({ rules, onImportComplete }) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(rules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compatibility-rules-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Description', 'Category', 'Component1', 'Component2', 'Action', 'Priority', 'Enabled', 'Conditions'];
    const rows = rules.map(rule => [
      rule.id,
      rule.name,
      rule.description || '',
      rule.category || '',
      rule.component1?.name || rule.component1_category || '',
      rule.component2?.name || rule.component2_category || '',
      rule.action,
      rule.priority,
      rule.enabled ? 'Yes' : 'No',
      JSON.stringify(rule.conditions || [])
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compatibility-rules-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (exportFormat === 'json') {
      handleExportJSON();
    } else {
      handleExportCSV();
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      let rulesToImport;

      if (file.name.endsWith('.json')) {
        try {
          rulesToImport = JSON.parse(text);
        } catch {
          setImportResult({ success: false, message: 'Invalid JSON file — could not parse' });
          setImporting(false);
          return;
        }
      } else {
        throw new Error('Only JSON files are supported for import');
      }

      if (!Array.isArray(rulesToImport)) {
        rulesToImport = [rulesToImport];
      }

      // Send to backend
      const response = await fetch(`${getServerBaseUrl()}/api/rules/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: rulesToImport })
      });

      if (!response.ok) throw new Error('Import failed');

      const data = await response.json();
      setImportResult({
        success: true,
        message: `Successfully imported ${data.data.imported} rule(s)`,
        details: data.data
      });

      // Reload rules list
      if (onImportComplete) {
        await onImportComplete();
      }
    } catch (err) {
      setImportResult({
        success: false,
        message: err.message,
        details: null
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="rule-import-export">
      <div className="import-export-grid">
        {/* Export Section */}
        <div className="export-section">
          <div className="section-header">
            <FiDownload size={24} />
            <h2>Export Rules</h2>
          </div>
          <p className="section-description">
            Download all compatibility rules to a file for backup or sharing
          </p>

          <div className="export-controls">
            <div className="form-group">
              <label htmlFor="export-format">Export Format</label>
              <select 
                id="export-format"
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <button 
              className="btn btn-primary btn-export"
              onClick={handleExport}
              disabled={rules.length === 0}
            >
              <FiDownload /> Export {rules.length} Rule(s)
            </button>
          </div>

          <div className="export-info">
            <h4>Export Information:</h4>
            <ul>
              <li><strong>JSON:</strong> Full rule data including all metadata (recommended for backup)</li>
              <li><strong>CSV:</strong> Spreadsheet format for analysis (conditions will be in JSON format)</li>
              <li>Export includes all {rules.length} rules in the database</li>
              <li>File will be saved to your Downloads folder</li>
            </ul>
          </div>
        </div>

        {/* Import Section */}
        <div className="import-section">
          <div className="section-header">
            <FiUpload size={24} />
            <h2>Import Rules</h2>
          </div>
          <p className="section-description">
            Upload a JSON file containing compatibility rules
          </p>

          <div className="import-controls">
            <div className="file-upload">
              <input
                type="file"
                id="rule-import"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                style={{ display: 'none' }}
              />
              <label htmlFor="rule-import" className="btn btn-primary btn-upload">
                <FiFile /> {importing ? 'Importing...' : 'Choose File'}
              </label>
            </div>

            {importResult && (
              <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                {importResult.success ? (
                  <FiCheckCircle color="#10b981" />
                ) : (
                  <FiAlertCircle color="#ef4444" />
                )}
                <div className="result-content">
                  <h4>{importResult.success ? 'Import Successful' : 'Import Failed'}</h4>
                  <p>{importResult.message}</p>
                  {importResult.details && (
                    <div className="import-details">
                      <p><strong>Imported:</strong> {importResult.details.imported || 0}</p>
                      {importResult.details.skipped > 0 && (
                        <p><strong>Skipped:</strong> {importResult.details.skipped} (duplicates)</p>
                      )}
                      {importResult.details.errors > 0 && (
                        <p className="error-text"><strong>Errors:</strong> {importResult.details.errors}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="import-info">
            <h4>Import Requirements:</h4>
            <ul>
              <li>Only JSON files are supported</li>
              <li>File must contain an array of rule objects</li>
              <li>Each rule must have: name, component IDs, conditions, action</li>
              <li>Duplicate rules (by name) will be skipped</li>
              <li>Invalid rules will be logged but won't stop the import</li>
            </ul>
          </div>

          <div className="import-template">
            <h4>Example Rule Format:</h4>
            <pre>
              <code>{`{
  "name": "Intel CPU with AMD Chipset",
  "description": "Incompatible combination",
  "component1_id": 123,
  "component2_id": 456,
  "conditions": [
    {
      "field": "component1.brand",
      "operator": "==",
      "value": "Intel"
    },
    {
      "logic": "AND",
      "field": "component2.brand",
      "operator": "==",
      "value": "AMD"
    }
  ],
  "action": "block",
  "priority": 5,
  "enabled": true
}`}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <button 
            className="action-card"
            onClick={handleExportJSON}
            disabled={rules.length === 0}
          >
            <FiDownload size={32} />
            <h4>Backup All Rules</h4>
            <p>Export to JSON for safekeeping</p>
          </button>

          <button 
            className="action-card"
            onClick={() => document.getElementById('rule-import').click()}
          >
            <FiUpload size={32} />
            <h4>Restore from Backup</h4>
            <p>Import rules from JSON file</p>
          </button>

          <button 
            className="action-card"
            onClick={handleExportCSV}
            disabled={rules.length === 0}
          >
            <FiFile size={32} />
            <h4>Export for Analysis</h4>
            <p>Download as CSV spreadsheet</p>
          </button>
        </div>
      </div>
    </div>
  );
};

RuleImportExport.propTypes = {
  rules: PropTypes.arrayOf(PropTypes.object).isRequired,
  onImportComplete: PropTypes.func,
};

export default RuleImportExport;
