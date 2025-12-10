import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
// Import theme system for all components
import "../styles/theme.css";
// Import comprehensive admin core styles with theme support
import "../styles/admin-core.css";
import "../styles/admin-text-fixes.css";
// Import comprehensive dark mode enhancement
import "../styles/dark-mode-enhancement.css";
import "../styles/dark-mode.css";
// Import no transparency fix
import "../styles/no-transparency.css";
// Import admin styles for admin routes
import "../admin/styles/admin-core.css";
import "../admin/styles/admin-layout.css";
import "../admin/styles/admin-dashboard.css";
import pcwiselogo from "../assets/App/pcwiselogo.svg";
import pcwisename from "../assets/App/pcwisename.svg";
import { useEffect } from "react";

// Kiosk Components
import Order from "../kiosk/Order";
import Transaction from "../kiosk/Transac-components";
import PCParts from "../kiosk/PC-Parts";
import PCServices from "../kiosk/PC-Services";
import AssistedService from "../kiosk/AssistedService";
import ProductPage from "../kiosk/ProductPage";
import OrderSummary from "../kiosk/OrderSummary";
import PaymentWindow from "../kiosk/PaymentWindow";
import QueuingDisplay from "../kiosk/QueuingDisplay";
import OnlineBanking from "../kiosk/OnlineBanking";
import CreditCard from "../kiosk/CreditCard";
// NEW: Payment Method Detail Pages (Pasted Images 3-8)
import OnlineBankPayment from "../kiosk/OnlineBankPayment";
import CreditCardPayment from "../kiosk/CreditCardPayment";
import InstallmentPayment from "../kiosk/InstallmentPayment";
import PentagonStats from "../kiosk/PentagonStats";
import PurposeOfUse from "../kiosk/PurposeOfUse";
import PCBuildCategory from "../kiosk/PCBuildCategory";
import PriceRange from "../kiosk/PriceRange";
import ProductList from "../kiosk/ProductList";
import PCCustomized from "../kiosk/PCCustomized";
import PrebuiltOptions from "../kiosk/PrebuiltOptions"; // NEW - Preset vs Community selection
import TierSelection from "../kiosk/TierSelection"; // NEW - Tier selection for preset/community
import PCCustomizedAIAssessment from "../kiosk/PCCustomizedAIAssessment"; // NEW - Feature 6: AI Customization Assessment
import PCCustomizedAISuggestions from "../kiosk/PCCustomizedAISuggestions"; // NEW - Feature 6: AI Build Suggestions
import CustomizeAI from "../components/CustomizeAI/CustomizeAI"; // NEW - Unified CustomizeAI wizard
import EditBuild from "../components/CustomizeAI/EditBuild"; // NEW - Edit AI-generated build
import PeripheralsPrompt from "../components/CustomizeAI/PeripheralsPrompt"; // NEW - Ask if user wants peripherals
import Peripherals from "../kiosk/Peripherals"; // NEW - Peripherals selection page
import ProductPageCustom from "../kiosk/ProductPageCustom";
import CustomizedProducts from "../kiosk/CustomizedProducts";
import PCBuilder from "../kiosk/PCBuilder"; // ✅ NEW: Guided step-by-step PC Builder
import BuildSummary from "../kiosk/BuildSummary"; // ✅ NEW: Build completion summary
import FutureUpgrade from "../kiosk/FutureUpgrade";
import CustomizedDisplay from "../kiosk/CustomizedDisplay";
import PreBuiltDisplay from "../kiosk/PreBuiltDisplay";
import OrderSumCustom from "../kiosk/OrderSumCustom";
import PCCleaning from "../kiosk/PCCleaning";
import PCCleaningAssessment from "../kiosk/PCCleaningAssessment"; // ✅ NEW: PC Cleaning Assessment
import PCReCase from "../kiosk/PCReCase"; // ✅ NEW: PC Re-Case optional page
import OrderSumClean from "../kiosk/OrderSumClean";
import PCCheckup from "../kiosk/PCCheckup";
import ReviewIssues from "../kiosk/ReviewIssues";
import OrderSumBuild from "../kiosk/OrderSumBuild";
import PCUpgrade from "../kiosk/PCUpgrade";
import PCUpgradePreview from "../kiosk/PCUpgradePreview"; // NEW - Phase 11: Preview Existing Build
import OrderSumUpgrade from "../kiosk/OrderSumUpgrade";
// NEW - Phase 3: Product Browsing Components
import PCUpgradeDisplay from "../kiosk/PCUpgradeDisplay";
import PCUpgradeProduct from "../kiosk/PCUpgradeProduct";

