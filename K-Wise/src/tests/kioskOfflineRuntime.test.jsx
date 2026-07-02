import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from '../api/api';
import PCCleaning from '../kiosk/PCCleaning';
import PCCheckup from '../kiosk/PCCheckup';
import PCBuildCategory from '../kiosk/PCBuildCategory';

vi.mock('../api/api', () => ({
    __esModule: true,
    default: {
        kiosk: {
            getCleaningServices: vi.fn(),
            getDiagnosticIssues: vi.fn()
        },
        utils: {
            getFullImageUrl: (url) => url
        }
    }
}));

describe('offline kiosk runtime flows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    test('PCCleaning uses local recommendations and never maps undefined reasoning', async () => {
        api.kiosk.getCleaningServices.mockResolvedValue([
            {
                id: 1,
                name: 'BASIC TIER CLEAN',
                tier: 'basic',
                price: 'P500.00',
                details: { completion: '1 hour' }
            },
            {
                id: 2,
                name: 'PRO TIER CLEAN',
                tier: 'pro',
                price: 'P1,000.00',
                details: { inclusion: ['Dust cleaning'], completion: '12 hours' }
            },
            {
                id: 3,
                name: 'PREMIUM TIER CLEAN',
                tier: 'premium',
                price: 'P1,500.00',
                details: { inclusion: ['Deep cleaning'], completion: '6 hours' }
            }
        ]);
        localStorage.setItem('cleaningAssessment', JSON.stringify({
            hasCleaned: false,
            pcAge: 'More than a year',
            underlyingIssues: true,
            selectedIssues: ['Overheating']
        }));

        render(
            <MemoryRouter>
                <PCCleaning />
            </MemoryRouter>
        );

        expect(await screen.findByText('PREMIUM TIER CLEAN')).toBeInTheDocument();
        expect(await screen.findByText('RECOMMENDED')).toBeInTheDocument();
        expect(await screen.findByText(/PREMIUM TIER CLEAN is best for you!/i)).toBeInTheDocument();
    });

    test('PCCheckup stores deterministic diagnostic analysis from database options', async () => {
        api.kiosk.getDiagnosticIssues.mockResolvedValue([
            {
                category: 'hardware',
                categoryDisplay: 'HARDWARE ISSUE',
                options: [{ name: 'Overheating' }]
            }
        ]);

        render(
            <MemoryRouter>
                <PCCheckup />
            </MemoryRouter>
        );

        fireEvent.click(await screen.findByText('Overheating'));
        fireEvent.click(screen.getByText('Next'));

        await waitFor(() => {
            const summary = JSON.parse(localStorage.getItem('diagnosticAnalysis'));
            expect(summary.source).toBe('deterministic');
            expect(summary.selectedIssues).toEqual(['Overheating']);
        });
        expect(localStorage.getItem('aiDiagnosticAnalysis')).toBeNull();
    });

    test('PCBuildCategory does not expose the removed AI customizer card', () => {
        render(
            <MemoryRouter>
                <PCBuildCategory />
            </MemoryRouter>
        );

        expect(screen.getByText('CUSTOMIZE')).toBeInTheDocument();
        expect(screen.getByText('PREBUILT')).toBeInTheDocument();
        expect(screen.queryByText('WITH AI')).not.toBeInTheDocument();
    });
});
