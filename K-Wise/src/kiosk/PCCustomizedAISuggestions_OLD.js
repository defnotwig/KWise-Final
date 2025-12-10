import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PCCustomizedAISuggestions.css";
import logo from "../assets/LOGO1.webp";
import { stockAPI } from "../services/api";
import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';
import { formatSpecifications } from '../utils/categoryHelpers';

function PCCustomizedAISuggestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const assessment = location.state?.assessment || {};

  useEffect(() => {
    generateAIBuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateAIBuild = async () => {
    setLoading(true);
    
    try {
      console.log("🤖 Fetching reference builds based on assessment:", assessment);

      // Fetch reference builds from backend using axios
      const buildsResponse = await axios.get(`${getApiBaseUrl()}/pc-customized-ai-builds/all`);
      
      if (!buildsResponse.data.success) {
        throw new Error('Failed to fetch reference builds');
      }

      const allBuilds = buildsResponse.data.data.builds;
      console.log("📦 Fetched reference builds:", Object.keys(allBuilds).length, "builds");

      // Find matching build based on assessment parameters
      const matchingBuild = findMatchingBuild(allBuilds, assessment);
      
      if (!matchingBuild) {
        console.warn("⚠️ No matching reference build found, using fallback");
        const fallbackBuild = await generateFallbackBuild(assessment);
        setAiSuggestions(fallbackBuild);
        setLoading(false);
        return;
      }

      console.log("✅ Found matching build:", matchingBuild.key);

      // Fetch full product details for each component
      const buildComponents = await fetchBuildComponents(matchingBuild.build);
      
      setAiSuggestions(buildComponents);
      
    } catch (error) {
      console.error("❌ Error fetching AI build:", error);
      
      // Fallback: Generate basic build without reference builds
      const fallbackBuild = await generateFallbackBuild(assessment);
      setAiSuggestions(fallbackBuild);
    } finally {
      setLoading(false);
    }
  };

  const findMatchingBuild = (builds, assessment) => {
    // Normalize assessment values to match database keys
    const usageMap = {
      "Gaming": "gaming",
      "Work": "work",
      "Content Creation": "content-creation",
      "General Use": "general-use",
      "Programming": "programming",
      "Video Editing": "video-editing"
    };

    const budgetMap = {
      "10000-25000": "10000-25000",
      "26000-50000": "26000-50000",
      "51000-75000": "51000-75000",
      "76000-100000": "76000-100000",
      "100000+": "100000+"
    };

    const performanceMap = {
      "Balanced": "balanced",
      "Performance": "performance",
      "Budget": "budget"
    };

    const gamingPrefMap = {
      "Competitive FPS": "competitive-fps",
      "AAA Games": "aaa-games",
      "Casual Gaming": "casual-gaming",
      "Streaming & Gaming": "streaming-gaming"
    };

    const usage = usageMap[assessment.usage] || "general-use";
    const budget = budgetMap[assessment.budget] || "26000-50000";
    const performance = performanceMap[assessment.performance] || "balanced";
    const gaming = assessment.gaming ? gamingPrefMap[assessment.gaming] : null;

    // Try to find exact match
    let buildKey;
    if (usage === "gaming" && gaming) {
      buildKey = `${usage}-${budget}-${performance}-${gaming}`;
    } else {
      buildKey = `${usage}-${budget}-${performance}`;
    }
    
    console.log("🔍 Looking for build key:", buildKey);
    console.log("📊 Assessment:", { usage, budget, performance, gaming });
    console.log("📦 Available builds:", Object.keys(builds).length);

    if (builds[buildKey]) {
      console.log("✅ Found exact match!");
      return { key: buildKey, build: builds[buildKey] };
    }

    // If no exact match with gaming pref, try without gaming pref
    if (usage === "gaming" && gaming) {
      const fallbackKey = `${usage}-${budget}-${performance}`;
      if (builds[fallbackKey]) {
        console.log("✅ Found fallback gaming build (no pref)");
        return { key: fallbackKey, build: builds[fallbackKey] };
      }
    }

    // If no exact match, find closest budget match
    const matchingBuilds = Object.entries(builds).filter(([key, build]) => {
      return build.usage === usage && build.performance === performance;
    });

    if (matchingBuilds.length > 0) {
      console.log("🔍 Found alternative builds:", matchingBuilds.length);
      return { key: matchingBuilds[0][0], build: matchingBuilds[0][1] };
    }

    console.warn("⚠️ No matching build found for criteria");
    return null;
  };

  const fetchBuildComponents = async (build) => {
    try {
      // Fetch all components from stockAPI
      const componentIds = {
        cpu: build.components.cpu,
        gpu: build.components.gpu,
        motherboard: build.components.motherboard,
        ram: build.components.ram,
        storage: build.components.storage,
        psu: build.components.psu,
        case: build.components.case,
        cooling: build.components.cooling
      };

      console.log("📦 Fetching component details:", componentIds);

      // Fetch all products (we'll filter locally for speed)
      const allProductsResponse = await stockAPI.getAll({ limit: 500 });
      const allProducts = allProductsResponse.data.data || allProductsResponse.data || [];

      // Map component IDs to actual products
      const components = {};
      for (const [key, id] of Object.entries(componentIds)) {
        if (id) {
          const product = allProducts.find(p => p.id === id);
          if (product) {
            components[key] = product;
          } else {
            console.warn(`⚠️ Component not found for ${key} (ID: ${id})`);
          }
        }
      }

      return components;
    } catch (error) {
      console.error("❌ Error fetching build components:", error);
      throw error;
    }
  };

  const generateFallbackBuild = async (assessment) => {
    try {
      // Fallback: Fetch products and generate build locally
      const categories = ["CPU", "Cooling", "Motherboard", "RAM", "Storage", "GPU", "Case", "PSU"];
      const productsPromises = categories.map(cat => 
        stockAPI.getAll({ category: cat, limit: 20, inStock: true })
      );

      const productsResults = await Promise.all(productsPromises);
      const allProducts = {};
      categories.forEach((cat, idx) => {
        const result = productsResults[idx];
        allProducts[cat] = result.data?.data || result.data || [];
      });

      // Parse budget
      const budgetRange = assessment.budget?.split("-") || ["30000", "50000"];
      const minBudget = parseInt(budgetRange[0].replace(/[^0-9]/g, "")) || 30000;
      const maxBudget = budgetRange[1] === "+" ? minBudget * 2 : parseInt(budgetRange[1]?.replace(/[^0-9]/g, "") || "50000");
      const targetBudget = (minBudget + maxBudget) / 2;

      // Simple component selection
      const selectProduct = (category, allocatedBudget) => {
        const available = allProducts[category] || [];
        if (available.length === 0) return null;

        const sorted = available
          .filter(p => p.stock > 0)
          .sort((a, b) => {
            const priceA = parseFloat(a.price) || 0;
            const priceB = parseFloat(b.price) || 0;
            return Math.abs(priceA - allocatedBudget) - Math.abs(priceB - allocatedBudget);
          });
        
        return sorted[0] || available[0];
      };

      const budgetAllocation = {
        CPU: 0.25, GPU: 0.30, RAM: 0.12, Storage: 0.10, 
        Motherboard: 0.10, PSU: 0.08, Case: 0.03, Cooling: 0.02
      };

      const components = {
        cpu: selectProduct("CPU", targetBudget * budgetAllocation.CPU),
        cooling: selectProduct("Cooling", targetBudget * budgetAllocation.Cooling),
        motherboard: selectProduct("Motherboard", targetBudget * budgetAllocation.Motherboard),
        ram: selectProduct("RAM", targetBudget * budgetAllocation.RAM),
        storage: selectProduct("Storage", targetBudget * budgetAllocation.Storage),
        gpu: selectProduct("GPU", targetBudget * budgetAllocation.GPU),
        case: selectProduct("Case", targetBudget * budgetAllocation.Case),
        psu: selectProduct("PSU", targetBudget * budgetAllocation.PSU)
      };

      return components;
    } catch (error) {
      console.error("❌ Fallback build generation failed:", error);
      return {};
    }
  };

  const handleProceedToCustomizer = () => {
    if (!aiSuggestions || !aiSuggestions.cpu) {
      // No components available, go to customizer with empty state
      navigate("/pc-customized");
      return;
    }

    // Store AI-selected components in localStorage for PC Customizer to use
    const customizedBuild = {
      cpu: aiSuggestions.cpu || null,
      cooling: aiSuggestions.cooling || null,
      motherboard: aiSuggestions.motherboard || null,
      ram: aiSuggestions.ram || null,
      storage: aiSuggestions.storage || null,
      gpu: aiSuggestions.gpu || null,
      case: aiSuggestions.case || null,
      psu: aiSuggestions.psu || null
    };

    localStorage.setItem("aiCustomizedBuild", JSON.stringify(customizedBuild));
    
    // Navigate to PC Customizer with AI suggestions pre-filled
    navigate("/pc-customized", {
      state: {
        aiSuggested: true,
        aiComponents: customizedBuild
      }
    });
  };

  if (loading) {
    return (
      <div className="ai-suggestions-loading">
        <div className="ai-logo-container">
          <img src={logo} alt="K-Wise Logo" className="ai-logo" />
        </div>
        <h1 className="ai-loading-title">🤖 AI is generating your perfect PC...</h1>
        <div className="ai-loading-spinner"></div>
        <p className="ai-loading-text">Analyzing your preferences and matching components</p>
      </div>
    );
  }

  if (!aiSuggestions || Object.keys(aiSuggestions).length === 0) {
    return (
      <div className="ai-suggestions-error">
        <div className="ai-logo-container">
          <img src={logo} alt="K-Wise Logo" className="ai-logo" />
        </div>
        <h1 className="ai-error-title">⚠️ No Build Found</h1>
        <p className="ai-error-text">
          We couldn't generate a build matching your criteria. This might be because:
        </p>
        <ul className="ai-error-list">
          <li>No products available for your budget range</li>
          <li>Insufficient stock for complete builds</li>
          <li>Reference builds need to be regenerated</li>
        </ul>
        <div className="ai-error-actions">
          <button 
            className="ai-back-button" 
            onClick={() => navigate("/pc-customized-ai-assessment")}
          >
            ← Try Different Options
          </button>
          <button 
            className="ai-proceed-button"
            onClick={() => navigate("/pc-customized")}
          >
            Build from Scratch →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-suggestions-container">
      {/* Logo */}
      <div className="ai-logo-container">
        <img src={logo} alt="K-Wise Logo" className="ai-logo" />
      </div>

      {/* Title */}
      <div className="ai-title-section">
        <div className="ai-icon">🎯</div>
        <h1 className="ai-main-title">YOUR CUSTOMIZED PC</h1>
        <p className="ai-subtitle">AI-Generated Build Recommendation</p>
        <p className="ai-powered">Powered by Ollama Deepseek R1</p>
      </div>

      {/* Build Summary */}
      {aiSuggestions && (
        <div className="ai-build-summary">
          <div className="ai-build-header">
            <h2>Recommended Build</h2>
            <div className="ai-build-total">
              <span className="ai-total-label">Estimated Total:</span>
              <span className="ai-total-amount">
                ₱{(() => {
                  const components = [
                    aiSuggestions.cpu,
                    aiSuggestions.cooling,
                    aiSuggestions.motherboard,
                    aiSuggestions.ram,
                    aiSuggestions.storage,
                    aiSuggestions.gpu,
                    aiSuggestions.case,
                    aiSuggestions.psu
                  ];
                  const total = components.reduce((sum, comp) => {
                    const price = parseFloat(comp?.price) || 0;
                    return sum + price;
                  }, 0);
                  return total.toLocaleString();
                })()}
              </span>
            </div>
          </div>

          {/* Components Grid */}
          <div className="ai-components-grid">
            {Object.entries({
              cpu: aiSuggestions.cpu,
              cooling: aiSuggestions.cooling,
              motherboard: aiSuggestions.motherboard,
              ram: aiSuggestions.ram,
              storage: aiSuggestions.storage,
              gpu: aiSuggestions.gpu,
              case: aiSuggestions.case,
              psu: aiSuggestions.psu
            }).map(([key, component]) => {
              if (!component) return null;
              
              return (
                <div key={key} className="ai-component-card">
                  <div className="ai-component-header">
                    <span className="ai-component-icon">
                      {key === "cpu" && "🎮"}
                      {key === "cooling" && "❄️"}
                      {key === "motherboard" && "🔌"}
                      {key === "ram" && "💾"}
                      {key === "storage" && "💿"}
                      {key === "gpu" && "🎨"}
                      {key === "case" && "📦"}
                      {key === "psu" && "⚡"}
                    </span>
                    <span className="ai-component-category">{key.toUpperCase()}</span>
                  </div>
                  <h3 className="ai-component-name">{component.name}</h3>
                  <p className="ai-component-price">₱{parseFloat(component.price || 0).toLocaleString()}</p>
                  {component.specifications && (
                    <p className="ai-component-specs">
                      {typeof component.specifications === 'string' 
                        ? component.specifications 
                        : formatSpecifications(component.specifications)}
                    </p>
                  )}
                  <div className="ai-component-stock">
                    {component.stock > 0 ? (
                      <span className="in-stock">✅ In Stock ({component.stock})</span>
                    ) : (
                      <span className="out-of-stock">⚠️ Out of Stock</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Message */}
          <div className="ai-message-box">
            <span className="ai-message-icon">💡</span>
            <p className="ai-message-text">
              AI-powered build recommendation based on your preferences: {assessment.usage}, 
              {assessment.budget && ` Budget: ${assessment.budget},`}
              {assessment.performance && ` Performance: ${assessment.performance}`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="ai-action-buttons">
            <button 
              className="ai-proceed-button"
              onClick={handleProceedToCustomizer}
            >
              Proceed to Customizer →
            </button>
            <p className="ai-action-note">
              You can modify any component in the next step
            </p>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button 
        className="ai-back-button" 
        onClick={() => navigate("/pc-customized-ai-assessment")}
      >
        ← Back to Assessment
      </button>
    </div>
  );
}

export default PCCustomizedAISuggestions;

