'use client';

import React, { useState } from 'react';
import { 
  useAPICall, 
  useAPIErrorHandler, 
  useAPIHealthMonitor,
  useBatchAPICall 
} from '@/hooks/use-api-error-handler';
import { 
  APIErrorDisplay, 
  APIErrorList, 
  APIErrorStats, 
  APIHealthIndicator 
} from '@/components/ui/api-error-display';
import { checkSupabaseHealth } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock API functions for demonstration
const mockSuccessAPI = async (delay: number = 1000): Promise<{ message: string; timestamp: Date }> => {
  await new Promise(resolve => setTimeout(resolve, delay));
  return { message: 'Success!', timestamp: new Date() };
};

const mockNetworkErrorAPI = async (): Promise<never> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  throw new Error('Failed to fetch');
};

const mockValidationErrorAPI = async (): Promise<never> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const error = new Error('Validation failed');
  (error as any).code = 'VALIDATION_ERROR';
  throw error;
};

const mockAuthErrorAPI = async (): Promise<never> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const error = new Error('Unauthorized access');
  (error as any).code = 'UNAUTHORIZED';
  throw error;
};

const mockServerErrorAPI = async (): Promise<never> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const error = new Error('Internal server error');
  (error as any).code = 'SERVER_ERROR';
  throw error;
};

const mockRandomErrorAPI = async (): Promise<{ message: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const random = Math.random();
  if (random < 0.3) {
    throw new Error('Network timeout');
  } else if (random < 0.6) {
    const error = new Error('Server overloaded');
    (error as any).code = 'SERVER_ERROR';
    throw error;
  } else if (random < 0.8) {
    const error = new Error('Invalid request');
    (error as any).code = 'VALIDATION_ERROR';
    throw error;
  }
  
  return { message: 'Random success!' };
};

