import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiPlay, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';

/**
 * RuleTester - Test rule against sample data
 * Allows users to validate rules before saving
 */
const RuleTester = ({ component1, component2, conditions, onTest, testResults }) => {
  const [testData, setTestData] = useState({
    component1_specs: {},
    component2_specs: {}
  });
  const [testing, setTesting] = useState(false);

  const handleAddTestField = (component, field, value) => {
    setTestData(prev => ({
      ...prev,
      [`${component}_specs`]: {
        ...prev[`${component}_specs`],
        [field]: value
      }
    }));
  };

  const handleRunTest = async () => {
    setTesting(true);
    try {
      await onTest(testData);
    } finally {
      setTesting(false);
    }
  };

  const getResultIcon = (passed) => {
    if (passed === null) return <FiAlertTriangle color="#f59e0b" />;
    return passed ? <FiCheckCircle color="#10b981" /> : <FiXCircle color="#ef4444" />;
  };

  return (
    <div className="rule-tester">
      <h2>Test Rule</h2>
      <p className="section-description">
        Test your rule with sample data to verify it works as expected
      </p>

      <div className="test-grid">
        {/* Component 1 Test Data */}
        <div className="test-section">
          <h3>{component1?.name || 'Component 1'} Test Data</h3>
          <div className="test-fields">
            {conditions
              .filter(c => c.field.startsWith('component1.'))
              .map(c => {
                const fieldName = c.field.replace('component1.', '');
                return (
                  <div key={c.id} className="test-field">
                    <label>{fieldName}</label>
                    <input
                      type="text"
                      placeholder={`Enter ${fieldName}...`}
                      value={testData.component1_specs[fieldName] || ''}
                      onChange={(e) => handleAddTestField('component1', fieldName, e.target.value)}
                    />
                  </div>
                );
              })}
          </div>
        </div>

        {/* Component 2 Test Data */}
        <div className="test-section">
          <h3>{component2?.name || 'Component 2'} Test Data</h3>
          <div className="test-fields">
            {conditions
              .filter(c => c.field.startsWith('component2.'))
              .map(c => {
                const fieldName = c.field.replace('component2.', '');
                return (
                  <div key={c.id} className="test-field">
                    <label>{fieldName}</label>
                    <input
                      type="text"
                      placeholder={`Enter ${fieldName}...`}
                      value={testData.component2_specs[fieldName] || ''}
                      onChange={(e) => handleAddTestField('component2', fieldName, e.target.value)}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="test-actions">
        <button
          className="btn btn-primary"
          onClick={handleRunTest}
          disabled={testing || conditions.length === 0}
        >
          <FiPlay /> {testing ? 'Testing...' : 'Run Test'}
        </button>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="test-results">
          <h3>Test Results</h3>
          <div className={`result-summary ${testResults.passed ? 'passed' : 'failed'}`}>
            {getResultIcon(testResults.passed)}
            <div className="result-text">
              <h4>{testResults.passed ? 'Test Passed ✅' : 'Test Failed ❌'}</h4>
              <p>{testResults.message}</p>
            </div>
          </div>

          {testResults.details && (
            <div className="result-details">
              <h4>Condition Results:</h4>
              <ul>
                {testResults.details.map((detail, index) => (
                  <li key={`${detail.condition}-${index}`} className={detail.passed ? 'passed' : 'failed'}>
                    {getResultIcon(detail.passed)}
                    <code>{detail.condition}</code>
                    <span className="result-value">{detail.result}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

RuleTester.propTypes = {
  component1: PropTypes.shape({
    name: PropTypes.string,
  }),
  component2: PropTypes.shape({
    name: PropTypes.string,
  }),
  conditions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      field: PropTypes.string,
    })
  ).isRequired,
  onTest: PropTypes.func.isRequired,
  testResults: PropTypes.shape({
    passed: PropTypes.bool,
    message: PropTypes.string,
    details: PropTypes.arrayOf(
      PropTypes.shape({
        condition: PropTypes.string,
        passed: PropTypes.bool,
        result: PropTypes.string,
      })
    ),
  }),
};

export default RuleTester;
