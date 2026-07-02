import React, { useState, useEffect } from "react";
import "./PCCheckup.css";
import CheckUp from "../assets/CheckUp.webp";
import { useNavigate } from "react-router-dom";
import api from "../api/api"; // API for diagnostic issues

const buildDiagnosticSummary = (selectedIssues, categories) => {
  const selectedSet = new Set(selectedIssues);
  const selectedCategories = categories
    .filter(cat => (cat.options || []).some(option => selectedSet.has(option)))
    .map(cat => cat.title);

  return {
    source: 'deterministic',
    selectedIssues,
    categories: selectedCategories,
    severity: selectedIssues.length > 5 ? 'high' : selectedIssues.length > 2 ? 'medium' : 'low',
    generatedAt: new Date().toISOString()
  };
};

function PCCheckup() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();

  // Load diagnostic issues from API on component mount
  useEffect(() => {
    let isMounted = true;

    const loadDiagnosticIssues = async () => {
      try {
        console.log('🔍 PCCheckup: Loading diagnostic issues from API...');
        setLoading(true);
        setError(null);
        
        const diagnosticCategories = await api.kiosk.getDiagnosticIssues();
        
        if (isMounted) {
          // Transform API data to match component structure
          const transformedCategories = diagnosticCategories.map(cat => ({
            title: cat.categoryDisplay || cat.category.toUpperCase(),
            category: cat.category,
            options: (cat.options || []).map(opt => opt.name).filter(Boolean)
          }));
          
          setCategories(transformedCategories);
          setLoading(false);
          console.log('✅ PCCheckup: Loaded', transformedCategories.length, 'diagnostic categories');
        }
      } catch (err) {
        console.error('❌ PCCheckup: Error loading diagnostic issues:', err);
        if (isMounted) {
          setError('Failed to load diagnostic options. Please try again.');
          setLoading(false);
          
          // Fallback to basic categories if API fails
          setCategories([
            {
              title: "PERFORMANCE ISSUES",
              options: ["Slow startup", "Frequently freezing"],
            },
            {
              title: "COMPUTER HARDWARE",
              options: ["Overheating", "Battery depletion", "Won't turn on", "Makes weird sounds"],
            }
          ]);
        }
      }
    };

    loadDiagnosticIssues();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = (option) => {
    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const handleNext = async () => {
    if (selected.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      localStorage.setItem("diagnosticIssues", JSON.stringify(selected));
      localStorage.setItem("diagnosticCategories", JSON.stringify(categories));
      localStorage.setItem("diagnosticAnalysis", JSON.stringify(buildDiagnosticSummary(selected, categories)));
      localStorage.removeItem("aiDiagnosticAnalysis");
      
      console.log('Diagnostic summary prepared:', selected.length, 'issues');
      
      navigate("/review-issues");
      
    } catch (error) {
      console.error('Diagnostic summary failed:', error);
      
      localStorage.setItem("diagnosticIssues", JSON.stringify(selected));
      navigate("/review-issues");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="pc-checkup-container">
        <div className="pc-checkup-header">
          <img src={CheckUp} alt="PC Check Up" className="pc-checkup-icon" />
          <div className="pc-checkup-title">
            <h1 className="pc-checkup-name">PC CHECK UP</h1>
            <p className="pc-checkup-subtitle">Prevent the Crash</p>
          </div>
        </div>
        <div className="pc-checkup-intro">
          <h2 className="pc-checkup-section-title">LOADING...</h2>
          <p className="pc-checkup-section-desc">Fetching diagnostic options</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && categories.length === 0) {
    return (
      <div className="pc-checkup-container">
        <div className="pc-checkup-header">
          <img src={CheckUp} alt="PC Check Up" className="pc-checkup-icon" />
          <div className="pc-checkup-title">
            <h1 className="pc-checkup-name">PC CHECK UP</h1>
            <p className="pc-checkup-subtitle">Prevent the Crash</p>
          </div>
        </div>
        <div className="pc-checkup-intro">
          <h2 className="pc-checkup-section-title">ERROR</h2>
          <p className="pc-checkup-section-desc" style={{ color: 'red' }}>{error}</p>
          <button 
            className="pc-checkup-next-btn" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-checkup-container">
      <div className="pc-checkup-header">
        <img src={CheckUp} alt="PC Check Up" className="pc-checkup-icon" />
        <div className="pc-checkup-title">
          <h1 className="pc-checkup-name">PC CHECK UP</h1>
          <p className="pc-checkup-subtitle">Prevent the Crash</p>
        </div>
      </div>

      <div className="pc-checkup-intro">
        <h2 className="pc-checkup-section-title">DIAGNOSTIC TEST</h2>
        <p className="pc-checkup-section-desc">Select all that applies</p>
      </div>

      <div className="pc-checkup-content">
        <div className="pc-checkup-scrollable">
          {categories.map((cat) => (
            <div key={cat.title} className="pc-checkup-category">
              <h3 className="pc-checkup-category-title">{cat.title}</h3>
              <div className="pc-checkup-options-row">
                {(cat.options || []).map((option) => (
                  <button
                    key={option}
                    className={`pc-checkup-option-btn${selected.includes(option) ? " selected" : ""}`}
                    onClick={() => handleToggle(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pc-checkup-actions">
        <button className="pc-checkup-back-btn" onClick={() => navigate(-1)}>
          Back
        </button>
        <button
          className="pc-checkup-next-btn"
          onClick={handleNext}
          disabled={selected.length === 0 || isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing...' : 'Next'}
        </button>
      </div>
    </div>
  );
}

export default PCCheckup;
