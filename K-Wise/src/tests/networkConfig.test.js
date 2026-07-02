import { getFullImageUrl } from '../utils/networkConfig';

describe('networkConfig image URL normalization', () => {
    const originalEnv = process.env.REACT_APP_BACKEND_PORT;

    beforeEach(() => {
        process.env.REACT_APP_BACKEND_PORT = '5000';
    });

    afterAll(() => {
        process.env.REACT_APP_BACKEND_PORT = originalEnv;
    });

    test('leaves CRA static media paths on the frontend origin', () => {
        expect(getFullImageUrl('/static/media/SystemUnit1.hash.webp')).toBe('/static/media/SystemUnit1.hash.webp');
        expect(getFullImageUrl('static/media/SystemUnit1.hash.webp')).toBe('static/media/SystemUnit1.hash.webp');
    });

    test('leaves blob and data image URLs unchanged', () => {
        expect(getFullImageUrl('blob:http://localhost:3000/image-id')).toBe('blob:http://localhost:3000/image-id');
        expect(getFullImageUrl('data:image/png;base64,abc123')).toBe('data:image/png;base64,abc123');
    });

    test('routes backend asset paths through the backend server', () => {
        expect(getFullImageUrl('/uploads/products/cpu.webp')).toBe('http://localhost:5000/uploads/products/cpu.webp');
    });
});
