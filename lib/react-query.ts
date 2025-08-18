import { QueryClient, DefaultOptions, MutationCache, QueryCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleSupabaseError, SupabaseError } from './supabase';
import { standardizeError, globalErrorHandler, APIError } from './api-error-handler';

// React Query configuration interface
export interface ReactQueryConfig {
  defaultStaleTime: number;
  defaultCacheTime: number;
  defaultRetryCount: number;
  defaultRetryDelay: (attemptIndex: number) => number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
  enableDevtools: boolean;
}

// Default configuration based on requirements - optimized for better performance
const defaultConfig: ReactQueryConfig = {
  defaultStaleTime: 5 * 60 * 1000, // 5 minutes - good balance for most data
  defaultCacheTime: 30 * 60 * 1000, // 30 minutes - increased for better caching
  defaultRetryCount: 3,
  defaultRetryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: false, // Prevent unnecessary refetches
  refetchOnReconnect: true, // Refetch when connection is restored
  enableDevtools: process.env.NODE_ENV === 'development',
};

// Error handler for queries
function handleQueryError(error: unknown): void {
  // Standardize the error using the new API error handler
  const apiError = standardizeError(error);
  
  // Handle the error globally
  globalErrorHandler.handleError(apiError);
  
  // Don't show toast for certain error types (silent errors)
  const silentErrors = ['PGRST116', 'PGRST301', 'NOT_FOUND', 'UNAUTHORIZED'];
  if (silentErrors.includes(apiError.code)) {
    return;
  }

  // Show user-friendly error message for non-silent errors
  toast.error(apiError.userMessage);
  
  // Log detailed error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Query Error:', apiError);
  }
}

// Error handler for mutations
function handleMutationError(error: unknown): void {
  // Standardize the error using the new API error handler
  const apiError = standardizeError(error);
  
  // Handle the error globally
  globalErrorHandler.handleError(apiError);
  
  // Always show mutation errors to user (mutations are user-initiated actions)
  toast.error(apiError.userMessage);
  
  // Log detailed error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Mutation Error:', apiError);
  }
}

// Convert technical errors to user-friendly messages
function getUserFriendlyErrorMessage(error: SupabaseError): string {
  // Map common error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'PGRST116': 'The requested data was not found.',
    'PGRST301': 'You do not have permission to access this data.',
    'PGRST204': 'No data was found matching your request.',
    '23505': 'This record already exists.',
    '23503': 'Cannot delete this record because it is referenced by other data.',
    '23502': 'Required information is missing.',
    '42501': 'You do not have permission to perform this action.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  };

  // Check for specific error codes
  if (error.code && error.code in errorMessages) {
    return errorMessages[error.code] || error.message;
  }

  // Check for network errors
  if (error.message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Check for timeout errors
  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Default fallback message
  return error.message || 'An unexpected error occurred. Please try again.';
}

// Success handler for mutations
function handleMutationSuccess(_data: unknown, _variables: unknown, _context: unknown): void {
  // Log successful mutations in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Mutation Success:', { data: _data, variables: _variables, context: _context });
  }
}

// Create query cache with error handling
const queryCache = new QueryCache({
  onError: handleQueryError,
});

// Create mutation cache with error handling
const mutationCache = new MutationCache({
  onError: handleMutationError,
  onSuccess: handleMutationSuccess,
});

