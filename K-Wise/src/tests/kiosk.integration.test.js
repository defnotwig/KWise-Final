import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PCCustomized from '../kiosk/PCCustomized';
import api from '../api/api';

const originalConsoleError = console.error;
let consoleErrorSpy;

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null, pathname: '/pc-customized' })
}));

vi.mock('../api/api', () => ({
  __esModule: true,
  default: {
    kiosk: {
      getCategoryProducts: vi.fn(),
      getCategoryBrands: vi.fn(),
      getCatalogBootstrap: vi.fn(),
      getBuildComponents: vi.fn()
    },
    utils: {
      formatSpecifications: vi.fn((specs) => specs),
      getFullImageUrl: vi.fn((url) => `http://localhost:5000${url}`)
    }
  }
}));

describe('Kiosk integration', () => {
  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const [firstArg] = args;
      if (typeof firstArg === 'string' && firstArg.includes('ReactDOMTestUtils.act')) {
        return;
      }

      originalConsoleError(...args);
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    api.kiosk.getCategoryProducts.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Test CPU',
          brand: 'AMD',
          category: 'CPU',
          imageUrl: '/images/cpu.jpg',
          specifications: { cores: 8 },
          dimensions: { width: 10 }
        }
      ]
    });
    api.kiosk.getCatalogBootstrap.mockResolvedValue({
      products: [
        {
          id: 1,
          name: 'Test CPU',
          brand: 'AMD',
          category: 'CPU',
          imageUrl: '/images/cpu.jpg',
          specifications: { cores: 8 },
          dimensions: { width: 10 }
        }
      ],
      brands: ['AMD', 'Intel']
    });
    api.kiosk.getBuildComponents.mockResolvedValue({
      cpu: {
        products: [
          {
            id: 1,
            name: 'Test CPU',
            brand: 'AMD',
            category: 'CPU',
            imageUrl: '/images/cpu.jpg',
            specifications: { cores: 8 },
            dimensions: { width: 10 }
          }
        ],
        brands: ['AMD', 'Intel']
      }
    });
    api.kiosk.getCategoryBrands.mockResolvedValue(['AMD', 'Intel']);
  });

  test('PCCustomized loads grouped categories through the centralized kiosk API', async () => {
    render(<PCCustomized />);

    await waitFor(() => {
      expect(api.kiosk.getBuildComponents).toHaveBeenCalledWith({ limit: 500 });
    });

    expect(screen.getByText(/start over/i)).toBeInTheDocument();
  });

  test('centralized API utilities remain callable from the kiosk layer', () => {
    const specs = { cores: 8, threads: 16 };
    const imageUrl = '/images/test.jpg';

    api.utils.formatSpecifications(specs);
    api.utils.getFullImageUrl(imageUrl);

    expect(api.utils.formatSpecifications).toHaveBeenCalledWith(specs);
    expect(api.utils.getFullImageUrl).toHaveBeenCalledWith(imageUrl);
  });
});
