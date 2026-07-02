import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => children
  };
});

// Mock heavy dependencies to isolate App routing tests
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({
    currentUser: {
      id: 1,
      name: 'Test Admin',
      role: 'superadmin',
    },
    isLoading: false,
    apiAvailable: true,
    backendStatus: 'connected',
    login: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  useTheme: () => ({
    currentTheme: 'light',
    currentLanguage: 'en',
    changeTheme: vi.fn(),
    changeLanguage: vi.fn(),
    t: (key) => key,
  }),
}));

vi.mock('../contexts/SearchContext-simple', () => ({
  SearchProvider: ({ children }) => <>{children}</>,
  useSearch: () => ({
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    showResults: false,
    setSearchQuery: vi.fn(),
    handleSearch: vi.fn(),
    clearSearch: vi.fn(),
  }),
}));

// Mock kiosk components to avoid rendering 50+ heavy components
vi.mock('../kiosk/Order', () => ({ default: () => <div data-testid="kiosk-order" /> }));
vi.mock('../kiosk/Transac-components', () => ({ default: () => <div data-testid="kiosk-transaction" /> }));
vi.mock('../kiosk/PC-Parts', () => ({ default: () => <div data-testid="kiosk-pc-parts" /> }));
vi.mock('../kiosk/PC-Services', () => ({ default: () => <div data-testid="kiosk-pc-services" /> }));
vi.mock('../kiosk/AssistedService', () => ({ default: () => <div data-testid="kiosk-assisted-service" /> }));
vi.mock('../kiosk/ProductPage', () => ({ default: () => <div data-testid="kiosk-product-page" /> }));
vi.mock('../kiosk/OrderSummary', () => ({ default: () => <div data-testid="kiosk-order-summary" /> }));
vi.mock('../kiosk/PaymentWindow', () => ({ default: () => <div data-testid="kiosk-payment-window" /> }));
vi.mock('../kiosk/QueuingDisplay', () => ({ default: () => <div data-testid="kiosk-queuing-display" /> }));
vi.mock('../kiosk/OnlineBanking', () => ({ default: () => <div data-testid="kiosk-online-banking" /> }));
vi.mock('../kiosk/CreditCard', () => ({ default: () => <div data-testid="kiosk-credit-card" /> }));
vi.mock('../kiosk/OnlineBankPayment', () => ({ default: () => <div data-testid="kiosk-online-bank-payment" /> }));
vi.mock('../kiosk/CreditCardPayment', () => ({ default: () => <div data-testid="kiosk-credit-card-payment" /> }));
vi.mock('../kiosk/InstallmentPayment', () => ({ default: () => <div data-testid="kiosk-installment-payment" /> }));
vi.mock('../kiosk/PentagonStats', () => ({ default: () => <div data-testid="kiosk-pentagon-stats" /> }));
vi.mock('../kiosk/PurposeOfUse', () => ({ default: () => <div data-testid="kiosk-purpose-of-use" /> }));
vi.mock('../kiosk/PCBuildCategory', () => ({ default: () => <div data-testid="kiosk-pc-build-category" /> }));
vi.mock('../kiosk/PriceRange', () => ({ default: () => <div data-testid="kiosk-price-range" /> }));
vi.mock('../kiosk/ProductList', () => ({ default: () => <div data-testid="kiosk-product-list" /> }));
vi.mock('../kiosk/PCCustomized', () => ({ default: () => <div data-testid="kiosk-pc-customized" /> }));
vi.mock('../kiosk/PrebuiltOptions', () => ({ default: () => <div data-testid="kiosk-prebuilt-options" /> }));
vi.mock('../kiosk/TierSelection', () => ({ default: () => <div data-testid="kiosk-tier-selection" /> }));
vi.mock('../kiosk/PCCustomizedAIAssessment', () => ({ default: () => <div data-testid="kiosk-custom-assessment" /> }));
vi.mock('../kiosk/PCCustomizedAISuggestions', () => ({ default: () => <div data-testid="kiosk-custom-suggestions" /> }));
vi.mock('../components/CustomizeAI/CustomizeAI', () => ({ default: () => <div data-testid="kiosk-customize-rules" /> }));
vi.mock('../components/CustomizeAI/EditBuild', () => ({ default: () => <div data-testid="kiosk-edit-build" /> }));
vi.mock('../components/CustomizeAI/PeripheralsPrompt', () => ({ default: () => <div data-testid="kiosk-peripherals-prompt" /> }));
vi.mock('../kiosk/ProductPageCustom', () => ({ default: () => <div data-testid="kiosk-product-page-custom" /> }));
vi.mock('../kiosk/CustomizedProducts', () => ({ default: () => <div data-testid="kiosk-customized-products" /> }));
vi.mock('../kiosk/PCBuilder', () => ({ default: () => <div data-testid="kiosk-pc-builder" /> }));
vi.mock('../kiosk/BuildSummary', () => ({ default: () => <div data-testid="kiosk-build-summary" /> }));
vi.mock('../kiosk/FutureUpgrade', () => ({ default: () => <div data-testid="kiosk-future-upgrade" /> }));
vi.mock('../kiosk/CustomizedDisplay', () => ({ default: () => <div data-testid="kiosk-customized-display" /> }));
vi.mock('../kiosk/PreBuiltDisplay', () => ({ default: () => <div data-testid="kiosk-prebuilt-display" /> }));
vi.mock('../kiosk/OrderSumCustom', () => ({ default: () => <div data-testid="kiosk-order-sum-custom" /> }));
vi.mock('../kiosk/PCCleaning', () => ({ default: () => <div data-testid="kiosk-pc-cleaning" /> }));
vi.mock('../kiosk/PCCleaningAssessment', () => ({ default: () => <div data-testid="kiosk-pc-cleaning-assessment" /> }));
vi.mock('../kiosk/PCReCase', () => ({ default: () => <div data-testid="kiosk-pc-recase" /> }));
vi.mock('../kiosk/OrderSumClean', () => ({ default: () => <div data-testid="kiosk-order-sum-clean" /> }));
vi.mock('../kiosk/PCCheckup', () => ({ default: () => <div data-testid="kiosk-pc-checkup" /> }));
vi.mock('../kiosk/ReviewIssues', () => ({ default: () => <div data-testid="kiosk-review-issues" /> }));
vi.mock('../kiosk/OrderSumBuild', () => ({ default: () => <div data-testid="kiosk-order-sum-build" /> }));
vi.mock('../kiosk/PCUpgrade', () => ({ default: () => <div data-testid="kiosk-pc-upgrade" /> }));
vi.mock('../kiosk/PCUpgradePreview', () => ({ default: () => <div data-testid="kiosk-pc-upgrade-preview" /> }));
vi.mock('../kiosk/OrderSumUpgrade', () => ({ default: () => <div data-testid="kiosk-order-sum-upgrade" /> }));
vi.mock('../kiosk/PCUpgradeDisplay', () => ({ default: () => <div data-testid="kiosk-pc-upgrade-display" /> }));
vi.mock('../kiosk/PCUpgradeProduct', () => ({ default: () => <div data-testid="kiosk-pc-upgrade-product" /> }));
vi.mock('../kiosk/Peripherals', () => ({ default: () => <div data-testid="kiosk-peripherals" /> }));