// Default options for all queries and mutations - optimized for performance and UX
const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: defaultConfig.defaultStaleTime,
    gcTime: defaultConfig.defaultCacheTime, // gcTime replaces cacheTime in v5
    retry: (failureCount, error) => {
      // Standardize the error for consistent retry logic
      const apiError = standardizeError(error);
      
      // Use the API error handler's retry logic
      if (!apiError.retryable) {
        return false;
      }

      // Retry up to the configured limit
      return failureCount < defaultConfig.defaultRetryCount;
    },
    retryDelay: defaultConfig.defaultRetryDelay,
    refetchOnWindowFocus: defaultConfig.refetchOnWindowFocus,
    refetchOnReconnect: defaultConfig.refetchOnReconnect,
    // Optimize refetch behavior
    refetchOnMount: 'always' as const,
    refetchInterval: false, // Disable automatic polling by default
    refetchIntervalInBackground: false,
    // Network mode for better offline handling
    networkMode: 'online',
    // Enable structural sharing for better performance
    structuralSharing: true,
    // Optimize for better perceived performance
    placeholderData: (previousData: any) => previousData,
    // Enhanced error handling
    throwOnError: false, // Handle errors gracefully through error boundaries
    // Optimize for better UX
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
  },
  mutations: {
    retry: (failureCount, error) => {
      // Standardize the error for consistent retry logic
      const apiError = standardizeError(error);
      
      // Only retry mutations if the error is retryable and it's a network/server error
      const retryableCategories = ['network', 'server'];
      const shouldRetry = apiError.retryable && 
                         retryableCategories.includes(apiError.category) &&
                         failureCount < 2; // Max 2 retries for mutations

      return shouldRetry;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    // Network mode for mutations
    networkMode: 'online',
    // Enhanced error handling for mutations
    throwOnError: false, // Handle errors gracefully
  },
};

// Create and configure the QueryClient
export function createQueryClient(config: Partial<ReactQueryConfig> = {}): QueryClient {
  const mergedConfig = { ...defaultConfig, ...config };

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      ...defaultOptions,
      queries: {
        ...defaultOptions.queries,
        staleTime: mergedConfig.defaultStaleTime,
        gcTime: mergedConfig.defaultCacheTime,
        retry: (failureCount, error) => {
          // Standardize the error for consistent retry logic
          const apiError = standardizeError(error);
          
          // Use the API error handler's retry logic
          if (!apiError.retryable) {
            return false;
          }

          return failureCount < mergedConfig.defaultRetryCount;
        },
        retryDelay: mergedConfig.defaultRetryDelay,
        refetchOnWindowFocus: mergedConfig.refetchOnWindowFocus,
        refetchOnReconnect: mergedConfig.refetchOnReconnect,
      },
    },
  });
}

// Pre-configured query client instance
export const queryClient = createQueryClient();

// Query key factory for consistent key generation
export const queryKeys = {
  // User queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
  },
  
  // Company queries
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.companies.lists(), { filters }] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    metrics: (id: string, dateRange?: { from: string; to: string }) => 
      [...queryKeys.companies.detail(id), 'metrics', { dateRange }] as const,
  },

  // Contact queries
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.contacts.lists(), { filters }] as const,
    details: () => [...queryKeys.contacts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
  },

  // Product queries
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.products.lists(), { filters }] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    lowStock: () => [...queryKeys.products.all, 'low-stock'] as const,
  },

  // Order queries
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.orders.lists(), { filters }] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
    items: (orderId: string) => [...queryKeys.orders.detail(orderId), 'items'] as const,
  },

  // Wallet queries
  wallets: {
    all: ['wallets'] as const,
    lists: () => [...queryKeys.wallets.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.wallets.lists(), { filters }] as const,
    details: () => [...queryKeys.wallets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.wallets.details(), id] as const,
    balance: (companyId: string) => [...queryKeys.wallets.all, 'balance', companyId] as const,
  },

  // Investment queries
  investments: {
    all: ['investments'] as const,
    lists: () => [...queryKeys.investments.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.investments.lists(), { filters }] as const,
    details: () => [...queryKeys.investments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.investments.details(), id] as const,
    portfolio: (companyId: string) => [...queryKeys.investments.all, 'portfolio', companyId] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    overview: (companyId: string) => [...queryKeys.dashboard.all, 'overview', companyId] as const,
    metrics: (companyId: string, period: string) => 
      [...queryKeys.dashboard.all, 'metrics', companyId, period] as const,
  },
} as const;

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate all queries for a specific entity
  invalidateEntity: (entity: keyof typeof queryKeys) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys[entity].all });
  },

  // Remove all queries for a specific entity
  removeEntity: (entity: keyof typeof queryKeys) => {
    return queryClient.removeQueries({ queryKey: queryKeys[entity].all });
  },

  // Prefetch a query
  prefetch: async (queryKey: readonly unknown[], queryFn: () => Promise<any>) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: defaultConfig.defaultStaleTime,
    });
  },

  // Set query data manually (useful for optimistic updates)
  setQueryData: (queryKey: readonly unknown[], data: any) => {
    return queryClient.setQueryData(queryKey, data);
  },

  // Get cached query data
  getQueryData: (queryKey: readonly unknown[]) => {
    return queryClient.getQueryData(queryKey);
  },

  // Clear all cache
  clear: () => {
    return queryClient.clear();
  },

  // Get cache stats
  getStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
    };
  },
};

