# Performance Optimizations

This document outlines the performance optimizations implemented in the SME Platform application.

## Overview

The performance optimizations focus on three main areas:
1. **Code Splitting** - Lazy loading of route components and heavy libraries
2. **React Optimizations** - Using React.memo, useCallback, and useMemo
3. **Bundle Analysis** - Monitoring and optimizing bundle size

## Code Splitting

### Route-Level Code Splitting

All major routes are lazy-loaded to reduce the initial bundle size:

```typescript
// Lazy-loaded route components
export const LazyDashboardPage = withLazyLoading(() => import('@/app/dashboard/page'));
export const LazyProductsPage = withLazyLoading(() => import('@/app/products/page'));
export const LazyContactsPage = withLazyLoading(() => import('@/app/crm/contacts/page'));
```

### Component-Level Code Splitting

Heavy dashboard components are lazy-loaded:

```typescript
// Lazy-loaded dashboard components
export const LazyMetricsGrid = withLazyLoading(
  () => import('@/components/dashboard/metrics-grid').then(m => ({ default: m.MetricsGrid }))
);
```

### Vendor Chunk Splitting

The webpack configuration splits vendor libraries into separate chunks:

- **react**: React and React DOM
- **charts**: Recharts and D3 libraries
- **ui**: Radix UI components
- **supabase**: Supabase client libraries
- **reactQuery**: TanStack React Query

## React Optimizations

### Memoization

Components are optimized using React.memo to prevent unnecessary re-renders:

```typescript
export const MetricsGrid = memo(function MetricsGrid() {
  const metrics = useMemo(() => getMetricsData(), []);
  // Component implementation
});
```

### Callback Optimization

Event handlers are memoized using useCallback:

```typescript
const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  setSearchTerm(e.target.value);
}, []);
```

### Data Memoization

Expensive computations are memoized using useMemo:

```typescript
const filteredProducts = useMemo(() => 
  products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [searchTerm]
);
```

## Bundle Analysis

### Webpack Bundle Analyzer

The application includes webpack-bundle-analyzer for analyzing bundle size:

```bash
npm run analyze        # Analyze bundle
npm run perf:build    # Build and analyze
```

### Performance Budget

The application enforces performance budgets:

- **Initial Bundle**: 200KB
- **Total Bundle**: 1MB
- **Gzipped**: 300KB
- **Render Time**: <16ms (one frame)
- **Memory Usage**: <50MB

### Bundle Optimization

The webpack configuration optimizes chunk splitting:

```javascript
config.optimization.splitChunks = {
  chunks: 'all',
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      chunks: 'all',
      priority: 10,
    },
    // Additional cache groups...
  },
};
```

## Performance Monitoring

### Development Monitoring

In development mode, the application includes performance monitoring:

- **Query Performance Monitor**: Tracks React Query performance
- **Memory Monitor**: Monitors JavaScript heap usage
- **Bundle Size Monitor**: Displays bundle size information
- **Render Time Monitor**: Tracks component render times

### Performance Metrics

The performance monitoring tracks:

- Total queries and slow queries
- Memory usage and largest queries
- Bundle size and gzipped size
- Component render times

### Performance Warnings

The system provides warnings when performance budgets are exceeded:

```typescript
const warnings = checkPerformanceBudget({
  bundleSize: 2 * 1024 * 1024, // 2MB
  renderTime: 25, // 25ms
});
// Returns: ["Bundle size (2048KB) exceeds budget (1024KB)", ...]
```

## React Query Optimizations

### Caching Strategy

React Query is configured with optimized caching:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});
```

### Query Performance Monitoring

The application monitors query performance:

- Slow queries (>1 second)
- Error queries
- Stale queries
- Memory usage per query

## Image Optimization

### Next.js Image Optimization

Images are optimized using Next.js Image component:

```typescript
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

## Core Web Vitals

The application targets Core Web Vitals:

- **LCP (Largest Contentful Paint)**: <2.5s
- **FID (First Input Delay)**: <100ms
- **CLS (Cumulative Layout Shift)**: <0.1

## Performance Testing

### Automated Testing

Performance optimizations are tested automatically:

```bash
npm run test:run lib/__tests__/performance-optimizations.test.ts
```

### Lighthouse Testing

Lighthouse performance testing:

```bash
npm run perf:lighthouse
```

## Best Practices

### Component Optimization

1. Use React.memo for components that receive stable props
2. Use useCallback for event handlers passed to child components
3. Use useMemo for expensive computations
4. Avoid creating objects/arrays in render methods

### Bundle Optimization

1. Use dynamic imports for code splitting
2. Analyze bundle size regularly
3. Remove unused dependencies
4. Use tree shaking for libraries

### Query Optimization

1. Set appropriate stale times for queries
2. Use query keys consistently
3. Implement proper error handling
4. Monitor query performance

## Monitoring and Debugging

### Development Tools

- React Query DevTools
- Performance Metrics Component
- Bundle Analyzer
- Memory Monitor

### Production Monitoring

- Core Web Vitals tracking
- Bundle size monitoring
- Error tracking
- Performance budgets

## Configuration Files

- `lib/performance-config.ts` - Performance configuration
- `lib/performance-monitor.tsx` - Performance monitoring components
- `lib/lazy-components.tsx` - Lazy loading utilities
- `next.config.js` - Webpack optimization configuration

## Scripts

- `npm run analyze` - Analyze bundle size
- `npm run perf:build` - Build and analyze performance
- `npm run perf:lighthouse` - Run Lighthouse audit
- `npm run test` - Run performance tests