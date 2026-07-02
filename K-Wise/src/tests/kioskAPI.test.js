const mockGet = vi.fn();

vi.mock('axios', () => ({
    default: {
        isCancel: vi.fn((error) => error?.name === 'CanceledError'),
        create: vi.fn(() => ({
            get: (...args) => mockGet(...args)
        }))
    },
    isCancel: vi.fn((error) => error?.name === 'CanceledError'),
    create: vi.fn(() => ({
        get: (...args) => mockGet(...args)
    }))
}));

vi.mock('../utils/networkConfig', () => ({
    getApiBaseUrl: () => 'http://localhost:5000/api',
    getFullImageUrl: (url) => {
        if (!url) return null;
        if (String(url).startsWith('/static/media/')) return url;
        if (String(url).startsWith('http')) return url;
        return `http://localhost:5000${url}`;
    }
}));

import kioskAPI from '../api/kioskAPI';

describe('kioskAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('getCategories returns server categories on success', async () => {
        mockGet.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: {
                success: true,
                data: [
                    { category: 'CPU', name: 'Central Processing Unit' },
                    { category: 'GPU', name: 'Graphics Processing Unit' }
                ]
            }
        });

        await expect(kioskAPI.getCategories()).resolves.toEqual([
            { category: 'CPU', name: 'Central Processing Unit' },
            { category: 'GPU', name: 'Graphics Processing Unit' }
        ]);
    });

    test('getCategories falls back to default categories on request failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('Network error'));

        const result = await kioskAPI.getCategories();

        expect(Array.isArray(result)).toBe(true);
        expect(result.find((item) => item.category === 'CPU')).toBeTruthy();
    });

    test('getCategoryProducts handles nested response format and normalizes images', async () => {
        mockGet.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: {
                success: true,
                data: {
                    items: [
                        {
                            id: 1,
                            name: 'AMD Ryzen 5 5600X',
                            imageUrl: '/assets/cpu/ryzen5600x.webp',
                            specifications: { cores: 6 },
                            dimensions: { length: 1 }
                        }
                    ],
                    pagination: { totalItems: 1, currentPage: 1, totalPages: 1 }
                }
            }
        });

        const result = await kioskAPI.getCategoryProducts('CPU', { page: 1, limit: 20 });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].image).toBe('http://localhost:5000/assets/cpu/ryzen5600x.webp');
        expect(result.pagination.totalItems).toBe(1);
    });

    test('getFeaturedProducts returns processed featured products', async () => {
        mockGet.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: {
                success: true,
                data: [
                    { id: 1, name: 'RTX 4070', image: '/assets/gpu/rtx4070.webp' }
                ]
            }
        });

        const result = await kioskAPI.getFeaturedProducts(6);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: 1,
            name: 'RTX 4070',
            image: 'http://localhost:5000/assets/gpu/rtx4070.webp',
            imageUrl: 'http://localhost:5000/assets/gpu/rtx4070.webp',
            image_url: 'http://localhost:5000/assets/gpu/rtx4070.webp'
        });
    });

    test('getOnSaleProducts returns a plain processed product array', async () => {
        mockGet.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: {
                success: true,
                data: {
                    items: [
                        { id: 2, name: 'Sale GPU', image_url: '/assets/gpu/sale.webp', salePrice: 12000 }
                    ]
                }
            }
        });

        const result = await kioskAPI.getOnSaleProducts(4);

        expect(mockGet).toHaveBeenCalledWith('/kiosk/on-sale', expect.objectContaining({
            params: { limit: 4 }
        }));
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: 2,
            name: 'Sale GPU',
            image_url: 'http://localhost:5000/assets/gpu/sale.webp',
            imageUrl: 'http://localhost:5000/assets/gpu/sale.webp',
            salePrice: 12000,
            image: 'http://localhost:5000/assets/gpu/sale.webp'
        });
    });

    test('getOnSaleProducts silently returns empty array for canceled requests', async () => {
        mockGet.mockRejectedValueOnce({ name: 'CanceledError', code: 'ERR_CANCELED' });

        await expect(kioskAPI.getOnSaleProducts(4)).resolves.toEqual([]);
    });

    test('getOnSaleProducts preserves frontend static media URLs', async () => {
        mockGet.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: {
                success: true,
                data: [
                    { id: 3, name: 'Imported Asset', image: '/static/media/SystemUnit1.hash.webp' }
                ]
            }
        });

        const result = await kioskAPI.getOnSaleProducts();

        expect(result[0].image).toBe('/static/media/SystemUnit1.hash.webp');
    });
});
