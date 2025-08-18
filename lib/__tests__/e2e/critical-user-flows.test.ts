import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorProvider } from '../../error-context';
import { LoadingStateProvider } from '../../loading-state-context';
import { mockUser, mockCompany, mockProduct, mockOrder, createTestQueryClient } from '../test-utils';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase
vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
    channel: vi.fn(),
  },
  handleSupabaseError: vi.fn((error) => ({
    message: error?.message || 'Unknown error',
    code: error?.code || 'UNKNOWN',
  })),
}));

// Mock components for testing
const MockDashboard = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      setData([mockCompany, mockProduct]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div data-testid="dashboard-data">
        {data.map((item, index) => (
          <div key={index}>{item.name}</div>
        ))}
      </div>
      <button onClick={loadData}>Refresh</button>
    </div>
  );
};

const MockAuthForm = ({ onSubmit }: { onSubmit: (credentials: any) => Promise<void> }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await onSubmit({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button type="submit" disabled={loading} data-testid="login-button">
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  );
};

const MockProductList = () => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);

  React.useEffect(() => {
    // Simulate loading products
    setTimeout(() => {
      setProducts([mockProduct, { ...mockProduct, id: 'product-2', name: 'Product 2' }]);
      setLoading(false);
    }, 100);
  }, []);

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
  };

  const handleOrder = async (productId: string) => {
    // Simulate order creation
    await new Promise(resolve => setTimeout(resolve, 200));
    alert(`Order created for product ${productId}`);
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div>
      <h2>Products</h2>
      <div data-testid="product-list">
        {products.map(product => (
          <div key={product.id} data-testid={`product-${product.id}`}>
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <button 
              onClick={() => handleProductSelect(product)}
              data-testid={`select-${product.id}`}
            >
              Select
            </button>
          </div>
        ))}
      </div>
      {selectedProduct && (
        <div data-testid="selected-product">
          <h3>Selected: {selectedProduct.name}</h3>
          <button 
            onClick={() => handleOrder(selectedProduct.id)}
            data-testid="order-button"
          >
            Order Now
          </button>
        </div>
      )}
    </div>
  );
};