export function APIErrorHandlingDemo() {
  const [selectedTab, setSelectedTab] = useState('single');
  
  // Error handler for global error tracking
  const { errorHistory, clearErrorHistory, getErrorStats } = useAPIErrorHandler();
  
  // Health monitoring
  const healthMonitor = useAPIHealthMonitor(checkSupabaseHealth, {
    interval: 30000, // Check every 30 seconds
    onHealthChange: (isHealthy) => {
      console.log('Health status changed:', isHealthy);
    },
  });
  
  // Single API calls
  const successCall = useAPICall(mockSuccessAPI, {
    retryConfig: { maxRetries: 2 },
    onSuccess: (data) => console.log('Success:', data),
    onError: (error) => console.log('Error:', error),
  });
  
  const networkErrorCall = useAPICall(mockNetworkErrorAPI, {
    retryConfig: { maxRetries: 3 },
    onRetry: (error, attempt) => console.log(`Retrying network call, attempt ${attempt + 1}`),
  });
  
  const validationErrorCall = useAPICall(mockValidationErrorAPI, {
    retryConfig: { maxRetries: 1 },
  });
  
  const authErrorCall = useAPICall(mockAuthErrorAPI, {
    retryConfig: { maxRetries: 0 }, // Don't retry auth errors
  });
  
  const serverErrorCall = useAPICall(mockServerErrorAPI, {
    retryConfig: { maxRetries: 3 },
    enableCircuitBreaker: true,
    circuitBreakerOptions: {
      failureThreshold: 3,
      resetTimeout: 10000,
    },
  });
  
  // Batch API calls
  const batchCall = useBatchAPICall(mockRandomErrorAPI, {
    maxConcurrent: 3,
    retryConfig: { maxRetries: 2 },
    onComplete: (results) => {
      console.log('Batch completed:', results);
    },
  });
  
  const errorStats = getErrorStats();
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          API Error Handling System Demo
        </h1>
        <p className="text-gray-600">
          Comprehensive error handling with retry mechanisms and user-friendly messages
        </p>
      </div>
      
      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            API Health Status
            <APIHealthIndicator 
              health={healthMonitor.health}
              stats={healthMonitor.getHealthStats()}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {healthMonitor.health?.latency || 0}ms
              </div>
              <div className="text-sm text-gray-500">Current Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {healthMonitor.getHealthStats()?.uptime.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {healthMonitor.getHealthStats()?.totalChecks || 0}
              </div>
              <div className="text-sm text-gray-500">Total Checks</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single">Single Calls</TabsTrigger>
          <TabsTrigger value="batch">Batch Calls</TabsTrigger>
          <TabsTrigger value="errors">Error History</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Success Call */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Success Call</CardTitle>
                <CardDescription>
                  Always succeeds after a delay
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => successCall.execute(1000)}
                  disabled={successCall.loading}
                  className="w-full"
                >
                  {successCall.loading ? 'Loading...' : 'Call Success API'}
                </Button>
                
                {successCall.data && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <strong>Success:</strong> {successCall.data.message}
                  </div>
                )}
                
                {successCall.error && (
                  <APIErrorDisplay
                    error={successCall.error}
                    onRetry={() => successCall.execute(1000)}
                    retryCount={successCall.retryCount}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Network Error Call */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Error</CardTitle>
                <CardDescription>
                  Simulates network failures with retry
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => networkErrorCall.execute()}
                  disabled={networkErrorCall.loading}
                  className="w-full"
                  variant="destructive"
                >
                  {networkErrorCall.loading ? 'Loading...' : 'Trigger Network Error'}
                </Button>
                
                {networkErrorCall.error && (
                  <APIErrorDisplay
                    error={networkErrorCall.error}
                    onRetry={() => networkErrorCall.execute()}
                    retryCount={networkErrorCall.retryCount}
                    maxRetries={3}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Validation Error Call */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Validation Error</CardTitle>
                <CardDescription>
                  Non-retryable validation error
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => validationErrorCall.execute()}
                  disabled={validationErrorCall.loading}
                  className="w-full"
                  variant="destructive"
                >
                  {validationErrorCall.loading ? 'Loading...' : 'Trigger Validation Error'}
                </Button>
                
                {validationErrorCall.error && (
                  <APIErrorDisplay
                    error={validationErrorCall.error}
                    onRetry={() => validationErrorCall.execute()}
                    retryCount={validationErrorCall.retryCount}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Auth Error Call */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auth Error</CardTitle>
                <CardDescription>
                  Authentication error (no retry)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => authErrorCall.execute()}
                  disabled={authErrorCall.loading}
                  className="w-full"
                  variant="destructive"
                >
                  {authErrorCall.loading ? 'Loading...' : 'Trigger Auth Error'}
                </Button>
                
                {authErrorCall.error && (
                  <APIErrorDisplay
                    error={authErrorCall.error}
                    retryCount={authErrorCall.retryCount}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Server Error with Circuit Breaker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Server Error</CardTitle>
                <CardDescription>
                  With circuit breaker protection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => serverErrorCall.execute()}
                  disabled={serverErrorCall.loading}
                  className="w-full"
                  variant="destructive"
                >
                  {serverErrorCall.loading ? 'Loading...' : 'Trigger Server Error'}
                </Button>
                
                {serverErrorCall.error && (
                  <APIErrorDisplay
                    error={serverErrorCall.error}
                    onRetry={() => serverErrorCall.execute()}
                    retryCount={serverErrorCall.retryCount}
                  />
                )}
                
                {serverErrorCall.getCircuitBreakerState && (
                  <div className="text-xs text-gray-500">
                    Circuit Breaker: {serverErrorCall.getCircuitBreakerState()?.state}
                    {(serverErrorCall.getCircuitBreakerState()?.failures ?? 0) > 0 && (
                      <span> ({serverErrorCall.getCircuitBreakerState()?.failures} failures)</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch API Calls</CardTitle>
              <CardDescription>
                Execute multiple API calls with individual error handling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  onClick={() => {
                    const calls = Array(5).fill(null).map((_, i) => [] as []);
                    batchCall.executeBatch(calls);
                  }}
                  disabled={batchCall.loading}
                >
                  {batchCall.loading ? 'Processing...' : 'Execute 5 Random Calls'}
                </Button>
                
                <Button
                  onClick={() => {
                    const calls = Array(10).fill(null).map((_, i) => [] as []);
                    batchCall.executeBatch(calls);
                  }}
                  disabled={batchCall.loading}
                  variant="outline"
                >
                  Execute 10 Random Calls
                </Button>
              </div>
              
              {batchCall.loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{batchCall.progress.completed}/{batchCall.progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(batchCall.progress.completed / batchCall.progress.total) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              {batchCall.results.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {batchCall.getStats().successful}
                      </div>
                      <div className="text-gray-500">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {batchCall.getStats().failed}
                      </div>
                      <div className="text-gray-500">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {batchCall.getStats().successRate.toFixed(1)}%
                      </div>
                      <div className="text-gray-500">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {batchCall.getStats().totalRetries}
                      </div>
                      <div className="text-gray-500">Total Retries</div>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {batchCall.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Call #{index + 1}</span>
                        {result.success ? (
                          <span className="text-green-600 text-sm">✓ Success</span>
                        ) : (
                          <span className="text-red-600 text-sm">✗ {result.error?.code}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Error History
                <Button
                  onClick={clearErrorHistory}
                  variant="outline"
                  size="sm"
                >
                  Clear History
                </Button>
              </CardTitle>
              <CardDescription>
                Recent errors from all API calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorHistory.length > 0 ? (
                <APIErrorList
                  errors={errorHistory}
                  maxVisible={10}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No errors recorded yet. Try triggering some API calls above.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <APIErrorStats stats={errorStats} />
            
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <APIHealthIndicator 
                  health={healthMonitor.health}
                  stats={healthMonitor.getHealthStats()}
                />
                
                {healthMonitor.history.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Health Checks</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {healthMonitor.history.slice(0, 10).map((check, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span>{check.timestamp.toLocaleTimeString()}</span>
                          <div className="flex items-center space-x-2">
                            <span className={check.isHealthy ? 'text-green-600' : 'text-red-600'}>
                              {check.isHealthy ? '✓' : '✗'}
                            </span>
                            <span>{check.latency}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}