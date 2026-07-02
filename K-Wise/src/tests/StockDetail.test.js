import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StockDetail from '../pages/Orders/StockDetail';

vi.mock('react-router-dom', () => ({
    useParams: () => ({ category: 'CPU' })
}));

vi.mock('../components/AutocompleteInput', () => ({
    __esModule: true,
    default: ({ id, name, value, onChange, type = 'text', required = false, placeholder = '' }) => (
        <input
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            type={type}
            required={required}
            placeholder={placeholder}
        />
    )
}));

const buildJsonResponse = (json, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => json
});

const createFetchMock = () => vi.fn((url, options = {}) => {
    if (url.includes('/stock/brands?')) {
        return Promise.resolve(buildJsonResponse({ data: ['AMD', 'Intel'] }));
    }

    if (url.includes('/stock/meta/')) {
        return Promise.resolve(buildJsonResponse({
            success: true,
            data: {
                fields: [
                    { name: 'socket', type: 'text', required: true },
                    { name: 'cores', type: 'number', required: true },
                    { name: 'integrated_gpu', type: 'boolean', required: false }
                ]
            }
        }));
    }

    if (url.includes('/stock?')) {
        return Promise.resolve(buildJsonResponse({
            success: true,
            data: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: 0
            }
        }));
    }

    if (url.endsWith('/stock') && options.method === 'POST') {
        return Promise.resolve(buildJsonResponse({ success: true, data: { id: 1, image_url: null } }));
    }

    return Promise.resolve(buildJsonResponse({ success: true, data: [] }));
});

describe('StockDetail specifications UI', () => {
    beforeEach(() => {
        globalThis.fetch = createFetchMock();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test('renders boolean and typed specification fields in the add modal', async () => {
        render(<StockDetail />);

        await waitFor(() => {
            expect(screen.getByText(/add new cpu/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/add new cpu/i));

        await waitFor(() => {
            expect(screen.getByRole('checkbox', { name: /integrated gpu/i })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/socket/i)).toHaveAttribute('type', 'text');
        expect(screen.getByLabelText(/cores/i)).toHaveAttribute('type', 'number');
    });

    test('submits boolean specification values inside the form data payload', async () => {
        render(<StockDetail />);

        await waitFor(() => {
            expect(screen.getByText(/add new cpu/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/add new cpu/i));

        await waitFor(() => {
            expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test CPU' } });
        fireEvent.change(screen.getByLabelText(/brand/i), { target: { value: 'Test Brand' } });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '299.99' } });
        fireEvent.change(screen.getByLabelText(/stock/i), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText(/product tier\/classification/i), { target: { value: 'entry' } });
        fireEvent.change(screen.getByLabelText(/socket/i), { target: { value: 'AM5' } });
        fireEvent.change(screen.getByLabelText(/cores/i), { target: { value: '6' } });
        fireEvent.click(screen.getByRole('checkbox', { name: /integrated gpu/i }));
        fireEvent.click(screen.getByRole('button', { name: /add item/i }));

        await waitFor(() => {
            expect(fetch.mock.calls.some(([url, opts]) => url.endsWith('/stock') && opts?.method === 'POST')).toBe(true);
        });

        const [, request] = fetch.mock.calls.find(([url, opts]) => url.endsWith('/stock') && opts?.method === 'POST');
        const submittedSpecifications = JSON.parse(request.body.get('specifications'));

        expect(submittedSpecifications.integrated_gpu).toBe(true);

        await waitFor(async () => {
            vi.advanceTimersByTime(500);
        });
    });
});
