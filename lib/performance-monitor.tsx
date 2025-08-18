'use client';
import { useEffect, useState, useCallback } from 'react';

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 16) { // More than one frame (16ms)
          console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      };
    }
  }, [componentName]);
}

// Bundle size monitoring
export function useBundleAnalyzer() {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number;
    gzipSize: number;
    chunks: Array<{ name: string; size: number }>;
  } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Mock bundle analysis - in real implementation, this would come from webpack stats
      const mockBundleInfo = {
        totalSize: 2.1 * 1024 * 1024, // 2.1MB
        gzipSize: 650 * 1024, // 650KB
        chunks: [
          { name: 'main', size: 800 * 1024 },
          { name: 'vendors', size: 900 * 1024 },
          { name: 'ui-components', size: 200 * 1024 },
          { name: 'dashboard-components', size: 150 * 1024 },
          { name: 'charts', size: 50 * 1024 },
        ],
      };
      
      setBundleInfo(mockBundleInfo);
    }
  }, []);

  return bundleInfo;
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  const updateMemoryInfo = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMemoryInfo({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      });
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      updateMemoryInfo();
      const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [updateMemoryInfo]);

  return memoryInfo;
}

// Performance metrics component for development
export function PerformanceMetrics() {
  const bundleInfo = useBundleAnalyzer();
  const memoryInfo = useMemoryMonitor();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono z-50">
      <div className="space-y-2">
        <div className="font-bold">Performance Metrics</div>
        
        {bundleInfo && (
          <div>
            <div>Bundle: {(bundleInfo.totalSize / 1024 / 1024).toFixed(2)}MB</div>
            <div>Gzipped: {(bundleInfo.gzipSize / 1024).toFixed(0)}KB</div>
          </div>
        )}
        
        {memoryInfo && (
          <div>
            <div>Memory: {(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB</div>
            <div>Limit: {(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(0)}MB</div>
          </div>
        )}
        
        <div className="text-gray-400">
          Press F12 → Performance for detailed analysis
        </div>
      </div>
    </div>
  );
}

// HOC for performance monitoring
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: T) {
    usePerformanceMonitor(componentName);
    return <Component {...props} />;
  };
}