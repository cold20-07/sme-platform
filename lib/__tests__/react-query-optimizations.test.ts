import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { 
  createQueryClient, 
  queryKeys, 
  optimisticUpdates, 
  loadingStateEnhancements,
  retryStrategies,
  performanceOptimization,
  cachingStrategies 
} from '../react-query';

describe('React Query Optimizations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Query Client Configuration', () => {
    it('should create query client with optimized defaults', () => {
      expect(queryClient).toBeDefined();
      
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000); // 30 minutes
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
      expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
    });

    it('should have proper error handling configuration', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.throwOnError).toBe(false);
      expect(defaultOptions.mutations?.throwOnError).toBe(false);
    });
  });

  describe('Query Keys Factory', () => {
    it('should generate consistent query keys', () => {
      const companyId = 'test-company-123';
      
      expect(queryKeys.companies.detail(companyId)).toEqual(['companies', 'detail', companyId]);
      expect(queryKeys.dashboard.overview(companyId)).toEqual(['dashboard', 'overview', companyId]);
      expect(queryKeys.products.list({ company_id: companyId })).toEqual([
        'products', 'list', { filters: { company_id: companyId } }
      ]);
    });

    it('should create hierarchical query keys', () => {
      expect(queryKeys.users.all).toEqual(['users']);
      expect(queryKeys.users.lists()).toEqual(['users', 'list']);
      expect(queryKeys.users.details()).toEqual(['users', 'detail']);
    });
  });

  describe('Retry Strategies', () => {
    it('should not retry auth errors', () => {
      const authError = { code: 'PGRST301', message: 'Unauthorized' };
      expect(retryStrategies.smartRetry(1, authError)).toBe(false);
      
      const permissionError = { code: '42501', message: 'Permission denied' };
      expect(retryStrategies.smartRetry(1, permissionError)).toBe(false);
    });

    it('should retry network errors more aggressively', () => {
      const networkError = { message: 'fetch failed' };
      expect(retryStrategies.smartRetry(1, networkError)).toBe(true);
      expect(retryStrategies.smartRetry(4, networkError)).toBe(true);
      expect(retryStrategies.smartRetry(5, networkError)).toBe(false);
    });

    it('should use adaptive retry delays', () => {
      const networkError = { message: 'network error' };
      const serverError = { message: '500 Internal Server Error' };
      
      const networkDelay = retryStrategies.adaptiveRetryDelay(1, networkError);
      const serverDelay = retryStrategies.adaptiveRetryDelay(1, serverError);
      
      expect(networkDelay).toBeLessThan(serverDelay);
    });

    it('should create circuit breaker with proper state management', () => {
      const circuitBreaker = retryStrategies.createCircuitBreaker('test-endpoint');
      
      expect(circuitBreaker.canExecute()).toBe(true);
      expect(circuitBreaker.getState().state).toBe('closed');
      
      // Record failures to open circuit
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure();
      }
      
      expect(circuitBreaker.getState().state).toBe('open');
      expect(circuitBreaker.canExecute()).toBe(false);
    });
  });

  describe('Caching Strategies', () => {
    it('should provide different caching strategies', () => {
      expect(cachingStrategies.longTerm.staleTime).toBe(30 * 60 * 1000);
      expect(cachingStrategies.shortTerm.staleTime).toBe(30 * 1000);
      expect(cachingStrategies.realTime.staleTime).toBe(0);
      expect(cachingStrategies.background.staleTime).toBe(60 * 60 * 1000);
    });

    it('should configure refetch behavior appropriately', () => {
      expect(cachingStrategies.longTerm.refetchOnWindowFocus).toBe(false);
      expect(cachingStrategies.realTime.refetchOnWindowFocus).toBe(true);
      expect(cachingStrategies.background.refetchOnMount).toBe(false);
    });
  });

  describe('Loading State Enhancements', () => {
    it('should create enhanced loading state with error categorization', () => {
      const mockQuery = {
        isLoading: false,
        isError: true,
        error: { code: 'PGRST301', message: 'Unauthorized' },
        isSuccess: false,
        isFetching: false,
        isRefetching: false,
        isPending: false,
        isStale: false,
        failureCount: 2,
      };

      const enhancedState = loadingStateEnhancements.createEnhancedLoadingState(mockQuery);
      
      expect(enhancedState.errorType).toBe('auth');
      expect(enhancedState.canRetry).toBe(false);
      expect(enhancedState.retryCount).toBe(2);
    });

    it('should create smart loading state with priority handling', () => {
      const queries = [
        { isLoading: true, isError: false, isSuccess: false },
        { isLoading: false, isError: false, isSuccess: true },
        { isLoading: true, isError: false, isSuccess: false },
      ];

      const smartState = loadingStateEnhancements.createSmartLoadingState(queries, {
        priorityQueries: [0, 1],
        backgroundQueries: [2],
      });

      expect(smartState.isLoading).toBe(true); // Priority query is loading
      expect(smartState.isBackgroundLoading).toBe(true); // Background query is loading
    });

    it('should create progressive loading state with stages', () => {
      const queries = [
        { isSuccess: true },
        { isSuccess: true },
        { isSuccess: false },
        { isSuccess: false },
      ];

      const stages = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'];
      const progressiveState = loadingStateEnhancements.createProgressiveLoadingState(queries, stages);

      expect(progressiveState.progress).toBe(50); // 2 out of 4 completed
      expect(progressiveState.completedQueries).toBe(2);
      expect(progressiveState.currentStage).toBe(2);
      expect(progressiveState.stageText).toBe('Stage 3');
    });
  });

  describe('Optimistic Updates', () => {
    beforeEach(() => {
      // Set up initial data
      queryClient.setQueryData(['test', 'list'], [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]);
    });

    it('should add item to list optimistically', () => {
      const newItem = { id: '3', name: 'Item 3' };
      const rollback = optimisticUpdates.addToList(['test', 'list'], newItem);

      const data = queryClient.getQueryData(['test', 'list']) as any[];
      expect(data).toHaveLength(3);
      expect(data[2]).toEqual(newItem);

      // Test rollback
      rollback();
      const rolledBackData = queryClient.getQueryData(['test', 'list']) as any[];
      expect(rolledBackData).toHaveLength(2);
    });

    it('should update item in list optimistically', () => {
      const updates = { name: 'Updated Item 1' };
      const rollback = optimisticUpdates.updateInList(['test', 'list'], '1', updates);

      const data = queryClient.getQueryData(['test', 'list']) as any[];
      expect(data[0].name).toBe('Updated Item 1');

      // Test rollback
      rollback();
      const rolledBackData = queryClient.getQueryData(['test', 'list']) as any[];
      expect(rolledBackData[0].name).toBe('Item 1');
    });

    it('should remove item from list optimistically', () => {
      const rollback = optimisticUpdates.removeFromList(['test', 'list'], '1');

      const data = queryClient.getQueryData(['test', 'list']) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('2');

      // Test rollback
      rollback();
      const rolledBackData = queryClient.getQueryData(['test', 'list']) as any[];
      expect(rolledBackData).toHaveLength(2);
    });

    it('should handle batch updates with rollback', () => {
      const updates = [
        {
          queryKey: ['test', 'list'] as const,
          operation: 'update' as const,
          itemId: '1',
          updates: { name: 'Updated Item 1' },
        },
      ];

      const rollback = optimisticUpdates.batchUpdates(updates);

      const data = queryClient.getQueryData(['test', 'list']) as any[];
      expect(data[0].name).toBe('Updated Item 1');

      // Test rollback
      rollback();
      const rolledBackData = queryClient.getQueryData(['test', 'list']) as any[];
      expect(rolledBackData[0].name).toBe('Item 1');
    });
  });

  describe('Performance Optimization', () => {
    it('should analyze query performance', () => {
      // Add some test queries
      queryClient.setQueryData(['test', '1'], { data: 'test1' });
      queryClient.setQueryData(['test', '2'], { data: 'test2' });

      const analysis = performanceOptimization.analyzeQueryPerformance();
      
      expect(analysis).toHaveProperty('slowQueries');
      expect(analysis).toHaveProperty('frequentQueries');
      expect(analysis).toHaveProperty('staleQueries');
      expect(analysis).toHaveProperty('recommendations');
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should monitor memory usage', () => {
      // Add some test data
      queryClient.setQueryData(['large', 'data'], { 
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }))
      });

      const memoryStats = performanceOptimization.monitorMemoryUsage();
      
      expect(memoryStats).toHaveProperty('totalQueries');
      expect(memoryStats).toHaveProperty('totalMemoryUsage');
      expect(memoryStats).toHaveProperty('largestQueries');
      expect(memoryStats).toHaveProperty('averageQuerySize');
      expect(memoryStats.totalMemoryUsage).toBeGreaterThan(0);
    });

    it('should perform advanced cleanup', () => {
      // Add some old queries
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      
      queryClient.setQueryData(['old', 'query'], { data: 'old' });
      
      // Mock the query to appear old
      const cache = queryClient.getQueryCache();
      const query = cache.find({ queryKey: ['old', 'query'] });
      if (query) {
        // @ts-ignore - accessing private property for testing
        query.state.dataUpdatedAt = oneHourAgo;
      }

      const cleanupResults = performanceOptimization.performAdvancedCleanup();
      
      expect(cleanupResults).toHaveProperty('removedUnused');
      expect(cleanupResults).toHaveProperty('removedErrors');
      expect(cleanupResults).toHaveProperty('removedLarge');
      expect(cleanupResults).toHaveProperty('totalRemoved');
    });
  });

  describe('Error Recovery', () => {
    it('should setup error recovery handlers', () => {
      const cleanup = performanceOptimization.setupErrorRecovery();
      
      expect(typeof cleanup).toBe('function');
      
      // Test cleanup
      cleanup();
    });
  });
});