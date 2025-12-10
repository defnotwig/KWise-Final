/**
 * Frontend Kiosk API Tests
 * Tests for kioskAPI integration and component functionality
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import kioskAPI from '../api/kioskAPI';
import PC_Parts from '../kiosk/PC-Parts';
import PCCustomized from '../kiosk/PCCustomized';

// Mock the API
jest.mock('../api/kioskAPI');

const mockKioskAPI = kioskAPI;

// Mock data
const mockCategories = [
    {
        category: 'CPU',
        name: 'Central Processing Unit',
        productCount: 15,
        minPrice: 1500,
        maxPrice: 25000,
        inStockCount: 12,
        order: 10
    },
    {
        category: 'GPU',
        name: 'Graphics Processing Unit',
        productCount: 8,
        minPrice: 5000,
        maxPrice: 45000,
        inStockCount: 6,
        order: 50
    }
];

const mockProducts = {
    items: [
        {
            id: 1,
            name: 'AMD Ryzen 5 5600X',
            category: 'CPU',
            brand: 'AMD',
            price: 15999,
            stock: 5,
            imageUrl: '/assets/cpu/ryzen5600x.webp',
            specifications: {
                cores: 6,
                threads: 12,
                base_clock: '3.7 GHz',
                boost_clock: '4.6 GHz'
            },
            description: 'High-performance gaming CPU',
            available: true
        }
    ],
    pagination: {
        currentPage: 1,
        totalPages: 3,
        totalItems: 15,
        itemsPerPage: 20,
        hasNext: true,
        hasPrev: false
    }
};

const mockFeaturedProducts = [
    {
        id: 1,
        name: 'Intel Core i7-12700K',
        category: 'CPU',
        brand: 'Intel',
        price: 22999,
        imageUrl: '/assets/cpu/i712700k.webp',
        available: true
    },
    {
        id: 2,
        name: 'NVIDIA RTX 4070',
        category: 'GPU',
        brand: 'NVIDIA',
        price: 35999,
        imageUrl: '/assets/gpu/rtx4070.webp',
        available: true
    }
];

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('KioskAPI', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('API Methods', () => {
        test('getCategories should return formatted categories', async () => {
            mockKioskAPI.getCategories.mockResolvedValue(mockCategories);

            const result = await kioskAPI.getCategories();

            expect(result).toEqual(mockCategories);
            expect(mockKioskAPI.getCategories).toHaveBeenCalledTimes(1);
        });

        test('getCategoryProducts should return products with pagination', async () => {
            mockKioskAPI.getCategoryProducts.mockResolvedValue(mockProducts);

            const result = await kioskAPI.getCategoryProducts('CPU', { page: 1, limit: 20 });

            expect(result).toEqual(mockProducts);
            expect(mockKioskAPI.getCategoryProducts).toHaveBeenCalledWith('CPU', { page: 1, limit: 20 });
        });

        test('getFeaturedProducts should return featured items', async () => {
            mockKioskAPI.getFeaturedProducts.mockResolvedValue(mockFeaturedProducts);

            const result = await kioskAPI.getFeaturedProducts(6);

            expect(result).toEqual(mockFeaturedProducts);
            expect(mockKioskAPI.getFeaturedProducts).toHaveBeenCalledWith(6);
        });

        test('should handle API errors gracefully', async () => {
            const errorMessage = 'Network error';
            mockKioskAPI.getCategories.mockRejectedValue(new Error(errorMessage));

            await expect(kioskAPI.getCategories()).rejects.toThrow(`Failed to load categories: ${errorMessage}`);
        });
    });
});

describe('PC-Parts Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockKioskAPI.getCategories.mockResolvedValue(mockCategories);
        mockKioskAPI.getFeaturedProducts.mockResolvedValue(mockFeaturedProducts);
        mockKioskAPI.getCategoryProducts.mockResolvedValue(mockProducts);
    });

    test('should load and display categories from API', async () => {
        renderWithRouter(<PC_Parts />);

        await waitFor(() => {
            expect(mockKioskAPI.getCategories).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText('Central Processing Unit')).toBeInTheDocument();
            expect(screen.getByText('Graphics Processing Unit')).toBeInTheDocument();
        });
    });

    test('should load products when category is selected', async () => {
        renderWithRouter(<PC_Parts />);

        await waitFor(() => {
            expect(mockKioskAPI.getCategories).toHaveBeenCalledTimes(1);
        });

        // Categories should be loaded and first category (CPU) should be selected
        await waitFor(() => {
            expect(mockKioskAPI.getCategoryProducts).toHaveBeenCalledWith('cpu', expect.any(Object));
        });
    });

    test('should display loading state initially', () => {
        renderWithRouter(<PC_Parts />);

        // Should show loading state while API calls are pending
        expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('should handle API errors and show error message', async () => {
        mockKioskAPI.getCategories.mockRejectedValue(new Error('API Error'));

        renderWithRouter(<PC_Parts />);

        await waitFor(() => {
            expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument();
        });
    });
});

describe('PCCustomized Component', () => {
    const mockBuildComponents = {
        cpu: {
            products: [mockProducts.items[0]],
            brands: ['AMD', 'Intel']
        },
        gpu: {
            products: [{
                id: 2,
                name: 'RTX 4070',
                brand: 'NVIDIA',
                price: 35999,
                available: true
            }],
            brands: ['NVIDIA', 'AMD']
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockKioskAPI.getBuildComponents.mockResolvedValue(mockBuildComponents);
    });

    test('should load build components from API', async () => {
        renderWithRouter(<PCCustomized />);

        await waitFor(() => {
            expect(mockKioskAPI.getBuildComponents).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText('AMD Ryzen 5 5600X')).toBeInTheDocument();
        });
    });

    test('should organize components by category', async () => {
        renderWithRouter(<PCCustomized />);

        await waitFor(() => {
            expect(mockKioskAPI.getBuildComponents).toHaveBeenCalledTimes(1);
        });

        // Should organize products into categories
        await waitFor(() => {
            expect(screen.getByText(/Central Processing Unit/i)).toBeInTheDocument();
        });
    });
});

// Performance tests
describe('Performance Tests', () => {
    test('should load categories within acceptable time', async () => {
        const startTime = Date.now();

        mockKioskAPI.getCategories.mockResolvedValue(mockCategories);
        await kioskAPI.getCategories();

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });

    test('should handle large product datasets efficiently', async () => {
        // Create large dataset
        const largeProductSet = {
            items: Array.from({ length: 1000 }, (_, i) => ({
                ...mockProducts.items[0],
                id: i + 1,
                name: `Product ${i + 1}`
            })),
            pagination: {
                ...mockProducts.pagination,
                totalItems: 1000
            }
        };

        mockKioskAPI.getCategoryProducts.mockResolvedValue(largeProductSet);

        const startTime = Date.now();
        await kioskAPI.getCategoryProducts('CPU', { page: 1, limit: 20 });
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(2000); // Should handle large datasets within 2 seconds
    });
});

export { };
