import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  queryKeys, 
  cachingStrategies, 
  queryOptimization, 
  optimisticUpdates,
  createLoadingState,
  loadingStateUtils,
  loadingStateEnhancements,
  retryStrategies,
  type LoadingState 
} from '@/lib/react-query';
import { useOptimisticMutation } from './use-optimistic-mutation';

// Example hook demonstrating optimized query usage
export function useOptimizedCompanyData(companyId: string) {
  const queryClient = useQueryClient();

  // Company details with long-term caching strategy and smart retry
  const companyQuery = useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        id: companyId,
        name: 'Sample Company',
        email: 'contact@sample.com',
        created_at: new Date().toISOString(),
      };
    },
    ...queryOptimization.createQueryOptions('longTerm', {
      retry: retryStrategies.smartRetry,
      retryDelay: retryStrategies.adaptiveRetryDelay,
    }),
    enabled: !!companyId,
  });

  // Dashboard metrics with medium-term caching and enhanced retry
  const metricsQuery = useQuery({
    queryKey: queryKeys.dashboard.overview(companyId),
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        company_id: companyId,
        company_name: 'Sample Company',
        total_users: 150,
        total_orders: 1250,
        total_revenue: 125000,
        active_products: 45,
        wallet_balance: 25000,
        total_investments: 75000,
      };
    },
    ...queryOptimization.createQueryOptions('medium', {
      retry: retryStrategies.smartRetry,
      retryDelay: retryStrategies.adaptiveRetryDelay,
    }),
    enabled: !!companyId,
  });

  // Products with optimized caching, prefetching, and background refresh
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ company_id: companyId }),
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      return Array.from({ length: 10 }, (_, i) => ({
        id: `product-${i + 1}`,
        name: `Product ${i + 1}`,
        price: Math.floor(Math.random() * 1000) + 100,
        stock: Math.floor(Math.random() * 100),
        company_id: companyId,
      }));
    },
    ...queryOptimization.createQueryOptions('medium', {
      retry: retryStrategies.smartRetry,
      retryDelay: retryStrategies.adaptiveRetryDelay,
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    }),
    enabled: !!companyId,
  });

  // Optimistic mutation for updating company
  const updateCompanyMutation = useOptimisticMutation({
    mutationFn: async (updates: Partial<{ name: string; email: string }>) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ...(companyQuery.data || {}), ...updates };
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.detail(companyId) });

      // Snapshot the previous value
      const previousCompany = queryClient.getQueryData(queryKeys.companies.detail(companyId));

      // Optimistically update
      optimisticUpdates.updateItem(queryKeys.companies.detail(companyId), variables);

      return { previousCompany };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousCompany) {
        queryClient.setQueryData(queryKeys.companies.detail(companyId), context.previousCompany);
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(companyId) });
    },
    successMessage: 'Company updated successfully!',
    errorMessage: 'Failed to update company. Please try again.',
  });

  // Optimistic mutation for adding products
  const addProductMutation = useOptimisticMutation({
    mutationFn: async (newProduct: { name: string; price: number; stock: number }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        id: `product-${Date.now()}`,
        company_id: companyId,
        ...newProduct,
      };
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products.list({ company_id: companyId }) });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData(queryKeys.products.list({ company_id: companyId }));

      // Optimistically add the new product
      const tempProduct = {
        id: `temp-${Date.now()}`,
        company_id: companyId,
        ...variables,
      };
      
      optimisticUpdates.addToList(
        queryKeys.products.list({ company_id: companyId }),
        tempProduct,
        { prepend: true }
      );

      return { previousProducts, tempProduct };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(
          queryKeys.products.list({ company_id: companyId }),
          context.previousProducts
        );
      }
    },
    onSuccess: (data, _variables, context) => {
      // Replace temp product with real data
      queryClient.setQueryData(
        queryKeys.products.list({ company_id: companyId }),
        (oldData: any[] | undefined) => {
          if (!oldData) return [data];
          return oldData.map(item => 
            item.id === context?.tempProduct?.id ? data : item
          );
        }
      );

      // Update metrics
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(companyId) });
    },
    successMessage: 'Product added successfully!',
    errorMessage: 'Failed to add product. Please try again.',
  });

  // Enhanced loading state with smart prioritization
  const loadingState = loadingStateEnhancements.createSmartLoadingState([
    companyQuery,
    metricsQuery,
    productsQuery,
  ], {
    priorityQueries: [0, 1], // Company and metrics are priority
    backgroundQueries: [2], // Products can load in background
  });

  // Prefetch related data when company changes
  const prefetchRelatedData = async () => {
    if (companyId) {
      await queryOptimization.prefetchRelatedData('company', companyId);
    }
  };

  return {
    // Data
    company: companyQuery.data,
    metrics: metricsQuery.data,
    products: productsQuery.data,

    // Loading states
    loadingState,
    isCompanyLoading: companyQuery.isLoading,
    isMetricsLoading: metricsQuery.isLoading,
    isProductsLoading: productsQuery.isLoading,

    // Individual query states
    companyQuery,
    metricsQuery,
    productsQuery,

    // Mutations
    updateCompany: updateCompanyMutation.mutate,
    addProduct: addProductMutation.mutate,
    isUpdatingCompany: updateCompanyMutation.isPending,
    isAddingProduct: addProductMutation.isPending,

    // Utilities
    prefetchRelatedData,
    refetchAll: () => {
      companyQuery.refetch();
      metricsQuery.refetch();
      productsQuery.refetch();
    },
  };
}