// Enhanced loading state management
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error: SupabaseError | null;
  isSuccess: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isPending: boolean;
  isStale: boolean;
}

// Create enhanced loading state from query result
export function createLoadingState(queryResult: any): LoadingState {
  return {
    isLoading: queryResult.isLoading || false,
    isError: queryResult.isError || false,
    error: queryResult.error ? handleSupabaseError(queryResult.error) : null,
    isSuccess: queryResult.isSuccess || false,
    isFetching: queryResult.isFetching || false,
    isRefetching: queryResult.isRefetching || false,
    isPending: queryResult.isPending || false,
    isStale: queryResult.isStale || false,
  };
}

// Combine multiple loading states
export function combineLoadingStates(...states: LoadingState[]): LoadingState {
  return {
    isLoading: states.some(state => state.isLoading),
    isError: states.some(state => state.isError),
    error: states.find(state => state.error)?.error || null,
    isSuccess: states.every(state => state.isSuccess),
    isFetching: states.some(state => state.isFetching),
    isRefetching: states.some(state => state.isRefetching),
    isPending: states.some(state => state.isPending),
    isStale: states.some(state => state.isStale),
  };
}

// Loading state utilities
export const loadingStateUtils = {
  // Check if any critical queries are loading
  isCriticalLoading: (states: LoadingState[]): boolean => {
    return states.some(state => state.isLoading && !state.isFetching);
  },

  // Check if background refresh is happening
  isBackgroundRefreshing: (states: LoadingState[]): boolean => {
    return states.some(state => state.isFetching && !state.isLoading);
  },

  // Get the most severe error from multiple states
  getMostSevereError: (states: LoadingState[]): SupabaseError | null => {
    const errors = states.filter(state => state.error).map(state => state.error!);
    if (errors.length === 0) return null;

    // Prioritize certain error types
    const priorityOrder = ['PGRST301', '42501', 'PGRST116', 'network', 'timeout'];
    
    for (const priority of priorityOrder) {
      const error = errors.find(err => err.code === priority || err.message.includes(priority));
      if (error) return error;
    }

    return errors[0] || null;
  },

  // Create loading state for multiple queries
  fromQueries: (queries: any[]): LoadingState => {
    const states = queries.map(createLoadingState);
    return combineLoadingStates(...states);
  },

  // Create loading state for mutations
  fromMutation: (mutation: any): LoadingState => {
    return {
      isLoading: mutation.isPending || false,
      isError: mutation.isError || false,
      error: mutation.error ? handleSupabaseError(mutation.error) : null,
      isSuccess: mutation.isSuccess || false,
      isFetching: mutation.isPending || false,
      isRefetching: false,
      isPending: mutation.isPending || false,
      isStale: false,
    };
  },
};

