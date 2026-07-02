import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UsageSelection from './UsageSelection';
import BudgetSelection from './BudgetSelection';
import PerformanceSelection from './PerformanceSelection';
import GamingPreference from './GamingPreference';
import LoadingScreen from './LoadingScreen';
import BuildResult from './BuildResult';
import '../../styles/CustomizeAI.css';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/networkConfig';
import logger from '../../utils/logger';

/**
 * CustomizeAI - Main orchestrator component for the AI-powered PC customization wizard
 * 
 * Flow:
 * 1. Usage Selection (Step 1)
 * 2. Budget Selection (Step 2)
 * 3. Performance Selection (Step 3)
 * 4. Gaming Preference (Step 4 - conditional, only if Gaming selected)
 * 5. Loading Screen
 * 6. Build Result (success or error)
 */
const CustomizeAI = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [assessment, setAssessment] = useState({
    usage: '',
    budget: '',
    performance: '',
    gamingPreference: ''
  });
  const [buildResult, setBuildResult] = useState(null);
  const [buildError, setBuildError] = useState(null);

  /**
   * Handle progression to next step
   */
  const handleNext = (data) => {
    const updatedAssessment = { ...assessment, ...data };
    setAssessment(updatedAssessment);

    // Step 1 -> Step 2
    if (currentStep === 1) {
      setCurrentStep(2);
    }
    // Step 2 -> Step 3
    else if (currentStep === 2) {
      setCurrentStep(3);
    }
    // Step 3 -> Check if Gaming
    else if (currentStep === 3) {
      if (updatedAssessment.usage === 'Gaming') {
        setCurrentStep(4); // Go to gaming preferences
      } else {
        setCurrentStep(5); // Go to loading
        generateBuild(updatedAssessment);
      }
    }
    // Step 4 (Gaming Preference) -> Loading
    else if (currentStep === 4) {
      setCurrentStep(5);
      generateBuild(updatedAssessment);
    }
  };

  /**
   * Handle going back to previous step
   */
  const handleBack = () => {
    if (currentStep === 1) {
      navigate('/pcbuild-category');
    } else if (currentStep === 4 && assessment.usage === 'Gaming') {
      // If on gaming preference, go back to performance
      setCurrentStep(3);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Generate PC build using reference builds from backend
   */
  const generateBuild = async (userAssessment) => {
    try {
      logger.info('🤖 Fetching reference builds based on assessment', userAssessment);

      // Fetch all reference builds (getApiBaseUrl() already includes /api)
      const response = await axios.get(`${getApiBaseUrl()}/pc-customized-ai-builds/all`);
      
      if (!response.data.success) {
        throw new Error('Failed to fetch reference builds');
      }

      const allBuilds = response.data.data.builds;
      logger.info('📦 Fetched reference builds', { count: allBuilds.length });

      // Find matching build
      const matchingBuild = findMatchingBuild(allBuilds, userAssessment);
      
      if (!matchingBuild) {
        logger.warn('⚠️ No matching reference build found');
        setBuildError({
          type: 'no_match',
          message: 'Unable to generate build',
          reasons: [
            'No products match your budget range',
            'Insufficient product inventory',
            'Reference builds need to be regenerated'
          ]
        });
        setCurrentStep(6); // Show error page
        return;
      }

      logger.info('✅ Found matching build', { key: matchingBuild.key });

      // Fetch full product details for each component
      const buildComponents = await fetchBuildComponents(matchingBuild.build);
      
      setBuildResult(buildComponents);
      setCurrentStep(6); // Show success page
      
    } catch (error) {
      logger.error('❌ Error generating build', { error: error.message });
      setBuildError({
        type: 'error',
        message: 'System error occurred',
        reasons: ['Network connection issue', 'Server unavailable', 'Please try again later']
      });
      setCurrentStep(6);
    }
  };

  /**
   * Find matching build from reference builds
   */
  const findMatchingBuild = (builds, userAssessment) => {
    // Create search key from assessment
    const usageKey = userAssessment.usage.toLowerCase().replaceAll(' ', '-');
    const budgetKey = userAssessment.budget.toLowerCase().replaceAll(' ', '-');
    const performanceKey = userAssessment.performance.toLowerCase().replaceAll(' ', '-');
    const gamingKey = userAssessment.gamingPreference 
      ? userAssessment.gamingPreference.toLowerCase().replaceAll(' ', '-')
      : null;

    let searchKey;
    if (usageKey === 'gaming' && gamingKey) {
      searchKey = `${usageKey}-${budgetKey}-${performanceKey}-${gamingKey}`;
    } else {
      searchKey = `${usageKey}-${budgetKey}-${performanceKey}`;
    }

    logger.info('🔍 Searching for build', { searchKey, totalBuilds: builds.length });

    // Builds is already an array with key and build_key properties
    const match = builds.find(b => b.key === searchKey || b.build_key === searchKey);
    
    if (match) {
      logger.info('✅ Found matching build', { build_key: match.build_key || match.key });
      return { key: searchKey, build: match };
    }

    logger.warn('❌ No exact match found', { searchKey, availableBuilds: builds.length });
    return null;
  };

  /**
   * Fetch full product details for all components in a build
   */
  const fetchBuildComponents = async (build) => {
    const components = {};
    const componentMap = {
      cpu: build.cpu_id || build.components?.cpu,
      cooling: build.cooling_id || build.components?.cooling,
      motherboard: build.motherboard_id || build.components?.motherboard,
      ram: build.ram_id || build.components?.ram,
      storage: build.storage_id || build.components?.storage,
      gpu: build.gpu_id || build.components?.gpu,
      case: build.case_id || build.components?.case,
      psu: build.psu_id || build.components?.psu
    };

    await Promise.all(
      Object.entries(componentMap).map(async ([category, productId]) => {
        if (!productId) return;

        try {
          // ✅ FIX: Use /stock/:id endpoint instead of non-existent /parts/:id
          const response = await axios.get(`${getApiBaseUrl()}/stock/${productId}`);
          if (response.data.success) {
            components[category] = response.data.data;
          }
        } catch (error) {
          logger.error(`Failed to fetch ${category}`, { error: error.message, productId });
        }
      })
    );

    return components;
  };

  /**
   * Render current step component
   */
  const renderStep = () => {
    // Dynamically calculate totalSteps based on usage selection
    const totalSteps = assessment.usage === 'Gaming' ? 4 : 3;
    
    switch (currentStep) {
      case 1:
        return <UsageSelection onNext={handleNext} onBack={handleBack} totalSteps={totalSteps} />;
      case 2:
        return <BudgetSelection onNext={handleNext} onBack={handleBack} totalSteps={totalSteps} />;
      case 3:
        return <PerformanceSelection onNext={handleNext} onBack={handleBack} selectedUsage={assessment.usage} totalSteps={totalSteps} />;
      case 4:
        return <GamingPreference onNext={handleNext} onBack={handleBack} totalSteps={totalSteps} />;
      case 5:
        return <LoadingScreen />;
      case 6:
        return (
          <BuildResult 
            buildResult={buildResult} 
            buildError={buildError}
            assessment={assessment}
          />
        );
      default:
        return <UsageSelection onNext={handleNext} onBack={handleBack} totalSteps={totalSteps} />;
    }
  };

  return (
    <div className="customize-ai-container">
      {renderStep()}
    </div>
  );
};

export default CustomizeAI;