// Hook for demonstrating background data fetching
export function useBackgroundDataSync(companyId: string) {
  const queryClient = useQueryClient();

  // Background sync for analytics data
  const analyticsQuery = useQuery({
    queryKey: ['analytics', companyId],
    queryFn: async () => {
      // Simulate heavy analytics computation
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        pageViews: Math.floor(Math.random() * 10000),
        uniqueVisitors: Math.floor(Math.random() * 5000),
        conversionRate: Math.random() * 10,
        revenue: Math.floor(Math.random() * 100000),
      };
    },
    ...queryOptimization.createQueryOptions('background'),
    enabled: !!companyId,
  });

  // Real-time notifications
  const notificationsQuery = useQuery({
    queryKey: ['notifications', companyId],
    queryFn: async () => {
      // Simulate real-time data
      await new Promise(resolve => setTimeout(resolve, 300));
      return Array.from({ length: 5 }, (_, i) => ({
        id: `notification-${i + 1}`,
        message: `Notification ${i + 1}`,
        type: ['info', 'warning', 'success'][Math.floor(Math.random() * 3)],
        timestamp: new Date().toISOString(),
      }));
    },
    ...queryOptimization.createQueryOptions('realTime'),
    enabled: !!companyId,
  });

  return {
    analytics: analyticsQuery.data,
    notifications: notificationsQuery.data,
    isAnalyticsLoading: analyticsQuery.isLoading,
    isNotificationsLoading: notificationsQuery.isLoading,
    
    // Manual refresh functions
    refreshAnalytics: () => analyticsQuery.refetch(),
    refreshNotifications: () => notificationsQuery.refetch(),
  };
}

// Hook for demonstrating batch operations
export function useBatchOperations(companyId: string) {
  const queryClient = useQueryClient();

  const batchUpdateProducts = useMutation({
    mutationFn: async (updates: Array<{ id: string; updates: any }>) => {
      // Simulate batch API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      return updates.map(({ id, updates: productUpdates }) => ({
        id,
        ...productUpdates,
        company_id: companyId,
      }));
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.products.list({ company_id: companyId }) 
      });

      // Snapshot previous data
      const previousProducts = queryClient.getQueryData(
        queryKeys.products.list({ company_id: companyId })
      );

      // Apply optimistic updates
      const rollback = optimisticUpdates.batchUpdates(
        variables.map(({ id, updates }) => ({
          queryKey: queryKeys.products.list({ company_id: companyId }),
          operation: 'update' as const,
          itemId: id,
          updates,
        }))
      );

      return { previousProducts, rollback };
    },
    onError: (_error, _variables, context) => {
      // Rollback all changes
      context?.rollback?.();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.products.all 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboard.overview(companyId) 
      });
    },
  });

  return {
    batchUpdateProducts: batchUpdateProducts.mutate,
    isBatchUpdating: batchUpdateProducts.isPending,
    batchUpdateError: batchUpdateProducts.error,
  };
}