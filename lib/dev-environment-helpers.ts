import { debugLogger, DebugCategory } from './debug-utilities';
import { queryClient } from './react-query';
import { reactQueryDevUtils } from './react-query-devtools';
import { supabase } from './supabase';

// Environment detection utilities
export const environment = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Feature flags for development
  features: {
    enableMockData: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true',
    enableDebugPanel: process.env.NEXT_PUBLIC_ENABLE_DEBUG_PANEL === 'true',
    enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    enableQueryDevtools: process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS !== 'false', // Default true in dev
    skipAuth: process.env.NEXT_PUBLIC_SKIP_AUTH === 'true',
  },
  
  // Get environment info
  getInfo: () => ({
    nodeEnv: process.env.NODE_ENV,
    nextjsVersion: process.env.NEXT_PUBLIC_NEXTJS_VERSION,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
    gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    features: environment.features,
  }),
};

// Mock data generators for development
export const mockData = {
  // Generate mock user data
  generateUser: (overrides: Partial<any> = {}) => ({
    id: `user_${Math.random().toString(36).substring(2, 11)}`,
    email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    name: `Test User ${Math.floor(Math.random() * 100)}`,
    company_id: `company_${Math.random().toString(36).substring(2, 11)}`,
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Generate mock company data
  generateCompany: (overrides: Partial<any> = {}) => ({
    id: `company_${Math.random().toString(36).substring(2, 11)}`,
    name: `Test Company ${Math.floor(Math.random() * 100)}`,
    industry: 'Technology',
    size: 'Medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Generate mock product data
  generateProduct: (overrides: Partial<any> = {}) => ({
    id: `product_${Math.random().toString(36).substring(2, 11)}`,
    name: `Test Product ${Math.floor(Math.random() * 100)}`,
    description: 'A test product for development',
    price: Math.floor(Math.random() * 1000) + 100,
    category: 'Software',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Generate mock dashboard data
  generateDashboardData: (companyId: string) => ({
    company_id: companyId,
    company_name: 'Test Company',
    total_users: Math.floor(Math.random() * 100) + 10,
    total_orders: Math.floor(Math.random() * 500) + 50,
    total_revenue: Math.floor(Math.random() * 100000) + 10000,
    active_products: Math.floor(Math.random() * 20) + 5,
    wallet_balance: Math.floor(Math.random() * 50000) + 5000,
    total_investments: Math.floor(Math.random() * 200000) + 20000,
    recent_orders: Array.from({ length: 5 }, (_, i) => ({
      id: `order_${i}`,
      product_name: `Product ${i + 1}`,
      amount: Math.floor(Math.random() * 1000) + 100,
      status: ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)],
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    })),
  }),
};

// Development API interceptors
export const apiInterceptors = {
  // Mock API responses for development
  setupMockResponses: () => {
    if (!environment.features.enableMockData) return;

    debugLogger.info(DebugCategory.GENERAL, 'Setting up mock API responses');

    // Mock Supabase responses for development
    const mockSupabaseResponses = {
      '/rest/v1/companies': () => ({
        data: [mockData.generateCompany()],
        error: null,
      }),
      '/rest/v1/users': () => ({
        data: [mockData.generateUser()],
        error: null,
      }),
      '/rest/v1/products': () => ({
        data: [mockData.generateProduct()],
        error: null,
      }),
    };

    // Store original methods
    const originalFrom = supabase.from;
    
    // Override supabase.from for mock responses
    if (environment.features.enableMockData) {
      supabase.from = ((table: string) => {
        debugLogger.debug(DebugCategory.API, `Mock Supabase query: ${table}`);
        
        return {
          select: () => ({
            data: mockSupabaseResponses[`/rest/v1/${table}`]?.()?.data || [],
            error: null,
          }),
          insert: (data: any) => ({
            data: Array.isArray(data) ? data : [data],
            error: null,
          }),
          update: (data: any) => ({
            data: [data],
            error: null,
          }),
          delete: () => ({
            data: null,
            error: null,
          }),
        };
      }) as any;
    }

    return () => {
      // Restore original methods
      supabase.from = originalFrom;
      debugLogger.info(DebugCategory.GENERAL, 'Mock API responses disabled');
    };
  },

  // Log all API calls for debugging
  setupApiLogging: () => {
    debugLogger.info(DebugCategory.GENERAL, 'Setting up API call logging');

    // Monitor React Query mutations and queries
    const cache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();

    cache.subscribe((event) => {
      if (event?.type === 'updated' && event.query.state.fetchStatus === 'fetching') {
        debugLogger.debug(DebugCategory.API, 'Query started', {
          queryKey: event.query.queryKey,
          status: event.query.state.status,
        });
      }
    });

    mutationCache.subscribe((event) => {
      if (event?.type === 'updated') {
        debugLogger.debug(DebugCategory.API, 'Mutation updated', {
          mutationKey: event.mutation.options.mutationKey,
          status: event.mutation.state.status,
        });
      }
    });
  },
};

// Development utilities for testing and debugging
export const devUtils = {
  // Reset application state for testing
  resetAppState: async () => {
    debugLogger.info(DebugCategory.GENERAL, 'Resetting application state');
    
    // Clear React Query cache
    queryClient.clear();
    
    // Clear localStorage (browser only)
    if (typeof window !== 'undefined') {
      const keysToKeep = ['debug-config', 'debug-logs'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
    }
    
    debugLogger.info(DebugCategory.GENERAL, 'Application state reset complete');
  },

  // Simulate different network conditions
  simulateNetworkConditions: (condition: 'slow' | 'offline' | 'normal') => {
    debugLogger.info(DebugCategory.GENERAL, `Simulating network condition: ${condition}`);
    
    const delays = {
      slow: 2000,
      offline: Infinity,
      normal: 0,
    };

    const delay = delays[condition];
    
    // Override React Query's default retry delay
    queryClient.setDefaultOptions({
      queries: {
        retry: condition === 'offline' ? 0 : 3,
        retryDelay: delay === Infinity ? 0 : Math.min(delay, 1000),
      },
      mutations: {
        retry: condition === 'offline' ? 0 : 3,
        retryDelay: delay === Infinity ? 0 : Math.min(delay, 1000),
      },
    });

    if (condition === 'offline') {
      // Simulate offline by rejecting all queries
      queryClient.setQueryDefaults(['*'], {
        queryFn: () => Promise.reject(new Error('Simulated offline condition')),
      });
    }
  },

  // Generate test data for specific scenarios
  generateTestScenario: (scenario: 'empty-state' | 'error-state' | 'loading-state' | 'success-state') => {
    debugLogger.info(DebugCategory.GENERAL, `Generating test scenario: ${scenario}`);
    
    switch (scenario) {
      case 'empty-state':
        queryClient.setQueryData(['companies'], []);
        queryClient.setQueryData(['products'], []);
        queryClient.setQueryData(['users'], []);
        break;
        
      case 'error-state':
        queryClient.setQueryData(['companies'], () => {
          throw new Error('Test error for companies');
        });
        break;
        
      case 'loading-state':
        queryClient.removeQueries();
        // Queries will be in loading state when refetched
        break;
        
      case 'success-state':
        queryClient.setQueryData(['companies'], [mockData.generateCompany()]);
        queryClient.setQueryData(['products'], [mockData.generateProduct()]);
        queryClient.setQueryData(['users'], [mockData.generateUser()]);
        break;
    }
  },

  // Performance testing utilities
  measureComponentRender: (componentName: string) => {
    if (typeof window === 'undefined') {
      return () => 0; // Return no-op function for server-side
    }
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      debugLogger.info(DebugCategory.PERFORMANCE, `Component render time: ${componentName}`, {
        duration: `${duration.toFixed(2)}ms`,
      });
      
      if (duration > 16) { // More than one frame at 60fps
        debugLogger.warn(DebugCategory.PERFORMANCE, `Slow component render: ${componentName}`, {
          duration: `${duration.toFixed(2)}ms`,
        });
      }
      
      return duration;
    };
  },

  // Memory usage monitoring
  monitorMemoryUsage: () => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      debugLogger.warn(DebugCategory.PERFORMANCE, 'Memory monitoring not available in this environment');
      return;
    }

    const logMemoryUsage = () => {
      const memory = (performance as any).memory;
      const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      
      debugLogger.info(DebugCategory.PERFORMANCE, 'Memory usage', {
        used: `${used}MB`,
        total: `${total}MB`,
        limit: `${limit}MB`,
        percentage: `${Math.round((used / limit) * 100)}%`,
      });
      
      // Warn if memory usage is high
      if (used / limit > 0.8) {
        debugLogger.warn(DebugCategory.PERFORMANCE, 'High memory usage detected', {
          used: `${used}MB`,
          limit: `${limit}MB`,
        });
      }
    };

    // Log immediately and then every 30 seconds
    logMemoryUsage();
    const interval = setInterval(logMemoryUsage, 30000);
    
    return () => clearInterval(interval);
  },

  // Bundle analysis helpers
  analyzeBundleSize: () => {
    if (!environment.isDevelopment || typeof window === 'undefined') {
      debugLogger.warn(DebugCategory.GENERAL, 'Bundle analysis only available in development browser environment');
      return;
    }

    // Estimate bundle size based on loaded modules
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes('/_next/static/')) {
        // Estimate size based on typical Next.js chunk sizes
        if (src.includes('framework-')) totalSize += 40; // React framework ~40KB
        else if (src.includes('main-')) totalSize += 20; // Main bundle ~20KB
        else if (src.includes('webpack-')) totalSize += 5; // Webpack runtime ~5KB
        else totalSize += 10; // Other chunks ~10KB average
      }
    });

    debugLogger.info(DebugCategory.PERFORMANCE, 'Estimated bundle size', {
      totalScripts: scripts.length,
      estimatedSize: `${totalSize}KB`,
      recommendation: totalSize > 200 ? 'Consider code splitting' : 'Bundle size looks good',
    });

    return { totalScripts: scripts.length, estimatedSize: totalSize };
  },
};

