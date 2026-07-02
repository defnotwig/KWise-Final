import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

const mockUser = {
  id: 1,
  name: 'Test Admin',
  role: 'admin',
  token: 'test-token-123'
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn()
  })
}));

vi.mock('../hooks/useSocket', () => ({
  useSocket: () => null
}));

vi.mock('../hooks/usePresence', () => ({
  usePresence: vi.fn()
}));

vi.mock('../components/GlobalSearch', () => ({
  __esModule: true,
  default: ({ isOpen, searchQuery = '' }) => isOpen ? <input aria-label="Global Search" role="searchbox" value={searchQuery} readOnly /> : null
}));

vi.mock('../components/NotificationCenter', () => ({
  __esModule: true,
  default: () => <div>Notification Center</div>
}));

vi.mock('../components/MessagingCenter', () => ({
  __esModule: true,
  default: () => <div>Messaging Center</div>
}));

describe('Dashboard', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders loading state while dashboard requests are pending', () => {
    fetch.mockImplementation(() => new Promise(() => {}));

    render(<Dashboard />);

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  test('displays fetched dashboard stats', async () => {
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
            lowStockProducts: 3
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { notifications: [] } })
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    expect(screen.getByText(/k-wise admin dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/failed to load dashboard data/i)).not.toBeInTheDocument();
  });

  test('uses cookie-backed credentials for dashboard requests', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { notifications: [] } })
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/dashboard/stats',
        expect.objectContaining({
          credentials: 'include'
        })
      );
    });
  });

  test('shows an error banner when dashboard loading fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  test('opens global search on Ctrl+K', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { totalUsers: 1, activeUsers: 1, totalOrders: 1, totalRevenue: 1 } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { notifications: [] } })
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/k-wise admin dashboard/i)).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
});
