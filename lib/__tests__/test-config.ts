import { QueryClient } from '@tanstack/react-query';

// Test configuration constants
export const TEST_CONFIG = {
  // Query client configuration for tests
  queryClient: {
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  },

  // Test timeouts
  timeouts: {
    short: 100,
    medium: 500,
    long: 2000,
  },

  // Mock data configuration
  mockData: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    },
    company: {
      id: 'test-company-id',
      name: 'Test Company',
      industry: 'Technology',
      size: '10-50',
    },
    product: {
      id: 'test-product-id',
      name: 'Test Product',
      price: 99.99,
      category: 'Software',
    },
  },

  // API response templates
  apiResponses: {
    success: <T>(data: T) => ({
      data,
      error: null,
      status: 200,
      statusText: 'OK',
    }),
    error: (message: string, code: string = 'UNKNOWN') => ({
      data: null,
      error: { message, code },
      status: 400,
      statusText: 'Bad Request',
    }),
  },
};

// Create a test query client with consistent configuration
export const createTestQueryClient = () => new QueryClient(TEST_CONFIG.queryClient);

// Common test utilities
export const testUtils = {
  // Wait for async operations
  wait: (ms: number = TEST_CONFIG.timeouts.short) => 
    new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock functions with common patterns
  createMockFunction: <T extends (...args: any[]) => any>(
    implementation?: T
  ) => vi.fn(implementation),

  // Mock Supabase responses
  mockSupabaseResponse: <T>(data: T[], error: any = null) => ({
    data,
    error,
    count: data.length,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  }),

  // Mock authentication states
  mockAuthStates: {
    authenticated: {
      user: TEST_CONFIG.mockData.user,
      session: {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
      },
    },
    unauthenticated: {
      user: null,
      session: null,
    },
  },

  // Common error scenarios
  commonErrors: {
    network: new Error('Network error'),
    unauthorized: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
    notFound: { message: 'Not found', code: 'NOT_FOUND' },
    validation: { message: 'Validation error', code: 'VALIDATION_ERROR' },
  },
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

  // Mock global objects
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock fetch
  global.fetch = vi.fn();

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });
};

// Cleanup test environment
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Custom matchers for testing
export const customMatchers = {
  // Check if element has loading state
  toHaveLoadingState: (received: HTMLElement) => {
    const hasSpinner = received.querySelector('[data-testid="loading-spinner"]');
    const hasLoadingClass = received.classList.contains('loading');
    const hasAriaLabel = received.getAttribute('aria-label')?.includes('loading');
    
    const pass = !!(hasSpinner || hasLoadingClass || hasAriaLabel);
    
    return {
      message: () => 
        pass 
          ? `Expected element not to have loading state`
          : `Expected element to have loading state`,
      pass,
    };
  },

  // Check if element has error state
  toHaveErrorState: (received: HTMLElement) => {
    const hasErrorMessage = received.querySelector('[data-testid*="error"]');
    const hasErrorClass = received.classList.contains('error');
    const hasErrorRole = received.getAttribute('role') === 'alert';
    
    const pass = !!(hasErrorMessage || hasErrorClass || hasErrorRole);
    
    return {
      message: () => 
        pass 
          ? `Expected element not to have error state`
          : `Expected element to have error state`,
      pass,
    };
  },
};

// Performance testing utilities
export const performanceUtils = {
  // Measure component render time
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    await testUtils.wait(0); // Wait for render to complete
    const end = performance.now();
    return end - start;
  },

  // Check for memory leaks
  checkMemoryLeaks: (component: any) => {
    // Basic memory leak detection
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return {
      initial: initialMemory,
      check: () => {
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
        return currentMemory - initialMemory;
      },
    };
  },
};

// Accessibility testing utilities
export const a11yUtils = {
  // Check for required ARIA attributes
  checkAriaAttributes: (element: HTMLElement) => {
    const requiredAttributes = ['role', 'aria-label', 'aria-labelledby'];
    const missingAttributes = requiredAttributes.filter(
      attr => !element.hasAttribute(attr)
    );
    
    return {
      hasAllRequired: missingAttributes.length === 0,
      missing: missingAttributes,
    };
  },

  // Check color contrast (simplified)
  checkColorContrast: (element: HTMLElement) => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // This is a simplified check - in real scenarios, you'd use a proper contrast checker
    return {
      color,
      backgroundColor,
      hasGoodContrast: color !== backgroundColor,
    };
  },
};