// Enhanced loading state management with better UX
export const loadingStateEnhancements = {
  // Create loading state with better error categorization
  createEnhancedLoadingState: (queryResult: any): LoadingState & {
    errorType?: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
    canRetry: boolean;
    retryCount: number;
  } => {
    const baseState = createLoadingState(queryResult);
    let errorType: 'network' | 'auth' | 'validation' | 'server' | 'unknown' | undefined;
    let canRetry = false;

    if (baseState.error) {
      const error = baseState.error;
      
      // Categorize error types
      if (error.message.includes('fetch') || error.message.includes('network')) {
        errorType = 'network';
        canRetry = true;
      } else if (error.code === 'PGRST301' || error.code === '42501') {
        errorType = 'auth';
        canRetry = false;
      } else if (error.code === '23505' || error.code === '23502') {
        errorType = 'validation';
        canRetry = false;
      } else if (error.message.includes('5')) {
        errorType = 'server';
        canRetry = true;
      } else {
        errorType = 'unknown';
        canRetry = true;
      }
    }

    return {
      ...baseState,
      errorType,
      canRetry,
      retryCount: queryResult.failureCount || 0,
    };
  },

  // Smart loading state that considers user experience
  createSmartLoadingState: (queries: any[], options: {
    priorityQueries?: number[];
    backgroundQueries?: number[];
  } = {}) => {
    const { priorityQueries = [], backgroundQueries = [] } = options;
    
    const allStates = queries.map((query, index) => ({
      ...loadingStateEnhancements.createEnhancedLoadingState(query),
      isPriority: priorityQueries.includes(index),
      isBackground: backgroundQueries.includes(index),
    }));

    // Priority queries determine main loading state
    const priorityStates = allStates.filter(state => state.isPriority);
    const mainStates = priorityStates.length > 0 ? priorityStates : allStates.filter(state => !state.isBackground);

    return {
      // Main loading state based on priority queries
      isLoading: mainStates.some(state => state.isLoading),
      isError: mainStates.some(state => state.isError),
      error: mainStates.find(state => state.error)?.error || null,
      isSuccess: mainStates.every(state => state.isSuccess),
      
      // Background loading indicators
      isBackgroundLoading: allStates.filter(state => state.isBackground).some(state => state.isLoading),
      isBackgroundRefreshing: allStates.some(state => state.isFetching && !state.isLoading),
      
      // Enhanced error information
      errorType: mainStates.find(state => state.errorType)?.errorType,
      canRetry: mainStates.some(state => state.canRetry),
      retryCount: Math.max(...mainStates.map(state => state.retryCount)),
      
      // Detailed states for advanced UI
      allStates,
      priorityStates,
      backgroundStates: allStates.filter(state => state.isBackground),
    };
  },

  // Progressive loading state for better perceived performance
  createProgressiveLoadingState: (queries: any[], stages: string[]) => {
    const states = queries.map(loadingStateEnhancements.createEnhancedLoadingState);
    const completedQueries = states.filter(state => state.isSuccess).length;
    const totalQueries = states.length;
    
    return {
      ...combineLoadingStates(...states),
      progress: totalQueries > 0 ? (completedQueries / totalQueries) * 100 : 0,
      currentStage: Math.min(Math.floor((completedQueries / totalQueries) * stages.length), stages.length - 1),
      stageText: stages[Math.min(Math.floor((completedQueries / totalQueries) * stages.length), stages.length - 1)] || 'Loading...',
      completedQueries,
      totalQueries,
    };
  },
};