// Development shortcuts and helpers
export const devShortcuts = {
  // Quick access to common development tasks
  quickLogin: async (userType: 'admin' | 'user' = 'user') => {
    if (!environment.features.skipAuth) {
      debugLogger.warn(DebugCategory.AUTH, 'Quick login disabled - NEXT_PUBLIC_SKIP_AUTH not set');
      return;
    }

    const mockUser = mockData.generateUser({
      role: userType,
      email: userType === 'admin' ? 'admin@example.com' : 'user@example.com',
    });

    debugLogger.info(DebugCategory.AUTH, `Quick login as ${userType}`, mockUser);
    
    // Set mock session data (browser only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: mockUser,
        session: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000, // 1 hour
        },
      }));

      // Trigger auth state change
      window.dispatchEvent(new CustomEvent('auth-state-change', { detail: mockUser }));
    }
  },

  // Quick data population
  populateTestData: async () => {
    debugLogger.info(DebugCategory.GENERAL, 'Populating test data');
    
    const companies = Array.from({ length: 3 }, () => mockData.generateCompany());
    const products = Array.from({ length: 5 }, () => mockData.generateProduct());
    const users = Array.from({ length: 10 }, () => mockData.generateUser());

    queryClient.setQueryData(['companies'], companies);
    queryClient.setQueryData(['products'], products);
    queryClient.setQueryData(['users'], users);

    debugLogger.info(DebugCategory.GENERAL, 'Test data populated', {
      companies: companies.length,
      products: products.length,
      users: users.length,
    });
  },

  // Clear all data
  clearAllData: () => {
    debugLogger.info(DebugCategory.GENERAL, 'Clearing all data');
    devUtils.resetAppState();
  },

  // Toggle debug features
  toggleDebugFeatures: () => {
    const currentLevel = debugLogger.getStats();
    debugLogger.info(DebugCategory.GENERAL, 'Current debug stats', currentLevel);
    
    // Show debug panel if available (browser only)
    if (typeof window !== 'undefined' && environment.features.enableDebugPanel) {
      const debugPanel = document.getElementById('debug-panel');
      if (debugPanel) {
        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
      }
    }
  },
};

