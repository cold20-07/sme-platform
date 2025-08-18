// MCP Integration Tests
// Tests for MCP database operations, query optimization, and schema validation

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MCPDatabaseOperations, MCPCache } from '../mcp-integration';
import { mcpValidator, validateTableRecord } from '../mcp-schema-validation';
import { mcpOptimizer, optimizeQuery } from '../mcp-query-optimization';
import { mcpClient, MCPClient } from '../mcp-utilities';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  removeChannel: vi.fn(),
};

// Mock query builder
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

describe('MCP Integration Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MCPCache', () => {
    let cache: MCPCache;

    beforeEach(() => {
      cache = new MCPCache({
        enabled: true,
        ttl: 60,
        maxSize: 100,
      });
    });

    it('should store and retrieve cached data', () => {
      const testData = { id: '1', name: 'Test' };
      cache.set('test-key', testData);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache entries', async () => {
      const testData = { id: '1', name: 'Test' };
      cache.set('test-key', testData, 0.001); // Very short TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should respect max cache size', () => {
      const smallCache = new MCPCache({
        enabled: true,
        ttl: 60,
        maxSize: 2,
      });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3'); // Should evict key1

      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');
    });

    it('should clear all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.size()).toBe(0);
    });
  });

  describe('MCPDatabaseOperations', () => {
    let mcpDb: MCPDatabaseOperations;

    beforeEach(() => {
      mcpDb = new MCPDatabaseOperations(mockSupabaseClient as any);
    });

    it('should execute optimized queries', async () => {
      const mockData = [{ id: '1', name: 'Test Company' }];
      
      // Chain the mock methods properly
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      };

      // The final method in the chain should return the data
      mockChain.limit.mockResolvedValue({
        data: mockData,
        error: null,
        status: 200,
        statusText: 'OK',
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mcpDb.query({
        table: 'companies',
        select: ['id', 'name'],
        filter: { name: 'Test Company' },
        limit: 10,
      });

      expect(result.data).toEqual(mockData);
      expect(result.metrics.optimizationApplied).toContain('select_optimization');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('companies');
    });

    it('should handle batch inserts with chunking', async () => {
      const records = Array.from({ length: 250 }, (_, i) => ({
        name: `Company ${i}`,
        email: `company${i}@example.com`,
      }));

      mockQueryBuilder.insert.mockResolvedValue({
        data: records.slice(0, 100),
        error: null,
        status: 201,
        statusText: 'Created',
      });

      const result = await mcpDb.batchInsert('companies', records, {
        batchSize: 100,
        maxConcurrency: 2,
      });

      expect(result.metrics.optimizationApplied).toContain('batch_processing');
      expect(result.metrics.optimizationApplied).toContain('chunking');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it('should validate records before insertion', async () => {
      const invalidRecord = {
        name: '', // Invalid: too short
        email: 'invalid-email', // Invalid: bad format
      };

      const result = await mcpDb.batchInsert('companies', [invalidRecord]);

      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.status).toBe(400);
    });

    it('should handle upsert operations', async () => {
      const record = {
        id: '1',
        name: 'Updated Company',
        email: 'updated@example.com',
      };

      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: record,
          error: null,
          status: 200,
          statusText: 'OK',
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mcpDb.upsert('companies', record, 'id');

      expect(result.data).toEqual(record);
      expect(result.metrics.optimizationApplied).toContain('upsert_optimization');
    });

    it('should call database functions with caching', async () => {
      const functionResult = [{
        total_orders: 100,
        total_revenue: 50000,
        avg_order_value: 500,
        customer_count: 25,
        product_count: 50,
        low_stock_count: 5,
        recent_orders: 10,
        growth_rate: 0.15,
      }];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: functionResult,
        error: null,
        status: 200,
        statusText: 'OK',
      });

      const result = await mcpDb.callFunction('get_company_metrics', {
        p_company_id: 'company-1',
        p_date_from: '2024-01-01',
        p_date_to: '2024-12-31',
      });

      expect(result.data).toEqual(functionResult);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_company_metrics', {
        p_company_id: 'company-1',
        p_date_from: '2024-01-01',
        p_date_to: '2024-12-31',
      });
    });

    it('should query views with optimization', async () => {
      const viewData = [{
        company_id: 'company-1',
        company_name: 'Test Company',
        total_orders: 100,
        total_revenue: 50000,
      }];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: viewData,
          error: null,
          status: 200,
          statusText: 'OK',
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mcpDb.queryView('company_dashboard', {
        company_id: 'company-1',
      });

      expect(result.data).toEqual(viewData);
      expect(result.metrics.optimizationApplied).toContain('view_query');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('company_dashboard');
    });
  });

  describe('Schema Validation', () => {
    it('should validate user records correctly', () => {
      const validUser = {
        email: 'test@example.com',
        role: 'admin' as const,
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateTableRecord('users', validUser);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid user records', () => {
      const invalidUser = {
        email: 'invalid-email',
        role: 'invalid-role' as any,
        company_id: 'invalid-uuid',
      };

      const result = validateTableRecord('users', invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('email format'))).toBe(true);
    });

    it('should validate product records with price constraints', () => {
      const validProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        stock_quantity: 100,
        reorder_level: 10,
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateTableRecord('products', validProduct);
      expect(result.isValid).toBe(true);
    });

    it('should reject products with negative prices', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: -10,
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateTableRecord('products', invalidProduct);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('price must be'))).toBe(true);
    });

    it('should validate order item subtotal calculation', () => {
      const validOrderItem = {
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 5,
        unit_price: 10.00,
        subtotal: 50.00,
      };

      const result = validateTableRecord('order_items', validOrderItem);
      expect(result.isValid).toBe(true);
    });

    it('should reject order items with incorrect subtotal', () => {
      const invalidOrderItem = {
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 5,
        unit_price: 10.00,
        subtotal: 40.00, // Should be 50.00
      };

      const result = validateTableRecord('order_items', invalidOrderItem);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('subtotal must equal'))).toBe(true);
    });
  });

  describe('Query Optimization', () => {
    it('should optimize select queries', () => {
      const optimization = optimizeQuery('products', {
        select: ['id', 'name', 'price'],
        filter: { company_id: 'company-1', status: 'active' },
        orderBy: [{ column: 'name', ascending: true }],
        limit: 20,
      });

      expect(optimization.estimatedCost).toBeLessThan(1);
      expect(optimization.hints.cacheStrategy).toBeDefined();
      expect(optimization.hints.batchSize).toBeGreaterThan(0);
    });

    it('should recommend appropriate batch sizes', () => {
      const optimization = mcpOptimizer.optimizeBatchOperation('products', 'insert', 1000);

      expect(optimization.batchSize).toBeGreaterThan(0);
      expect(optimization.maxConcurrency).toBeGreaterThan(0);
      expect(optimization.strategy).toMatch(/sequential|parallel|hybrid/);
      expect(optimization.estimatedTime).toBeGreaterThan(0);
    });

    it('should analyze query patterns', () => {
      // Simulate some query patterns
      mcpOptimizer.recordQueryPerformance('test-query-1', {
        executionTime: 500,
        rowsScanned: 1000,
        rowsReturned: 100,
        cacheHit: false,
        indexesUsed: ['idx_products_company_id'],
        optimizationsApplied: ['filter_optimization'],
        cost: 0.5,
      });

      const analysis = mcpOptimizer.analyzeQueryPatterns();
      expect(analysis.patterns).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.insights).toBeDefined();
    });
  });

  describe('MCPClient Integration', () => {
    let client: MCPClient;

    beforeEach(() => {
      client = new MCPClient(mockSupabaseClient as any, {
        enableValidation: true,
        enableOptimization: true,
        enablePerformanceTracking: true,
      });
    });

    it('should execute queries with full MCP integration', async () => {
      const mockData = [{ id: '1', name: 'Test Company' }];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
          status: 200,
          statusText: 'OK',
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await client.query('companies', {
        filter: { name: 'Test Company' },
        limit: 10,
      });

      expect(result.data).toEqual(mockData);
      expect(result.optimizations).toBeDefined();
    });

    it('should validate records before insertion', async () => {
      const invalidRecord = {
        name: '', // Too short
        email: 'invalid-email',
      };

      const result = await client.insert('companies', invalidRecord);

      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.validationResult?.isValid).toBe(false);
    });

    it('should handle batch operations with validation', async () => {
      const records = [
        { name: 'Company 1', email: 'company1@example.com' },
        { name: 'Company 2', email: 'company2@example.com' },
      ];

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: records,
          error: null,
          status: 201,
          statusText: 'Created',
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await client.batchInsert('companies', records);

      expect(result.validationResult?.isValid).toBe(true);
      expect(result.data).toEqual(records);
    });

    it('should fetch dashboard data efficiently', async () => {
      let callCount = 0;
      
      mockSupabaseClient.from.mockImplementation((table) => {
        callCount++;
        
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
        };

        // Mock different responses based on call order
        if (callCount === 1) {
          // Dashboard view
          mockChain.eq.mockResolvedValue({
            data: [{
              company_id: 'company-1',
              company_name: 'Test Company',
              total_orders: 100,
              total_revenue: 50000,
            }],
            error: null,
            status: 200,
            statusText: 'OK',
          });
        } else if (callCount === 2) {
          // Low stock products
          mockChain.limit.mockResolvedValue({
            data: [{
              id: 'product-1',
              name: 'Low Stock Product',
              stock_quantity: 5,
              reorder_level: 10,
            }],
            error: null,
            status: 200,
            statusText: 'OK',
          });
        } else if (callCount === 3) {
          // Top customers
          mockChain.limit.mockResolvedValue({
            data: [{
              contact_id: 'customer-1',
              customer_name: 'Top Customer',
              total_spent: 10000,
            }],
            error: null,
            status: 200,
            statusText: 'OK',
          });
        } else {
          // Recent orders
          mockChain.limit.mockResolvedValue({
            data: [{
              id: 'order-1',
              order_number: 'ORD-001',
              total_amount: 500,
            }],
            error: null,
            status: 200,
            statusText: 'OK',
          });
        }

        return mockChain;
      });

      const result = await client.getDashboardData('company-1');

      expect(result.dashboard).toBeTruthy();
      expect(result.lowStockProducts).toHaveLength(1);
      expect(result.topCustomers).toHaveLength(1);
      expect(result.recentOrders).toHaveLength(1);
    });

    it('should provide performance insights', () => {
      const insights = client.getPerformanceInsights();

      expect(insights.patterns).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      expect(insights.insights).toBeDefined();
      expect(insights.cacheStats).toBeDefined();
    });

    it('should update configuration', () => {
      client.updateConfig({
        batchSize: 200,
        maxConcurrency: 5,
        enableCaching: false,
      });

      // Configuration should be updated (we can't directly test private properties)
      // but we can test that the method doesn't throw
      expect(() => client.updateConfig({ batchSize: 150 })).not.toThrow();
    });

    it('should clear cache', () => {
      expect(() => client.clearCache()).not.toThrow();
    });
  });
});