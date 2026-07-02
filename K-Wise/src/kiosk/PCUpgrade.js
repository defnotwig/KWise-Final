import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PCUpgrade.css';
import './PCCustomized.css';
import './PCUpgradeEstimate.css'; // NEW - PCCleaningAssessment-style design
import PcUpgrade from "../assets/PCUpgrade.webp";
import api from '../api/api'; // API for fetching upgrade categories
import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';
import CompatibilityValidationModal from "../components/CompatibilityValidationModal"; // ✅ ENHANCED COMPATIBILITY MODAL

// Import your component icons
import CPU1 from "../assets/CPU1.webp";
import Motherboard2 from "../assets/Motherboard2.webp";
import GPU2 from "../assets/GPU1.webp";
import RAM1 from "../assets/RAM1.webp";
import Storage2 from "../assets/Storage2.webp";
import PSU2 from "../assets/PSU2.webp";
import CPUCooler from "../assets/CPUCooler.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";

// Import usage type SVG icons
import gaming from '../assets/UsageSelection/gaming.svg';
import work from '../assets/UsageSelection/work.svg';
import contentcreation from '../assets/UsageSelection/contentcreation.svg';
import generaluse from '../assets/UsageSelection/generaluse.svg';
import programming from '../assets/UsageSelection/programming.svg';
import videoediting from '../assets/UsageSelection/videoediting.svg';
import recent from "../assets/PCUpgrade/recent.svg";
import midage from "../assets/PCUpgrade/midage.svg";
import old from "../assets/PCUpgrade/old.svg";

const CATEGORY_TO_UPGRADE_ID = {
  CPU: 'processor',
  GPU: 'gpu',
  RAM: 'ram',
  Storage: 'storage',
  Motherboard: 'motherboard',
  PSU: 'psu',
  Cooling: 'cpu-cooler',
  Case: 'chassis'
};

const getAgeBand = (yearPurchased) => {
  const year = Number.parseInt(yearPurchased, 10);
  if (!year) return 'unknown';

  const age = Math.max(0, new Date().getFullYear() - year);
  if (age <= 3) return 'recent';
  if (age <= 7) return 'mid';
  return 'old';
};

const getBudgetBand = (budget) => {
  const value = Number.parseInt(budget, 10);
  if (!value) return 'unknown';
  if (value < 26000) return 'entry';
  if (value < 51000) return 'mainstream';
  if (value < 76000) return 'performance';
  return 'highEnd';
};

const uniqueCategories = (categories) => [...new Set(categories.filter(Boolean))];

const buildLocalUpgradeEstimate = ({ usage, yearPurchased, budget }) => {
  const ageBand = getAgeBand(yearPurchased);
  const budgetBand = getBudgetBand(budget);
  const normalizedUsage = String(usage || 'General Use').toLowerCase();

  const generationLabel = ageBand === 'recent'
    ? 'recent-generation'
    : ageBand === 'mid'
      ? 'mid-generation'
      : 'older-generation';
  const budgetLabel = budgetBand === 'highEnd'
    ? 'high-performance'
    : budgetBand === 'performance'
      ? 'performance'
      : budgetBand === 'mainstream'
        ? 'mainstream'
        : 'entry-level';

  const estimated = {
    CPU: `${generationLabel} ${budgetLabel} CPU class`,
    Motherboard: `${generationLabel} motherboard platform`,
    RAM: ageBand === 'recent' ? '16GB or higher DDR4/DDR5 memory' : '8GB to 16GB DDR3/DDR4 memory',
    Storage: budgetBand === 'entry' ? 'SATA SSD or hard drive storage' : 'SSD-based storage',
    GPU: normalizedUsage.includes('gaming') || normalizedUsage.includes('video') || normalizedUsage.includes('content')
      ? `${budgetLabel} dedicated graphics card`
      : 'integrated or entry dedicated graphics',
    PSU: budgetBand === 'highEnd' || normalizedUsage.includes('gaming') ? '600W+ power supply class' : '450W to 550W power supply class',
    Cooling: ageBand === 'old' ? 'stock or aging air cooler' : 'standard CPU cooling',
    Case: 'standard ATX or mATX case'
  };

  let suggestedCategories = ['RAM', 'Storage'];
  if (normalizedUsage.includes('gaming')) {
    suggestedCategories = ['GPU', 'RAM', 'CPU', 'PSU'];
  } else if (normalizedUsage.includes('content') || normalizedUsage.includes('video')) {
    suggestedCategories = ['CPU', 'GPU', 'RAM', 'Storage'];
  } else if (normalizedUsage.includes('programming') || normalizedUsage.includes('work')) {
    suggestedCategories = ['RAM', 'Storage', 'CPU'];
  }

  if (ageBand === 'old') {
    suggestedCategories.push('Motherboard', 'PSU', 'Cooling');
  } else if (ageBand === 'mid') {
    suggestedCategories.push('CPU');
  }

  const confidence = ageBand === 'unknown' || budgetBand === 'unknown' ? 0.62 : ageBand === 'old' ? 0.68 : 0.74;

  return {
    estimated,
    matched: {},
    confidence,
    suggestedCategories: uniqueCategories(suggestedCategories)
  };
};

const buildLocalRecommendations = (selectedCategories, usage) => {
  const categories = uniqueCategories(selectedCategories.length ? selectedCategories : ['RAM', 'Storage']);
  const primary = categories[0] || 'RAM';
  const secondary = categories[1] || primary;
  const tertiary = categories[2] || secondary;

  const makeRecommendation = (tier, priority, price) => ({
    tier,
    priority,
    component: {
      name: `${tier} ${priority} upgrade path for ${usage || 'General Use'}`,
      price
    },
    performanceGain: tier === 'Budget' ? 'Moderate uplift' : tier === 'Balanced' ? 'Strong uplift' : 'Maximum practical uplift',
    compatibility: 'Verify exact model against selected parts before checkout'
  });

  return {
    bottlenecks: categories,
    recommendations: {
      budget: makeRecommendation('Budget', primary, 5000),
      midRange: makeRecommendation('Balanced', secondary, 12000),
      highEnd: makeRecommendation('Performance', tertiary, 25000)
    }
  };
};

const formatConfidencePercent = (confidence) => {
  const value = Number(confidence) || 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
};