// Enhanced optimistic update helpers with rollback support
export const optimisticUpdates = {
  // Add item to list optimistically with rollback support
  addToList: <T extends { id: string }>(
    queryKey: readonly unknown[],
    newItem: T,
    options: { prepend?: boolean; maxItems?: number } = {}
  ) => {
    const previousData = queryClient.getQueryData(queryKey);
    
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return [newItem];
      
      let updatedData = options.prepend 
        ? [newItem, ...oldData]
        : [...oldData, newItem];
      
      // Limit the number of items if specified
      if (options.maxItems && updatedData.length > options.maxItems) {
        updatedData = options.prepend 
          ? updatedData.slice(0, options.maxItems)
          : updatedData.slice(-options.maxItems);
      }
      
      return updatedData;
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  // Update item in list optimistically with rollback support
  updateInList: <T extends { id: string }>(
    queryKey: readonly unknown[],
    itemId: string,
    updates: Partial<Omit<T, 'id'>> & { id?: string }
  ) => {
    const previousData = queryClient.getQueryData(queryKey);
    
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  // Remove item from list optimistically with rollback support
  removeFromList: <T extends { id: string }>(
    queryKey: readonly unknown[],
    itemId: string
  ) => {
    const previousData = queryClient.getQueryData(queryKey);
    
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.filter(item => item.id !== itemId);
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  // Update single item optimistically with rollback support
  updateItem: <T extends Record<string, any>>(
    queryKey: readonly unknown[],
    updates: Partial<T>
  ) => {
    const previousData = queryClient.getQueryData(queryKey);
    
    queryClient.setQueryData(queryKey, (oldData: T | undefined) => {
      if (!oldData) return oldData;
      return { ...oldData, ...updates };
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  // Batch optimistic updates with rollback support
  batchUpdates: <T extends { id: string }>(
    updates: Array<{
      queryKey: readonly unknown[];
      operation: 'add' | 'update' | 'remove';
      item?: T;
      itemId?: string;
      updates?: Partial<T>;
    }>
  ) => {
    const rollbackFunctions: Array<() => void> = [];

    updates.forEach(({ queryKey, operation, item, itemId, updates: itemUpdates }) => {
      switch (operation) {
        case 'add':
          if (item) {
            const rollback = optimisticUpdates.addToList(queryKey, item);
            rollbackFunctions.push(rollback);
          }
          break;
        case 'update':
          if (itemId && itemUpdates) {
            const rollback = optimisticUpdates.updateInList(queryKey, itemId, itemUpdates);
            rollbackFunctions.push(rollback);
          }
          break;
        case 'remove':
          if (itemId) {
            const rollback = optimisticUpdates.removeFromList(queryKey, itemId);
            rollbackFunctions.push(rollback);
          }
          break;
      }
    });

    return () => rollbackFunctions.forEach(rollback => rollback());
  },

  // Smart optimistic updates that consider data relationships
  smartUpdate: <T extends { id: string }>(
    primaryQueryKey: readonly unknown[],
    relatedQueryKeys: readonly unknown[][],
    item: T,
    operation: 'add' | 'update' | 'remove'
  ) => {
    const rollbackFunctions: Array<() => void> = [];

    // Update primary query
    switch (operation) {
      case 'add':
        rollbackFunctions.push(optimisticUpdates.addToList(primaryQueryKey, item));
        break;
      case 'update':
        rollbackFunctions.push(optimisticUpdates.updateInList(primaryQueryKey, item.id, item));
        break;
      case 'remove':
        rollbackFunctions.push(optimisticUpdates.removeFromList(primaryQueryKey, item.id));
        break;
    }

    // Update related queries
    relatedQueryKeys.forEach(queryKey => {
      const existingData = queryClient.getQueryData(queryKey) as T[] | undefined;
      if (existingData) {
        switch (operation) {
          case 'add':
            rollbackFunctions.push(optimisticUpdates.addToList(queryKey, item));
            break;
          case 'update':
            const existingItem = existingData.find(existing => existing.id === item.id);
            if (existingItem) {
              rollbackFunctions.push(optimisticUpdates.updateInList(queryKey, item.id, item));
            }
            break;
          case 'remove':
            const itemExists = existingData.some(existing => existing.id === item.id);
            if (itemExists) {
              rollbackFunctions.push(optimisticUpdates.removeFromList(queryKey, item.id));
            }
            break;
        }
      }
    });

    return () => rollbackFunctions.forEach(rollback => rollback());
  },
};

// Enhanced retry strategies with intelligent backoff
export const retryStrategies = {
  // Smart retry that considers error type and network conditions
  smartRetry: (failureCount: number, error: unknown) => {
    const supabaseError = handleSupabaseError(error);
    
    // Never retry certain error types
    const noRetryErrors = ['PGRST301', '42501', 'PGRST116', '23505', '23502'];
    if (supabaseError.code && noRetryErrors.includes(supabaseError.code)) {
      return false;
    }

    // Don't retry 4xx errors (client errors)
    if (supabaseError.message.includes('4')) {
      return false;
    }

    // Retry network errors more aggressively
    const networkErrors = ['fetch', 'timeout', 'network', 'connection'];
    const isNetworkError = networkErrors.some(keyword => 
      supabaseError.message.toLowerCase().includes(keyword)
    );

    if (isNetworkError) {
      return failureCount < 5; // More retries for network issues
    }

    // Standard retry for other errors
    return failureCount < 3;
  },

  // Adaptive retry delay based on error type and network conditions
  adaptiveRetryDelay: (attemptIndex: number, error?: unknown) => {
    const baseDelay = 1000;
    const maxDelay = 30000;
    
    if (error) {
      const supabaseError = handleSupabaseError(error);
      const networkErrors = ['fetch', 'timeout', 'network', 'connection'];
      const isNetworkError = networkErrors.some(keyword => 
        supabaseError.message.toLowerCase().includes(keyword)
      );

      if (isNetworkError) {
        // Faster retry for network errors
        return Math.min(baseDelay * Math.pow(1.5, attemptIndex), maxDelay);
      }

      // Server errors get longer delays
      if (supabaseError.message.includes('5')) {
        return Math.min(baseDelay * Math.pow(3, attemptIndex), maxDelay);
      }
    }

    // Standard exponential backoff
    return Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
  },

  // Circuit breaker pattern for failing endpoints
  createCircuitBreaker: (endpoint: string, options: {
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringPeriod?: number;
  } = {}) => {
    const {
      failureThreshold = 5,
      resetTimeout = 60000, // 1 minute
      monitoringPeriod = 300000, // 5 minutes
    } = options;

    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return {
      canExecute: () => {
        const now = Date.now();
        
        // Reset if monitoring period has passed
        if (now - lastFailureTime > monitoringPeriod) {
          failures = 0;
          state = 'closed';
        }

        // If circuit is open, check if we should try again
        if (state === 'open') {
          if (now - lastFailureTime > resetTimeout) {
            state = 'half-open';
            return true;
          }
          return false;
        }

        return true;
      },

      recordSuccess: () => {
        failures = 0;
        state = 'closed';
      },

      recordFailure: () => {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          state = 'open';
        }
      },

      getState: () => ({ state, failures, lastFailureTime }),
    };
  },
};

// Advanced caching strategies
export const cachingStrategies = {
  // Strategy for frequently accessed, rarely changing data (e.g., user profile, company info)
  longTerm: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnMount: false as const,
    refetchOnWindowFocus: false,
  },

  // Strategy for moderately changing data (e.g., dashboard metrics, product lists)
  medium: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: false,
  },

  // Strategy for frequently changing data (e.g., real-time notifications, live data)
  shortTerm: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every minute
  },

  // Strategy for critical data that should always be fresh (e.g., authentication status)
  realTime: {
    staleTime: 0, // Always stale
    gcTime: 30 * 1000, // 30 seconds
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  },

  // Strategy for background data that can be stale (e.g., analytics, reports)
  background: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: false as const,
    refetchOnWindowFocus: false,
  },
} as const;

// Query optimization utilities
export const queryOptimization = {
  // Create optimized query options based on data type
  createQueryOptions: (
    strategy: keyof typeof cachingStrategies,
    customOptions: Partial<any> = {}
  ) => ({
    ...cachingStrategies[strategy],
    ...customOptions,
  }),

  // Batch multiple queries for better performance
  batchQueries: async (queries: Array<{ queryKey: readonly unknown[]; queryFn: () => Promise<any> }>) => {
    const results = await Promise.allSettled(
      queries.map(({ queryKey, queryFn }) =>
        queryClient.fetchQuery({ queryKey, queryFn })
      )
    );

    return results.map((result, index) => ({
      queryKey: queries[index]?.queryKey || [],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  },

  // Prefetch related data based on user behavior patterns
  prefetchRelatedData: async (entityType: string, entityId: string) => {
    const prefetchPromises: Promise<any>[] = [];

    switch (entityType) {
      case 'company':
        // Prefetch common company-related data
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.overview(entityId),
            queryFn: () => Promise.resolve(null), // Will be replaced with actual query
            ...cachingStrategies.medium,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.products.list({ company_id: entityId }),
            queryFn: () => Promise.resolve([]), // Will be replaced with actual query
            ...cachingStrategies.medium,
          })
        );
        break;

      case 'user':
        // Prefetch user-related data
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.users.detail(entityId),
            queryFn: () => Promise.resolve(null), // Will be replaced with actual query
            ...cachingStrategies.longTerm,
          })
        );
        break;

      default:
        break;
    }

    await Promise.allSettled(prefetchPromises);
  },

  // Intelligent cache warming based on route patterns
  warmCacheForRoute: async (route: string, params: Record<string, string> = {}) => {
    const { companyId, userId } = params;

    switch (route) {
      case '/dashboard':
        if (companyId) {
          await queryOptimization.prefetchRelatedData('company', companyId);
        }
        break;

      case '/crm':
        if (companyId) {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.contacts.list({ company_id: companyId }),
            queryFn: () => Promise.resolve([]), // Will be replaced with actual query
            ...cachingStrategies.medium,
          });
        }
        break;

      case '/products':
        if (companyId) {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.products.list({ company_id: companyId }),
            queryFn: () => Promise.resolve([]), // Will be replaced with actual query
            ...cachingStrategies.medium,
          });
        }
        break;

      default:
        break;
    }
  },
};