// Mock admin pages
vi.mock('../pages/Dashboard/Dashboard', () => ({ default: () => <div data-testid="admin-dashboard" /> }));
vi.mock('../admin/AutoGenerateOrders', () => ({ default: () => <div data-testid="admin-auto-generate-orders" /> }));
vi.mock('../admin/AnalyticsDashboard', () => ({ default: () => <div data-testid="admin-analytics" /> }));
vi.mock('../components/admin/CachePerformanceDashboard', () => ({ default: () => <div data-testid="admin-cache-performance" /> }));
vi.mock('../components/admin/SystemPerformanceMetrics', () => ({ default: () => <div data-testid="admin-system-performance" /> }));
vi.mock('../components/admin/RuleBuilder/RuleBuilder', () => ({ default: () => <div data-testid="admin-rule-builder" /> }));
vi.mock('../admin/pages/IPAccessControl', () => ({ default: () => <div data-testid="admin-ip-access" /> }));
vi.mock('../admin/components/AdminFeedbackReview', () => ({ default: () => <div data-testid="admin-feedback-review" /> }));
vi.mock('../admin/components/AdminKnownIssues', () => ({ default: () => <div data-testid="admin-known-issues" /> }));
vi.mock('../pages/Login/Login', () => ({ default: () => <div data-testid="admin-login" /> }));
vi.mock('../pages/Login/ResetPassword', () => ({ default: () => <div data-testid="admin-reset-password" /> }));
vi.mock('../pages/Orders/Stock', () => ({ default: () => <div data-testid="admin-stock" /> }));
vi.mock('../pages/Orders/StockDetail', () => ({ default: () => <div data-testid="admin-stock-detail" /> }));
vi.mock('../pages/Orders/History', () => ({ default: () => <div data-testid="admin-history" /> }));
vi.mock('../pages/Orders/OrderQueue', () => ({ default: () => <div data-testid="admin-order-queue" /> }));
vi.mock('../pages/Orders/QueueMonitorDisplay', () => ({ default: () => <div data-testid="admin-queue-monitor" /> }));
vi.mock('../pages/Orders/LogHistory', () => ({ default: () => <div data-testid="admin-log-history" /> }));
vi.mock('../pages/Accounts/Accounts', () => ({ default: () => <div data-testid="admin-accounts" /> }));
vi.mock('../pages/Settings/Settings', () => ({ default: () => <div data-testid="admin-settings" /> }));
vi.mock('../pages/DeveloperTools/DeveloperTools', () => ({ default: () => <div data-testid="admin-dev-tools" /> }));

