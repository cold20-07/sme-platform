// Performance optimization configuration

export const PERFORMANCE_CONFIG = {
  // React Query optimizations
  reactQuery: {
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 3,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
      },
    },
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Bundle optimization thresholds
  bundleThresholds: {
    maxChunkSize: 250 * 1024, // 250KB
    maxAssetSize: 500 * 1024, // 500KB
    maxEntrypointSize: 1024 * 1024, // 1MB
  },

  // Performance monitoring
  monitoring: {
    enableInDevelopment: true,
    enableInProduction: false,
    metricsInterval: 5000, // 5 seconds
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    renderTimeThreshold: 16, // 16ms (one frame)
  },

  // Code splitting configuration
  codeSplitting: {
    // Routes to lazy load
    lazyRoutes: [
      '/dashboard',
      '/products',
      '/crm/contacts',
      '/wallet',
      '/compliance',
    ],
    
    // Components to lazy load
    lazyComponents: [
      'MetricsGrid',
      'RevenueChart',
      'OwnershipChart',
      'ComplianceChart',
      'ProactiveInsights',
    ],
    
    // Libraries to split into separate chunks
    vendorChunks: {
      react: ['react', 'react-dom'],
      charts: ['recharts', 'd3'],
      ui: ['@radix-ui'],
      supabase: ['@supabase'],
      reactQuery: ['@tanstack/react-query'],
    },
  },

  // Preloading configuration
  preloading: {
    // Critical routes to preload
    criticalRoutes: ['/dashboard'],
    
    // Resources to preload
    criticalResources: [
      '/api/dashboard/metrics',
      '/api/user/profile',
    ],
  },
} as const;

// Performance budget configuration
export const PERFORMANCE_BUDGET = {
  // Lighthouse score targets
  lighthouse: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 90,
  },

  // Core Web Vitals targets
  coreWebVitals: {
    lcp: 2500, // Largest Contentful Paint (ms)
    fid: 100,  // First Input Delay (ms)
    cls: 0.1,  // Cumulative Layout Shift
  },

  // Bundle size limits
  bundleSize: {
    initial: 200 * 1024,    // 200KB initial bundle
    total: 1024 * 1024,     // 1MB total bundle
    gzipped: 300 * 1024,    // 300KB gzipped
  },

  // Network performance
  network: {
    ttfb: 600,     // Time to First Byte (ms)
    domReady: 1500, // DOM Content Loaded (ms)
    loadComplete: 3000, // Load Complete (ms)
  },
} as const;

// Development performance warnings
export function checkPerformanceBudget(metrics: {
  bundleSize?: number;
  gzippedSize?: number;
  renderTime?: number;
  memoryUsage?: number;
}) {
  const warnings: string[] = [];

  if (metrics.bundleSize && metrics.bundleSize > PERFORMANCE_BUDGET.bundleSize.total) {
    warnings.push(`Bundle size (${(metrics.bundleSize / 1024).toFixed(0)}KB) exceeds budget (${PERFORMANCE_BUDGET.bundleSize.total / 1024}KB)`);
  }

  if (metrics.gzippedSize && metrics.gzippedSize > PERFORMANCE_BUDGET.bundleSize.gzipped) {
    warnings.push(`Gzipped size (${(metrics.gzippedSize / 1024).toFixed(0)}KB) exceeds budget (${PERFORMANCE_BUDGET.bundleSize.gzipped / 1024}KB)`);
  }

  if (metrics.renderTime && metrics.renderTime > PERFORMANCE_CONFIG.monitoring.renderTimeThreshold) {
    warnings.push(`Render time (${metrics.renderTime.toFixed(2)}ms) exceeds threshold (${PERFORMANCE_CONFIG.monitoring.renderTimeThreshold}ms)`);
  }

  if (metrics.memoryUsage && metrics.memoryUsage > PERFORMANCE_CONFIG.monitoring.memoryThreshold) {
    warnings.push(`Memory usage (${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB) exceeds threshold (${PERFORMANCE_CONFIG.monitoring.memoryThreshold / 1024 / 1024}MB)`);
  }

  return warnings;
}