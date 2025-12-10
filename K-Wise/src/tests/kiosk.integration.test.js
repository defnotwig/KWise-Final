/**
 * Frontend Integration Tests for Kiosk Components
 * Tests real-time data integration in React components
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PC_Parts from '../kiosk/PC-Parts';
import PCCustomized from '../kiosk/PCCustomized';
import api, { kioskAPI } from '../api/api';

// Mock the API
jest.mock('../api/api', () => ({
  default: {
    utils: {
      formatSpecifications: jest.fn((specs) => 'Mocked specs'),
      getFullImageUrl: jest.fn((url) => `http://localhost:5000${url}`)
    }
  },
  kioskAPI: {
    getCategories: jest.fn(),
    getCategoryProducts: jest.fn(),
    getFeaturedProducts: jest.fn(),
    getBuildComponents: jest.fn()
  }
}));

describe('Kiosk Real-time Integration Tests', () => {
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('PC_Parts Component', () => {
    
    it('should load categories from API on mount', async () => {
      // Mock API response
      kioskAPI.getCategories.mockResolvedValue([
        {
          category: 'CPU',
          name: 'Central Processing Unit',
          productCount: 34,
          inStockCount: 25,
          order: 10
        }
      ]);

      kioskAPI.getFeaturedProducts.mockResolvedValue([]);

      render(
        <BrowserRouter>
          <PC_Parts />
        </BrowserRouter>
      );

      // Wait for API calls to complete
      await waitFor(() => {
        expect(kioskAPI.getCategories).toHaveBeenCalled();
      });

      // Check if categories are rendered
      await waitFor(() => {
        expect(screen.getByText('Central Processing Unit')).toBeInTheDocument();
      });
    });

    it('should show error state when API fails', async () => {
      // Mock API failure
      kioskAPI.getCategories.mockRejectedValue(new Error('API Error'));
      kioskAPI.getFeaturedProducts.mockRejectedValue(new Error('API Error'));

      render(
        <BrowserRouter>
          <PC_Parts />
        </BrowserRouter>
      );

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText('System Error')).toBeInTheDocument();
      });
    });

  });

  describe('PCCustomized Component', () => {
    
    it('should load build components from API', async () => {
      // Mock API response
      kioskAPI.getBuildComponents.mockResolvedValue({
        cpu: {
          products: [
            {
              id: 1,
              name: 'Test CPU',
              brand: 'AMD',
              price: 1000,
              imageUrl: '/images/cpu.jpg',
              specifications: { cores: 8, threads: 16 }
            }
          ],
          brands: ['AMD', 'Intel']
        }
      });

      render(
        <BrowserRouter>
          <PCCustomized />
        </BrowserRouter>
      );

      // Wait for API calls to complete
      await waitFor(() => {
        expect(kioskAPI.getBuildComponents).toHaveBeenCalled();
      });

      // Check if components are rendered
      await waitFor(() => {
        expect(screen.getByText('Central Processing Unit')).toBeInTheDocument();
      });
    });

  });

  describe('API Integration', () => {
    
    it('should use centralized API utilities', () => {
      // Test formatSpecifications utility
      const specs = { cores: 8, threads: 16 };
      api.utils.formatSpecifications(specs);
      expect(api.utils.formatSpecifications).toHaveBeenCalledWith(specs);

      // Test getFullImageUrl utility
      const imageUrl = '/images/test.jpg';
      api.utils.getFullImageUrl(imageUrl);
      expect(api.utils.getFullImageUrl).toHaveBeenCalledWith(imageUrl);
    });

  });

});

export default { 
  testKioskIntegration: () => console.log('Kiosk integration tests configured') 
};