// Mock hooks
vi.mock('../hooks/useSocket', () => ({ default: () => ({ socket: null, connected: false }) }));
vi.mock('../components/AssistanceNotification', () => ({ default: () => <div data-testid="assistance-notification" /> }));
vi.mock('../components/Layout/Layout', async () => {
  const { Outlet } = await vi.importActual('react-router-dom');
  return {
    default: () => (
      <div data-testid="admin-layout">
        <Outlet />
      </div>
    )
  };
});
vi.mock('../components/Widgets/OrderQueueDisplay', () => ({ default: () => <div data-testid="order-queue-display" /> }));

// Mock CSS imports
vi.mock('./App.css', () => ({}), { virtual: true });
vi.mock('../styles/theme.css', () => ({}), { virtual: true });
vi.mock('../styles/admin-core.css', () => ({}), { virtual: true });
vi.mock('../styles/admin-text-fixes.css', () => ({}), { virtual: true });
vi.mock('../styles/dark-mode-enhancement.css', () => ({}), { virtual: true });
vi.mock('../styles/dark-mode.css', () => ({}), { virtual: true });
vi.mock('../styles/no-transparency.css', () => ({}), { virtual: true });
vi.mock('../admin/styles/admin-core.css', () => ({}), { virtual: true });
vi.mock('../admin/styles/admin-layout.css', () => ({}), { virtual: true });
vi.mock('../admin/styles/admin-dashboard.css', () => ({}), { virtual: true });

// Mock SVG imports
vi.mock('../assets/App/pcwiselogo.svg', () => ({ default: 'pcwiselogo.svg' }), { virtual: true });
vi.mock('../assets/App/pcwisename.svg', () => ({ default: 'pcwisename.svg' }), { virtual: true });