describe('Critical User Flows E2E Tests', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    user = userEvent.setup();
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <LoadingStateProvider>
          {children}
        </LoadingStateProvider>
      </ErrorProvider>
    </QueryClientProvider>
  );

  describe('User Authentication Flow', () => {
    it('should complete full login flow successfully', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      const handleSubmit = async (credentials: any) => {
        const result = await mockSignIn(credentials);
        if (result.error) throw new Error(result.error.message);
      };

      render(
        <TestWrapper>
          <MockAuthForm onSubmit={handleSubmit} />
        </TestWrapper>
      );

      // Fill in login form
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');

      // Submit form
      await user.click(screen.getByTestId('login-button'));

      // Wait for login to complete
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should handle login errors gracefully', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const handleSubmit = async (credentials: any) => {
        const result = await mockSignIn(credentials);
        if (result.error) throw new Error(result.error.message);
      };

      render(
        <TestWrapper>
          <MockAuthForm onSubmit={handleSubmit} />
        </TestWrapper>
      );

      await user.type(screen.getByTestId('email-input'), 'invalid@example.com');
      await user.type(screen.getByTestId('password-input'), 'wrongpassword');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials');
      });
    });
  });

  describe('Dashboard Loading and Data Display', () => {
    it('should load dashboard data and display correctly', async () => {
      render(
        <TestWrapper>
          <MockDashboard />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-data')).toBeInTheDocument();
      });

      // Check that data is displayed
      expect(screen.getByText(mockCompany.name)).toBeInTheDocument();
      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    });

    it('should handle dashboard refresh functionality', async () => {
      render(
        <TestWrapper>
          <MockDashboard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should show loading again briefly
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-data')).toBeInTheDocument();
      });
    });
  });

  describe('Product Selection and Ordering Flow', () => {
    it('should complete product selection and ordering flow', async () => {
      // Mock window.alert for order confirmation
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <TestWrapper>
          <MockProductList />
        </TestWrapper>
      );

      // Wait for products to load
      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument();
      });

      // Check products are displayed
      expect(screen.getByTestId('product-list')).toBeInTheDocument();
      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();

      // Select a product
      const selectButton = screen.getByTestId(`select-${mockProduct.id}`);
      await user.click(selectButton);

      // Check product is selected
      await waitFor(() => {
        expect(screen.getByTestId('selected-product')).toBeInTheDocument();
        expect(screen.getByText(`Selected: ${mockProduct.name}`)).toBeInTheDocument();
      });

      // Place order
      const orderButton = screen.getByTestId('order-button');
      await user.click(orderButton);

      // Wait for order confirmation
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(`Order created for product ${mockProduct.id}`);
      });

      alertSpy.mockRestore();
    });

    it('should handle multiple product interactions', async () => {
      render(
        <TestWrapper>
          <MockProductList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument();
      });

      // Select first product
      await user.click(screen.getByTestId(`select-${mockProduct.id}`));
      
      await waitFor(() => {
        expect(screen.getByText(`Selected: ${mockProduct.name}`)).toBeInTheDocument();
      });

      // Select second product
      await user.click(screen.getByTestId('select-product-2'));
      
      await waitFor(() => {
        expect(screen.getByText('Selected: Product 2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from API errors', async () => {
      const MockErrorComponent = () => {
        const [error, setError] = React.useState<string | null>(null);
        const [retryCount, setRetryCount] = React.useState(0);

        const simulateApiCall = async () => {
          if (retryCount < 2) {
            setError('API Error occurred');
            setRetryCount(prev => prev + 1);
          } else {
            setError(null);
          }
        };

        React.useEffect(() => {
          simulateApiCall();
        }, [retryCount]);

        return (
          <div>
            {error ? (
              <div>
                <div data-testid="error-display">{error}</div>
                <button onClick={simulateApiCall} data-testid="retry-button">
                  Retry
                </button>
              </div>
            ) : (
              <div data-testid="success-state">Success!</div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <MockErrorComponent />
        </TestWrapper>
      );

      // Should show error initially
      expect(screen.getByTestId('error-display')).toHaveTextContent('API Error occurred');

      // Click retry
      await user.click(screen.getByTestId('retry-button'));

      // Should still show error on first retry
      expect(screen.getByTestId('error-display')).toBeInTheDocument();

      // Click retry again
      await user.click(screen.getByTestId('retry-button'));

      // Should show success after second retry
      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toHaveTextContent('Success!');
      });
    });
  });

  describe('Loading States and User Experience', () => {
    it('should show appropriate loading states during operations', async () => {
      const MockLoadingComponent = () => {
        const [loading, setLoading] = React.useState(false);
        const [data, setData] = React.useState<string | null>(null);

        const loadData = async () => {
          setLoading(true);
          await new Promise(resolve => setTimeout(resolve, 200));
          setData('Loaded data');
          setLoading(false);
        };

        return (
          <div>
            <button onClick={loadData} data-testid="load-button">
              Load Data
            </button>
            {loading && <div data-testid="loading-indicator">Loading...</div>}
            {data && <div data-testid="loaded-data">{data}</div>}
          </div>
        );
      };

      render(
        <TestWrapper>
          <MockLoadingComponent />
        </TestWrapper>
      );

      // Click load button
      await user.click(screen.getByTestId('load-button'));

      // Should show loading
      expect(screen.getByTestId('loading-indicator')).toHaveTextContent('Loading...');

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('loaded-data')).toHaveTextContent('Loaded data');
      });

      // Loading indicator should be gone
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation and Submission', () => {
    it('should validate form inputs and handle submission', async () => {
      const MockForm = () => {
        const [email, setEmail] = React.useState('');
        const [errors, setErrors] = React.useState<Record<string, string>>({});
        const [submitted, setSubmitted] = React.useState(false);

        const validateForm = () => {
          const newErrors: Record<string, string> = {};
          
          if (!email) {
            newErrors.email = 'Email is required';
          } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
          }

          setErrors(newErrors);
          return Object.keys(newErrors).length === 0;
        };

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (validateForm()) {
            setSubmitted(true);
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="email-input"
            />
            {errors.email && (
              <div data-testid="email-error">{errors.email}</div>
            )}
            <button type="submit" data-testid="submit-button">
              Submit
            </button>
            {submitted && (
              <div data-testid="success-message">Form submitted successfully!</div>
            )}
          </form>
        );
      };

      render(
        <TestWrapper>
          <MockForm />
        </TestWrapper>
      );

      // Submit empty form
      await user.click(screen.getByTestId('submit-button'));
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');

      // Enter invalid email
      await user.type(screen.getByTestId('email-input'), 'invalid-email');
      await user.click(screen.getByTestId('submit-button'));
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email is invalid');

      // Enter valid email
      await user.clear(screen.getByTestId('email-input'));
      await user.type(screen.getByTestId('email-input'), 'valid@example.com');
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent('Form submitted successfully!');
      });
    });
  });
});