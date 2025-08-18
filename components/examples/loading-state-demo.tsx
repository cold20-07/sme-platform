'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  LoadingSpinner, 
  EnhancedCardSkeleton, 
  MetricsSkeleton, 
  ChartSkeleton,
  LoadingButton,
  DataWrapper,
  ProgressIndicator,
  SmartLoadingWrapper,
  OperationLoadingIndicator
} from '@/components/ui/loading-states';
import { useAsyncOperation, useAsyncOperations, usePaginatedAsyncOperation } from '@/hooks/use-async-operation';
import { useEnhancedLoading, useEnhancedLoadingMultiple, useProgressiveLoading } from '@/hooks/use-enhanced-loading';
import { useLoadingState, useGlobalLoadingState } from '@/lib/loading-state-context';
import { queryKeys } from '@/lib/react-query';

// Mock API functions
const mockApiCall = (delay: number, shouldFail = false): Promise<{ data: string; timestamp: number }> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Mock API call failed'));
      } else {
        resolve({ data: `Mock data loaded at ${new Date().toLocaleTimeString()}`, timestamp: Date.now() });
      }
    }, delay);
  });
};

const mockPaginatedApiCall = (page: number, pageSize: number, delay: number = 1000) => {
  return new Promise<{ data: Array<{ id: string; name: string }>; hasMore: boolean; total: number }>((resolve) => {
    setTimeout(() => {
      const startIndex = (page - 1) * pageSize;
      const data = Array.from({ length: pageSize }, (_, i) => ({
        id: `item-${startIndex + i + 1}`,
        name: `Item ${startIndex + i + 1}`,
      }));
      
      resolve({
        data,
        hasMore: page < 5, // Mock 5 pages total
        total: 100,
      });
    }, delay);
  });
};

// Basic loading states demo
function BasicLoadingDemo() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [skeletonType, setSkeletonType] = useState<'card' | 'metrics' | 'chart'>('card');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Loading Components</CardTitle>
        <CardDescription>
          Demonstrates basic loading spinners and skeleton components
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="default" />
          <LoadingSpinner size="lg" />
        </div>

        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button
              variant={skeletonType === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSkeletonType('card')}
            >
              Card
            </Button>
            <Button
              variant={skeletonType === 'metrics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSkeletonType('metrics')}
            >
              Metrics
            </Button>
            <Button
              variant={skeletonType === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSkeletonType('chart')}
            >
              Chart
            </Button>
          </div>
          
          <Button onClick={() => setShowSkeleton(!showSkeleton)}>
            {showSkeleton ? 'Hide' : 'Show'} Skeleton
          </Button>
        </div>

        {showSkeleton && (
          <div className="space-y-4">
            {skeletonType === 'card' && (
              <EnhancedCardSkeleton showAvatar showActions lines={3} />
            )}
            {skeletonType === 'metrics' && (
              <MetricsSkeleton count={4} />
            )}
            {skeletonType === 'chart' && (
              <ChartSkeleton height={200} />
            )}
          </div>
        )}

        <ProgressIndicator
          steps={['Loading data', 'Processing', 'Rendering']}
          currentStep={1}
        />
      </CardContent>
    </Card>
  );
}

