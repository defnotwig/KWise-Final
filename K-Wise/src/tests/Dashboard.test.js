/**
 * Frontend Dashboard Component Test
 * Tests dashboard rendering, API integration, and real-time updates
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import Dashboard from '../Dashboard';

// Mock fetch globally
global.fetch = jest.fn();

// Mock user context
const mockUser = {
  id: 1,
  name: 'Test Admin',
  role: 'admin',
  token: 'test-token-123'
};

const MockAuthProvider = ({ children }) => {
  const mockAuthValue = {
    user: mockUser,
    logout: jest.fn(),
    isAuthenticated: true
  };

  return (
    <AuthProvider value={mockAuthValue}>
      {children}
    </AuthProvider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('Should render dashboard with loading state', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          totalUsers: 10,
          activeUsers: 5,
          totalOrders: 25,
          totalRevenue: 15000,
          totalProducts: 185,
          lowStockItems: 3
        }
      })
    });

    render(
      <MockAuthProvider>
        <Dashboard />
      </MockAuthProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('Should display dashboard stats after loading', async () => {
    // Mock successful API responses
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            totalUsers: 10,
            activeUsers: 5,
            totalOrders: 25,
            totalRevenue: 15000,
            totalProducts: 185,
            lowStockItems: 3
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            notifications: [],
            unreadCount: 0
          }
        })
      });

    render(
      <MockAuthProvider>
        <Dashboard />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Total users
      expect(screen.getByText('5')).toBeInTheDocument(); // Active users
      expect(screen.getByText('25')).toBeInTheDocument(); // Total orders
    });
  });

  test('Should call correct API endpoints', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    render(
      <MockAuthProvider>
        <Dashboard />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/dashboard/stats',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });
  });

  test('Should handle API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MockAuthProvider>
        <Dashboard />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('Should open search on Ctrl+K', () => {
    render(
      <MockAuthProvider>
        <Dashboard />
      </MockAuthProvider>
    );

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  test('Should display active users correctly', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            totalUsers: 18,
            activeUsers: 3,
            totalOrders: 4,
            totalRevenue: 2500,
            totalProducts: 185,
            lowStockItems: 5
          }
        })
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

    render(
      <MockAuthProvider>
        <Dashboard />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Active users
      expect(screen.getByText('18')).toBeInTheDocument(); // Total users
    });
  });
});
