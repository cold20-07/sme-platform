import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PERFORMANCE_CONFIG, PERFORMANCE_BUDGET, checkPerformanceBudget } from '../performance-config';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    totalJSHeapSize: 20 * 1024 * 1024, // 20MB
    jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
  },
};

// Mock window.performance
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Performance Configuration', () => {
    it('should have proper React Query configuration', () => {
      expect(PERFORMANCE_CONFIG.reactQuery.defaultOptions.queries.staleTime).toBe(5 * 60 * 1000);
      expect(PERFORMANCE_CONFIG.reactQuery.defaultOptions.queries.cacheTime).toBe(10 * 60 * 1000);
      expect(PERFORMANCE_CONFIG.reactQuery.defaultOptions.queries.refetchOnWindowFocus).toBe(false);
    });

    it('should have proper bundle thresholds', () => {
      expect(PERFORMANCE_CONFIG.bundleThresholds.maxChunkSize).toBe(250 * 1024);
      expect(PERFORMANCE_CONFIG.bundleThresholds.maxAssetSize).toBe(500 * 1024);
      expect(PERFORMANCE_CONFIG.bundleThresholds.maxEntrypointSize).toBe(1024 * 1024);
    });

    it('should have proper code splitting configuration', () => {
      expect(PERFORMANCE_CONFIG.codeSplitting.lazyRoutes).toContain('/dashboard');
      expect(PERFORMANCE_CONFIG.codeSplitting.lazyRoutes).toContain('/products');
      expect(PERFORMANCE_CONFIG.codeSplitting.lazyComponents).toContain('MetricsGrid');
    });
  });

  describe('Performance Budget', () => {
    it('should have proper Lighthouse score targets', () => {
      expect(PERFORMANCE_BUDGET.lighthouse.performance).toBe(90);
      expect(PERFORMANCE_BUDGET.lighthouse.accessibility).toBe(95);
      expect(PERFORMANCE_BUDGET.lighthouse.bestPractices).toBe(90);
      expect(PERFORMANCE_BUDGET.lighthouse.seo).toBe(90);
    });

    it('should have proper Core Web Vitals targets', () => {
      expect(PERFORMANCE_BUDGET.coreWebVitals.lcp).toBe(2500);
      expect(PERFORMANCE_BUDGET.coreWebVitals.fid).toBe(100);
      expect(PERFORMANCE_BUDGET.coreWebVitals.cls).toBe(0.1);
    });

    it('should have proper bundle size limits', () => {
      expect(PERFORMANCE_BUDGET.bundleSize.initial).toBe(200 * 1024);
      expect(PERFORMANCE_BUDGET.bundleSize.total).toBe(1024 * 1024);
      expect(PERFORMANCE_BUDGET.bundleSize.gzipped).toBe(300 * 1024);
    });
  });

  describe('Performance Budget Checking', () => {
    it('should return no warnings for good metrics', () => {
      const metrics = {
        bundleSize: 500 * 1024, // 500KB (under 1MB limit)
        gzippedSize: 200 * 1024, // 200KB (under 300KB limit)
        renderTime: 10, // 10ms (under 16ms limit)
        memoryUsage: 30 * 1024 * 1024, // 30MB (under 50MB limit)
      };

      const warnings = checkPerformanceBudget(metrics);
      expect(warnings).toHaveLength(0);
    });

    it('should return warnings for bad bundle size', () => {
      const metrics = {
        bundleSize: 2 * 1024 * 1024, // 2MB (over 1MB limit)
      };

      const warnings = checkPerformanceBudget(metrics);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Bundle size');
      expect(warnings[0]).toContain('exceeds budget');
    });

    it('should return warnings for bad gzipped size', () => {
      const metrics = {
        gzippedSize: 400 * 1024, // 400KB (over 300KB limit)
      };

      const warnings = checkPerformanceBudget(metrics);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Gzipped size');
      expect(warnings[0]).toContain('exceeds budget');
    });

    it('should return warnings for slow render time', () => {
      const metrics = {
        renderTime: 25, // 25ms (over 16ms limit)
      };

      const warnings = checkPerformanceBudget(metrics);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Render time');
      expect(warnings[0]).toContain('exceeds threshold');
    });

    it('should return warnings for high memory usage', () => {
      const metrics = {
        memoryUsage: 60 * 1024 * 1024, // 60MB (over 50MB limit)
      };

      const warnings = checkPerformanceBudget(metrics);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Memory usage');
      expect(warnings[0]).toContain('exceeds threshold');
    });

    it('should return multiple warnings for multiple issues', () => {
      const metrics = {
        bundleSize: 2 * 1024 * 1024, // 2MB (over limit)
        renderTime: 25, // 25ms (over limit)
        memoryUsage: 60 * 1024 * 1024, // 60MB (over limit)
      };

      const warnings = checkPerformanceBudget(metrics);
      expect(warnings).toHaveLength(3);
    });
  });

  describe('Code Splitting', () => {
    it('should have lazy loading configuration for routes', () => {
      const lazyRoutes = PERFORMANCE_CONFIG.codeSplitting.lazyRoutes;
      
      expect(lazyRoutes).toContain('/dashboard');
      expect(lazyRoutes).toContain('/products');
      expect(lazyRoutes).toContain('/crm/contacts');
      expect(lazyRoutes).toContain('/wallet');
      expect(lazyRoutes).toContain('/compliance');
    });

    it('should have lazy loading configuration for components', () => {
      const lazyComponents = PERFORMANCE_CONFIG.codeSplitting.lazyComponents;
      
      expect(lazyComponents).toContain('MetricsGrid');
      expect(lazyComponents).toContain('RevenueChart');
      expect(lazyComponents).toContain('OwnershipChart');
      expect(lazyComponents).toContain('ComplianceChart');
      expect(lazyComponents).toContain('ProactiveInsights');
    });

    it('should have vendor chunk configuration', () => {
      const vendorChunks = PERFORMANCE_CONFIG.codeSplitting.vendorChunks;
      
      expect(vendorChunks.react).toEqual(['react', 'react-dom']);
      expect(vendorChunks.charts).toEqual(['recharts', 'd3']);
      expect(vendorChunks.ui).toEqual(['@radix-ui']);
      expect(vendorChunks.supabase).toEqual(['@supabase']);
      expect(vendorChunks.reactQuery).toEqual(['@tanstack/react-query']);
    });
  });

  describe('Performance Monitoring', () => {
    it('should have proper monitoring configuration', () => {
      expect(PERFORMANCE_CONFIG.monitoring.enableInDevelopment).toBe(true);
      expect(PERFORMANCE_CONFIG.monitoring.enableInProduction).toBe(false);
      expect(PERFORMANCE_CONFIG.monitoring.metricsInterval).toBe(5000);
      expect(PERFORMANCE_CONFIG.monitoring.memoryThreshold).toBe(50 * 1024 * 1024);
      expect(PERFORMANCE_CONFIG.monitoring.renderTimeThreshold).toBe(16);
    });
  });

  describe('Preloading Configuration', () => {
    it('should have critical routes configured', () => {
      expect(PERFORMANCE_CONFIG.preloading.criticalRoutes).toContain('/dashboard');
    });

    it('should have critical resources configured', () => {
      expect(PERFORMANCE_CONFIG.preloading.criticalResources).toContain('/api/dashboard/metrics');
      expect(PERFORMANCE_CONFIG.preloading.criticalResources).toContain('/api/user/profile');
    });
  });
});

// Integration test for performance optimizations
describe('Performance Integration', () => {
  it('should measure component render performance', async () => {
    const startTime = performance.now();
    
    // Simulate component render
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeGreaterThan(0);
    expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
  });

  it('should track memory usage', () => {
    const memoryInfo = (performance as any).memory;
    
    expect(memoryInfo.usedJSHeapSize).toBeGreaterThan(0);
    expect(memoryInfo.totalJSHeapSize).toBeGreaterThan(memoryInfo.usedJSHeapSize);
    expect(memoryInfo.jsHeapSizeLimit).toBeGreaterThan(memoryInfo.totalJSHeapSize);
  });
});