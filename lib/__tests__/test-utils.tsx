import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorProvider } from '../error-context';
import { LoadingStateProvider } from '../loading-state-context';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <LoadingStateProvider>
          {children}
        </LoadingStateProvider>
      </ErrorProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock data generators
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockCompany = {
  id: 'test-company-id',
  name: 'Test Company',
  industry: 'Technology',
  size: '10-50',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockProduct = {
  id: 'test-product-id',
  name: 'Test Product',
  description: 'A test product',
  price: 99.99,
  category: 'Software',
  company_id: 'test-company-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockOrder = {
  id: 'test-order-id',
  product_id: 'test-product-id',
  user_id: 'test-user-id',
  quantity: 1,
  total_amount: 99.99,
  status: 'pending' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockWallet = {
  id: 'test-wallet-id',
  user_id: 'test-user-id',
  balance: 1000.00,
  currency: 'USD',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Test utilities for async operations
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock Supabase responses
export const createMockSupabaseResponse = <T>(data: T[], error: any = null) => ({
  data,
  error,
  count: data.length,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

export const createMockSupabaseError = (message: string, code: string = 'UNKNOWN') => ({
  message,
  code,
  details: null,
  hint: null,
});

// Helper for testing hooks with React Query
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});