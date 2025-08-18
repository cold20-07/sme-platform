'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { environment, initializeDevEnvironment } from '@/lib/dev-environment-helpers-simple';

// Dynamically import development components to avoid bundling in production
const DebugPanel = dynamic(() => import('@/components/ui/debug-panel'), {
  ssr: false,
  loading: () => null,
});

const QueryPerformanceMonitor = dynamic(
  () => import('@/lib/react-query-provider').then(mod => ({ default: mod.QueryPerformanceMonitor })),
  { ssr: false, loading: () => null }
);

const QueryCacheInspector = dynamic(
  () => import('@/lib/react-query-provider').then(mod => ({ default: mod.QueryCacheInspector })),
  { ssr: false, loading: () => null }
);

interface DevelopmentToolsProps {
  enableDebugPanel?: boolean;
  enablePerformanceMonitor?: boolean;
  enableCacheInspector?: boolean;
}

export function DevelopmentTools({
  enableDebugPanel = true,
  enablePerformanceMonitor = true,
  enableCacheInspector = false,
}: DevelopmentToolsProps) {
  useEffect(() => {
    // Initialize development tools
    if (environment.isDevelopment) {
      // Initialize the base development environment first
      initializeDevEnvironment();
      
      // Then initialize additional tools
      import('@/lib/dev-initialization').then(({ default: initDev }) => {
        initDev({
          enableDebugPanel,
          enablePerformanceMonitoring: enablePerformanceMonitor,
          enableApiLogging: true,
          enableMemoryMonitoring: true,
        });
      }).catch(error => {
        console.warn('Failed to initialize development tools:', error);
      });
    }
  }, [enableDebugPanel, enablePerformanceMonitor]);

  // Only render in development
  if (!environment.isDevelopment) {
    return null;
  }

  return (
    <>
      {enableDebugPanel && environment.features.enableDebugPanel && (
        <div data-debug-panel>
          <DebugPanel />
        </div>
      )}
      
      {enablePerformanceMonitor && environment.features.enablePerformanceMonitoring && (
        <QueryPerformanceMonitor />
      )}
      
      {enableCacheInspector && (
        <QueryCacheInspector />
      )}
    </>
  );
}

// Hook for accessing development utilities in components
export function useDevelopmentTools() {
  const [isDevMode] = React.useState(environment.isDevelopment);
  
  const devTools = React.useMemo(() => {
    if (!isDevMode) return null;

    return {
      // Quick access to common dev functions
      resetApp: () => {
        if (typeof window !== 'undefined' && (window as any).dev) {
          (window as any).dev.reset();
        }
      },
      
      quickLogin: (type: 'user' | 'admin' = 'user') => {
        if (typeof window !== 'undefined' && (window as any).dev) {
          (window as any).dev.login(type);
        }
      },
      
      populateTestData: () => {
        if (typeof window !== 'undefined' && (window as any).dev) {
          (window as any).dev.populate();
        }
      },
      
      simulateNetwork: (condition: 'normal' | 'slow' | 'offline') => {
        if (typeof window !== 'undefined' && (window as any).dev) {
          (window as any).dev.network(condition);
        }
      },
      
      generateScenario: (type: 'empty-state' | 'error-state' | 'loading-state' | 'success-state') => {
        if (typeof window !== 'undefined' && (window as any).dev) {
          (window as any).dev.scenario(type);
        }
      },
      
      // Environment info
      getEnvironmentInfo: () => environment.getInfo(),
      
      // Feature flags
      features: environment.features,
    };
  }, [isDevMode]);

  return {
    isDevMode,
    devTools,
  };
}

export default DevelopmentTools;