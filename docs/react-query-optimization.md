# React Query Optimization Guide

This document outlines the comprehensive React Query optimizations implemented in the SME Platform application.

## Overview

The React Query configuration has been optimized to provide:
- Intelligent caching strategies
- Enhanced error handling and retry logic
- Optimistic updates with automatic rollback
- Performance monitoring and optimization
- Advanced loading state management
- Memory usage optimization

## Key Features

### 1. Intelligent Caching Strategies

Different data types use different caching strategies based on their characteristics:

#### Long-term Strategy
- **Use case**: User profiles, company information, rarely changing data
- **Stale time**: 30 minutes
- **Cache time**: 1 hour
- **Refetch behavior**: Minimal refetching

#### Medium-term Strategy
- **Use case**: Dashboard metrics, product lists, moderately changing data
- **Stale time**: 5 minutes
- **Cache time**: 15 minutes
- **Refetch behavior**: Refetch on mount

#### Short-term Strategy
- **Use case**: Real-time notifications, frequently changing data
- **Stale time**: 30 seconds
- **Cache time**: 2 minutes
- **Refetch behavior**: Frequent refetching with intervals

#### Real-time Strategy
- **Use case**: Authentication status, critical real-time data
- **Stale time**: 0 (always stale)
- **Cache time**: 30 seconds
- **Refetch behavior**: Continuous refetching

#### Background Strategy
- **Use case**: Analytics, reports, background data
- **Stale time**: 1 hour
- **Cache time**: 24 hours
- **Refetch behavior**: Minimal background updates

### 2. Enhanced Error Handling

#### Smart Retry Logic
- Network errors: Retry with exponential backoff
- 4xx errors: No retry (client errors)
- Authentication errors: No retry
- Permission errors: No retry

#### User-friendly Error Messages
- Technical errors are mapped to user-friendly messages
- Context-aware error handling
- Automatic error recovery for network issues

#### Error Recovery Mechanisms
- Automatic refetch when connection is restored
- Periodic retry for failed queries
- Global error boundary integration

### 3. Optimistic Updates

#### Features
- Automatic rollback on error
- Batch operations support
- Smart relationship handling
- Memory-efficient updates

#### Usage Example
```typescript
const updateCompanyMutation = useOptimisticMutation({
  mutationFn: updateCompanyAPI,
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['companies', companyId] });
    
    // Snapshot previous value
    const previousData = queryClient.getQueryData(['companies', companyId]);
    
    // Optimistically update
    queryClient.setQueryData(['companies', companyId], { ...previousData, ...variables });
    
    return { previousData };
  },
  onError: (error, variables, context) => {
    // Rollback on error
    if (context?.previousData) {
      queryClient.setQueryData(['companies', companyId], context.previousData);
    }
  },
  successMessage: 'Company updated successfully!',
  errorMessage: 'Failed to update company.',
});
```

### 4. Performance Monitoring

#### Automatic Analysis
- Slow query detection (>2 seconds)
- Memory usage monitoring
- Cache efficiency analysis
- Performance recommendations

#### Development Tools
- Real-time performance metrics
- Cache inspector
- Query performance monitor
- Memory usage alerts

### 5. Advanced Loading States

#### Combined Loading States
```typescript
const loadingState = loadingStateUtils.fromQueries([
  companyQuery,
  metricsQuery,
  productsQuery,
]);

// Check different loading scenarios
const isCriticalLoading = loadingStateUtils.isCriticalLoading([loadingState]);
const isBackgroundRefreshing = loadingStateUtils.isBackgroundRefreshing([loadingState]);
```

#### Loading State Components
- `LoadingStateHandler`: Comprehensive loading state management
- `DataWrapper`: Data fetching with loading states
- `LoadingButton`: Button with loading indicators
- `ProgressIndicator`: Multi-step operation progress

### 6. Query Key Factory

Consistent and hierarchical query key generation:

```typescript
// Hierarchical structure
queryKeys.companies.all // ['companies']
queryKeys.companies.lists() // ['companies', 'list']
queryKeys.companies.detail(id) // ['companies', 'detail', id]

// With filters
queryKeys.products.list({ company_id: 'abc' }) 
// ['products', 'list', { filters: { company_id: 'abc' } }]
```

### 7. Cache Management Utilities

#### Cache Operations
```typescript
// Invalidate entity queries
cacheUtils.invalidateEntity('companies');

// Remove entity queries
cacheUtils.removeEntity('products');

// Get cache statistics
const stats = cacheUtils.getStats();

// Prefetch data
await cacheUtils.prefetch(queryKey, queryFn);
```

#### Automatic Optimization
- Unused query cleanup
- Memory usage optimization
- Performance analysis
- Cache size management

## Implementation Guide

