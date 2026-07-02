import { BrowserRouter as Router, Route, Routes, Navigate, Link, useLocation } from "react-router-dom";
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
import { lazy, Suspense, useEffect } from "react";
import PropTypes from 'prop-types';

// Kiosk Components
const Order = lazy(() => import("../kiosk/Order"));
const Transaction = lazy(() => import("../kiosk/Transac-components"));
const PCParts = lazy(() => import("../kiosk/PC-Parts"));
const PCServices = lazy(() => import("../kiosk/PC-Services"));
const AssistedService = lazy(() => import("../kiosk/AssistedService"));
const ProductPage = lazy(() => import("../kiosk/ProductPage"));
const OrderSummary = lazy(() => import("../kiosk/OrderSummary"));
const PaymentWindow = lazy(() => import("../kiosk/PaymentWindow"));
const QueuingDisplay = lazy(() => import("../kiosk/QueuingDisplay"));
const OnlineBanking = lazy(() => import("../kiosk/OnlineBanking"));
const CreditCard = lazy(() => import("../kiosk/CreditCard"));
const OnlineBankPayment = lazy(() => import("../kiosk/OnlineBankPayment"));
const CreditCardPayment = lazy(() => import("../kiosk/CreditCardPayment"));
const InstallmentPayment = lazy(() => import("../kiosk/InstallmentPayment"));
const PentagonStats = lazy(() => import("../kiosk/PentagonStats"));
const PurposeOfUse = lazy(() => import("../kiosk/PurposeOfUse"));
const PCBuildCategory = lazy(() => import("../kiosk/PCBuildCategory"));
const PriceRange = lazy(() => import("../kiosk/PriceRange"));
const ProductList = lazy(() => import("../kiosk/ProductList"));
const PCCustomized = lazy(() => import("../kiosk/PCCustomized"));
const PrebuiltOptions = lazy(() => import("../kiosk/PrebuiltOptions"));
const TierSelection = lazy(() => import("../kiosk/TierSelection"));
// Offline kiosk mode: AI customizer source is retained on disk, but routes below redirect away from it.
const PeripheralsPrompt = lazy(() => import("../components/CustomizeAI/PeripheralsPrompt"));
const Peripherals = lazy(() => import("../kiosk/Peripherals"));
const ProductPageCustom = lazy(() => import("../kiosk/ProductPageCustom"));
const CustomizedProducts = lazy(() => import("../kiosk/CustomizedProducts"));
const PCBuilder = lazy(() => import("../kiosk/PCBuilder"));
const BuildSummary = lazy(() => import("../kiosk/BuildSummary"));
const FutureUpgrade = lazy(() => import("../kiosk/FutureUpgrade"));
const CustomizedDisplay = lazy(() => import("../kiosk/CustomizedDisplay"));
const PreBuiltDisplay = lazy(() => import("../kiosk/PreBuiltDisplay"));
const OrderSumCustom = lazy(() => import("../kiosk/OrderSumCustom"));
const PCCleaning = lazy(() => import("../kiosk/PCCleaning"));
const PCCleaningAssessment = lazy(() => import("../kiosk/PCCleaningAssessment"));
const PCReCase = lazy(() => import("../kiosk/PCReCase"));
const OrderSumClean = lazy(() => import("../kiosk/OrderSumClean"));
const PCCheckup = lazy(() => import("../kiosk/PCCheckup"));
const ReviewIssues = lazy(() => import("../kiosk/ReviewIssues"));
const OrderSumBuild = lazy(() => import("../kiosk/OrderSumBuild"));
const PCUpgrade = lazy(() => import("../kiosk/PCUpgrade"));
const PCUpgradePreview = lazy(() => import("../kiosk/PCUpgradePreview"));
const OrderSumUpgrade = lazy(() => import("../kiosk/OrderSumUpgrade"));
const PCUpgradeDisplay = lazy(() => import("../kiosk/PCUpgradeDisplay"));
const PCUpgradeProduct = lazy(() => import("../kiosk/PCUpgradeProduct"));
const AutoGenerateOrders = lazy(() => import("../admin/AutoGenerateOrders"));
const AnalyticsDashboard = lazy(() => import("../admin/AnalyticsDashboard"));
const CachePerformanceDashboard = lazy(() => import("../components/admin/CachePerformanceDashboard"));
const SystemPerformanceMetrics = lazy(() => import("../components/admin/SystemPerformanceMetrics"));
const RuleBuilder = lazy(() => import("../components/admin/RuleBuilder/RuleBuilder"));
const IPAccessControl = lazy(() => import("../admin/pages/IPAccessControl"));
const AdminFeedbackReview = lazy(() => import("../admin/components/AdminFeedbackReview"));
const AdminKnownIssues = lazy(() => import("../admin/components/AdminKnownIssues"));