// NEW - Phase 4: Admin AI Metrics
import AIMetrics from "../admin/pages/AIMetrics";

// NEW - Task 7: Admin Auto-Generate Orders
import AutoGenerateOrders from "../admin/AutoGenerateOrders";

// NEW - Task 11: Analytics Dashboard
import AnalyticsDashboard from "../admin/AnalyticsDashboard";

// NEW - Task 14 Phase 4: AI Analytics Dashboard
import AIAnalyticsDashboard from "../admin/AIAnalyticsDashboard";

// NEW - Phase 4: Cache Performance Dashboard
import CachePerformanceDashboard from "../components/admin/CachePerformanceDashboard";

// NEW - Phase 4: System Performance Metrics
import SystemPerformanceMetrics from "../components/admin/SystemPerformanceMetrics";

// NEW - Phase 4: Visual Rule Builder
import RuleBuilder from "../components/admin/RuleBuilder/RuleBuilder";

// NEW - IP Access Control System
import IPAccessControl from "../admin/pages/IPAccessControl";

// NEW - PRIORITY 3: Real-World Data Admin Components
import AdminFeedbackReview from "../admin/components/AdminFeedbackReview";
import AdminKnownIssues from "../admin/components/AdminKnownIssues";

// Debug components
import CategoriesDebugTest from "../components/CategoriesDebugTest";
import SimpleCategoriesTest from "../components/SimpleCategoriesTest";

// Assistance Notification Component
import AssistanceNotification from "../components/AssistanceNotification";
import useSocket from "../hooks/useSocket";

// Backend Integration Components
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SearchProvider } from '../contexts/SearchContext-simple';
import Dashboard from '../pages/Dashboard/Dashboard';
import Login from '../pages/Login/Login';
import ResetPassword from '../pages/Login/ResetPassword';
import Stock from '../pages/Orders/Stock';
import StockDetail from '../pages/Orders/StockDetail';
import History from '../pages/Orders/History';
import OrderQueue from '../pages/Orders/OrderQueue';
import QueueMonitorDisplay from '../pages/Orders/QueueMonitorDisplay'; // NEW - Issue #6: Vertical monitor display
import LogHistory from '../pages/Orders/LogHistory';
import Accounts from '../pages/Accounts/Accounts';
import Settings from '../pages/Settings/Settings';
import DeveloperTools from '../pages/DeveloperTools/DeveloperTools';
import OrderQueueDisplay from '../components/Widgets/OrderQueueDisplay';
import Layout from '../components/Layout/Layout';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  // Debug logging for route protection
  useEffect(() => {
    console.log(`🔒 ProtectedRoute (${location.pathname}) - Auth Check:`, {
      currentUser: currentUser ? `${currentUser.name} (${currentUser.role})` : 'None',
      isLoading,
      allowedRoles,
      path: location.pathname
    });
  }, [currentUser, isLoading, allowedRoles, location.pathname]);

  // Check if we have a user in localStorage when currentUser is not available yet
  const getUserFromStorage = () => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      console.error('Error parsing user from localStorage in ProtectedRoute:', e);
    }
    return null;
  };

  // Use either currentUser from context or from localStorage
  const user = currentUser || getUserFromStorage();

  // Show loading state only if truly loading and no stored user
  if (isLoading && !user) {
    console.log("ProtectedRoute - Still loading auth, showing loading...");
    return <div className="loading">Loading...</div>;
  }

  // Redirect to login if no user found
  if (!user) {
    console.log("ProtectedRoute - No user found, redirecting to login");
    // Save current path for redirect after login
    sessionStorage.setItem('redirectPath', location.pathname);
    return <Navigate to="/login" />;
  }

  // Check role-based access - Now this is mostly handled by the components
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log(`Access denied: User role ${user.role} not in allowed roles:`, allowedRoles);
    return <Navigate to="/admin/dashboard" />;
  }

  console.log(`✅ ProtectedRoute (${location.pathname}) - Access granted for user:`, user.name, user.role);
  return children;
};

