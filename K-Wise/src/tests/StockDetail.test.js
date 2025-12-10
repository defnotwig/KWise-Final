import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StockDetail from '../pages/Orders/StockDetail';

// Mock the API calls
jest.mock('../services/api', () => ({
    stockAPI: {
        getByCategory: jest.fn(),
        getById: jest.fn(),
        addItemWithImage: jest.fn(),
        updateItemWithImage: jest.fn()
    }
}));

const MockStockDetail = () => (
    <BrowserRouter>
        <StockDetail />
    </BrowserRouter>
);

describe('StockDetail Specifications UI', () => {
    beforeEach(() => {
        // Mock fetch for specification fields
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: [
                        { name: 'socket', type: 'string', required: true },
                        { name: 'cores', type: 'integer', required: true },
                        { name: 'integrated_gpu', type: 'boolean', required: false }
                    ]
                })
            })
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders boolean fields as checkboxes in add modal', async () => {
        render(<MockStockDetail />);

        // Wait for component to load and open add modal
        await waitFor(() => {
            const addButton = screen.getByText(/add new/i);
            fireEvent.click(addButton);
        });

        // Check that boolean field renders as checkbox
        await waitFor(() => {
            const integratedGpuCheckbox = screen.getByRole('checkbox', { name: /integrated gpu/i });
            expect(integratedGpuCheckbox).toBeInTheDocument();
        });

        // Check that string field renders as text input
        const socketInput = screen.getByLabelText(/socket/i);
        expect(socketInput).toHaveAttribute('type', 'text');

        // Check that integer field renders as number input
        const coresInput = screen.getByLabelText(/cores/i);
        expect(coresInput).toHaveAttribute('type', 'number');
    });

    test('checkbox input sends boolean values', async () => {
        const mockAddItem = jest.fn().mockResolvedValue({ 
            success: true, 
            data: { id: 1 } 
        });
        
        render(<MockStockDetail />);

        // Open add modal
        await waitFor(() => {
            const addButton = screen.getByText(/add new/i);
            fireEvent.click(addButton);
        });

        // Fill required fields
        await waitFor(() => {
            fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test CPU' } });
            fireEvent.change(screen.getByLabelText(/brand/i), { target: { value: 'Test Brand' } });
            fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '299.99' } });
            fireEvent.change(screen.getByLabelText(/stock/i), { target: { value: '10' } });
        });

        // Toggle checkbox
        const integratedGpuCheckbox = screen.getByRole('checkbox', { name: /integrated gpu/i });
        fireEvent.click(integratedGpuCheckbox);

        // Submit form
        const submitButton = screen.getByRole('button', { name: /add item/i });
        fireEvent.click(submitButton);

        // Verify that the API was called with boolean value
        await waitFor(() => {
            expect(mockAddItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    specifications: expect.objectContaining({
                        integrated_gpu: true
                    })
                })
            );
        });
    });

    test('image preview section remains visible with many spec fields', async () => {
        // Mock many specification fields
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: Array.from({ length: 15 }, (_, i) => ({
                        name: `field_${i}`,
                        type: 'string',
                        required: false
                    }))
                })
            })
        );

        render(<MockStockDetail />);

        // Open add modal
        await waitFor(() => {
            const addButton = screen.getByText(/add new/i);
            fireEvent.click(addButton);
        });

        // Check that image upload section is visible
        await waitFor(() => {
            const imageUploadSection = screen.getByText(/image upload/i);
            expect(imageUploadSection).toBeVisible();
        });

        // Check that modal uses grid layout
        const modal = screen.getByRole('dialog') || screen.getByClassName('modal-form');
        expect(modal).toHaveClass('kw-admin-stock-modal');
    });
});