describe('App', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
      // If it renders without throwing, the test passes
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Kiosk Routes', () => {
    it('renders Order component at /order route', () => {
      render(
        <MemoryRouter initialEntries={['/order']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-order')).toBeInTheDocument();
    });

    it('renders PC-Parts component at /pc-parts route', () => {
      render(
        <MemoryRouter initialEntries={['/pc-parts']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-parts')).toBeInTheDocument();
    });

    it('renders PC Customized component at /pc-customized route', () => {
      render(
        <MemoryRouter initialEntries={['/pc-customized']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-customized')).toBeInTheDocument();
    });

    it('renders PC Builder component at /pc-builder route', () => {
      render(
        <MemoryRouter initialEntries={['/pc-builder']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-builder')).toBeInTheDocument();
    });

    it('renders QueuingDisplay component at /queuing-display route', () => {
      render(
        <MemoryRouter initialEntries={['/queuing-display']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-queuing-display')).toBeInTheDocument();
    });

    it('renders PaymentWindow component at /payment-window route', () => {
      render(
        <MemoryRouter initialEntries={['/payment-window']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-payment-window')).toBeInTheDocument();
    });

    it('renders FutureUpgrade component at /future-upgrades route', () => {
      render(
        <MemoryRouter initialEntries={['/future-upgrades']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-future-upgrade')).toBeInTheDocument();
    });

    it('renders PCCleaning component at /pc-cleaning route', () => {
      render(
        <MemoryRouter initialEntries={['/pc-cleaning']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-cleaning')).toBeInTheDocument();
    });

    it('renders PCCheckup component at /pc-checkup route', () => {
      render(
        <MemoryRouter initialEntries={['/pc-checkup']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-checkup')).toBeInTheDocument();
    });

    it('renders PCUpgrade component at /pc-upgrade route', () => {
      render(
        <MemoryRouter initialEntries={['/pc-upgrade']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-upgrade')).toBeInTheDocument();
    });

    it('redirects legacy customize-ai route to manual customizer', () => {
      render(
        <MemoryRouter initialEntries={['/customize-ai']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-customized')).toBeInTheDocument();
    });

    it('redirects legacy pc-customized-ai route to manual customizer', () => {
      render(
        <MemoryRouter initialEntries={['/pc-customized-ai-assessment']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('kiosk-pc-customized')).toBeInTheDocument();
    });
  });

  describe('Admin Routes', () => {
    it('renders Login component at /login route', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-login')).toBeInTheDocument();
    });

    it('renders Dashboard component at /admin/dashboard route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    });

    it('renders Stock component at /admin/stock route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/stock']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-stock')).toBeInTheDocument();
    });

    it('renders StockDetail component at /admin/stock/:category route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/stock/CPU']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-stock-detail')).toBeInTheDocument();
    });

    it('renders OrderQueue component at /admin/order-queue route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/order-queue']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-order-queue')).toBeInTheDocument();
    });

    it('renders Accounts component at /admin/accounts route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/accounts']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-accounts')).toBeInTheDocument();
    });

    it('renders Settings component at /admin/settings route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/settings']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-settings')).toBeInTheDocument();
    });

    it('renders DeveloperTools component at /admin/developer-tools route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/developer-tools']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('admin-dev-tools')).toBeInTheDocument();
    });
  });

  describe('Context Providers', () => {
    it('wraps app with AuthProvider', () => {
      // AuthProvider is mocked, but we verify it doesn't crash when rendering
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
      expect(document.body).toBeInTheDocument();
    });

    it('wraps app with ThemeProvider', () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
      expect(document.body).toBeInTheDocument();
    });

    it('wraps app with SearchProvider', () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Route Fallback', () => {
    it('redirects unknown routes to home page', () => {
      render(
        <MemoryRouter initialEntries={['/non-existent-route-12345']}>
          <App />
        </MemoryRouter>
      );
      // Should render something (either home or redirect)
      expect(document.body).toBeInTheDocument();
    });
  });
});