const PCUpgrade = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUpgrades, setSelectedUpgrades] = useState([]);
  const [step, setStep] = useState('estimate-build'); // 'estimate-build', 'view-build', 'select-upgrades', or 'current-parts'
  const [currentParts, setCurrentParts] = useState({}); // 🔥 KEEP: AI estimated build (display only, NOT for ordering)
  const [upgradeParts, setUpgradeParts] = useState({}); // 🔥 NEW: Actual parts selected to purchase
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterContext, setFilterContext] = useState({ catKey: null, idx: null, options: [], title: "", selected: null, error: null, noResults: false });
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSelectAgainModal, setShowSelectAgainModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showCompatibilityValidationModal, setShowCompatibilityValidationModal] = useState(false); // ✅ NEW: Enhanced validation modal
  
  // AI Enhancement State
  // eslint-disable-next-line no-unused-vars
  const [aiRecommendations, setAiRecommendations] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [isAnalyzingUpgrades, setIsAnalyzingUpgrades] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [aiUpgradeError, setAiUpgradeError] = useState(null);
  
  // NEW - Phase 1: "Estimate My PC" State (No longer modal - full screen)
  const [showEstimateModal, setShowEstimateModal] = useState(false); // Keep for backward compat
  const [estimateData, setEstimateData] = useState({
    usage: '',
    yearPurchased: '',
    budget: '',
    knownParts: {}
  });
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('usage'); // For multi-step estimate form
  
  // NEW - Store AI estimation results
  const [estimatedBuild, setEstimatedBuild] = useState(null);
  const [aiSuggestedCategories, setAiSuggestedCategories] = useState([]);
  const [buildConfidence, setBuildConfidence] = useState(0);
  
  // NEW - Phase 2: "AI Recommendations" Modal State
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [recommendationsError, setRecommendationsError] = useState(null);
  const [estimatedUsage, setEstimatedUsage] = useState('Gaming'); // Store usage from estimation

  // PC Upgrade Parameters - Dynamic from Database
  const [usageTypes, setUsageTypes] = useState([]);
  const [yearRanges, setYearRanges] = useState([]);
  const [budgetRanges, setBudgetRanges] = useState([]);
  const [parametersLoading, setParametersLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [parametersError, setParametersError] = useState(null);

  // Default fallback categories with fixed database mapping
  const DEFAULT_UPGRADE_OPTIONS = [
    { id: 'ram', name: 'RAM (MEMORY)', image: RAM1, category: 'RAM' },
    { id: 'storage', name: 'STORAGE', image: Storage2, category: 'Storage' },
    { id: 'gpu', name: 'GPU', image: GPU2, category: 'GPU' },
    { id: 'processor', name: 'PROCESSOR', image: CPU1, category: 'CPU' },
    { id: 'motherboard', name: 'MOTHERBOARD', image: Motherboard2, category: 'Motherboard' },
    { id: 'psu', name: 'PSU', image: PSU2, category: 'PSU' },
    { id: 'cpu-cooler', name: 'CPU COOLER', image: CPUCooler, category: 'Cooling' },
    { id: 'chassis', name: 'CHASSIS', image: SystemUnit1, category: 'Case' }
  ];

  // Dynamic upgrade categories state - Initialize with fallback to prevent crashes
  const [upgradeOptions, setUpgradeOptions] = useState(DEFAULT_UPGRADE_OPTIONS);

  // Map upgrade options to menuItems structure for product browsing
  // This maps the UI IDs to the currentParts category keys used internally
  const menuItems = useMemo(() => {
    return [
      { id: 'ram', name: 'RAM (MEMORY)', category: 'ram', image: RAM1, brands: [], products: [] },
      { id: 'storage', name: 'STORAGE', category: 'storage', image: Storage2, brands: [], products: [] },
      { id: 'gpu', name: 'GPU', category: 'gpu', image: GPU2, brands: [], products: [] },  // 🔥 FIX: Changed from 'graphcard' to 'gpu'
      { id: 'processor', name: 'PROCESSOR', category: 'cpu', image: CPU1, brands: [], products: [] },
      { id: 'motherboard', name: 'MOTHERBOARD', category: 'motherboard', image: Motherboard2, brands: [], products: [] },
      { id: 'psu', name: 'PSU', category: 'power supply', image: PSU2, brands: [], products: [] },
      { id: 'cpu-cooler', name: 'CPU COOLER', category: 'cpu-cooler', image: CPUCooler, brands: [], products: [] },
      { id: 'chassis', name: 'CHASSIS', category: 'case', image: SystemUnit1, brands: [], products: [] }
    ];
  }, []);

  // Map of images by category ID
  const categoryImages = {
    'ram': RAM1,
    'storage': Storage2,
    'gpu': GPU2,
    'processor': CPU1,
    'motherboard': Motherboard2,
    'psu': PSU2,
    'cpu-cooler': CPUCooler,
    'chassis': SystemUnit1
  };

  // Load upgrade categories from API on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadUpgradeCategories = async () => {
      try {
        console.log('🔧 PCUpgrade: Loading upgrade categories from API...');
        
        const categories = await api.kiosk.getUpgradeCategories();
        
        if (isMounted) {
          // Map API data to component structure with images
          const categoriesWithImages = categories.map(cat => ({
            ...cat,
            image: categoryImages[cat.id] || RAM1 // Fallback to RAM image
          }));
          
          setUpgradeOptions(categoriesWithImages);
          console.log('✅ PCUpgrade: Loaded', categoriesWithImages.length, 'upgrade categories');
        }
      } catch (err) {
        console.error('❌ PCUpgrade: Error loading upgrade categories:', err);
        if (isMounted) {
          setUpgradeOptions(DEFAULT_UPGRADE_OPTIONS);
        }
      }
    };
    
    loadUpgradeCategories();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load PC Upgrade Parameters from API
  useEffect(() => {
    let isMounted = true;
    
    const loadParameters = async () => {
      try {
        console.log('🔧 PCUpgrade: Loading PC upgrade parameters from API...');
        setParametersLoading(true);
        setParametersError(null);
        
        const response = await axios.get(`${getApiBaseUrl()}/kiosk/pc-upgrade-parameters`);
        
        if (isMounted && response.data.success) {
          setUsageTypes(response.data.data.usageTypes || []);
          setYearRanges(response.data.data.yearRanges || []);
          setBudgetRanges(response.data.data.budgetRanges || []);
          console.log('✅ PCUpgrade: Loaded parameters -', 
            response.data.data.usageTypes?.length, 'usage types,',
            response.data.data.yearRanges?.length, 'year ranges,',
            response.data.data.budgetRanges?.length, 'budget ranges'
          );
        }
      } catch (err) {
        console.error('❌ PCUpgrade: Error loading parameters:', err);
        if (isMounted) {
          setParametersError('Failed to load parameters');
          // Set fallback values
          setUsageTypes([
            { id: 1, name: 'gaming', display_name: 'Gaming' },
            { id: 2, name: 'work', display_name: 'Work' },
            { id: 3, name: 'content_creation', display_name: 'Content Creation' },
            { id: 4, name: 'general', display_name: 'General Use' },
            { id: 5, name: 'programming', display_name: 'Programming' },
            { id: 6, name: 'video_editing', display_name: 'Video Editing' }
          ]);
          setYearRanges([
            { id: 1, name: '2021-2025', display_name: '2021-2025 (Recent)', start_year: 2021, end_year: 2025, representative_year: 2022 },
            { id: 2, name: '2016-2020', display_name: '2016-2020 (Mid-Age)', start_year: 2016, end_year: 2020, representative_year: 2018 },
            { id: 3, name: '2010-2015', display_name: '2010-2015 (Old)', start_year: 2010, end_year: 2015, representative_year: 2012 }
          ]);
          setBudgetRanges([
            { id: 1, name: '10000-25000', display_name: '₱10,000 - ₱25,000', min_budget: 10000, max_budget: 25000, representative_budget: 17500 },
            { id: 2, name: '26000-50000', display_name: '₱26,000 - ₱50,000', min_budget: 26000, max_budget: 50000, representative_budget: 38000 },
            { id: 3, name: '51000-75000', display_name: '₱51,000 - ₱75,000', min_budget: 51000, max_budget: 75000, representative_budget: 63000 },
            { id: 4, name: '76000-100000', display_name: '₱76,000 - ₱100,000', min_budget: 76000, max_budget: 100000, representative_budget: 88000 }
          ]);
        }
      } finally {
        if (isMounted) {
          setParametersLoading(false);
        }
      }
    };
    
    loadParameters();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // AI-Powered Upgrade Analysis
  useEffect(() => {
    // Note: AI upgrade analysis feature is available but disabled for kiosk mode
    // Only Phase 1 (Estimate My PC) and Phase 2 (AI Recommendations) are active
    // This prevents unnecessary AI calls during component selection
    
    // Clear any previous recommendations when selections change
    if (selectedUpgrades.length === 0) {
      setAiRecommendations([]);
    }
  }, [selectedUpgrades, step, currentParts, upgradeOptions]);

  // Load persisted state (if navigated away for selection)
  useEffect(() => {
    const savedUpgrades = JSON.parse(localStorage.getItem('pc-upgrade-selected')) || [];
    if (savedUpgrades.length) setSelectedUpgrades(savedUpgrades);

    // 🔥 NEW - Phase 11: Handle navigation from Preview page
    if (location.state?.step === 'select-upgrades') {
      console.log('✅ Coming back from Preview Build page, restoring state...');
      setStep('select-upgrades');
      
      // Restore all state from preview page
      if (location.state.estimatedBuild) setEstimatedBuild(location.state.estimatedBuild);
      if (location.state.buildConfidence) setBuildConfidence(location.state.buildConfidence);
      if (location.state.estimateData) setEstimateData(location.state.estimateData);
      if (location.state.aiSuggestedCategories) setAiSuggestedCategories(location.state.aiSuggestedCategories);
      if (location.state.selectedUpgrades) setSelectedUpgrades(location.state.selectedUpgrades);
      if (location.state.currentParts) setCurrentParts(location.state.currentParts); // AI estimated build
      
      return; // Exit early
    }

    // Handle "Back" button from Preview page (return to estimate form)
    if (location.state?.step === 'estimate-build' && location.state?.preserveData) {
      console.log('✅ Back to estimate form from Preview page');
      setStep('estimate-build');
      return; // Exit early
    }

    // 🔥 CRITICAL FIX: If coming from order-sum-upgrade (Order More), clear ALL data to start fresh
    if (location.state?.from === 'order-sum-upgrade') {
      console.log('🔥 Coming from Order Summary - clearing ALL upgrade data to start fresh');
      localStorage.removeItem('pc-upgrade-current');
      localStorage.removeItem('pc-upgrade-estimated');
      localStorage.removeItem('pc-upgrade-selections');
      localStorage.removeItem('pc-upgrade-selected');
      localStorage.removeItem('pc-upgrade-manual');
      setCurrentParts({}); // Clear estimated build
      setUpgradeParts({}); // Clear upgrade selections
      setSelectedUpgrades([]);
      setStep('estimate-build'); // Start from beginning
      return; // Exit early
    }

    // 🔥 FIX: Load upgradeParts (actual selections) and currentParts (estimated build) separately
    const savedCurrent = JSON.parse(localStorage.getItem('pc-upgrade-estimated')) || {};
    const savedUpgradeParts = JSON.parse(localStorage.getItem('pc-upgrade-selections')) || {};
    
    if (location.state?.fromSelection && Object.keys(savedUpgradeParts).length) {
      console.log('✅ Restoring upgrade selections from previous selection:', Object.keys(savedUpgradeParts));
      setUpgradeParts(savedUpgradeParts);
    } else if (!location.state?.fromSelection) {
      // Starting fresh - clear any old localStorage data
      console.log('🔥 Starting fresh PC Upgrade - clearing old localStorage data');
      localStorage.removeItem('pc-upgrade-current');
      localStorage.removeItem('pc-upgrade-estimated');
      localStorage.removeItem('pc-upgrade-selections');
      localStorage.removeItem('pc-upgrade-selected');
      setCurrentParts({}); // Clear estimated build
      setUpgradeParts({}); // Clear upgrade selections
      setSelectedUpgrades([]);
    }
    
    // Restore estimated build if available
    if (Object.keys(savedCurrent).length) {
      setCurrentParts(savedCurrent);
    }

    if (location.state?.step === 'current-parts') setStep('current-parts');
  }, [location.state]);

  // Persist selections
  useEffect(() => {
    localStorage.setItem('pc-upgrade-selected', JSON.stringify(selectedUpgrades));
  }, [selectedUpgrades]);

  // 🔥 FIX: Persist estimated build and upgrade selections separately
  useEffect(() => {
    localStorage.setItem('pc-upgrade-estimated', JSON.stringify(currentParts));
  }, [currentParts]);

  useEffect(() => {
    localStorage.setItem('pc-upgrade-selections', JSON.stringify(upgradeParts));
  }, [upgradeParts]);

  // Reset currentQuestion when returning to estimate-build step
  useEffect(() => {
    if (step === 'estimate-build') {
      setCurrentQuestion('usage');
    }
  }, [step]);

  const handleUpgradeSelection = (upgradeId) => {
    setSelectedUpgrades(prev => {
      if (prev.includes(upgradeId)) {
        return prev.filter(id => id !== upgradeId); // Deselect if already selected
      }
      return [...prev, upgradeId]; // Add to selection
    });
  };

  const handleNext = () => {
    if (selectedUpgrades.length === 0) {
      alert('Please select at least one component to upgrade');
      return;
    }

    // Clear any previously selected upgrade parts for the categories being upgraded
    const ORDER = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'power supply', 'cpu-cooler', 'case'];
    const selectedCategories = selectedUpgrades
      .map(id => upgradeOptions.find(opt => opt.id === id)?.category)
      .filter(Boolean)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

    // 🔥 FIX: Clear upgradeParts for new selection (don't touch currentParts/estimated build)
    setUpgradeParts(prev => {
      const next = { ...prev };
      selectedCategories.forEach(cat => {
        delete next[cat];
      });
      return next;
    });

    setStep('current-parts');
  };


  const handleBackFromSelectUpgrades = () => {
    // Navigate back to "Tell Us About Your PC" (Step 1)
    setStep('estimate-build');
  };

  // NEW - Phase 1: Handle "Estimate My PC" button click
  // eslint-disable-next-line no-unused-vars
  const handleOpenEstimateModal = () => {
    setEstimateError(null);
    setShowEstimateModal(true);
  };

  // NEW - Phase 1: Handle estimate submission
  const handleEstimateSubmit = async () => {
    try {
      setIsEstimating(true);
      setEstimateError(null);

      // Validate input
      if (!estimateData.usage || !estimateData.yearPurchased) {
        setEstimateError('Please provide usage type and year purchased');
        return;
      }

      console.log('Estimating PC build locally...', estimateData);

      const estimate = buildLocalUpgradeEstimate(estimateData);
      const newCurrentParts = Object.entries(estimate.matched || {}).reduce((acc, [category, product]) => {
        if (product && product.id) {
          acc[category] = {
            ...product,
            isCurrentPart: true
          };
        }
        return acc;
      }, {});

      setEstimatedBuild(estimate.estimated);
      setBuildConfidence(estimate.confidence);
      setCurrentParts(prev => ({ ...prev, ...newCurrentParts }));
      setAiSuggestedCategories(estimate.suggestedCategories);
      
      // Store usage for recommendations
      setEstimatedUsage(estimateData.usage);

      const preSelectedIds = estimate.suggestedCategories
        .map(cat => CATEGORY_TO_UPGRADE_ID[cat])
        .filter(Boolean);
      
      setSelectedUpgrades(preSelectedIds);

      // Close modal if open
      setShowEstimateModal(false);
      
      // Navigate to Preview Build page (NEW - Phase 11)
      navigate('/pc-upgrade-preview', {
        state: {
          estimatedBuild: estimate.estimated,
          buildConfidence: estimate.confidence,
          estimateData: estimateData,
          aiSuggestedCategories: estimate.suggestedCategories,
          selectedUpgrades: preSelectedIds,
          currentParts: newCurrentParts
        }
      });

    } catch (err) {
      console.error('❌ Error estimating build:', err);
      setEstimateError(err.message || 'Failed to estimate build. Please fill the form manually.');
    } finally {
      setIsEstimating(false);
    }
  };

  // NEW - Phase 2: Handle "Get AI Recommendations" button click
  // eslint-disable-next-line no-unused-vars
  const handleGetRecommendations = async () => {
    try {
      setIsLoadingRecommendations(true);
      setRecommendationsError(null);

      const selectedCategories = selectedUpgrades
        .map(id => upgradeOptions.find(opt => opt.id === id)?.category)
        .filter(Boolean);
      const localRecommendations = buildLocalRecommendations(selectedCategories, estimatedUsage);

      console.log('Upgrade recommendations prepared:', localRecommendations);

      setRecommendations(localRecommendations);
      setShowRecommendationsModal(true);

    } catch (err) {
      console.error('❌ Error getting recommendations:', err);
      setRecommendationsError(err.message || 'Failed to get recommendations');
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // NEW - Phase 2: Apply recommendation to current parts
  const handleApplyRecommendation = (recommendation) => {
    if (!recommendation || !recommendation.component) return;

    const category = recommendation.priority;
    const product = recommendation.component;

    setCurrentParts(prev => ({
      ...prev,
      [category]: product
    }));

    setShowRecommendationsModal(false);
    alert(`${category} upgraded to ${product.name}!`);
  };

  const handleConfirmSelectAgain = () => {
    setShowSelectAgainModal(false);
    setStep('select-upgrades');
  };

  const handleCancelSelectAgain = () => {
    setShowSelectAgainModal(false);
  };

  const handleConfirmExit = () => {
    try {
      localStorage.removeItem('upgradeOrders');
      localStorage.removeItem('pc-upgrade-selected');
      localStorage.removeItem('pc-upgrade-current');
    } catch { }
    setShowExitModal(false);
    navigate('/pc-services');
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const renderUpgradeSelection = () => {
    // Map category names to upgrade option IDs
    const categoryToId = {
      'CPU': 'processor',
      'GPU': 'gpu',
      'RAM': 'ram',
      'Storage': 'storage',
      'Motherboard': 'motherboard',
      'PSU': 'psu',
      'Cooling': 'cpu-cooler',
      'Case': 'chassis'
    };

    // Determine which options are AI-recommended
    const aiRecommendedIds = aiSuggestedCategories
      .map(cat => categoryToId[cat])
      .filter(Boolean);

    return (
    <div className="pc-upgrade-container">
      <div className="pc-upgrade-content">
          <img className="pcu-estimate-logo-image" src={PcUpgrade} alt="PC Upgrade" />
        <div className="pc-upgrade-intro">
          <h2 className="pc-upgrade-section-title">What are you Upgrading?</h2>
          <p className="pc-upgrade-section-desc">
            {aiRecommendedIds.length > 0 
              ? 'Recommended upgrades are highlighted below' 
              : 'Select all that counts'}
          </p>
          
          {/* Local status display */}
          {isAnalyzingUpgrades && (
            <div className="ai-status-bar analyzing">
              <span className="ai-badge">LOCAL</span>
              <span>Analyzing upgrade compatibility...</span>
            </div>
          )}
        </div>
      </div>


      <div className="pc-upgrade-grid">
        {/* First row */}
        <div 
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[0].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[0].id) ? ' ai-recommended' : ''}`} 
          data-id="ram" 
          onClick={() => handleUpgradeSelection(upgradeOptions[0].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "150px", height: "100px" }} src={upgradeOptions[0].image} alt={upgradeOptions[0].name} />
          <span>{upgradeOptions[0].name}</span>
        </div>
        <div 
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[1].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[1].id) ? ' ai-recommended' : ''}`} 
          data-id="storage" 
          onClick={() => handleUpgradeSelection(upgradeOptions[1].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "150px", height: "100px" }} src={upgradeOptions[1].image} alt={upgradeOptions[1].name} />
          <span>{upgradeOptions[1].name}</span>
        </div>
        <div 
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[2].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[2].id) ? ' ai-recommended' : ''}`} 
          data-id="gpu" 
          onClick={() => handleUpgradeSelection(upgradeOptions[2].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "150px", height: "100px" }} src={upgradeOptions[2].image} alt={upgradeOptions[2].name} />
          <span>{upgradeOptions[2].name}</span>
        </div>
        {/* Second row */}
        <div 
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[3].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[3].id) ? ' ai-recommended' : ''}`} 
          data-id="processor" 
          onClick={() => handleUpgradeSelection(upgradeOptions[3].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "150px", height: "100px" }} src={upgradeOptions[3].image} alt={upgradeOptions[3].name} />
          <span>{upgradeOptions[3].name}</span>
        </div>
        <div 
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[4].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[4].id) ? ' ai-recommended' : ''}`} 
          data-id="motherboard2" 
          onClick={() => handleUpgradeSelection(upgradeOptions[4].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "110px", height: "130px" }} src={upgradeOptions[4].image} alt={upgradeOptions[4].name} />
          <span style={{ marginTop: "20px" }}>{upgradeOptions[4].name}</span>
        </div>
        <div 
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[5].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[5].id) ? ' ai-recommended' : ''}`} 
          data-id="psu" 
          onClick={() => handleUpgradeSelection(upgradeOptions[5].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "125px", height: "110px" }} src={upgradeOptions[5].image} alt={upgradeOptions[5].name} />
          <span>{upgradeOptions[5].name}</span>
        </div>
      </div>

      <div className='excluded-grid'>
        {/* Third row */}
        <div 
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[6].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[6].id) ? ' ai-recommended' : ''}`} 
          data-id="cpu-cooler" 
          onClick={() => handleUpgradeSelection(upgradeOptions[6].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "150px", height: "150px" }} src={upgradeOptions[6].image} alt={upgradeOptions[6].name} />
          <span>{upgradeOptions[6].name}</span>
        </div>
        <div
          className={`pc-upgrade-item${selectedUpgrades.includes(upgradeOptions[7].id) ? ' selected' : ''}${aiRecommendedIds.includes(upgradeOptions[7].id) ? ' ai-recommended' : ''}`} 
          data-id="chassis" 
          onClick={() => handleUpgradeSelection(upgradeOptions[7].id)}
        >
          <div className="glow-effect"></div>
          <img className="pc-upgrade-icons" style={{ width: "95px", height: "140px" }} src={upgradeOptions[7].image} alt={upgradeOptions[7].name} />
          <span>{upgradeOptions[7].name}</span>
        </div>
      </div>

      <div className="pc-upgrade-buttons">
        <button className="pc-upgrade-back-btn" onClick={handleBackFromSelectUpgrades}>
          Back
        </button>
        <button
          className={`pc-upgrade-next-btn ${selectedUpgrades.length === 0 ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={selectedUpgrades.length === 0}
        >
          Next
        </button>

      </div>

      {showExitModal && (
        <div className="pcu-modal-overlay">
          <div className="pcu-modal-background"></div>
          <div className="pcu-modal">
            <h2 className="pcu-modal-title">Going back may discard your changes. Continue?</h2>
            <div className="pcu-modal-actions">
              <button className="pcu-modal-back-btn" onClick={handleCancelExit}>NO</button>
              <button
                className="pcu-modal-confirm-btn"
                onClick={handleConfirmExit}
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}
      {showSelectAgainModal && (
        <div className="pcu-modal-overlay">
          <div className="pcu-modal-background"></div>
          <div className="pcu-modal">
            <h2 className="pcu-modal-title">Are you sure you want to Select Again?</h2>
            <div className="pcu-modal-actions">
              <button className="pcu-modal-back-btn" onClick={handleCancelSelectAgain}>NO</button>
              <button
                className="pcu-modal-confirm-btn"
                onClick={handleConfirmSelectAgain}
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  // === CPU Cooler compatibility helpers (socket + TDP) ===
  const getSpec = (product, key) => {
    try {
      const specs = product?.specifications || {};
      const entry = Object.entries(specs).find(([k]) => k.toLowerCase() === String(key).toLowerCase());
      return entry ? String(entry[1]) : '';
    } catch { return ''; }
  };
  const norm = (s) => String(s || '').toUpperCase();
  const normSocket = (s) => norm(s).replaceAll(/\s|-/g, '');

  const parseCpuTdpWatts = (cpu) => {
    const t = getSpec(cpu, 'TDP') || '';
    const m = String(t).match(/([0-9]{2,3})\s*W/i);
    return m ? Number.parseInt(m[1], 10) : 0;
  };

  const estimateCoolerTdpCapacity = (cooler) => {
    const name = norm(cooler?.name);
    // AIOs by radiator size
    if (name.includes('360')) return 260; // 360mm AIO
    if (name.includes('280')) return 220; // 280mm AIO
    if (name.includes('240')) return 200; // 240mm AIO
    if (name.includes('120')) return 140; // 120mm AIO or small air
    // Air coolers by model identifiers (rough estimates)
    if (name.includes('AK500')) return 220;
    if (name.includes('AG500')) return 190;
    if (name.includes('AK400')) return 150;
    if (name.includes('GAMMAX 400')) return 130;
    if (name.includes('AG300')) return 110;
    if (name.includes('AG200')) return 95;
    // Basic labeled Intel/AMD small stock-like
    if (name.includes('INTEL 1ST') || name.includes('1ST-11TH') || name.includes('AMD (AM3') || name.includes('AM3/AM4')) return 70;
    // Conservative default for unknown models
    return 120;
  };

  const coolerSupportsSocket = (cooler, socketNorm, cpuIsAMD) => {
    const sup = norm(getSpec(cooler, 'Supported Sockets') || getSpec(cooler, 'Socket'));
    if (sup.includes('UNIVERSAL')) return true;
    if (!socketNorm) return true;
    if (sup.replaceAll(/\s|-/g, '').includes(socketNorm)) return true;
    if (cpuIsAMD && sup.includes('AMD')) return true;
    if (!cpuIsAMD && sup.includes('INTEL')) return true;
    const name = norm(cooler?.name).replaceAll(/\s|-/g, '');
    if (name.includes(socketNorm)) return true;
    return false;
  };

  const coolerMeetsCpuTdp = (cooler, cpu) => {
    const cpuTdp = parseCpuTdpWatts(cpu);
    if (!cpuTdp) return true; // unknown TDP, don't block
    const headroom = cpuTdp >= 105 ? 1.35 : 1.25; // more headroom for higher-TDP CPUs
    const capacity = estimateCoolerTdpCapacity(cooler);
    return capacity >= Math.ceil(cpuTdp * headroom);
  };

  // Cross-category compatibility helpers
  const getCpuSocket = (cpu) => normSocket(getSpec(cpu, 'Socket'));
  const getMoboSocket = (mobo) => normSocket(getSpec(mobo, 'Socket'));

  const moboMemType = (mobo) => {
    const raw = norm(getSpec(mobo, 'Memory Slots') || getSpec(mobo, 'Memory'));
    if (raw.includes('DDR5')) return 'DDR5';
    if (raw.includes('DDR4')) return 'DDR4';
    return '';
  };
  const ramType = (ram) => {
    const raw = norm(getSpec(ram, 'Type'));
    if (raw.includes('DDR5')) return 'DDR5';
    if (raw.includes('DDR4')) return 'DDR4';
    return '';
  };

  const parsePsuWattage = (psu) => {
    const src = getSpec(psu, 'Wattage') || psu?.name || '';
    const m = String(src).match(/([0-9]{3,4})\s*W/i);
    return m ? Number.parseInt(m[1], 10) : 0;
  };
  const recommendWattForGpu = (gpu) => {
    const name = norm(gpu?.name);
    if (name.includes('4070 TI') || name.includes('4070TI')) return 750;
    if (name.includes('4070')) return 650;
    if (name.includes('4060 TI') || name.includes('4060TI')) return 600;
    if (name.includes('4060')) return 550;
    if (name.includes('RX 7800') || name.includes('RX7800')) return 700;
    if (name.includes('RX 7700') || name.includes('RX7700')) return 650;
    if (name.includes('RX 7600') || name.includes('RX7600')) return 600;
    if (name.includes('RX 6600') || name.includes('RX6600')) return 500;
    if (name.includes('RX 580') || name.includes('RX580')) return 500;
    if (name.includes('RX 550') || name.includes('RX550')) return 350;
    return 450;
  };

  const getMoboFormFactor = (mobo) => norm(getSpec(mobo, 'Form Factor'));
  const caseSupportsMobo = (caseProd, moboFormFactor) => {
    const ff = norm(getSpec(caseProd, 'Form Factor'));
    const m = norm(moboFormFactor);
    if (m.includes('ATX')) return ff.includes('ATX');
    if (m.includes('MICROATX') || m.includes('MICRO-ATX')) return ff.includes('ATX') || ff.includes('MICRO');
    if (m.includes('MINI')) return true;
    return true;
  };

  // Modal helpers
  // eslint-disable-next-line no-unused-vars
  const buildFilterTitle = (menuItem, catKey) => {
    switch (catKey) {
      case 'cpu': return 'What is your preferred PROCESSOR SERIES?';
      case 'motherboard': return 'What is your preferred MOTHERBOARD SERIES?';
      case 'ram': return 'What is your preferred RAM CAPACITY?';
      case 'storage': return 'What is your preferred STORAGE CAPACITY?';
      case 'gpu': return 'What is your preferred GPU BRAND?';  // 🔥 FIXED: Changed from 'graphcard' to 'gpu'
      case 'graphcard': return 'What is your preferred GPU BRAND?';  // 🔥 Keep backward compatibility
      case 'power supply': return 'What is your preferred POWER SUPPLY BRAND?';
      case 'cpu-cooler': return 'What is your preferred CPU COOLER BRAND?';
      case 'case': return 'What is your preferred CASE BRAND?';
      default: return `Choose a preference for ${menuItem?.name || 'this category'}`;
    }
  };

  // Precise brand filtering helpers
  const normalizeBrandLabel = (s) => String(s || '').toUpperCase().replaceAll(/[^A-Z0-9]/g, '');
  const detectProductBrand = (product, catKey) => {
    const name = norm(product?.name);
    const u = name.toUpperCase();
    const compact = u.replaceAll(/\s|-/g, '');
    switch (catKey) {
      case 'cpu':
        if (u.includes('AMD') || u.includes('RYZEN')) return 'AMD';
        if (u.includes('INTEL') || u.includes('CORE')) return 'Intel';
        return '';
      case 'motherboard':
        if (u.includes('AORUS')) return 'AORUS';
        if (u.includes('GIGABYTE')) return 'Gigabyte';
        if (u.includes('ASUS')) return 'ASUS';
        if (u.includes('ASROCK')) return 'ASRock';
        if (u.includes('MSI')) return 'MSI';
        if (u.includes('RAMSTA')) return 'RAMSTA';
        return '';
      case 'ram':
        if (u.includes('G.SKILL') || u.includes('GSKILL')) return 'G.Skill';
        if (u.includes('T-FORCE') || compact.includes('TFORCE') || u.includes('TEAM')) return 'TeamGroup';
        if (u.includes('KINGSTON')) return 'Kingston';
        if (u.includes('CORSAIR')) return 'Corsair';
        return '';
      case 'storage':
        if (u.includes('SAMSUNG')) return 'Samsung';
        if (u.includes('WESTERN DIGITAL') || u.includes(' WD ') || u.startsWith('WD ') || u.includes(' WD')) return 'Western Digital';
        if (u.includes('CRUCIAL')) return 'Crucial';
        if (u.includes('SEAGATE')) return 'Seagate';
        return '';
      case 'power supply':
        if (u.includes('CORSAIR')) return 'Corsair';
        if (u.includes('FSP')) return 'FSP';
        if (u.includes('COOLERMASTER') || u.includes('COOLER MASTER')) return 'Cooler Master';
        if (u.includes('MSI')) return 'MSI';
        if (u.includes('GIGABYTE')) return 'Gigabyte';
        if (u.includes('AORUS')) return 'AORUS';
        if (u.includes('EVGA')) return 'EVGA';
        if (u.includes('SEASONIC')) return 'Seasonic';
        return '';
      case 'graphcard':
        if (u.includes('GIGABYTE') || u.includes('AORUS')) return 'Gigabyte';
        if (u.includes('ASROCK')) return 'ASRock';
        if (u.includes('SAPPHIRE')) return 'Sapphire';
        if (u.includes('GALAX')) return 'GALAX';
        if (u.includes('COLORFUL') || u.includes('IGAME')) return 'Colorful';
        if (u.includes('RTX') || u.includes('NVIDIA')) return 'NVIDIA';
        if (u.includes('RX') || u.includes('RADEON') || u.includes('AMD')) return 'AMD';
        return '';
      case 'cpu-cooler':
        if (u.includes('DEEPCOOL')) return 'Deepcool';
        if (u.includes('DARKFLASH')) return 'Darkflash';
        if (u.includes('THERMALRIGHT')) return 'Thermalright';
        return '';
      case 'case':
        if (u.includes('LIANLI') || u.includes('LIAN LI')) return 'Lian Li';
        if (u.includes('COOLERMASTER') || u.includes('COOLER MASTER')) return 'Cooler Master';
        if (u.includes('KEYTECH')) return 'Keytech';
        if (u.includes('INPLAY')) return 'Inplay';
        if (u.includes('COOLMAN')) return 'Coolman';
        if (u.includes('FSP')) return 'FSP';
        if (u.includes('ASUS')) return 'ASUS';
        if (u.includes('DEEPCOOL')) return 'DEEPCOOL';
        if (u.includes('DARKFLASH')) return 'DarkFlash';
        if (u.includes('NZXT')) return 'NZXT';
        return '';
      default:
        return '';
    }
  };

  const filterProductsByOption = (products = [], catKey, option) => {
    if (!option) return products;
    const optNorm = normalizeBrandLabel(option);
    if (optNorm === 'ANY' || optNorm === 'ALL') return products;
    return (products || []).filter(p => normalizeBrandLabel(detectProductBrand(p, catKey)) === optNorm);
  };

  // Build compatible products for a category based on current selected parts
  const buildProductsForCatWithCompatibility = (catKey) => {
    const menuItem = menuItems.find(item => item.category === catKey);
    if (!menuItem) return [];
    let productsToSend = menuItem.products || [];

    // Apply cross-category compatibility based on already selected parts
    const cpu = currentParts['cpu'];
    const mobo = currentParts['motherboard'];
    const ram = currentParts['ram'];
    const psu = currentParts['power supply'];
    const gpu = currentParts['gpu'];  // 🔥 FIXED: Changed from 'graphcard' to 'gpu'

    switch (catKey) {
      case 'cpu':
        if (mobo) {
          const s = getMoboSocket(mobo);
          if (s) productsToSend = productsToSend.filter(p => getCpuSocket(p) === s);
        }
        break;
      case 'motherboard':
        if (cpu) {
          const s = getCpuSocket(cpu);
          if (s) productsToSend = productsToSend.filter(p => getMoboSocket(p) === s);
        }
        if (ram) {
          const rt = ramType(ram);
          if (rt) productsToSend = productsToSend.filter(p => (moboMemType(p) || '').includes(rt));
        }
        break;
      case 'ram':
        if (mobo) {
          const mt = moboMemType(mobo);
          if (mt) productsToSend = productsToSend.filter(p => (ramType(p) || '') === mt);
        }
        break;
      case 'power supply':
        if (gpu) {
          const need = recommendWattForGpu(gpu);
          productsToSend = productsToSend.filter(p => parsePsuWattage(p) >= need);
        }
        break;
      case 'gpu':  // 🔥 FIXED: Changed from 'graphcard' to 'gpu'
      case 'graphcard':  // 🔥 Keep backward compatibility
        if (psu) {
          const have = parsePsuWattage(psu);
          productsToSend = productsToSend.filter(p => recommendWattForGpu(p) <= have);
        }
        break;
      case 'cpu-cooler':
        if (cpu) {
          const socket = getCpuSocket(cpu);
          const isAMD = norm(cpu?.name).includes('AMD') || socket.startsWith('AM');
          let filtered = productsToSend
            .filter(p => coolerSupportsSocket(p, socket, isAMD))
            .filter(p => coolerMeetsCpuTdp(p, cpu));
          if (!filtered.length) {
            filtered = (menuItem.products || []).filter(p => coolerSupportsSocket(p, socket, isAMD));
          }
          productsToSend = filtered;
        }
        break;
      case 'case':
        if (mobo) {
          const mf = getMoboFormFactor(mobo);
          productsToSend = productsToSend.filter(p => caseSupportsMobo(p, mf));
        }
        break;
      default:
        break;
    }

    return productsToSend;
  };

  const getFilteredBySelectedOption = (catKey, selectedOption) => {
    const base = buildProductsForCatWithCompatibility(catKey);
    return filterProductsByOption(base, catKey, selectedOption);
  };

  const handleConfirmFilter = () => {
    if (!filterContext.selected) return;
    const menuItem = menuItems.find(item => item.category === filterContext.catKey);
    if (!menuItem) return;

    // Apply compatibility + brand filtering
    const filtered = getFilteredBySelectedOption(filterContext.catKey, filterContext.selected);
    if (!filtered.length) {
      setFilterContext(prev => ({ ...prev, error: 'There is no compatible/brand product available*', noResults: true }));
      return;
    }

    // Get AI recommendation for this category
    const categoryNameMap = {
      'processor': 'CPU',
      'gpu': 'GPU',
      'ram': 'RAM',
      'storage': 'Storage',
      'motherboard': 'Motherboard',
      'psu': 'PSU',
      'cpu-cooler': 'Cooling',
      'chassis': 'Case'
    };
    
    const aiCategory = categoryNameMap[filterContext.catKey];
    const aiRecommendation = estimatedBuild?.[aiCategory] || null;

    setShowFilterModal(false);
    localStorage.setItem('pc-upgrade-selected', JSON.stringify(selectedUpgrades));
    // NEW - Phase 3: Navigate to PCUpgradeDisplay with AI data
    navigate('/pc-upgrade-display', {
      state: {
        categoryName: menuItem.name,
        products: filtered,
        brands: menuItem.brands,
        categoryIndex: filterContext.idx,
        from: 'pc-upgrade',
        returnTo: '/pc-upgrade',
        categoryKey: filterContext.catKey,
        apiCategory: aiCategory,
        // NEW: AI estimation data for smart filtering
        aiRecommendation: aiRecommendation,
        estimatedUsage: estimatedUsage,
        buildConfidence: buildConfidence,
        estimatedBudget: estimateData.budget
      }
    });
  };

  // Build short bottleneck descriptions per selected category
  // eslint-disable-next-line no-unused-vars
  const getStorageKind = (name = "") => {
    const n = String(name).toUpperCase();
    if (/(NVME|NVME|M\.2|M2)/.test(n)) return 'NVMe SSD';
    if (/(HDD|HARD DISK)/.test(n)) return 'SATA HDD';
    return 'SATA SSD';
  };
  // eslint-disable-next-line no-unused-vars
  const buildBottleneckLines = () => {
    const ORDER = ['cpu', 'motherboard', 'ram', 'storage', 'graphcard', 'power supply', 'cpu-cooler', 'case'];
    const selectedCategories = selectedUpgrades
      .map(id => upgradeOptions.find(opt => opt.id === id)?.category)
      .filter(Boolean)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

    const lines = [];
    selectedCategories.forEach((cat) => {
      const p = currentParts[cat];
      if (!p) return;
      switch (cat) {
        case 'cpu':
          lines.push(`${p.name} → This is your CPU. It must match the motherboard's socket/chipset. Higher-TDP CPUs may need stronger coolers and PSU headroom. If you have no GPU, the CPU must have integrated graphics.`);
          break;
        case 'motherboard':
          lines.push(`${p.name} → This is your motherboard. It must match the CPU socket; it fixes the RAM type (DDR4/DDR5) and must fit your case (ATX/mATX/ITX). Check M.2/SATA count for your drives.`);
          break;
        case 'ram':
          lines.push(`${p.name} → This is your RAM. It only needs a supported motherboard + CPU combo to work (the PSU and storage don’t affect compatibility).`);
          break;
        case 'storage': {
          const kind = getStorageKind(p.name);
          lines.push(`${p.name} → This is your storage drive (${kind}). It connects to ${kind.includes('NVMe') ? 'an M.2 slot' : 'a SATA port'} on the motherboard. No issue with RAM or PSU.`);
          break;
        }
        case 'graphcard':
          lines.push(`${p.name} → This is your graphics card (GPU). Ensure the PSU meets recommended wattage and connectors, and the case has enough length/height clearance. Very fast GPUs can bottleneck on low-end CPUs.`);
          break;
        case 'power supply':
          lines.push(`${p.name} → This is your power supply. It provides power for the whole system. Ensure sufficient wattage (with headroom) and the correct PCIe connectors for your GPU.`);
          break;
        case 'cpu-cooler':
          lines.push(`${p.name} → This is your CPU cooler. It must support the CPU socket and have enough cooling capacity (TDP). Large air coolers can conflict with tall RAM or case height limits.`);
          break;
        case 'case':
          lines.push(`${p.name} → This is your case. It must fit your motherboard form factor and allow clearance for the GPU length and CPU cooler height; check radiator mounts for AIOs.`);
          break;
        default:
          break;
      }
    });

    if (!lines.length) lines.push('No parts selected yet for the chosen upgrades.');
    return lines;
  };

  // Build overall compatibility headline with concise reminders
  // eslint-disable-next-line no-unused-vars
  const buildCompatibilitySummary = () => {
    const ORDER = ['cpu', 'motherboard', 'ram', 'storage', 'graphcard', 'power supply', 'cpu-cooler', 'case'];
    const selectedCategories = selectedUpgrades
      .map(id => upgradeOptions.find(opt => opt.id === id)?.category)
      .filter(Boolean)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

    const issues = [];
    const reminders = [];

    const cpu = currentParts['cpu'];
    const mobo = currentParts['motherboard'];
    const ram = currentParts['ram'];
    const storage = currentParts['storage'];
    const gpu = currentParts['gpu'];  // 🔥 FIXED: Changed from 'graphcard' to 'gpu'
    const psu = currentParts['power supply'];
    const cooler = currentParts['cpu-cooler'];
    const pcCase = currentParts['case'];

    // CPU ↔ Motherboard socket
    if (selectedCategories.includes('cpu') || selectedCategories.includes('motherboard')) {
      if (cpu && mobo) {
        const cs = getCpuSocket(cpu);
        const ms = getMoboSocket(mobo);
        if (cs && ms && cs !== ms) {
          issues.push(`CPU socket (${cs}) doesn't match motherboard socket (${ms})`);
        } else if (cs && ms && cs === ms) {
          // confirmation not needed in headline
        } else {
          reminders.push('ensure CPU socket matches the motherboard');
        }
      } else if (cpu && !mobo) {
        reminders.push('ensure your motherboard matches the CPU socket');
      } else if (!cpu && mobo) {
        reminders.push('ensure your CPU matches the motherboard socket');
      }
    }

    // Motherboard ↔ RAM type
    if (selectedCategories.includes('ram')) {
      if (ram) {
        const mt = mobo ? moboMemType(mobo) : '';
        const rt = ramType(ram);
        if (mt && rt && mt !== rt) {
          issues.push(`RAM type ${rt} is not supported by the motherboard (${mt})`);
        } else {
          if (rt) reminders.push(`your motherboard supports ${rt} and speed (e.g., ${/\d{4}/.exec(ram.name || '')?.[0] || ''}MHz)`);
          else reminders.push('your motherboard supports your RAM type');
        }
      }
    }

    // PSU ↔ GPU wattage
    if (selectedCategories.includes('graphcard') || selectedCategories.includes('power supply')) {
      if (psu && gpu) {
        const need = recommendWattForGpu(gpu);
        const have = parsePsuWattage(psu);
        if (have && need && have < need) {
          issues.push(`PSU wattage (${have}W) is below the GPU recommendation (${need}W)`);
        } else if (have && need) {
          reminders.push(`your PSU wattage (${have}W) is enough for the GPU (${need}W rec)`);
        } else {
          reminders.push('ensure PSU wattage meets your GPU recommendation');
        }
      } else if (gpu && !psu) {
        reminders.push('pick a PSU with enough wattage and the right PCIe connectors for the GPU');
      }
    }

    // Cooler ↔ CPU socket/TDP
    if (selectedCategories.includes('cpu-cooler')) {
      if (cooler && cpu) {
        const socket = getCpuSocket(cpu);
        const isAMD = norm(cpu?.name).includes('AMD') || socket.startsWith('AM');
        if (!coolerSupportsSocket(cooler, socket, isAMD)) {
          issues.push('CPU cooler may not support the CPU socket');
        } else if (!coolerMeetsCpuTdp(cooler, cpu)) {
          issues.push('CPU cooler may not have enough TDP capacity for the CPU');
        } else {
          reminders.push('your cooler is suitable for the CPU socket and TDP');
        }
      } else if (cooler && !cpu) {
        reminders.push('ensure the cooler supports your CPU socket and TDP');
      }
    }

    // Case ↔ Motherboard form factor
    if (selectedCategories.includes('case') || selectedCategories.includes('motherboard')) {
      if (pcCase && mobo) {
        const mf = getMoboFormFactor(mobo);
        if (!caseSupportsMobo(pcCase, mf)) {
          issues.push('Case may not support your motherboard form factor');
        } else {
          reminders.push('your case supports the motherboard form factor');
        }
      } else if (pcCase && !mobo) {
        reminders.push('ensure the case supports your motherboard form factor');
      }
    }

    // Storage connection reminder
    if (selectedCategories.includes('storage') && storage) {
      const n = String(storage.name || '').toUpperCase();
      if (/(NVME|M\.2|M2)/.test(n)) reminders.push('your motherboard has an available M.2 slot for the NVMe drive');
      else reminders.push('your motherboard has an available SATA port for the SATA drive');
    }

    // Compose headline
    if (!selectedCategories.some(cat => currentParts[cat])) {
      return 'Add parts to evaluate compatibility.';
    }

    const allGood = issues.length === 0;
    const reminderText = reminders.length ? ` — ${reminders.slice(0, 3).join(' and ')}` : '';
    if (allGood) {
      return `So yes, they're all compatible ✅${reminderText}`;
    }
    return `There may be compatibility issues ❌ — ${issues.join(' | ')}`;
  };

  const renderCurrentPartsSelection = () => {
    // Map selected upgrade ids to the menuItems category keys (internal keys), then sort to a fixed order
    const ORDER = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'power supply', 'cpu-cooler', 'case'];
    
    // Map selected IDs to their corresponding menuItem category keys
    const selectedCategories = selectedUpgrades
      .map(id => {
        const menuItem = menuItems.find(item => item.id === id);
        return menuItem?.category; // This returns the internal category key (e.g., 'cpu', 'gpu', 'power supply')
      })
      .filter(Boolean)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

    // 🔥 CRITICAL FIX: Use upgradeParts (actual selections to buy) instead of currentParts (estimated build)
    // Require at least one category selected AND every selected category has a chosen upgrade part
    const allRequiredSelected = selectedCategories.every(cat => Boolean(upgradeParts[cat]));
    const canProceed = selectedCategories.length > 0 && allRequiredSelected;
    
    console.log('🔍 renderCurrentPartsSelection - State Check:', {
      step,
      selectedUpgrades,
      selectedCategories,
      currentParts: currentParts, // AI estimated build (for reference)
      upgradeParts: upgradeParts, // Actual parts to purchase
      allRequiredSelected,
      canProceed
    });

    return (
      <div className="pc-customizer-container">
        {/* Header styled exactly like PCCustomized */}
        <div className="pc-upgrade-header">
          <img src={PcUpgrade} alt="Logo" className="pc-upgrade-img" />
          <div className="pc-upgrade-title">
            <h1 className="pc-upgrade-name">PC UPGRADE</h1>
            <p className="pc-upgrade-subtitle">Select your current parts</p>
          </div>
        </div>

        <div className='pc-upgrade-content'>
          <div className='pc-upgrade-content-name'>SELECTED PARTS TO UPGRADE</div>
          <div className='pc-upgrade-content-subtitle'>Click each category below to select upgrade components</div>
        </div>

        {/* Steps list (PCCustomized look) */}
        <div className="pc-upgrade-steps">
          {selectedCategories.map((catKey, idx) => {
            const menuItem = menuItems.find(item => item.category === catKey);
            if (!menuItem) return null;
            // 🔥 CRITICAL FIX: Use upgradeParts (actual selections) instead of currentParts (estimated build)
            const selectedProduct = upgradeParts[catKey];

            return (
              <div key={catKey} className="pc-customizer-step-container">
                <p className="step-subtitle"> {menuItem.name}</p>
                <div
                  className={`pc-customizer-step unlocked-step ${selectedProduct ? 'selected-step' : ''}`}
                  style={{ position: 'relative' }}
                  onClick={() => {
                    // Store current upgrade progress for recovery
                    const upgradeProgress = {
                      selectedUpgrades,
                      currentParts, // AI estimated build
                      upgradeParts, // 🔥 NEW: Actual selections to purchase
                      estimatedBuild,
                      aiSuggestedCategories,
                      estimateData
                    };
                    localStorage.setItem('pc-upgrade-progress', JSON.stringify(upgradeProgress));
                    localStorage.setItem('pc-upgrade-selected', JSON.stringify(selectedUpgrades));

                    // Map category key to AI estimation category name
                    const categoryNameMap = {
                      'cpu': 'CPU',
                      'gpu': 'GPU',
                      'ram': 'RAM',
                      'storage': 'Storage',
                      'motherboard': 'Motherboard',
                      'psu': 'PSU',
                      'cpu-cooler': 'Cooling',
                      'chassis': 'Case'
                    };
                    
                    const aiCategory = categoryNameMap[catKey];
                    const aiRecommendation = estimatedBuild?.[aiCategory] || null;

                    // Navigate to PCUpgradeDisplay for this category
                    navigate('/pc-upgrade-display', {
                      state: {
                        categoryKey: catKey,
                        categoryName: menuItem.name,
                        apiCategory: aiCategory,
                        returnTo: '/pc-upgrade',
                        from: 'pc-upgrade',
                        fromSelection: true, // 🔥 FIX: Mark that we're navigating from selection
                        // AI estimation data for smart filtering
                        aiRecommendation: aiRecommendation,
                        estimatedUsage: estimatedUsage,
                        buildConfidence: buildConfidence,
                        estimatedBudget: estimateData.budget
                      }
                    });
                  }}
                >
                  <div className="step-icon">
                    <img src={selectedProduct?.image || menuItem.image} alt={menuItem.name} />
                  </div>
                  <div className="step-details">
                    <p className="step-title">
                      {selectedProduct?.name || menuItem.name}
                    </p>
                    <p className="step-price">
                      {selectedProduct?.price ? `${selectedProduct.price}` : ""}
                    </p>
                  </div>
                  
                  {/* Step button container with add/minus icons - matches PCCustomized */}
                  <div className="step-button-container">
                    {selectedProduct ? (
                      <div
                        className="step-add-minus-icon minus-active"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigation when clicking remove
                          // Remove from upgradeParts (actual selections)
                          setUpgradeParts(prev => {
                            const updated = { ...prev };
                            delete updated[catKey];
                            localStorage.setItem('pc-upgrade-selections', JSON.stringify(updated));
                            return updated;
                          });
                        }}
                      >
                        <span className="step-minus-icon">-</span>
                      </div>
                    ) : (
                      <div className="step-add-minus-icon">
                        <span className="step-add-icon">+</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showFilterModal && (
          <div className="pcu-modal-overlay">
            <div className='pcu-modal-background'></div>
            <div className="pcu-modal">
              <h2 className="pcu-modal-title">{filterContext.title}</h2>

              <div className="pcu-modal-options">
                {filterContext.options.length ? filterContext.options.map((opt) => {
                  const selected = filterContext.selected === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        const filtered = getFilteredBySelectedOption(filterContext.catKey, opt);
                        const noResults = filtered.length === 0;
                        setFilterContext(prev => ({
                          ...prev,
                          selected: opt,
                          error: noResults ? 'There is no compatible/brand product available*' : null,
                          noResults
                        }));
                      }}
                      className={`pcu-modal-option-btn${selected ? ' selected' : ''}`}
                    >
                      {opt}
                    </button>
                  );
                }) : (
                  <div className="pcu-modal-no-options">No filters available for this category.</div>
                )}
              </div>

              {filterContext.error && (
                <div className="pcu-modal-no-options">{filterContext.error}</div>
              )}

              <div className="pcu-modal-actions">
                <button onClick={() => setShowFilterModal(false)} className="pcu-modal-back-btn">Back</button>
                <button onClick={handleConfirmFilter} disabled={!filterContext.selected || filterContext.noResults} className="pcu-modal-confirm-btn">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* Back confirm modal */}
        {showResetModal && (
          <div className="pcu-modal-overlay">
            <div className="pcu-modal-background"></div>
            <div className="pcu-modal">
              <h2 className="pcu-modal-title">Are you sure you want to<br /> Select Again?</h2>
              <div className="pcu-modal-actions">
                <button className="pcu-modal-back-btn" onClick={() => setShowResetModal(false)}>NO</button>
                <button
                  className="pcu-modal-confirm-btn"
                  onClick={() => {
                    // Clear selections and go back to category selection
                    setSelectedUpgrades([]);
                    setCurrentParts({});
                    try {
                      localStorage.removeItem('pc-upgrade-selected');
                      localStorage.removeItem('pc-upgrade-current');
                    } catch { }
                    setShowResetModal(false);
                    setStep('select-upgrades');
                  }}
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        )}

        {showExitModal && (
          <div className="pcu-modal-overlay">
            <div className="pcu-modal-background"></div>
            <div className="pcu-modal">
              <h2 className="pcu-modal-title">Going back may discard your changes. Continue?</h2>
              <div className="pcu-modal-actions">
                <button className="pcu-modal-back-btn" onClick={() => setShowExitModal(false)}>NO</button>
                <button
                  className="pcu-modal-confirm-btn"
                  onClick={() => {
                    try {
                      localStorage.removeItem('upgradeOrders');
                      localStorage.removeItem('pc-upgrade-selected');
                      localStorage.removeItem('pc-upgrade-current');
                    } catch { }
                    setShowExitModal(false);
                    navigate('/pc-services');
                  }}
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW - Phase 1: Estimate Modal */}
        {showEstimateModal && (
          <div className="pcu-modal-overlay">
            <div className="pcu-modal-background" onClick={() => setShowEstimateModal(false)}></div>
            <div className="pcu-modal" style={{ maxWidth: '500px', padding: '25px' }}>
              <h2 className="pcu-modal-title" style={{ marginBottom: '20px' }}>
                Estimate Your PC Build
              </h2>
              
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                  Tell us about your PC and we will estimate your components.
                </p>
                
                {/* Usage Field */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                    How do you use your PC? *
                  </label>
                  <select
                    value={estimateData.usage}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, usage: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  >
                    <option value="">-- Select Usage --</option>
                    {parametersLoading ? (
                      <option disabled>Loading...</option>
                    ) : (
                      usageTypes.map(type => (
                        <option key={type.id} value={type.display_name}>
                          {type.display_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Year Purchased */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                    When did you buy this PC? *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 2020"
                    min="2015"
                    max={new Date().getFullYear()}
                    value={estimateData.yearPurchased}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, yearPurchased: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  />
                </div>

                {/* Budget (Optional) */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                    Budget when purchased (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 35000"
                    min="0"
                    value={estimateData.budget}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, budget: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  />
                </div>

                {/* Error Display */}
                {estimateError && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '5px',
                    fontSize: '13px',
                    marginTop: '10px'
                  }}>
                    {estimateError}
                  </div>
                )}
              </div>

              <div className="pcu-modal-actions">
                <button
                  className="pcu-modal-back-btn"
                  onClick={() => setShowEstimateModal(false)}
                  disabled={isEstimating}
                >
                  Cancel
                </button>
                <button
                  className="pcu-modal-confirm-btn"
                  onClick={handleEstimateSubmit}
                  disabled={isEstimating || !estimateData.usage || !estimateData.yearPurchased}
                  style={{
                    opacity: (isEstimating || !estimateData.usage || !estimateData.yearPurchased) ? 0.6 : 1
                  }}
                >
                  {isEstimating ? 'Estimating...' : 'Estimate Build'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW - Phase 2: Recommendations Modal */}
        {showRecommendationsModal && recommendations && (
          <div className="pcu-modal-overlay">
            <div className="pcu-modal-background" onClick={() => setShowRecommendationsModal(false)}></div>
            <div className="pcu-modal" style={{ maxWidth: '800px', padding: '25px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 className="pcu-modal-title" style={{ marginBottom: '20px' }}>
                💡 Upgrade Recommendations
              </h2>
              
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                {/* Bottlenecks Summary */}
                {recommendations.bottlenecks && recommendations.bottlenecks.length > 0 && (
                  <div style={{
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    border: '1px solid #ffc107'
                  }}>
                    <strong style={{ fontSize: '15px' }}>🎯 Priority Components:</strong>
                    <p style={{ marginTop: '5px', fontSize: '14px' }}>
                      {recommendations.bottlenecks.join(', ')} are limiting your system performance.
                    </p>
                  </div>
                )}

                {/* Budget Tier */}
                {recommendations.recommendations?.budget && (
                  <div style={{
                    border: '2px solid #4CAF50',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '15px',
                    backgroundColor: '#f1f8f4'
                  }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#4CAF50', fontSize: '16px' }}>
                      💰 {recommendations.recommendations.budget.tier}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', fontSize: '14px' }}>
                      <strong>Component:</strong>
                      <span>{recommendations.recommendations.budget.priority}</span>
                      
                      <strong>Upgrade To:</strong>
                      <span>{recommendations.recommendations.budget.component?.name || 'N/A'}</span>
                      
                      <strong>Price:</strong>
                      <span>₱{recommendations.recommendations.budget.component?.price?.toLocaleString() || 'N/A'}</span>
                      
                      <strong>Performance:</strong>
                      <span>{recommendations.recommendations.budget.performanceGain}</span>
                      
                      <strong>Compatibility:</strong>
                      <span style={{ color: '#4CAF50' }}>✓ {recommendations.recommendations.budget.compatibility}</span>
                    </div>
                    <button
                      onClick={() => handleApplyRecommendation(recommendations.recommendations.budget)}
                      style={{
                        marginTop: '15px',
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      Apply This Recommendation
                    </button>
                  </div>
                )}

                {/* Mid-Range Tier */}
                {recommendations.recommendations?.midRange && (
                  <div style={{
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '15px',
                    backgroundColor: '#e3f2fd'
                  }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#2196F3', fontSize: '16px' }}>
                      ⭐ {recommendations.recommendations.midRange.tier}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', fontSize: '14px' }}>
                      <strong>Component:</strong>
                      <span>{recommendations.recommendations.midRange.priority}</span>
                      
                      <strong>Upgrade To:</strong>
                      <span>{recommendations.recommendations.midRange.component?.name || 'N/A'}</span>
                      
                      <strong>Price:</strong>
                      <span>₱{recommendations.recommendations.midRange.component?.price?.toLocaleString() || 'N/A'}</span>
                      
                      <strong>Performance:</strong>
                      <span>{recommendations.recommendations.midRange.performanceGain}</span>
                      
                      <strong>Compatibility:</strong>
                      <span style={{ color: '#4CAF50' }}>✓ {recommendations.recommendations.midRange.compatibility}</span>
                    </div>
                    <button
                      onClick={() => handleApplyRecommendation(recommendations.recommendations.midRange)}
                      style={{
                        marginTop: '15px',
                        padding: '10px 20px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      Apply This Recommendation
                    </button>
                  </div>
                )}

                {/* High-End Tier */}
                {recommendations.recommendations?.highEnd && (
                  <div style={{
                    border: '2px solid #FF9800',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '15px',
                    backgroundColor: '#fff3e0'
                  }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#FF9800', fontSize: '16px' }}>
                      🚀 {recommendations.recommendations.highEnd.tier}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', fontSize: '14px' }}>
                      <strong>Component:</strong>
                      <span>{recommendations.recommendations.highEnd.priority}</span>
                      
                      <strong>Upgrade To:</strong>
                      <span>{recommendations.recommendations.highEnd.component?.name || 'N/A'}</span>
                      
                      <strong>Price:</strong>
                      <span>₱{recommendations.recommendations.highEnd.component?.price?.toLocaleString() || 'N/A'}</span>
                      
                      <strong>Performance:</strong>
                      <span>{recommendations.recommendations.highEnd.performanceGain}</span>
                      
                      <strong>Compatibility:</strong>
                      <span style={{ color: '#4CAF50' }}>✓ {recommendations.recommendations.highEnd.compatibility}</span>
                    </div>
                    <button
                      onClick={() => handleApplyRecommendation(recommendations.recommendations.highEnd)}
                      style={{
                        marginTop: '15px',
                        padding: '10px 20px',
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      Apply This Recommendation
                    </button>
                  </div>
                )}
              </div>

              <div className="pcu-modal-actions">
                <button
                  className="pcu-modal-back-btn"
                  onClick={() => setShowRecommendationsModal(false)}
                  style={{ width: '100%' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pc-upgrade-steps-buttons">
          <div className="left-buttons">
            <button className="back-btn" onClick={() => { 
              // Go back to "What Are You Upgrading" page
              console.log('🔙 Back button clicked - going to select-upgrades');
              setStep('select-upgrades');
            }}>
              Back
            </button>
            
            {/* NEW: Skip Button for Manual Processing (Client Requirement 5) */}
            <button
              className="skip-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('⏭️ SKIP BUTTON CLICKED - Manual processing mode');
                
                // 🔥 CRITICAL FIX: Clear ALL previous upgrade data to prevent duplication
                localStorage.removeItem('pc-upgrade-selections'); // Clear actual parts
                localStorage.removeItem('pc-upgrade-selected'); // Clear category selections
                localStorage.removeItem('pc-upgrade-estimated'); // Clear AI estimation
                
                // Save manual processing flag ONLY
                localStorage.setItem('pc-upgrade-manual', 'true');
                localStorage.setItem('pc-upgrade-estimated', JSON.stringify(currentParts));
                
                console.log('✅ Cleared all upgrade data, navigating to manual processing mode');
                
                // Navigate directly to Order Summary with 0 pesos
                // Order will be created with manual_processing flag
                navigate('/order-sum-upgrade', { 
                  state: { 
                    manualProcessing: true,
                    estimatedBuild: currentParts 
                  } 
                });
              }}
            >
              Skip (Manual Processing)
            </button>
          </div>
          
          <div className="right-buttons">
            <button
              className={`next-btn ${!canProceed ? 'disabled' : ''}`}
              disabled={!canProceed}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎯 NEXT BUTTON CLICKED from SELECTED PARTS TO UPGRADE page');
                console.log('Current step:', step);
                console.log('Selected upgrades:', selectedUpgrades);
                console.log('🔥 Estimated build (NOT being ordered):', currentParts);
                console.log('✅ Upgrade parts (ACTUAL ORDER):', upgradeParts);
                console.log('Can proceed:', canProceed);
                
                // 🔥 CRITICAL FIX: Save upgradeParts (actual selections) to localStorage for Order Summary
                try {
                  localStorage.setItem('pc-upgrade-selected', JSON.stringify(selectedUpgrades));
                  localStorage.setItem('pc-upgrade-selections', JSON.stringify(upgradeParts)); // Actual parts to buy
                  localStorage.setItem('pc-upgrade-estimated', JSON.stringify(currentParts)); // AI estimation for reference
                  localStorage.setItem('pc-upgrade-manual', 'false'); // Not manual processing
                  console.log('✅ Data saved to localStorage successfully');
                  console.log('   - pc-upgrade-selections:', Object.keys(upgradeParts));
                  console.log('   - pc-upgrade-estimated:', Object.keys(currentParts));
                } catch (error) {
                  console.error('❌ Error saving to localStorage:', error);
                }
                
                // ✅ ENHANCED: Trigger compatibility validation modal before navigation
                setShowCompatibilityValidationModal(true);
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  // NEW - Render estimation form as FIRST SCREEN (Modern redesign with icons)
  const renderEstimateBuildForm = () => {
    const usageIcons = {
      'Gaming': gaming,
      'Work': work,
      'Content Creation': contentcreation,
      'General Use': generaluse,
      'Programming': programming,
      'Video Editing': videoediting
    };

    const yearIcons = {
      '2021-2025 (Recent)': recent,
      '2016-2020 (Mid-Age)': midage,
      '2010-2015 (Old)': old
    };
    
    const renderQuestion = () => {
      if (currentQuestion === 'usage') {
        return (
          <div className="pcu-estimate-question-container">
            <h2 className="pcu-estimate-question">How will you use your PC?</h2>
            <div className="pcu-estimate-options-grid">
              {parametersLoading ? (
                <div className="pcu-estimate-loading">
                  <div className="pcu-estimate-loading-text">Loading options...</div>
                </div>
              ) : usageTypes.length > 0 ? (
                usageTypes.map(type => (
                  <button
                    key={type.id}
                    className={`pcu-estimate-option-card ${estimateData.usage === type.display_name ? 'selected' : ''}`}
                    onClick={() => {
                      setEstimateData(prev => ({ ...prev, usage: type.display_name }));
                      setEstimateError(null);
                      setTimeout(() => setCurrentQuestion('year'), 300);
                    }}
                  >
                    <div className="pcu-estimate-option-icon-wrapper">
                      <img
                        src={usageIcons[type.display_name] || generaluse}
                        alt={type.display_name}
                        className="pcu-estimate-option-icon-svg"
                      />
                    </div>
                    <span className="pcu-estimate-option-text">{type.display_name}</span>
                  </button>
                ))
              ) : (
                <div className="pcu-estimate-error">No usage types available</div>
              )}
            </div>
          </div>
        );
      }
      
      if (currentQuestion === 'year') {
        return (
          <div className="pcu-estimate-question-container">
            <h2 className="pcu-estimate-question">When did you buy this PC?</h2>
            <div className="pcu-estimate-options-grid">
              {parametersLoading ? (
                <div className="pcu-estimate-loading">
                  <div className="pcu-estimate-loading-text">Loading options...</div>
                </div>
              ) : yearRanges.length > 0 ? (
                yearRanges.map(range => (
                  <button
                    key={range.id}
                    className={`pcu-estimate-option-card ${estimateData.yearPurchased === range.representative_year ? 'selected' : ''}`}
                    onClick={() => {
                      setEstimateData(prev => ({ ...prev, yearPurchased: range.representative_year }));
                      setEstimateError(null);
                      setTimeout(() => setCurrentQuestion('budget'), 300);
                    }}
                  >
                    <div className="pcu-estimate-option-icon-wrapper">
                      <img
                        src={yearIcons[range.display_name] || old}
                        alt={range.display_name}
                        className="pcu-estimate-option-icon-svg"
                      />
                    </div>
                    <span className="pcu-estimate-option-text">{range.display_name}</span>
                  </button>
                ))
              ) : (
                <div className="pcu-estimate-error">No year ranges available</div>
              )}
            </div>
          </div>
        );
      }
      
      if (currentQuestion === 'budget') {
        return (
          <div className="pcu-estimate-question-container">
            <h2 className="pcu-estimate-question">Estimated cost of PC?</h2>
            <div className="pcu-estimate-options-cost-grid">
              {parametersLoading ? (
                <div className="pcu-estimate-loading">
                  <div className="pcu-estimate-loading-text">Loading options...</div>
                </div>
              ) : (
                <>
                  {budgetRanges.map((range, index) => {
                    // Format budget display with proper ranges
                    const formatBudget = (range, index) => {
                      const budget = range.representative_budget;
                      
                      // Define the actual ranges
                      if (budget >= 10000 && budget < 26000) {
                        return '₱10,000 - ₱25,000';
                      } else if (budget >= 26000 && budget < 51000) {
                        return '₱26,000 - ₱50,000';
                      } else if (budget >= 51000 && budget < 76000) {
                        return '₱51,000 - ₱75,000';
                      } else if (budget >= 76000) {
                        return '₱76,000+';
                      }
                      
                      // Fallback: format whatever value we have
                      return `₱${Number.parseInt(budget, 10).toLocaleString()}`;
                    };
                    
                    return (
                      <button
                        key={range.id}
                        className={`pcu-estimate-option-cost-btn ${estimateData.budget === range.representative_budget ? 'selected' : ''}`}
                        onClick={() => {
                          setEstimateData(prev => ({ ...prev, budget: range.representative_budget }));
                          setEstimateError(null);
                          setTimeout(() => setCurrentQuestion('submit'), 300);
                        }}
                      >
                        {formatBudget(range, index)}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        );
      }
      
      if (currentQuestion === 'submit') {
        return (
          <>
            <div className="pcu-estimate-question-container">
              <h2 className="pcu-estimate-question">Ready to analyze your PC?</h2>
              <div className="pcu-estimate-summary">
                <p><strong>Usage:</strong> {estimateData.usage}</p>
                <p><strong>Purchase Year:</strong> {yearRanges.find(r => r.representative_year === estimateData.yearPurchased)?.display_name}</p>
                {estimateData.budget && <p><strong>Budget:</strong> {budgetRanges.find(r => r.representative_budget === estimateData.budget)?.display_name}</p>}
              </div>
              
              {estimateError && (
                <div className="pcu-estimate-error">
                  {estimateError}
                </div>
              )}
            </div>
            
            <div className="pcu-estimate-actions" style={{ marginTop: '40px' }}>
              <button 
                className="pcu-estimate-back-btn"
                style={{
                  width: '460px',
                  height: '71.346px'
                }}
                onClick={() => setCurrentQuestion('budget')}
                disabled={isEstimating}
              >
                Back
              </button>
              <button
                className="pcu-estimate-back-btn"
                style={{
                  width: '460px',
                  height: '71.346px',
                  background: 'linear-gradient(135deg, #00E083 0%, #00A8FF 100%)',
                  border: 'none'
                }}
                onClick={handleEstimateSubmit}
                disabled={isEstimating || !estimateData.usage || !estimateData.yearPurchased}
              >
                {isEstimating ? 'Analyzing Your PC...' : 'Estimate My Build'}
              </button>
            </div>
          </>
        );
      }
    };
    
    return (
      <div className="pcu-estimate-container">
        {/* Logo */}
        <div className="pcu-estimate-logo-container">
          <img src={PcUpgrade} alt="K-Wise Logo" className="pcu-estimate-logo-image" />
        </div>

        {/* Header */}
        <div className="pcu-estimate-header">
          <h1 className="pcu-estimate-main-title">PC UPGRADE</h1>
          <p className="pcu-estimate-tagline">Perform faster</p>
        </div>

        {/* Progress Indicator */}
        <div className="pcu-estimate-progress">
          <div className="pcu-estimate-progress-bar">
            <div
              className="pcu-estimate-progress-fill"
              style={{ 
                width: `${(
                  currentQuestion === 'usage' ? 1 : 
                  currentQuestion === 'year' ? 2 : 
                  currentQuestion === 'budget' ? 3 : 
                  currentQuestion === 'submit' ? 4 : 1
                ) / 6 * 100}%` 
              }}
            ></div>
          </div>
          <p className="pcu-estimate-progress-text">
            Step {
              currentQuestion === 'usage' ? '1' : 
              currentQuestion === 'year' ? '2' : 
              currentQuestion === 'budget' ? '3' : 
              currentQuestion === 'submit' ? '4' : '1'
            } out of 6
          </p>
        </div>

        {/* Content */}
        <div className="pcu-estimate-content">
          {isEstimating ? (
            <div className="pcu-estimate-loading">
              <div className="pcu-estimate-loading-spinner"></div>
              <p className="pcu-estimate-loading-text">Analyzing your PC...</p>
              <p className="pcu-estimate-loading-subtext">This may take a moment</p>
            </div>
          ) : (
            renderQuestion()
          )}
        </div>

        {/* Actions - Hide on submit question since it has dedicated buttons */}
        {currentQuestion !== 'submit' && (
          <div className="pcu-estimate-actions">
            <button 
              className="pcu-estimate-back-btn"
              onClick={() => {
                if (currentQuestion === 'usage') {
                  // Navigate back to PC Services when on first question
                  navigate('/pc-services');
                } else if (currentQuestion === 'year') {
                  setCurrentQuestion('usage');
                } else if (currentQuestion === 'budget') {
                  setCurrentQuestion('year');
                }
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    );
  };

  // NEW - Render estimated build view (AFTER AI SUCCESS)
  const renderViewEstimatedBuild = () => {
    // Map category names back to upgrade option IDs
    const categoryToId = {
      'CPU': 'processor',
      'GPU': 'gpu',
      'RAM': 'ram',
      'Storage': 'storage',
      'Motherboard': 'motherboard',
      'PSU': 'psu',
      'Cooling': 'cpu-cooler',
      'Case': 'chassis'
    };

    return (
      <div className="pc-upgrade-container">
        <div className="pc-upgrade-header">
          <img className="pc-upgrade-img" src={PcUpgrade} alt="PC Upgrade" />
          <div className='upgrade-title'>
            <h1 className='upgrade-name'>PC UPGRADE</h1>
            <p className='upgrade-subtitle'>Your Estimated Build</p>
          </div>
        </div>

        <div className="pc-upgrade-content">
          <div className="pc-upgrade-intro">
            <h2 className="pc-upgrade-section-title">
              ✅ Build Estimated with {formatConfidencePercent(buildConfidence)}% Confidence!
            </h2>
            <p className="pc-upgrade-section-desc">
              Based on your {estimatedUsage} usage
            </p>
          </div>

          {/* Estimated Components Display */}
          <div style={{ maxWidth: '900px', margin: '30px auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {estimatedBuild && Object.entries(estimatedBuild).map(([category, description]) => {
                const isRecommended = aiSuggestedCategories.includes(category);
                return (
                  <div key={category} style={{
                    padding: '20px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: isRecommended ? '3px solid #4CAF50' : '1px solid #ddd',
                    position: 'relative'
                  }}>
                    {isRecommended && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '10px',
                        padding: '4px 12px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        fontSize: '11px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        ⭐ RECOMMENDED
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '28px', marginRight: '12px' }}>
                        {category === 'CPU' ? '🔧' :
                         category === 'GPU' ? '🎮' :
                         category === 'RAM' ? '💾' :
                         category === 'Storage' ? '💿' :
                         category === 'Motherboard' ? '🔌' :
                         category === 'PSU' ? '⚡' :
                         category === 'Cooling' ? '❄️' :
                         category === 'Case' ? '📦' : '⚙️'}
                      </span>
                      <strong style={{ fontSize: '18px' }}>{category}</strong>
                    </div>
                    <p style={{ margin: '8px 0', color: '#666', fontSize: '15px', lineHeight: '1.5' }}>
                      {description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Recommendations Summary */}
            {aiSuggestedCategories.length > 0 && (
              <div style={{
                padding: '25px',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                border: '2px solid #ffc107',
                marginBottom: '25px'
              }}>
                <strong style={{ fontSize: '18px', display: 'block', marginBottom: '12px' }}>
                  🎯 Upgrade Recommendations:
                </strong>
                <p style={{ fontSize: '15px', color: '#666', margin: 0, lineHeight: '1.6' }}>
                  For optimal <strong>{estimatedUsage}</strong> performance, we recommend upgrading:{' '}
                  <strong>{aiSuggestedCategories.join(', ')}</strong>
                </p>
              </div>
            )}

            <button
              onClick={() => {
                // Pre-select AI-recommended categories
                const categoryIds = aiSuggestedCategories.map(cat => categoryToId[cat]).filter(Boolean);
                setSelectedUpgrades(categoryIds);
                setStep('select-upgrades');
              }}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '17px',
                fontWeight: 'bold',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1976D2'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2196F3'}
            >
              Continue to Upgrade Selection →
            </button>
          </div>
        </div>

        <div className="pc-upgrade-buttons">
          <button className="back-btn" onClick={() => setStep('estimate-build')}>
            Back to Estimation
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {step === 'estimate-build' ? renderEstimateBuildForm() :
       step === 'view-build' ? renderViewEstimatedBuild() :
       step === 'select-upgrades' ? renderUpgradeSelection() :
       renderCurrentPartsSelection()}

      {/* ✅ NEW: Enhanced Compatibility Validation Modal for Order Summary */}
      {showCompatibilityValidationModal && (
        <CompatibilityValidationModal
          isOpen={showCompatibilityValidationModal}
          cartItems={Object.values(upgradeParts).filter(part => part !== null && part !== undefined)}
          pageName="PC-Upgrade"
          onClose={() => setShowCompatibilityValidationModal(false)}
          onProceed={() => {
            setShowCompatibilityValidationModal(false);
            console.log('🚀 Navigating to /order-sum-upgrade...');
            navigate('/order-sum-upgrade');
          }}
        />
      )}
    </>
  );
};

export default PCUpgrade;