// Create a more robust protected component for direct page access
// Commented out since it's not currently used - can be uncommented when needed
/*
const ProtectedDirectRoute = ({ component: Component, requiredRole }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  console.log(`ProtectedDirectRoute (${location.pathname}) - Initial render, required role:`, requiredRole);

  useEffect(() => {
    const checkAccess = async () => {
      console.log(`ProtectedDirectRoute (${location.pathname}) - Checking authorization for role:`, requiredRole);

      setIsChecking(true);
      let user = null;
      let role = null;

      // First try to get user from context
      if (currentUser && currentUser.role) {
        user = currentUser;
        role = currentUser.role;
        console.log(`ProtectedDirectRoute (${location.pathname}) - Found user in context:`, user.name, role);
      }
      // Then try from localStorage
      else {
        try {
          const storedUser = localStorage.getItem('currentUser');
          if (storedUser) {
            user = JSON.parse(storedUser);
            role = user.role;
            console.log(`ProtectedDirectRoute (${location.pathname}) - Found user in localStorage:`, user.name, role);
          }
        } catch (e) {
          console.error(`ProtectedDirectRoute (${location.pathname}) - Error checking stored user:`, e);
        }
      }

      // Check authorization
      let authorized = false;

      if (!user) {
        console.log(`ProtectedDirectRoute (${location.pathname}) - No user found, redirecting to login`);
        navigate('/login', { replace: true });
        setIsChecking(false);
        return;
      }

      // For superadmin role check
      if (requiredRole === 'superadmin' && role === 'superadmin') {
        authorized = true;
      }
      // For admin or superadmin role check
      else if (requiredRole === 'adminOrSuperadmin' && (role === 'admin' || role === 'superadmin')) {
        authorized = true;
      }

      console.log(`ProtectedDirectRoute (${location.pathname}) - Authorization result:`, authorized);

      if (!authorized) {
        console.log(`ProtectedDirectRoute (${location.pathname}) - Access denied, redirecting to dashboard`);
        navigate('/admin/dashboard', { replace: true });
      }

      setIsAuthorized(authorized);
      setIsChecking(false);
    };

    // Only check access if:
    // 1. Not loading from auth context
    // 2. We haven't finished checking yet OR we need to recheck because user/loading state changed
    if (!isLoading || isChecking) {
      checkAccess();
    }
  }, [currentUser, isLoading, requiredRole, navigate, location.pathname, isChecking]);

  // Show loading while checking authorization
  if (isLoading || isChecking) {
    return (
      <div className="loading">
        Verifying access...
      </div>
    );
  }

  // Only render component if authorized
  if (!isAuthorized) {
    return null; // Will be redirected by useEffect
  }

  // Render the protected component
  return (
    <SearchProvider>
      <Layout>
        <Component />
      </Layout>
    </SearchProvider>
  );
};
*/

// AdminLayout component to wrap authenticated routes with SearchProvider
const AdminLayout = () => {
  return (
    <SearchProvider>
      <Layout />
    </SearchProvider>
  );
};