// Assistance Notification Component
import AssistanceNotification from "../components/AssistanceNotification";
import useSocket from "../hooks/useSocket";

// Backend Integration Components
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SearchProvider } from '../contexts/SearchContext-simple';
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const Login = lazy(() => import('../pages/Login/Login'));
const ResetPassword = lazy(() => import('../pages/Login/ResetPassword'));
const Stock = lazy(() => import('../pages/Orders/Stock'));
const StockDetail = lazy(() => import('../pages/Orders/StockDetail'));
const History = lazy(() => import('../pages/Orders/History'));
const OrderQueue = lazy(() => import('../pages/Orders/OrderQueue'));
const QueueMonitorDisplay = lazy(() => import('../pages/Orders/QueueMonitorDisplay'));
const LogHistory = lazy(() => import('../pages/Orders/LogHistory'));
const Accounts = lazy(() => import('../pages/Accounts/Accounts'));
const Settings = lazy(() => import('../pages/Settings/Settings'));
const DeveloperTools = lazy(() => import('../pages/DeveloperTools/DeveloperTools'));
const OrderQueueDisplay = lazy(() => import('../components/Widgets/OrderQueueDisplay'));
const Layout = lazy(() => import('../components/Layout/Layout'));

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

  const user = currentUser;

  // Show loading state while /api/auth/me verifies the cookie-backed session
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

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

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
  return (
    <Link
      to="/order"
      className="App"
      aria-label="Tap anywhere to start"
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
          <span className="button-like" aria-hidden="true">TAP ANYWHERE TO START</span>
        </div>
      </header>
    </Link>
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

AdminWrapper.propTypes = {
  children: PropTypes.node.isRequired
};

// Route wrapper to determine if admin styles should be applied
function RouteWrapper({ children }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/login' || location.pathname === '/reset-password';
  
  if (isAdminRoute) {
    return <AdminWrapper>{children}</AdminWrapper>;
  }
  
  return children;
}

RouteWrapper.propTypes = {
  children: PropTypes.node.isRequired
};

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

    }
  }, []); // Empty dependency array ensures this only runs once

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="app-container">
            <RouteWrapper>
              <Suspense fallback={<div className="loading">Loading...</div>}>
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
              <Route path="/pc-customized-ai-assessment" element={<Navigate to="/pc-customized" replace />} />
              <Route path="/pc-customized-ai-suggestions" element={<Navigate to="/pc-customized" replace />} />
              <Route path="/pc-customized-ai/*" element={<Navigate to="/pc-customized" replace />} />
              <Route path="/customize-ai" element={<Navigate to="/pc-customized" replace />} />
              <Route path="/customize-ai/*" element={<Navigate to="/pc-customized" replace />} />
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
                <Route path="ai-analytics" element={<Navigate to="/admin/analytics" replace />} />
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
                <Route path="ai-metrics" element={<Navigate to="/admin/system-metrics" replace />} />
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
              </Suspense>
            </RouteWrapper>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
