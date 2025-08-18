'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LoadingSpinner, 
  LoadingStateHandler, 
  DataWrapper, 
  ProgressIndicator,
  LoadingButton,
  ErrorDisplay 
} from '@/components/ui/loading-states';
import { 
  queryKeys, 
  loadingStateEnhancements, 
  retryStrategies,
  cachingStrategies,
  queryOptimization 
} from '@/lib/react-query';
import { useOptimisticMutation } from '@/hooks/use-optimistic-mutation';

// Demo component showcasing React Query optimizations
export function ReactQueryLoadingDemo() {
  const [selectedDemo, setSelectedDemo] = useState<string>('smart-loading');
  const queryClient = useQueryClient();

  // Demo queries with different loading patterns
  const fastQuery = useQuery({
    queryKey: ['demo', 'fast'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id: 1, name: 'Fast Data', value: Math.random() * 100 };
    },
    ...queryOptimization.createQueryOptions('shortTerm'),
  });

  const slowQuery = useQuery({
    queryKey: ['demo', 'slow'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { id: 2, name: 'Slow Data', value: Math.random() * 100 };
    },
    ...queryOptimization.createQueryOptions('medium'),
  });

  const errorQuery = useQuery({
    queryKey: ['demo', 'error'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (Math.random() > 0.7) {
        throw new Error('Random demo error for testing');
      }
      return { id: 3, name: 'Error-Prone Data', value: Math.random() * 100 };
    },
    retry: retryStrategies.smartRetry,
    retryDelay: retryStrategies.adaptiveRetryDelay,
  });

  const backgroundQuery = useQuery({
    queryKey: ['demo', 'background'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Background Item ${i + 1}`,
        value: Math.random() * 100,
      }));
    },
    ...queryOptimization.createQueryOptions('background'),
  });

  // Smart loading state demo
  const smartLoadingState = loadingStateEnhancements.createSmartLoadingState([
    fastQuery,
    slowQuery,
    errorQuery,
    backgroundQuery,
  ], {
    priorityQueries: [0, 1], // Fast and slow queries are priority
    backgroundQueries: [3], // Background query loads in background
  });

  // Progressive loading state demo
  const progressiveLoadingState = loadingStateEnhancements.createProgressiveLoadingState([
    fastQuery,
    slowQuery,
    errorQuery,
    backgroundQuery,
  ], [
    'Loading user data...',
    'Fetching dashboard metrics...',
    'Validating permissions...',
    'Loading additional content...',
  ]);

  // Optimistic mutation demo
  const optimisticMutation = useOptimisticMutation({
    mutationFn: async (newItem: { name: string; value: number }) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        id: Date.now(),
        ...newItem,
      };
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['demo', 'items'] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(['demo', 'items']);

      // Optimistically update
      queryClient.setQueryData(['demo', 'items'], (old: any[] | undefined) => {
        const newItem = { id: 'temp-' + Date.now(), ...variables };
        return old ? [...old, newItem] : [newItem];
      });

      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['demo', 'items'], context.previousItems);
      }
    },
    onSuccess: (data, _variables, context) => {
      // Replace temp item with real data
      queryClient.setQueryData(['demo', 'items'], (old: any[] | undefined) => {
        if (!old) return [data];
        return old.map(item => 
          item.id.toString().startsWith('temp-') ? data : item
        );
      });
    },
    successMessage: 'Item added successfully!',
    errorMessage: 'Failed to add item. Please try again.',
  });

  const demoItems = useQuery({
    queryKey: ['demo', 'items'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        { id: 1, name: 'Existing Item 1', value: 50 },
        { id: 2, name: 'Existing Item 2', value: 75 },
      ];
    },
    ...queryOptimization.createQueryOptions('medium'),
  });

  const renderDemo = () => {
    switch (selectedDemo) {
      case 'smart-loading':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Smart Loading States</h3>
            <p className="text-sm text-gray-600">
              Demonstrates priority-based loading where critical queries determine the main loading state,
              while background queries load independently.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Loading State</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Main Loading:</span>
                    <Badge variant={smartLoadingState.isLoading ? 'default' : 'secondary'}>
                      {smartLoadingState.isLoading ? 'Loading' : 'Ready'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Background:</span>
                    <Badge variant={smartLoadingState.isBackgroundLoading ? 'default' : 'secondary'}>
                      {smartLoadingState.isBackgroundLoading ? 'Loading' : 'Ready'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Refreshing:</span>
                    <Badge variant={smartLoadingState.isBackgroundRefreshing ? 'default' : 'secondary'}>
                      {smartLoadingState.isBackgroundRefreshing ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {smartLoadingState.errorType && (
                    <div className="flex justify-between text-xs">
                      <span>Error Type:</span>
                      <Badge variant="destructive">{smartLoadingState.errorType}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Query States</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {smartLoadingState.allStates.map((state, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span>Query {index + 1}:</span>
                      <div className="flex space-x-1">
                        {state.isPriority && <Badge variant="outline" className="text-xs">Priority</Badge>}
                        {state.isBackground && <Badge variant="outline" className="text-xs">Background</Badge>}
                        <Badge variant={
                          state.isLoading ? 'default' : 
                          state.isError ? 'destructive' : 
                          'secondary'
                        }>
                          {state.isLoading ? 'Loading' : state.isError ? 'Error' : 'Success'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <LoadingStateHandler
              loadingState={smartLoadingState}
              onRetry={() => {
                fastQuery.refetch();
                slowQuery.refetch();
                errorQuery.refetch();
              }}
              loadingComponent={
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-2 text-sm text-gray-600">Loading priority data...</p>
                  </div>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Fast Query</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {fastQuery.data && (
                      <div className="text-sm">
                        <p>Name: {fastQuery.data.name}</p>
                        <p>Value: {fastQuery.data.value.toFixed(2)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Slow Query</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {slowQuery.data && (
                      <div className="text-sm">
                        <p>Name: {slowQuery.data.name}</p>
                        <p>Value: {slowQuery.data.value.toFixed(2)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </LoadingStateHandler>

            {smartLoadingState.isBackgroundLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-blue-700">Loading background data...</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'progressive-loading':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Progressive Loading</h3>
            <p className="text-sm text-gray-600">
              Shows loading progress across multiple queries with stage indicators.
            </p>

            <ProgressIndicator
              steps={[
                'Loading user data...',
                'Fetching dashboard metrics...',
                'Validating permissions...',
                'Loading additional content...',
              ]}
              currentStep={progressiveLoadingState.currentStage}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Progress Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progress:</span>
                  <span>{progressiveLoadingState.progress.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Completed:</span>
                  <span>{progressiveLoadingState.completedQueries} / {progressiveLoadingState.totalQueries}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Current Stage:</span>
                  <span>{progressiveLoadingState.stageText}</span>
                </div>
              </CardContent>
            </Card>

            {progressiveLoadingState.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">All data loaded successfully!</p>
              </div>
            )}
          </div>
        );

      case 'optimistic-updates':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Optimistic Updates</h3>
            <p className="text-sm text-gray-600">
              Demonstrates optimistic updates with automatic rollback on errors.
            </p>

            <div className="flex space-x-2">
              <LoadingButton
                isLoading={optimisticMutation.isPending}
                onClick={() => optimisticMutation.mutate({
                  name: `New Item ${Date.now()}`,
                  value: Math.random() * 100,
                })}
                loadingText="Adding..."
              >
                Add Item (Optimistic)
              </LoadingButton>

              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['demo', 'items'] })}
              >
                Refresh Items
              </Button>
            </div>

            <DataWrapper
              data={demoItems.data}
              loadingState={loadingStateEnhancements.createEnhancedLoadingState(demoItems)}
              onRetry={() => demoItems.refetch()}
              emptyMessage="No items found"
            >
              {(items) => (
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-gray-600">Value: {item.value.toFixed(2)}</p>
                          </div>
                          {item.id.toString().startsWith('temp-') && (
                            <Badge variant="outline" className="text-xs">
                              Pending...
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DataWrapper>
          </div>
        );

      case 'error-handling':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Enhanced Error Handling</h3>
            <p className="text-sm text-gray-600">
              Shows intelligent error categorization and retry strategies.
            </p>

            <div className="space-x-2">
              <Button onClick={() => errorQuery.refetch()}>
                Trigger Error Query
              </Button>
              <Button 
                variant="outline"
                onClick={() => queryClient.resetQueries({ queryKey: ['demo', 'error'] })}
              >
                Reset Query
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Query State</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Status:</span>
                  <Badge variant={
                    errorQuery.isLoading ? 'default' : 
                    errorQuery.isError ? 'destructive' : 
                    'secondary'
                  }>
                    {errorQuery.isLoading ? 'Loading' : errorQuery.isError ? 'Error' : 'Success'}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Retry Count:</span>
                  <span>{errorQuery.failureCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Can Retry:</span>
                  <Badge variant={errorQuery.isError ? 'default' : 'secondary'}>
                    {errorQuery.isError ? 'Yes' : 'N/A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {errorQuery.isError && (
              <ErrorDisplay
                error={errorQuery.error as Error}
                onRetry={() => errorQuery.refetch()}
              />
            )}

            {errorQuery.isSuccess && errorQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Success Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>Name: {errorQuery.data.name}</p>
                    <p>Value: {errorQuery.data.value.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">React Query Optimization Demo</h2>
        <p className="text-gray-600">
          Interactive demonstration of React Query optimizations including smart loading states,
          progressive loading, optimistic updates, and enhanced error handling.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'smart-loading', label: 'Smart Loading' },
          { id: 'progressive-loading', label: 'Progressive Loading' },
          { id: 'optimistic-updates', label: 'Optimistic Updates' },
          { id: 'error-handling', label: 'Error Handling' },
        ].map((demo) => (
          <Button
            key={demo.id}
            variant={selectedDemo === demo.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDemo(demo.id)}
          >
            {demo.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {renderDemo()}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Smart Loading: Priority queries determine main loading state, background queries load independently</p>
        <p>• Progressive Loading: Shows loading progress across multiple queries with stage indicators</p>
        <p>• Optimistic Updates: UI updates immediately with automatic rollback on errors</p>
        <p>• Error Handling: Intelligent error categorization with appropriate retry strategies</p>
      </div>
    </div>
  );
}