// Async operation demo
function AsyncOperationDemo() {
  const fastOperation = useAsyncOperation({
    id: 'fast-operation',
    label: 'Fast Operation',
    category: 'other',
    priority: 'medium',
    showSuccessToast: true,
    successMessage: 'Fast operation completed!',
  });

  const slowOperation = useAsyncOperation({
    id: 'slow-operation',
    label: 'Slow Operation',
    category: 'other',
    priority: 'high',
    showSuccessToast: true,
    successMessage: 'Slow operation completed!',
    retryable: true,
    maxRetries: 3,
  });

  const multipleOperations = useAsyncOperations({
    operation1: {
      id: 'multi-op-1',
      label: 'Operation 1',
      category: 'other',
      priority: 'medium',
    },
    operation2: {
      id: 'multi-op-2',
      label: 'Operation 2',
      category: 'other',
      priority: 'medium',
    },
    operation3: {
      id: 'multi-op-3',
      label: 'Operation 3',
      category: 'other',
      priority: 'medium',
    },
  });

  const handleFastOperation = () => {
    fastOperation.execute(async () => {
      return mockApiCall(1000);
    });
  };

  const handleSlowOperation = () => {
    slowOperation.execute(async (signal) => {
      return mockApiCall(5000);
    });
  };

  const handleMultipleOperations = () => {
    multipleOperations.executeAll({
      operation1: async () => mockApiCall(1000),
      operation2: async () => mockApiCall(2000),
      operation3: async () => mockApiCall(1500),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Async Operations</CardTitle>
        <CardDescription>
          Demonstrates async operation management with loading states
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <LoadingButton
              isLoading={fastOperation.isLoading}
              onClick={handleFastOperation}
              loadingText="Loading..."
            >
              Fast Operation (1s)
            </LoadingButton>
            {fastOperation.isError && (
              <p className="text-sm text-red-600">Error: {fastOperation.error?.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <LoadingButton
              isLoading={slowOperation.isLoading}
              onClick={handleSlowOperation}
              loadingText="Loading..."
            >
              Slow Operation (5s)
            </LoadingButton>
            {slowOperation.canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => slowOperation.retry(async () => mockApiCall(5000))}
              >
                Retry ({slowOperation.retryCount}/3)
              </Button>
            )}
            {slowOperation.isError && (
              <p className="text-sm text-red-600">Error: {slowOperation.error?.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <LoadingButton
              isLoading={multipleOperations.isAnyLoading}
              onClick={handleMultipleOperations}
              loadingText="Loading..."
            >
              Multiple Operations
            </LoadingButton>
            <div className="text-xs text-gray-600">
              Loading: {Object.values(multipleOperations.operations).filter(op => op.isLoading).length}/3
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <OperationLoadingIndicator operationId="fast-operation" />
          <OperationLoadingIndicator operationId="slow-operation" />
          <OperationLoadingIndicator operationId="multi-op-1" />
          <OperationLoadingIndicator operationId="multi-op-2" />
          <OperationLoadingIndicator operationId="multi-op-3" />
        </div>
      </CardContent>
    </Card>
  );
}

// React Query integration demo
function ReactQueryDemo() {
  const queryClient = useQueryClient();
  
  const fastQuery = useQuery({
    queryKey: ['demo-fast'],
    queryFn: () => mockApiCall(1000),
    enabled: false,
  });

  const slowQuery = useQuery({
    queryKey: ['demo-slow'],
    queryFn: () => mockApiCall(3000),
    enabled: false,
  });

  const failingQuery = useQuery({
    queryKey: ['demo-failing'],
    queryFn: () => mockApiCall(1000, true),
    enabled: false,
    retry: 2,
  });

  const enhancedFast = useEnhancedLoading(fastQuery, {
    operationId: 'enhanced-fast',
    label: 'Enhanced Fast Query',
    category: 'query',
    priority: 'medium',
  });

  const enhancedMultiple = useEnhancedLoadingMultiple(
    { fast: fastQuery, slow: slowQuery },
    {
      operationId: 'enhanced-multiple',
      label: 'Multiple Queries',
      category: 'query',
      priority: 'high',
      combineStrategy: 'all',
    }
  );

  const progressiveQueries = useProgressiveLoading(
    [
      { name: 'Loading basic data', queries: ['fast'], required: true },
      { name: 'Loading detailed data', queries: ['slow'], required: true },
      { name: 'Loading optional data', queries: ['failing'], required: false },
    ],
    { fast: fastQuery, slow: slowQuery, failing: failingQuery },
    {
      operationId: 'progressive-loading',
      label: 'Progressive Loading',
      category: 'query',
      priority: 'high',
    }
  );

  const mutation = useMutation({
    mutationFn: () => mockApiCall(2000),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo'] });
    },
  });

  const enhancedMutation = useEnhancedLoading(mutation, {
    operationId: 'enhanced-mutation',
    label: 'Enhanced Mutation',
    category: 'mutation',
    priority: 'high',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>React Query Integration</CardTitle>
        <CardDescription>
          Demonstrates enhanced loading states with React Query
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Button onClick={() => fastQuery.refetch()}>
              Trigger Fast Query
            </Button>
            <Button onClick={() => slowQuery.refetch()}>
              Trigger Slow Query
            </Button>
            <Button onClick={() => failingQuery.refetch()}>
              Trigger Failing Query
            </Button>
            <Button onClick={() => mutation.mutate()}>
              Trigger Mutation
            </Button>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => {
                fastQuery.refetch();
                slowQuery.refetch();
              }}
            >
              Trigger Multiple Queries
            </Button>
            <Button 
              onClick={() => {
                fastQuery.refetch();
                slowQuery.refetch();
                failingQuery.refetch();
              }}
            >
              Trigger Progressive Loading
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Enhanced Single Query</h4>
            <div className="text-sm space-y-1">
              <div>Status: <Badge variant={enhancedFast.isLoading ? 'default' : enhancedFast.isError ? 'destructive' : 'secondary'}>
                {enhancedFast.isLoading ? 'Loading' : enhancedFast.isError ? 'Error' : 'Idle'}
              </Badge></div>
              {enhancedFast.duration > 0 && <div>Duration: {enhancedFast.duration}ms</div>}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Enhanced Multiple Queries</h4>
            <div className="text-sm space-y-1">
              <div>Status: <Badge variant={enhancedMultiple.isLoading ? 'default' : enhancedMultiple.isError ? 'destructive' : 'secondary'}>
                {enhancedMultiple.isLoading ? 'Loading' : enhancedMultiple.isError ? 'Error' : 'Idle'}
              </Badge></div>
              <div>Loading: {enhancedMultiple.loadingCount}/2</div>
              <div>Success: {enhancedMultiple.successCount}/2</div>
              <div>Errors: {enhancedMultiple.errorCount}/2</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Progressive Loading</h4>
            <div className="text-sm space-y-1">
              <div>Current Stage: {progressiveQueries.currentStage + 1}/3</div>
              <div>Stage: {progressiveQueries.stage}</div>
              <div>Overall Progress: {Math.round(progressiveQueries.overallProgress)}%</div>
              <div>Stage Progress: {Math.round(progressiveQueries.stageProgress)}%</div>
            </div>
            <div className="mt-2 space-y-1">
              {progressiveQueries.stageStates.map((stage, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Badge variant={stage.isComplete ? 'default' : stage.isLoading ? 'secondary' : 'outline'}>
                    {stage.name}
                  </Badge>
                  <span className="text-xs">{Math.round(stage.progress)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Paginated loading demo
function PaginatedLoadingDemo() {
  const paginatedOperation = usePaginatedAsyncOperation({
    id: 'paginated-demo',
    label: 'Loading paginated data',
    category: 'query',
    priority: 'medium',
    pageSize: 10,
  });

  const loadFirstPage = () => {
    paginatedOperation.loadPage(mockPaginatedApiCall, 1);
  };

  const loadNextPage = () => {
    paginatedOperation.loadNext(mockPaginatedApiCall);
  };

  const refresh = () => {
    paginatedOperation.refresh(mockPaginatedApiCall);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paginated Loading</CardTitle>
        <CardDescription>
          Demonstrates paginated data loading with loading states
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <LoadingButton
            isLoading={paginatedOperation.isLoading}
            onClick={loadFirstPage}
          >
            Load First Page
          </LoadingButton>
          <LoadingButton
            isLoading={paginatedOperation.isLoading}
            onClick={loadNextPage}
            disabled={!paginatedOperation.hasMore}
          >
            Load Next Page
          </LoadingButton>
          <Button onClick={refresh} variant="outline">
            Refresh
          </Button>
        </div>

        <div className="text-sm space-y-1">
          <div>Current Page: {paginatedOperation.currentPage}</div>
          <div>Has More: {paginatedOperation.hasMore ? 'Yes' : 'No'}</div>
          <div>Total Items: {paginatedOperation.allData.length}</div>
        </div>

        {paginatedOperation.allData.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Loaded Items:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {paginatedOperation.allData.map((item) => (
                <div key={item.id} className="p-2 bg-gray-100 rounded text-sm">
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Global loading state demo
function GlobalLoadingStateDemo() {
  const { state, startOperation, completeOperation, clearAll } = useLoadingState();
  const globalState = useGlobalLoadingState();

  const startCriticalOperation = () => {
    startOperation({
      id: 'critical-demo',
      label: 'Critical Operation',
      category: 'other',
      priority: 'critical',
      cancellable: true,
      onCancel: () => completeOperation('critical-demo'),
    });

    setTimeout(() => {
      completeOperation('critical-demo');
    }, 5000);
  };

  const startBackgroundOperation = () => {
    startOperation({
      id: 'background-demo',
      label: 'Background Operation',
      category: 'other',
      priority: 'low',
    });

    setTimeout(() => {
      completeOperation('background-demo');
    }, 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Loading State</CardTitle>
        <CardDescription>
          Demonstrates global loading state management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button onClick={startCriticalOperation}>
            Start Critical Operation
          </Button>
          <Button onClick={startBackgroundOperation}>
            Start Background Operation
          </Button>
          <Button onClick={clearAll} variant="outline">
            Clear All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Global State</h4>
            <div className="text-sm space-y-1">
              <div>Is Global Loading: <Badge variant={globalState.isGlobalLoading ? 'default' : 'secondary'}>
                {globalState.isGlobalLoading ? 'Yes' : 'No'}
              </Badge></div>
              <div>Operation Count: {globalState.operationCount}</div>
              <div>Critical Operations: {globalState.criticalOperations.length}</div>
              <div>Background Operations: {globalState.backgroundOperations.length}</div>
              <div>Has Errors: {globalState.hasErrors ? 'Yes' : 'No'}</div>
              {globalState.currentStage && <div>Current Stage: {globalState.currentStage}</div>}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Active Operations</h4>
            <div className="space-y-1">
              {Array.from(state.operations.values()).map((operation) => (
                <div key={operation.id} className="text-sm p-2 bg-gray-100 rounded">
                  <div className="font-medium">{operation.label}</div>
                  <div className="text-xs text-gray-600">
                    Priority: {operation.priority} | Category: {operation.category}
                  </div>
                  {operation.progress && (
                    <div className="text-xs">Progress: {Math.round(operation.progress)}%</div>
                  )}
                </div>
              ))}
              {state.operations.size === 0 && (
                <div className="text-sm text-gray-500">No active operations</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoadingStateDemo() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Loading State Management Demo</h1>
        <p className="text-gray-600">
          Comprehensive demonstration of the enhanced loading state management system
        </p>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="async">Async Ops</TabsTrigger>
          <TabsTrigger value="react-query">React Query</TabsTrigger>
          <TabsTrigger value="paginated">Paginated</TabsTrigger>
          <TabsTrigger value="global">Global State</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicLoadingDemo />
        </TabsContent>

        <TabsContent value="async">
          <AsyncOperationDemo />
        </TabsContent>

        <TabsContent value="react-query">
          <ReactQueryDemo />
        </TabsContent>

        <TabsContent value="paginated">
          <PaginatedLoadingDemo />
        </TabsContent>

        <TabsContent value="global">
          <GlobalLoadingStateDemo />
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Loading Wrapper Example</CardTitle>
            </CardHeader>
            <CardContent>
              <SmartLoadingWrapper
                operationId="wrapper-demo"
                label="Loading wrapper content"
                category="other"
                priority="medium"
                loadingComponent={<EnhancedCardSkeleton />}
              >
                <div className="p-4 bg-green-50 rounded">
                  Content loaded successfully!
                </div>
              </SmartLoadingWrapper>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Wrapper Example</CardTitle>
            </CardHeader>
            <CardContent>
              <DataWrapper
                data={['Item 1', 'Item 2', 'Item 3']}
                loadingState={{
                  isLoading: false,
                  isError: false,
                  error: null,
                  isSuccess: true,
                  isFetching: false,
                  isRefetching: false,
                  isPending: false,
                  isStale: false,
                }}
                emptyMessage="No items found"
              >
                {(data) => (
                  <div className="space-y-2">
                    {data.map((item, index) => (
                      <div key={index} className="p-2 bg-blue-50 rounded">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </DataWrapper>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}