// Performance monitoring and optimization
export const performanceOptimization = {
  // Monitor query performance and suggest optimizations
  analyzeQueryPerformance: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const slowQueries = queries.filter(query => {
      const lastFetchDuration = query.state.dataUpdatedAt - (query.state.errorUpdatedAt || 0);
      return lastFetchDuration > 2000; // Queries taking more than 2 seconds
    });

    const frequentQueries = queries.filter(query => {
      return query.getObserversCount() > 3; // Queries with many observers
    });

    const staleQueries = queries.filter(query => query.isStale());

    return {
      slowQueries: slowQueries.map(q => ({
        queryKey: q.queryKey,
        duration: q.state.dataUpdatedAt - (q.state.errorUpdatedAt || 0),
      })),
      frequentQueries: frequentQueries.map(q => ({
        queryKey: q.queryKey,
        observerCount: q.getObserversCount(),
      })),
      staleQueries: staleQueries.map(q => ({
        queryKey: q.queryKey,
        staleTime: Date.now() - q.state.dataUpdatedAt,
      })),
      recommendations: [
        ...(slowQueries.length > 0 ? ['Consider optimizing slow queries or implementing pagination'] : []),
        ...(frequentQueries.length > 0 ? ['Consider increasing stale time for frequently accessed queries'] : []),
        ...(staleQueries.length > queries.length * 0.5 ? ['Many queries are stale, consider adjusting stale times'] : []),
      ],
    };
  },

  // Optimize cache size by removing unused queries
  optimizeCacheSize: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove queries with no observers that are older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const unusedQueries = queries.filter(query => 
      query.getObserversCount() === 0 && 
      query.state.dataUpdatedAt < oneHourAgo
    );

    unusedQueries.forEach(query => {
      queryClient.removeQueries({ queryKey: query.queryKey });
    });

    return {
      removedQueries: unusedQueries.length,
      remainingQueries: queries.length - unusedQueries.length,
    };
  },

  // Setup automatic cache optimization
  setupAutomaticOptimization: () => {
    // Run cache optimization every 10 minutes
    const intervalId = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        const analysis = performanceOptimization.analyzeQueryPerformance();
        console.log('Query Performance Analysis:', analysis);
      }
      
      performanceOptimization.optimizeCacheSize();
    }, 10 * 60 * 1000);

    // Return cleanup function
    return () => clearInterval(intervalId);
  },

  // Enhanced error recovery strategies
  setupErrorRecovery: () => {
    // Global error recovery for network issues
    const handleOnline = () => {
      // Refetch all failed queries when connection is restored
      queryClient.refetchQueries({
        predicate: (query) => query.state.status === 'error',
      });
      
      // Also refetch stale queries that might have failed due to network issues
      queryClient.refetchQueries({
        predicate: (query) => query.isStale() && query.state.fetchFailureCount > 0,
      });
    };

    const handleOffline = () => {
      // Pause all queries when offline
      queryClient.getQueryCache().getAll().forEach(query => {
        query.cancel();
      });
    };

    // Setup event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },

  // Memory usage monitoring
  monitorMemoryUsage: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const memoryStats = {
      totalQueries: queries.length,
      totalMemoryUsage: 0,
      largestQueries: [] as Array<{ queryKey: readonly unknown[]; size: number }>,
      averageQuerySize: 0,
    };

    // Calculate memory usage for each query
    const querySizes = queries.map(query => {
      const dataSize = JSON.stringify(query.state.data || {}).length;
      const errorSize = JSON.stringify(query.state.error || {}).length;
      const totalSize = dataSize + errorSize;
      
      memoryStats.totalMemoryUsage += totalSize;
      
      return {
        queryKey: query.queryKey,
        size: totalSize,
      };
    });

    // Find largest queries
    memoryStats.largestQueries = querySizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    // Calculate average
    memoryStats.averageQuerySize = memoryStats.totalMemoryUsage / queries.length || 0;

    return memoryStats;
  },

  // Advanced cache cleanup strategies
  performAdvancedCleanup: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const now = Date.now();
    
    // Remove queries that haven't been accessed in the last hour and have no observers
    const oneHourAgo = now - 60 * 60 * 1000;
    const unusedQueries = queries.filter(query => 
      query.getObserversCount() === 0 && 
      query.state.dataUpdatedAt < oneHourAgo
    );

    // Remove error queries that are older than 5 minutes
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const oldErrorQueries = queries.filter(query =>
      query.state.status === 'error' &&
      query.state.errorUpdatedAt < fiveMinutesAgo &&
      query.getObserversCount() === 0
    );

    // Remove large queries that are stale and unused
    const memoryStats = performanceOptimization.monitorMemoryUsage();
    const averageSize = memoryStats.averageQuerySize;
    const largeUnusedQueries = queries.filter(query => {
      const dataSize = JSON.stringify(query.state.data || {}).length;
      return dataSize > averageSize * 3 && // 3x larger than average
             query.getObserversCount() === 0 &&
             query.isStale();
    });

    // Perform cleanup
    [...unusedQueries, ...oldErrorQueries, ...largeUnusedQueries].forEach(query => {
      queryClient.removeQueries({ queryKey: query.queryKey });
    });

    return {
      removedUnused: unusedQueries.length,
      removedErrors: oldErrorQueries.length,
      removedLarge: largeUnusedQueries.length,
      totalRemoved: unusedQueries.length + oldErrorQueries.length + largeUnusedQueries.length,
    };
  },
};

// Export types for use in components