//Here is the Starting point of a Kiosk System, where we can see the route in every page.
function Home() {
  const navigate = useNavigate();
  // Make the entire page clickable and accessible
  const handleClick = (e) => {
    // Prevent double navigation if a link or button is clicked
    if (e.target.closest("a,button")) return;
    navigate("/order");
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      navigate("/order");
    }
  };
  return (
    <div
      className="App"
      tabIndex={0}
      role="button"
      aria-label="Tap anywhere to start"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ outline: "none" }}
    >
      <div className="bg-vectors">
        <div className="vec vec1">
          <svg viewBox="0 0 570 876" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <defs>
              <filter id="edgeBlur1" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>
            <path d="M97.7048 226.907C-1.49459 -6.07294 127.178 35.2845 221.704 4.51708C354.389 -38.6706 385.323 240.674 428.874 295.742C483.312 364.576 651.165 449.296 710.14 671.686C769.116 894.076 369.898 878.947 97.7048 943.244C-174.489 1007.54 221.704 518.131 97.7048 226.907Z" fill="none" stroke="#00E083" strokeWidth="60" strokeLinejoin="round" strokeOpacity="0.6" filter="url(#edgeBlur1)" />
            <path d="M97.7048 226.907C-1.49459 -6.07294 127.178 35.2845 221.704 4.51708C354.389 -38.6706 385.323 240.674 428.874 295.742C483.312 364.576 651.165 449.296 710.14 671.686C769.116 894.076 369.898 878.947 97.7048 943.244C-174.489 1007.54 221.704 518.131 97.7048 226.907Z" fill="#00E083" />
          </svg>
        </div>
        <div className="vec vec2">
          <svg viewBox="0 0 363 674" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <defs>
              <filter id="edgeBlur2" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="10" />
              </filter>
            </defs>
            <path d="M-118.213 251.271C-183.813 97.2713 138.851 -48.2285 155.898 15.2571C192.287 150.771 130.287 222.271 254.287 317.771C360.365 399.468 395.642 500.406 326.287 635.757C254.287 776.271 205.287 471.271 25.2874 513.771C-154.713 556.271 -36.2129 443.771 -118.213 251.271Z" fill="none" stroke="#00E083" strokeWidth="40" strokeLinejoin="round" strokeOpacity="0.6" filter="url(#edgeBlur2)" />
            <path d="M-118.213 251.271C-183.813 97.2713 138.851 -48.2285 155.898 15.2571C192.287 150.771 130.287 222.271 254.287 317.771C360.365 399.468 395.642 500.406 326.287 635.757C254.287 776.271 205.287 471.271 25.2874 513.771C-154.713 556.271 -36.2129 443.771 -118.213 251.271Z" fill="#00E083" />
          </svg>
        </div>
        <div className="vec vec3">
          <svg viewBox="0 0 646 766" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <defs>
              <filter id="edgeBlur3" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>
            <path d="M231.339 -16.323C336.797 -211.454 753.851 2.36473 702.128 72.459C591.721 222.08 466.46 216.965 469.819 424.224C472.693 601.526 397.201 721.431 199.701 761.453C-5.33274 803.001 270.309 500.309 77.7245 349.084C-114.859 197.86 99.5156 227.591 231.339 -16.323Z" fill="none" stroke="#00E083" strokeWidth="60" strokeLinejoin="round" strokeOpacity="0.6" filter="url(#edgeBlur3)" />
            <path d="M231.339 -16.323C336.797 -211.454 753.851 2.36473 702.128 72.459C591.721 222.08 466.46 216.965 469.819 424.224C472.693 601.526 397.201 721.431 199.701 761.453C-5.33274 803.001 270.309 500.309 77.7245 349.084C-114.859 197.86 99.5156 227.591 231.339 -16.323Z" fill="#00E083" />
          </svg>
        </div>
      </div>
      <header className="Store-name">
        <img className="store-logo" src={pcwiselogo} alt="PC Wise" />
        <div className="store-title">
          <img className="store-name-image" src={pcwisename} alt="PC WISE" />
          <p>YOUR WISE CHOICE</p>
        </div>
        <div className="start-up">
          <button tabIndex={-1} style={{ pointerEvents: "none" }}>TAP ANYWHERE TO START</button>
        </div>
      </header>
    </div>
  );
}

// Admin Wrapper Component
function AdminWrapper({ children }) {
  const { socket, connected } = useSocket();
  
  return (
    <div className="admin-app">
      {/* Show assistance notification for admin users */}
      {socket && connected && <AssistanceNotification io={socket} />}
      {children}
    </div>
  );
}

// Route wrapper to determine if admin styles should be applied
function RouteWrapper({ children }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/login' || location.pathname === '/reset-password';
  
  if (isAdminRoute) {
    return <AdminWrapper>{children}</AdminWrapper>;
  }
  
  return children;
}