// Initialize development environment
export const initializeDevEnvironment = () => {
  if (!environment.isDevelopment) return;

  debugLogger.info(DebugCategory.GENERAL, 'Initializing development environment', environment.getInfo());

  // Setup API interceptors if enabled
  if (environment.features.enableMockData) {
    apiInterceptors.setupMockResponses();
  }

  // Setup API logging
  apiInterceptors.setupApiLogging();

  // Start memory monitoring if enabled
  if (environment.features.enablePerformanceMonitoring) {
    devUtils.monitorMemoryUsage();
  }

  // Make utilities available globally (browser only)
  if (typeof window !== 'undefined') {
    (window as any).devUtils = devUtils;
    (window as any).devShortcuts = devShortcuts;
    (window as any).mockData = mockData;
    (window as any).environment = environment;
  }

  console.log('🚀 Development environment initialized');
  console.log('Available utilities:');
  console.log('- window.devUtils: Development utilities');
  console.log('- window.devShortcuts: Quick development shortcuts');
  console.log('- window.mockData: Mock data generators');
  console.log('- window.environment: Environment info and feature flags');
  
  // Show helpful tips
  console.log('\n💡 Quick tips:');
  console.log('- devShortcuts.quickLogin() - Quick login for testing');
  console.log('- devShortcuts.populateTestData() - Add test data');
  console.log('- devUtils.resetAppState() - Reset application state');
  console.log('- devUtils.simulateNetworkConditions("slow") - Test slow network');
};

// All exports are already declared above with their definitions