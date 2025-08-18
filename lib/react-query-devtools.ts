import { queryClient, cacheUtils } from './react-query';

// Development utilities for React Query
export const devUtils = {
  // Get detailed cache information
  getCacheInfo: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      successQueries: queries.filter(q => q.state.status === 'success').length,
      pendingQueries: queries.filter(q => q.state.status === 'pending').length,
      
      // Memory usage estimation
      estimatedMemoryUsage: queries.reduce((total, query) => {
        const dataSize = JSON.stringify(query.state.data || {}).length;
        return total + dataSize;
      }, 0),
      
      // Query details
      queryDetails: queries.map(query => ({
        queryKey: query.queryKey,
        status: query.state.status,
        dataUpdatedAt: query.state.dataUpdatedAt,
        errorUpdatedAt: query.state.errorUpdatedAt,
        fetchStatus: query.state.fetchStatus,
        isStale: query.isStale(),
        isFetching: query.state.fetchStatus === 'fetching',
        observersCount: query.getObserversCount(),
        dataSize: JSON.stringify(query.state.data || {}).length,
      })),
    };
  },

  // Clear specific entity cache
  clearEntityCache: (entity: string) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.findAll({ queryKey: [entity] });
    
    queries.forEach(query => {
      queryClient.removeQueries({ queryKey: query.queryKey });
    });
    
    console.log(`Cleared ${queries.length} queries for entity: ${entity}`);
  },

  // Force refetch all stale queries
  refetchStaleQueries: async () => {
    const cache = queryClient.getQueryCache();
    const staleQueries = cache.getAll().filter(q => q.isStale());
    
    console.log(`Refetching ${staleQueries.length} stale queries...`);
    
    await Promise.all(
      staleQueries.map(query => 
        queryClient.refetchQueries({ queryKey: query.queryKey })
      )
    );
    
    console.log('All stale queries refetched');
  },

  // Simulate network error for testing
  simulateNetworkError: (queryKey: readonly unknown[]) => {
    queryClient.setQueryData(queryKey, () => {
      throw new Error('Simulated network error for testing');
    });
  },

  // Prefetch common queries
  prefetchCommonQueries: async (companyId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['companies', 'detail', companyId],
      queryFn: () => Promise.resolve({ id: companyId, name: 'Test Company' }),
    });

    await queryClient.prefetchQuery({
      queryKey: ['dashboard', 'overview', companyId],
      queryFn: () => Promise.resolve({ 
        company_id: companyId,
        company_name: 'Test Company',
        total_users: 0,
        total_orders: 0, 
        total_revenue: 0, 
        active_products: 0,
        wallet_balance: 0,
        total_investments: 0,
      }),
    });

    console.log('Common queries prefetched');
  },

  // Monitor query performance
  startPerformanceMonitoring: () => {
    const cache = queryClient.getQueryCache();
    
    cache.subscribe((event) => {
      if (event?.type === 'updated') {
        const query = event.query;
        const duration = query.state.dataUpdatedAt - (query.state.fetchFailureCount > 0 
          ? query.state.errorUpdatedAt 
          : query.state.dataUpdatedAt - 1000); // Rough estimate

        if (duration > 2000) { // Log slow queries (>2s)
          console.warn('Slow query detected:', {
            queryKey: query.queryKey,
            duration: `${duration}ms`,
            status: query.state.status,
          });
        }
      }
    });

    console.log('Query performance monitoring started');
  },

  // Export cache data for debugging
  exportCacheData: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const exportData = queries.map(query => ({
      queryKey: query.queryKey,
      data: query.state.data,
      status: query.state.status,
      error: query.state.error,
      dataUpdatedAt: query.state.dataUpdatedAt,
      errorUpdatedAt: query.state.errorUpdatedAt,
    }));

    // Create downloadable JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `react-query-cache-${new Date().toISOString()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('Cache data exported');
  },

  // Analyze cache efficiency
  analyzeCacheEfficiency: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const analysis = {
      totalQueries: queries.length,
      hitRate: 0,
      missRate: 0,
      averageDataAge: 0,
      duplicateQueries: 0,
      unusedQueries: queries.filter(q => q.getObserversCount() === 0).length,
      
      recommendations: [] as string[],
    };

    // Calculate average data age
    const now = Date.now();
    const totalAge = queries.reduce((sum, query) => {
      return sum + (now - query.state.dataUpdatedAt);
    }, 0);
    analysis.averageDataAge = totalAge / queries.length;

    // Find potential duplicate queries
    const queryKeyStrings = queries.map(q => JSON.stringify(q.queryKey));
    const uniqueKeys = new Set(queryKeyStrings);
    analysis.duplicateQueries = queryKeyStrings.length - uniqueKeys.size;

    // Generate recommendations
    if (analysis.unusedQueries > queries.length * 0.3) {
      analysis.recommendations.push('Consider reducing cache time for unused queries');
    }
    
    if (analysis.averageDataAge > 10 * 60 * 1000) { // 10 minutes
      analysis.recommendations.push('Some data is quite old, consider reducing stale time');
    }
    
    if (analysis.duplicateQueries > 0) {
      analysis.recommendations.push('Duplicate queries detected, check for unnecessary refetches');
    }

    console.log('Cache efficiency analysis:', analysis);
    return analysis;
  },
};

