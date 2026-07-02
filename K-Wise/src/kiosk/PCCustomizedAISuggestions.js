import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PCCustomizedAISuggestions.css";
import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';
import { formatSpecifications } from '../utils/categoryHelpers';
import api from '../api/api';

// Import component icons
import CPU1 from "../assets/CPU1.webp";
import Motherboard2 from "../assets/Motherboard2.webp";
import GPU2 from "../assets/GPU1.webp";
import RAM1 from "../assets/RAM1.webp";
import Storage2 from "../assets/Storage2.webp";
import PSU2 from "../assets/PSU2.webp";
import CPUCooler from "../assets/CPUCooler.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import PCCustomized from "../assets/Customized.webp";

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
    const gamingPref = assessment.gamingPreference 
      ? gamingPrefMap[assessment.gamingPreference] 
      : null;

    // Build the key to search for (using hyphens to match database format)
    let buildKey;
    if (usage === "gaming" && gamingPref) {
      buildKey = `${usage}-${budget}-${performance}-${gamingPref}`;
    } else {
      buildKey = `${usage}-${budget}-${performance}`;
    }

    console.log("🔍 Searching for build key:", buildKey);
    console.log("📦 Available builds:", builds.map(b => b.key).slice(0, 5), "...");

    // Find the exact match
    const matchedBuild = builds.find(build => build.key === buildKey);
    
    if (matchedBuild) {
      console.log("✅ MATCH FOUND:", matchedBuild.key);
    } else {
      console.warn("❌ NO MATCH - Build key not found:", buildKey);
      console.warn("Available keys sample:", builds.slice(0, 3).map(b => b.key));
    }
    
    return matchedBuild;
  };

  const fetchBuildComponents = async (build) => {
    const componentIds = {
      cpu: build.cpu_id,
      cooling: build.cooling_id,
      motherboard: build.motherboard_id,
      ram: build.ram_id,
      storage: build.storage_id,
      gpu: build.gpu_id,
      case: build.case_id,
      psu: build.psu_id
    };

    const components = {};

    await Promise.all(
      Object.entries(componentIds).map(async ([category, productId]) => {
        if (!productId) {
          console.warn(`⚠️ No product ID for category: ${category}`);
          return;
        }

        try {
          const response = await axios.get(`${getApiBaseUrl()}/stock/${productId}`);
          if (response.data.success) {
            components[category] = response.data.data;
          } else {
            console.warn(`⚠️ Failed to fetch ${category} component:`, response.data.message);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${category} component:`, error);
        }
      })
    );

    return components;
  };

  const generateFallbackBuild = async (assessment) => {
    console.log("⚠️ Generating fallback build...");
    
    try {
      // Parse budget range to get max budget
      const budgetStr = assessment.budget || "26000-50000";
      let maxBudget = 50000; // Default
      
      if (budgetStr.includes("+")) {
        maxBudget = 120000;
      } else {
        const parts = budgetStr.split("-");
        if (parts.length === 2) {
          maxBudget = Number.parseInt(parts[1], 10);
        }
      }

      const allocatedBudget = {
        cpu: maxBudget * 0.25,
        cooling: maxBudget * 0.05,
        motherboard: maxBudget * 0.15,
        ram: maxBudget * 0.15,
        storage: maxBudget * 0.10,
        gpu: assessment.usage === "Gaming" ? maxBudget * 0.20 : 0,
        case: maxBudget * 0.05,
        psu: maxBudget * 0.05
      };

      // Fetch all products and select closest to allocated budget
      const categoriesResponse = await axios.get(`${getApiBaseUrl()}/stock/categories`);
      if (!categoriesResponse.data.success) {
        throw new Error('Failed to fetch categories');
      }

      const components = {};

      for (const [category, budget] of Object.entries(allocatedBudget)) {
        if (budget === 0) continue;

        try {
          const categoryResponse = await axios.get(`${getApiBaseUrl()}/stock`, { params: { category } });
          if (categoryResponse.data.success && categoryResponse.data.data.length > 0) {
            const products = categoryResponse.data.data;
            
            // Sort by closest price to allocated budget
            products.sort((a, b) => {
              const priceA = Number.parseFloat(a.price) || 0;
              const priceB = Number.parseFloat(b.price) || 0;
              return Math.abs(priceA - budget) - Math.abs(priceB - budget);
            });

            // Select the first (closest) product
            components[category] = products[0];
          }
        } catch (error) {
          console.error(`❌ Error fetching ${category} products:`, error);
        }
      }

      return components;
    } catch (error) {
      console.error("❌ Error generating fallback build:", error);
      return {};
    }
  };

  const handleProceedToCustomizer = () => {
    // Prepare the AI build data to pass to PCCustomized
    const aiCart = Object.entries({
      cpu: aiSuggestions.cpu,
      cooling: aiSuggestions.cooling,
      motherboard: aiSuggestions.motherboard,
      ram: aiSuggestions.ram,
      storage: aiSuggestions.storage,
      gpu: aiSuggestions.gpu,
      case: aiSuggestions.case,
      psu: aiSuggestions.psu
    })
      .filter(([key, component]) => component && component.product_id)
      .map(([key, component]) => ({
        ...component,
        category: key.charAt(0).toUpperCase() + key.slice(1)
      }));

    console.log("🚀 Proceeding to customizer with AI build:", aiCart);

    // Store in localStorage for persistence
    localStorage.setItem('aiCustomizedBuild', JSON.stringify(aiCart));

    // Navigate to PCCustomized with state
    navigate("/pc-customized", {
      state: {
        fromAI: true,
        aiCart: aiCart,
        assessment: assessment
      }
    });
  };

  // Category display order (standard PC build order)
  const categoryOrder = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];

  // Map category names to icons
  const categoryIcons = {
    'CPU': CPU1,
    'Cooling': CPUCooler,
    'Motherboard': Motherboard2,
    'RAM': RAM1,
    'Storage': Storage2,
    'GPU': GPU2,
    'Case': SystemUnit1,
    'PSU': PSU2
  };

  // Loading state
  if (loading) {
    return (
      <div className="ai-suggestions-loading">
        <div className="ai-loading-spinner"></div>
        <h2 className="ai-loading-title">Generating Your Perfect PC Build</h2>
        <p className="ai-loading-text">Analyzing your preferences with AI...</p>
        <p className="ai-loading-text">This may take a few seconds</p>
      </div>
    );
  }

  // Error state
  if (!aiSuggestions || Object.keys(aiSuggestions).length === 0) {
    return (
      <div className="ai-suggestions-error">
        <div className="ai-error-icon">⚠️</div>
        <h2 className="ai-error-title">Unable to Generate Build</h2>
        <p className="ai-error-text">
          We couldn't generate a PC build recommendation. This could be because:
        </p>
        <ul className="ai-error-list">
          <li>No products match your budget range</li>
          <li>Insufficient product inventory</li>
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

  // Format build components for display (vertical list design)
  const buildComponents = categoryOrder
    .map(category => {
      const categoryLower = category.toLowerCase();
      const component = aiSuggestions[categoryLower];
      
      // Get proper image URL using API utility
      let imageUrl = null;
      if (component?.image_url) {
        imageUrl = api.utils.getFullImageUrl(component.image_url);
      } else if (component?.imageUrl) {
        imageUrl = api.utils.getFullImageUrl(component.imageUrl);
      } else if (component?.image) {
        imageUrl = api.utils.getFullImageUrl(component.image);
      }
      
      return {
        category,
        icon: imageUrl || categoryIcons[category] || CPU1,
        name: component?.name || `No ${category}`,
        price: Number.parseFloat(component?.price) || 0,
        specifications: component?.specifications,
        stock: component?.stock || 0,
        hasProduct: !!component,
        productData: component
      };
    })
    .filter(item => item.hasProduct);

  // Calculate total price
  const totalPrice = buildComponents.reduce((sum, item) => {
    const price = Number.parseFloat(item?.price) || 0;
    return sum + price;
  }, 0);

  return (
    <div className="ai-suggestions-preview-container">
      {/* Header */}
      <div className="ai-suggestions-header">
        <img className="ai-suggestions-img" src={PCCustomized} alt="PC Customized AI" />
        <div className='ai-suggestions-title'>
          <h1 className='ai-suggestions-name'>PC CUSTOMIZED AI</h1>
          <p className='ai-suggestions-subtitle'>Your AI-Generated Build</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="ai-suggestions-content">
        <div className="ai-suggestions-intro">
          <h2 className="ai-suggestions-title-main">YOUR RECOMMENDED PC BUILD</h2>
          <p className="ai-suggestions-desc">
            Based on your assessment, here's your perfectly matched build
          </p>
          
          {/* AI Badge */}
          <div className="ai-confidence-badge">
            <span className="ai-confidence-icon">🤖</span>
            <span className="ai-confidence-label">Powered by Ollama Deepseek R1</span>
          </div>
        </div>

        {/* Build Summary Info */}
        <div className="ai-build-summary-info">
          <div className="ai-summary-item">
            <span className="ai-summary-label">Usage:</span>
            <span className="ai-summary-value">{assessment.usage || 'General'}</span>
          </div>
          <div className="ai-summary-item">
            <span className="ai-summary-label">Budget:</span>
            <span className="ai-summary-value">₱{assessment.budget || 'Not Set'}</span>
          </div>
          {assessment.performance && (
            <div className="ai-summary-item">
              <span className="ai-summary-label">Performance:</span>
              <span className="ai-summary-value">{assessment.performance}</span>
            </div>
          )}
          {assessment.gamingPreference && (
            <div className="ai-summary-item">
              <span className="ai-summary-label">Gaming:</span>
              <span className="ai-summary-value">{assessment.gamingPreference}</span>
            </div>
          )}
        </div>

        {/* Components List (Vertical Design like PC Upgrade Preview) */}
        <div className="ai-suggestions-components-scrollable">
          <div className="ai-suggestions-components-container">
            {buildComponents.map((component, index) => (
              <div key={component.category} className="ai-suggestions-component-step-container">
                <div className="ai-suggestions-component-step">
                  <div className="ai-suggestions-step-icon">
                    <img src={component.icon} alt={component.category} />
                  </div>
                  <div className="ai-suggestions-step-details">
                    <p className="ai-suggestions-step-title">
                      {component.name} <span className="ai-suggestions-category-label">({component.category})</span>
                    </p>
                    {component.price > 0 && (
                      <p className="ai-suggestions-step-price">
                        ₱{component.price.toLocaleString()}
                      </p>
                    )}
                    {component.specifications && (
                      <p className="ai-suggestions-step-specs">
                        {typeof component.specifications === 'string' 
                          ? component.specifications 
                          : formatSpecifications(component.specifications)}
                      </p>
                    )}
                  </div>
                  
                  {/* Stock Badge */}
                  <div className="ai-suggestions-status-badge">
                    {component.stock > 0 ? (
                      <span className="badge-in-stock">✓ In Stock</span>
                    ) : (
                      <span className="badge-out-stock">⚠️ Out of Stock</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Bottom Section */}
        <div className="ai-suggestions-fixed-bottom">
          {/* Total Price */}
          {totalPrice > 0 && (
            <div className="ai-suggestions-total-container">
              <div className="ai-suggestions-total-label">Estimated Total Cost:</div>
              <div className="ai-suggestions-total-price">₱{totalPrice.toLocaleString()}</div>
            </div>
          )}

          {/* Important Notice */}
          <div className="ai-suggestions-notice-container">
            <div className="ai-suggestions-notice-icon">💡</div>
            <div className="ai-suggestions-notice-content">
              <p className="ai-suggestions-notice-text">
                You can <strong>modify any component</strong> in the next step to customize your build further.
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="ai-suggestions-navigation-buttons">
            <button className="ai-suggestions-back-btn" onClick={() => navigate("/pc-customized-ai-assessment")}>
              <span>←</span> Back
            </button>
            <button className="ai-suggestions-next-btn" onClick={handleProceedToCustomizer}>
              Proceed to Customizer <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PCCustomizedAISuggestions;