### 1. Setting Up the Provider

```typescript
import ReactQueryProvider from '@/lib/react-query-provider';

function App() {
  return (
    <ReactQueryProvider>
      {/* Your app components */}
    </ReactQueryProvider>
  );
}
```

### 2. Using Optimized Queries

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys, queryOptimization } from '@/lib/react-query';

function useCompanyData(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: () => fetchCompany(companyId),
    ...queryOptimization.createQueryOptions('longTerm'),
    enabled: !!companyId,
  });
}
```

### 3. Implementing Optimistic Updates

```typescript
import { useOptimisticMutation } from '@/hooks/use-optimistic-mutation';

function useUpdateCompany(companyId: string) {
  return useOptimisticMutation({
    mutationFn: updateCompanyAPI,
    invalidateQueries: [
      queryKeys.companies.all,
      queryKeys.dashboard.overview(companyId),
    ],
    successMessage: 'Company updated successfully!',
    errorMessage: 'Failed to update company.',
  });
}
```

### 4. Managing Loading States

```typescript
import { useOptimizedCompanyData } from '@/hooks/use-optimized-queries';
import { LoadingStateHandler } from '@/components/ui/loading-states';

function CompanyDashboard({ companyId }: { companyId: string }) {
  const { company, loadingState, refetchAll } = useOptimizedCompanyData(companyId);

  return (
    <LoadingStateHandler
      loadingState={loadingState}
      onRetry={refetchAll}
    >
      {/* Your component content */}
    </LoadingStateHandler>
  );
}
```

## Performance Best Practices

### 1. Choose Appropriate Caching Strategies
- Use `longTerm` for rarely changing data
- Use `medium` for moderately changing data
- Use `shortTerm` for frequently changing data
- Use `realTime` for critical real-time data
- Use `background` for analytics and reports

### 2. Implement Optimistic Updates
- Use for better perceived performance
- Always implement rollback mechanisms
- Consider data relationships

### 3. Monitor Performance
- Use development tools to identify slow queries
- Monitor memory usage
- Analyze cache efficiency
- Follow performance recommendations

### 4. Handle Errors Gracefully
- Provide user-friendly error messages
- Implement appropriate retry strategies
- Use error boundaries for critical errors

### 5. Optimize Loading States
- Combine multiple loading states
- Use skeleton loaders for better UX
- Implement progressive loading

## Development Tools

### Performance Monitor
Shows real-time performance metrics in development mode:
- Slow queries count
- Stale queries count
- Memory usage
- Performance recommendations

### Cache Inspector
Provides detailed cache information:
- Query details and status
- Memory usage per query
- Cache hit/miss rates
- Query relationships

### React Query DevTools
Enhanced with custom configuration:
- Query performance tracking
- Cache optimization suggestions
- Error analysis
- Memory usage monitoring

## Configuration Options

### Custom Query Client
```typescript
import { createQueryClient } from '@/lib/react-query';

const customQueryClient = createQueryClient({
  defaultStaleTime: 10 * 60 * 1000, // 10 minutes
  defaultCacheTime: 30 * 60 * 1000, // 30 minutes
  defaultRetryCount: 5,
  refetchOnWindowFocus: true,
});
```

### Environment-specific Settings
- Development: Enhanced debugging and monitoring
- Production: Optimized for performance
- Testing: Minimal caching for predictable tests

## Troubleshooting

### Common Issues

1. **Slow Queries**
   - Check query performance in development tools
   - Consider implementing pagination
   - Optimize API endpoints

2. **High Memory Usage**
   - Review cache times for large datasets
   - Implement data pagination
   - Use selective data fetching

3. **Stale Data**
   - Adjust stale times based on data characteristics
   - Implement real-time subscriptions for critical data
   - Use manual invalidation when needed

4. **Network Errors**
   - Verify retry strategies
   - Check error handling implementation
   - Monitor network conditions

### Debug Commands

```typescript
// Analyze query performance
const analysis = performanceOptimization.analyzeQueryPerformance();

// Monitor memory usage
const memoryStats = performanceOptimization.monitorMemoryUsage();

// Get cache statistics
const stats = cacheUtils.getStats();

// Clear cache
cacheUtils.clear();
```

## Conclusion

The React Query optimization implementation provides a robust, performant, and user-friendly data fetching solution. It automatically handles caching, error recovery, loading states, and performance optimization while providing comprehensive development tools for monitoring and debugging.

The system is designed to be:
- **Performant**: Intelligent caching and optimization
- **Reliable**: Robust error handling and recovery
- **User-friendly**: Smooth loading states and error messages
- **Developer-friendly**: Comprehensive debugging tools
- **Maintainable**: Clean abstractions and utilities
- **Scalable**: Efficient memory and cache management