// Global development helpers (only available in development and browser)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Make dev utils available globally for debugging
  (window as any).reactQueryDevUtils = devUtils;
  (window as any).queryClient = queryClient;
  (window as any).cacheUtils = cacheUtils;

  console.log('React Query dev utils available at window.reactQueryDevUtils');
  console.log('Query client available at window.queryClient');
  console.log('Cache utils available at window.cacheUtils');
}

// Performance monitoring setup
export function setupPerformanceMonitoring() {
  if (process.env.NODE_ENV === 'development') {
    devUtils.startPerformanceMonitoring();
    
    // Log cache stats every 30 seconds
    setInterval(() => {
      const stats = cacheUtils.getStats();
      console.log('Cache stats:', stats);
    }, 30000);
  }
}

// Cache warming for critical data with optimization
export async function warmCache(companyId: string, route?: string) {
  if (!companyId) return;

  try {
    await devUtils.prefetchCommonQueries(companyId);
    
    // Use the new optimization utilities
    const { queryOptimization } = await import('./react-query');
    if (route) {
      await queryOptimization.warmCacheForRoute(route, { companyId });
    }
  } catch (error) {
    console.warn('Failed to warm cache:', error);
  }
}

export { devUtils as reactQueryDevUtils };

// React Query DevTools component configuration
export const ReactQueryDevtoolsConfig = {
  // DevTools configuration options
  defaultOptions: {
    initialIsOpen: false,
    position: 'bottom-left' as const,
    toggleButtonProps: {
      style: {
        backgroundColor: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: 99999,
      },
    },
    panelProps: {
      style: {
        zIndex: 99998,
      },
    },
  },

  // Enhanced DevTools with custom features
  get enhancedOptions() {
    return {
      ...this.defaultOptions,
      onToggle: (isOpen: boolean) => {
        console.log(`React Query DevTools ${isOpen ? 'opened' : 'closed'}`);
        devUtils.analyzeCacheEfficiency();
      },
    };
  },
};

// DevTools initialization
export const initializeReactQueryDevTools = () => {
  if (process.env.NODE_ENV !== 'development') return null;

  // Dynamic import to avoid including DevTools in production
  return import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => {
    console.log('🔧 React Query DevTools loaded');
    return ReactQueryDevtools;
  }).catch((error) => {
    console.warn('Failed to load React Query DevTools:', error);
    return null;
  });
};

// DevTools component wrapper - moved to separate file to avoid JSX in .ts file
export const createDevToolsWrapper = () => {
  if (process.env.NODE_ENV !== 'development') return null;

  return {
    config: ReactQueryDevtoolsConfig.enhancedOptions,
    loadDevTools: () => import('@tanstack/react-query-devtools').then(module => module.ReactQueryDevtools),
  };
};