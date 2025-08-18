'use client';

import React, { useEffect, useState, memo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient, performanceOptimization } from './react-query';
import { setupPerformanceMonitoring, ReactQueryDevtoolsConfig } from './react-query-devtools';
import { PERFORMANCE_CONFIG, checkPerformanceBudget } from './performance-config';

// Enhanced React Query Provider with optimizations
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    // Setup performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      setupPerformanceMonitoring();
      
      // Enhanced performance tracking
      const performanceInterval = setInterval(() => {
        const metrics = performanceOptimization.analyzeQueryPerformance();
        const memoryStats = performanceOptimization.monitorMemoryUsage();
        
        setPerformanceMetrics({
          ...metrics,
          memory: memoryStats,
          timestamp: Date.now(),
        });
      }, 10000); // Update every 10 seconds

      return () => clearInterval(performanceInterval);
    }
  }, []);

  useEffect(() => {
    // Setup automatic cache optimization with enhanced cleanup
    const cleanupOptimization = performanceOptimization.setupAutomaticOptimization();
    
    // Setup error recovery with better handling
    const cleanupErrorRecovery = performanceOptimization.setupErrorRecovery();

    // Enhanced memory management
    const memoryCleanupInterval = setInterval(() => {
      const cleanupResults = performanceOptimization.performAdvancedCleanup();
      
      if (process.env.NODE_ENV === 'development' && cleanupResults.totalRemoved > 0) {
        console.log('Advanced cache cleanup performed:', cleanupResults);
      }
    }, 15 * 60 * 1000); // Every 15 minutes

    // Cleanup on unmount
    return () => {
      cleanupOptimization();
      cleanupErrorRecovery();
      clearInterval(memoryCleanupInterval);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          {...ReactQueryDevtoolsConfig.enhancedOptions}
        />
      )}
    </QueryClientProvider>
  );
}

// Hook to access query client with type safety
export function useQueryClient() {
  const client = React.useContext(QueryClientProvider as any);
  if (!client) {
    throw new Error('useQueryClient must be used within a ReactQueryProvider');
  }
  return client;
}

// Enhanced performance monitoring component for development
export function QueryPerformanceMonitor() {
  const [stats, setStats] = useState<any>(null);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const updateStats = () => {
      const performance = performanceOptimization.analyzeQueryPerformance();
      const memory = performanceOptimization.monitorMemoryUsage();
      setStats(performance);
      setMemoryStats(memory);
    };

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development' || !stats) {
    return null;
  }

  const getHealthColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Query Performance</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Total Queries:</span>
          <span className="font-mono">{stats.totalQueries}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Slow Queries:</span>
          <span className={getHealthColor(stats.slowQueries.length, { good: 0, warning: 2 })}>
            {stats.slowQueries.length}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Error Queries:</span>
          <span className={getHealthColor(stats.errorQueries.length, { good: 0, warning: 1 })}>
            {stats.errorQueries.length}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Stale Queries:</span>
          <span className={getHealthColor(stats.staleQueries.length, { good: 5, warning: 15 })}>
            {stats.staleQueries.length}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Memory Usage:</span>
          <span className={getHealthColor(memoryStats.totalMemoryUsage / 1024 / 1024, { good: 2, warning: 5 })}>
            {(memoryStats.totalMemoryUsage / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>

        {isExpanded && (
          <>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span>Active Queries:</span>
                <span className="font-mono">{stats.activeQueries || 0}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Fetching:</span>
                <span className="font-mono">{stats.fetchingQueries.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Avg Query Size:</span>
                <span className="font-mono">
                  {(memoryStats.averageQuerySize / 1024).toFixed(1)} KB
                </span>
              </div>
              
              {memoryStats.largestQueries.length > 0 && (
                <div className="mt-2">
                  <div className="text-yellow-700 font-medium">Largest Query:</div>
                  <div className="text-yellow-600 font-mono text-xs truncate">
                    {JSON.stringify(memoryStats.largestQueries[0]?.queryKey).slice(0, 30)}...
                  </div>
                  <div className="text-yellow-600 text-xs">
                    {(memoryStats.largestQueries[0]?.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {stats.recommendations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-yellow-700 font-medium">Recommendations:</div>
            <ul className="mt-1 space-y-1">
              {stats.recommendations.slice(0, isExpanded ? 5 : 2).map((rec: string, i: number) => (
                <li key={i} className="text-yellow-600 text-xs">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Query cache inspector for development
export function QueryCacheInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [cacheData, setCacheData] = useState<any[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !isOpen) return;

    const updateCacheData = () => {
      const { devUtils } = require('./react-query-devtools');
      const info = devUtils.getCacheInfo();
      setCacheData(info.queryDetails.slice(0, 20)); // Show top 20 queries
    };

    updateCacheData();
    const interval = setInterval(updateCacheData, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm z-50"
      >
        Cache Inspector
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Query Cache Inspector</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {cacheData.map((query, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-mono text-sm text-blue-600">
                      {JSON.stringify(query.queryKey)}
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        query.status === 'success' ? 'bg-green-100 text-green-800' :
                        query.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {query.status}
                      </span>
                      {query.isStale && (
                        <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                          Stale
                        </span>
                      )}
                      {query.isFetching && (
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          Fetching
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Observers:</span> {query.observersCount}
                    </div>
                    <div>
                      <span className="font-medium">Data Size:</span> {(query.dataSize / 1024).toFixed(2)} KB
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {
                        query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString() : 'Never'
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export the provider as default
export default ReactQueryProvider;