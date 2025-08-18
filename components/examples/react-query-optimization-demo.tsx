'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LoadingStateHandler, 
  LoadingButton, 
  DataWrapper, 
  CardSkeleton,
  TableSkeleton,
  ProgressIndicator 
} from '@/components/ui/loading-states';
import { 
  useOptimizedCompanyData, 
  useBackgroundDataSync, 
  useBatchOperations 
} from '@/hooks/use-optimized-queries';
import { cacheUtils, performanceOptimization } from '@/lib/react-query';
import { toast } from 'sonner';

// Demo component showcasing React Query optimizations
export function ReactQueryOptimizationDemo() {
  const [companyId] = useState('demo-company-123');
  const [activeTab, setActiveTab] = useState('data');
  const [batchProgress, setBatchProgress] = useState(0);

  // Use optimized company data hook
  const {
    company,
    metrics,
    products,
    loadingState,
    updateCompany,
    addProduct,
    isUpdatingCompany,
    isAddingProduct,
    prefetchRelatedData,
    refetchAll,
  } = useOptimizedCompanyData(companyId);

  // Use background data sync
  const {
    analytics,
    notifications,
    isAnalyticsLoading,
    isNotificationsLoading,
    refreshAnalytics,
    refreshNotifications,
  } = useBackgroundDataSync(companyId);

  // Use batch operations
  const {
    batchUpdateProducts,
    isBatchUpdating,
  } = useBatchOperations(companyId);

  // Demo functions
  const handleUpdateCompany = () => {
    updateCompany({
      name: `Updated Company ${Date.now()}`,
      email: `updated-${Date.now()}@example.com`,
    });
  };

  const handleAddProduct = () => {
    addProduct({
      name: `New Product ${Date.now()}`,
      price: Math.floor(Math.random() * 1000) + 100,
      stock: Math.floor(Math.random() * 100) + 10,
    });
  };

  const handleBatchUpdate = () => {
    if (!products || !Array.isArray(products)) return;

    const updates = products.slice(0, 3).map(product => ({
      id: product.id,
      updates: {
        price: product.price + Math.floor(Math.random() * 100),
        stock: product.stock + Math.floor(Math.random() * 20),
      },
    }));

    batchUpdateProducts(updates);
  };

  const handlePrefetchData = async () => {
    await prefetchRelatedData();
    toast.success('Related data prefetched successfully!');
  };

  const handleCacheAnalysis = () => {
    const analysis = performanceOptimization.analyzeQueryPerformance();
    console.log('Cache Analysis:', analysis);
    toast.info(`Cache analysis complete. Check console for details.`);
  };

  const handleCacheOptimization = () => {
    const result = performanceOptimization.optimizeCacheSize();
    toast.success(`Cache optimized: ${result.removedQueries} queries removed`);
  };

  const getCacheStats = () => {
    return cacheUtils.getStats();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">React Query Optimization Demo</h1>
        <p className="text-gray-600">
          Demonstrating optimized caching, loading states, and error handling
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="loading">Loading States</TabsTrigger>
          <TabsTrigger value="cache">Cache Management</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Company Data */}
            <Card>
              <CardHeader>
                <CardTitle>Company Data</CardTitle>
                <CardDescription>Optimized with long-term caching</CardDescription>
              </CardHeader>
              <CardContent>
                <DataWrapper
                  data={company}
                  loadingState={loadingState}
                  onRetry={refetchAll}
                  loadingComponent={<CardSkeleton />}
                >
                  {(companyData) => (
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {companyData.name}</p>
                      <p><strong>Email:</strong> {companyData.email}</p>
                      <p><strong>ID:</strong> {companyData.id}</p>
                      <LoadingButton
                        isLoading={isUpdatingCompany}
                        onClick={handleUpdateCompany}
                        size="sm"
                        className="w-full mt-4"
                      >
                        Update Company
                      </LoadingButton>
                    </div>
                  )}
                </DataWrapper>
              </CardContent>
            </Card>

            {/* Metrics Data */}
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Metrics</CardTitle>
                <CardDescription>Medium-term caching strategy</CardDescription>
              </CardHeader>
              <CardContent>
                <DataWrapper
                  data={metrics}
                  loadingState={loadingState}
                  onRetry={refetchAll}
                  loadingComponent={<CardSkeleton />}
                >
                  {(metricsData) => (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Users:</span>
                        <Badge variant="secondary">{metricsData.total_users}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Orders:</span>
                        <Badge variant="secondary">{metricsData.total_orders}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <Badge variant="secondary">${metricsData.total_revenue.toLocaleString()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Products:</span>
                        <Badge variant="secondary">{metricsData.active_products}</Badge>
                      </div>
                    </div>
                  )}
                </DataWrapper>
              </CardContent>
            </Card>

            {/* Products Data */}
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>Optimistic updates enabled</CardDescription>
              </CardHeader>
              <CardContent>
                <DataWrapper
                  data={products}
                  loadingState={loadingState}
                  onRetry={refetchAll}
                  loadingComponent={<TableSkeleton rows={3} columns={2} />}
                >
                  {(productsData) => (
                    <div className="space-y-3">
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {Array.isArray(productsData) && productsData.slice(0, 3).map((product) => (
                          <div key={product.id} className="flex justify-between text-sm">
                            <span className="truncate">{product.name}</span>
                            <Badge variant="outline">${product.price}</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <LoadingButton
                          isLoading={isAddingProduct}
                          onClick={handleAddProduct}
                          size="sm"
                          className="w-full"
                        >
                          Add Product
                        </LoadingButton>
                        <LoadingButton
                          isLoading={isBatchUpdating}
                          onClick={handleBatchUpdate}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          Batch Update (3 items)
                        </LoadingButton>
                      </div>
                    </div>
                  )}
                </DataWrapper>
              </CardContent>
            </Card>
          </div>

          {/* Background Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics (Background)</CardTitle>
                <CardDescription>Heavy computation with background caching</CardDescription>
              </CardHeader>
              <CardContent>
                <LoadingStateHandler
                  loadingState={{ 
                    isLoading: isAnalyticsLoading, 
                    isError: false, 
                    error: null,
                    isSuccess: !!analytics,
                    isFetching: isAnalyticsLoading,
                    isRefetching: false,
                    isPending: isAnalyticsLoading,
                    isStale: false,
                  }}
                  onRetry={refreshAnalytics}
                  loadingComponent={<CardSkeleton />}
                >
                  {analytics && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Page Views:</span>
                        <Badge>{analytics.pageViews.toLocaleString()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Unique Visitors:</span>
                        <Badge>{analytics.uniqueVisitors.toLocaleString()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversion Rate:</span>
                        <Badge>{analytics.conversionRate.toFixed(2)}%</Badge>
                      </div>
                      <Button
                        onClick={refreshAnalytics}
                        size="sm"
                        variant="outline"
                        className="w-full mt-4"
                      >
                        Refresh Analytics
                      </Button>
                    </div>
                  )}
                </LoadingStateHandler>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications (Real-time)</CardTitle>
                <CardDescription>Real-time updates with frequent refetching</CardDescription>
              </CardHeader>
              <CardContent>
                <LoadingStateHandler
                  loadingState={{ 
                    isLoading: isNotificationsLoading, 
                    isError: false, 
                    error: null,
                    isSuccess: !!notifications,
                    isFetching: isNotificationsLoading,
                    isRefetching: false,
                    isPending: isNotificationsLoading,
                    isStale: false,
                  }}
                  onRetry={refreshNotifications}
                  loadingComponent={<CardSkeleton />}
                >
                  {notifications && (
                    <div className="space-y-2">
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {notifications.slice(0, 3).map((notification) => (
                          <div key={notification.id} className="text-xs p-2 bg-gray-50 rounded">
                            <div className="flex justify-between items-center">
                              <span className="truncate">{notification.message}</span>
                              <Badge 
                                variant={
                                  notification.type === 'success' ? 'default' :
                                  notification.type === 'warning' ? 'destructive' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {notification.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={refreshNotifications}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        Refresh Notifications
                      </Button>
                    </div>
                  )}
                </LoadingStateHandler>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loading State Examples</CardTitle>
              <CardDescription>Different loading patterns and states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Combined Loading State */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Combined Loading State</h3>
                <div className="p-4 border rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">Is Loading:</span>
                      <Badge variant={loadingState.isLoading ? 'default' : 'secondary'}>
                        {loadingState.isLoading ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">Is Error:</span>
                      <Badge variant={loadingState.isError ? 'destructive' : 'secondary'}>
                        {loadingState.isError ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">Is Success:</span>
                      <Badge variant={loadingState.isSuccess ? 'default' : 'secondary'}>
                        {loadingState.isSuccess ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">Is Fetching:</span>
                      <Badge variant={loadingState.isFetching ? 'default' : 'secondary'}>
                        {loadingState.isFetching ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Operation Progress */}
              {isBatchUpdating && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Batch Operation Progress</h3>
                  <ProgressIndicator
                    steps={['Preparing updates', 'Updating products', 'Refreshing cache', 'Complete']}
                    currentStep={batchProgress}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={refetchAll} variant="outline">
                  Refetch All Data
                </Button>
                <Button onClick={handlePrefetchData} variant="outline">
                  Prefetch Related Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cache Management</CardTitle>
              <CardDescription>Monitor and control React Query cache</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cache Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Cache Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(getCacheStats()).map(([key, value]) => (
                    <div key={key} className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{value}</div>
                      <div className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cache Actions */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Cache Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleCacheAnalysis} variant="outline">
                    Analyze Performance
                  </Button>
                  <Button onClick={handleCacheOptimization} variant="outline">
                    Optimize Cache Size
                  </Button>
                  <Button 
                    onClick={() => {
                      cacheUtils.invalidateEntity('companies');
                      toast.success('Companies cache invalidated');
                    }} 
                    variant="outline"
                  >
                    Invalidate Companies
                  </Button>
                  <Button 
                    onClick={() => {
                      cacheUtils.clear();
                      toast.success('All cache cleared');
                    }} 
                    variant="destructive"
                  >
                    Clear All Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Monitoring</CardTitle>
              <CardDescription>Real-time performance metrics and optimizations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-gray-600">
                <p>Performance monitoring is active in development mode.</p>
                <p>Check the browser console for detailed performance logs.</p>
                <p>Slow queries (&gt;2s) and cache efficiency metrics are automatically tracked.</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Optimization Features Active:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Intelligent caching strategies (long-term, medium, short-term, real-time, background)</li>
                  <li>✓ Optimistic updates with automatic rollback</li>
                  <li>✓ Smart retry logic with exponential backoff</li>
                  <li>✓ Automatic cache size optimization</li>
                  <li>✓ Query performance monitoring</li>
                  <li>✓ Background data prefetching</li>
                  <li>✓ Batch operation support</li>
                  <li>✓ Enhanced error handling with user-friendly messages</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}