// App Component
function App() {
  // Add debug logging for backend integration - only once and in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 K-Wise App Component Mounted');
      console.log('✅ Backend Integration Status: All systems initialized');
      
      // Test API connection on app start - only once
      const testBackendConnection = async () => {
        try {
          const { testConnection } = await import('../services/api');
          const isConnected = await testConnection();
          console.log('🔌 Backend Connection Test:', isConnected ? '✅ Connected' : '❌ Disconnected');
        } catch (error) {
          console.log('⚠️ Could not test backend connection:', error.message);
        }
      };

      // Only test connection once on mount
      testBackendConnection();
    }
  }, []); // Empty dependency array ensures this only runs once

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="app-container">
            <RouteWrapper>
              <Routes>
                {/* Login route */}
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Client-facing routes */}
                <Route path="/" element={<Home />} />
                <Route path="/app" element={<Home />} />
              <Route path="/order" element={<Order />} />
              <Route path="/transaction" element={<Transaction />} />
              <Route path="/pc-parts" element={<PCParts />} />
              <Route path="/debug-categories" element={<CategoriesDebugTest />} />
              <Route path="/simple-test" element={<SimpleCategoriesTest />} />
              <Route path="/pc-services" element={<PCServices />} />
              <Route path="/assisted-service" element={<AssistedService />} />
              <Route path="/product/:productId" element={<ProductPage />} />
              <Route path="/pc-product-details" element={<ProductPage />} />
              <Route path="/order-summary" element={<OrderSummary />} />
              <Route path="/payment-window" element={<PaymentWindow />} />
              <Route path="/queuing-display" element={<QueuingDisplay />} />
              {/* NEW: Payment Method Detail Pages (Pasted Images 3-8) */}
              <Route path="/payment/online-bank" element={<OnlineBankPayment />} />
              <Route path="/payment/credit-card" element={<CreditCardPayment />} />
              <Route path="/payment/installment" element={<InstallmentPayment />} />
              {/* OLD payment pages (keeping for compatibility) */}
              <Route path="/online-banking" element={<OnlineBanking />} />
              <Route path="/credit-card" element={<CreditCard />} />
              <Route path="/pentagon-stats" element={<PentagonStats />} />
              <Route path="/pcbuild-purpose" element={<PurposeOfUse />} />
              <Route path="/pcbuild-category" element={<PCBuildCategory />} />
              <Route path="/prebuilt-options" element={<PrebuiltOptions />} /> {/* NEW - Preset vs Community */}
              <Route path="/tier-selection" element={<TierSelection />} /> {/* NEW - Tier selection */}
              <Route path="/priceRange" element={<PriceRange />} />
              <Route path="/product-list" element={<ProductList />} />
              <Route path="/pc-customized" element={<PCCustomized />} />
              <Route path="/pc-customized-ai-assessment" element={<PCCustomizedAIAssessment />} /> {/* NEW - Feature 6: AI Assessment */}
              <Route path="/pc-customized-ai-suggestions" element={<PCCustomizedAISuggestions />} /> {/* NEW - Feature 6: AI Suggestions */}
              <Route path="/customize-ai" element={<CustomizeAI />} /> {/* NEW - Unified CustomizeAI wizard */}
              <Route path="/customize-ai/edit-build" element={<EditBuild />} /> {/* NEW - Edit AI build */}
              <Route path="/peripherals-prompt" element={<PeripheralsPrompt />} /> {/* NEW - Ask about peripherals */}
              <Route path="/peripherals" element={<Peripherals />} /> {/* NEW - Peripherals selection */}
              <Route path="/productpage-custom/:productId" element={<ProductPageCustom />} />
              <Route path="/customized-products" element={<CustomizedProducts />} />
              <Route path="/pc-builder" element={<PCBuilder />} /> {/* ✅ NEW: Guided PC Builder */}
              <Route path="/build-summary" element={<BuildSummary />} /> {/* ✅ NEW: Build Summary */}
              <Route path="/future-upgrades" element={<FutureUpgrade />} /> {/* ✅ Corrected */}
              <Route path="/customized-display" element={<CustomizedDisplay />} />
              <Route path="/prebuilt-display" element={<PreBuiltDisplay />} />
              <Route path="/ordersum-custom" element={<OrderSumCustom />} />
              <Route path="/pc-cleaning-assessment" element={<PCCleaningAssessment />} /> {/* ✅ NEW: PC Cleaning Assessment */}
              <Route path="/pc-cleaning" element={<PCCleaning />} />
              <Route path="/pc-recase" element={<PCReCase />} /> {/* ✅ NEW: PC Re-Case optional page */}
              <Route path="/ordersum-clean" element={<OrderSumClean />} />
              <Route path="/pc-checkup" element={<PCCheckup />} />
              <Route path="/review-issues" element={<ReviewIssues />} />
              <Route path="/order-sum-build" element={<OrderSumBuild />} />
              <Route path="/pc-upgrade" element={<PCUpgrade />} />
              <Route path="/pc-upgrade-preview" element={<PCUpgradePreview />} /> {/* NEW - Phase 11 */}
              <Route path="/order-sum-upgrade" element={<OrderSumUpgrade />} />
              {/* NEW - Phase 3: Product Browsing Routes */}
              <Route path="/pc-upgrade-display" element={<PCUpgradeDisplay />} />
              <Route path="/pc-upgrade-product" element={<PCUpgradeProduct />} />

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="stock" element={<Stock />} />
                <Route path="stock/:category" element={<StockDetail />} />
                <Route path="history" element={<History />} />
                <Route path="order-queue" element={<OrderQueue />} />
                {/* NEW - Task 7: Auto-Generate Test Orders */}
                <Route path="auto-generate-orders" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin", "developer"]}>
                    <AutoGenerateOrders />
                  </ProtectedRoute>
                } />
                {/* NEW - Task 11: Analytics Dashboard */}
                <Route path="analytics" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin", "developer"]}>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                } />
                {/* NEW - Task 14 Phase 4: AI Analytics Dashboard */}
                <Route path="ai-analytics" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin", "developer"]}>
                    <AIAnalyticsDashboard />
                  </ProtectedRoute>
                } />
                <Route path="log-history" element={
                  <ProtectedRoute allowedRoles={["superadmin"]}>
                    <LogHistory />
                  </ProtectedRoute>
                } />
                <Route path="accounts" element={<Accounts />} />
                <Route path="settings" element={<Settings />} />
                {/* NEW - IP Access Control System */}
                <Route path="ip-access-control" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                    <IPAccessControl />
                  </ProtectedRoute>
                } />
                {/* NEW - Phase 4: AI Metrics Dashboard */}
                <Route path="ai-metrics" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                    <AIMetrics />
                  </ProtectedRoute>
                } />
                {/* NEW - Phase 4: Cache Performance Dashboard */}
                <Route path="cache-performance" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin", "developer"]}>
                    <CachePerformanceDashboard />
                  </ProtectedRoute>
                } />
                {/* NEW - Phase 4: System Performance Metrics */}
                <Route path="system-metrics" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin", "developer"]}>
                    <SystemPerformanceMetrics />
                  </ProtectedRoute>
                } />
                {/* NEW - Phase 4: Visual Rule Builder */}
                <Route path="rule-builder" element={
                  <ProtectedRoute allowedRoles={["superadmin"]}>
                    <RuleBuilder />
                  </ProtectedRoute>
                } />
                {/* NEW - PRIORITY 3: Real-World Data Management */}
                <Route path="feedback-review" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                    <AdminFeedbackReview />
                  </ProtectedRoute>
                } />
                <Route path="known-issues" element={
                  <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                    <AdminKnownIssues />
                  </ProtectedRoute>
                } />
                <Route path="developer-tools" element={
                  <ProtectedRoute allowedRoles={["superadmin", "developer"]}>
                    <DeveloperTools />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Customer-facing order queue display */}
              <Route path="/queue-display" element={<OrderQueueDisplay />} />
              
              {/* NEW - Issue #6: Vertical monitor display for queue (1920x1080) */}
              <Route path="/queue-display-monitor" element={<QueueMonitorDisplay />} />

              {/* Fallback redirect to home */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            </RouteWrapper>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
