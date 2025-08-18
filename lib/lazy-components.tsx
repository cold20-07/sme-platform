'use client';
import { lazy, Suspense, ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Loading component for lazy-loaded routes
export function RouteLoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Loading component for lazy-loaded components
export function ComponentLoadingSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ComponentType = ComponentLoadingSkeleton
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<fallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Lazy-loaded route components
export const LazyDashboardPage = withLazyLoading(
  () => import('@/app/dashboard/page'),
  RouteLoadingSpinner
);

export const LazyProductsPage = withLazyLoading(
  () => import('@/app/products/page'),
  RouteLoadingSpinner
);

export const LazyContactsPage = withLazyLoading(
  () => import('@/app/crm/contacts/page'),
  RouteLoadingSpinner
);

export const LazyWalletPage = withLazyLoading(
  () => import('@/app/wallet/page'),
  RouteLoadingSpinner
);

export const LazyCompliancePage = withLazyLoading(
  () => import('@/app/compliance/page'),
  RouteLoadingSpinner
);

export const LazyAuthPage = withLazyLoading(
  () => import('@/app/auth/page'),
  RouteLoadingSpinner
);

// Lazy-loaded dashboard components
export const LazyMetricsGrid = withLazyLoading(
  () => import('@/components/dashboard/metrics-grid').then(m => ({ default: m.MetricsGrid }))
);

export const LazyRevenueChart = withLazyLoading(
  () => import('@/components/dashboard/charts').then(m => ({ default: m.RevenueChart }))
);

export const LazyOwnershipChart = withLazyLoading(
  () => import('@/components/dashboard/charts').then(m => ({ default: m.OwnershipChart }))
);

export const LazyComplianceChart = withLazyLoading(
  () => import('@/components/dashboard/charts').then(m => ({ default: m.ComplianceChart }))
);

export const LazyProactiveInsights = withLazyLoading(
  () => import('@/components/dashboard/insights').then(m => ({ default: m.ProactiveInsights }))
);