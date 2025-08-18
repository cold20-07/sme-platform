// MCP Integration Layer for Supabase
// This module provides MCP-specific database operation utilities, query optimization, and schema validation

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { 
  Database, 
  Tables, 
  TablesInsert, 
  TablesUpdate,
  Views,
  Functions,
  MCPOperationResult,
  SupabaseError,
  ValidationResult,
  DatabaseConstraints
} from './database-types';

// MCP Query Builder Interface
export interface MCPQueryBuilder<T extends keyof Database['public']['Tables']> {
  table: T;
  select?: string[];
  filter?: Partial<Database['public']['Tables'][T]['Row']>;
  orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
  limit?: number;
  offset?: number;
  joins?: MCPJoin[];
  aggregations?: MCPAggregation[];
}

// MCP Join Configuration
export interface MCPJoin {
  table: keyof Database['public']['Tables'];
  on: string;
  type: 'inner' | 'left' | 'right' | 'full';
  select?: string[];
}

// MCP Aggregation Configuration
export interface MCPAggregation {
  function: 'count' | 'sum' | 'avg' | 'min' | 'max';
  column: string;
  alias?: string;
}

// MCP Batch Operation Configuration
export interface MCPBatchConfig {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

// MCP Cache Configuration
export interface MCPCacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache entries
}

// MCP Performance Metrics
export interface MCPPerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  rowsAffected: number;
  optimizationApplied: string[];
}

// Default configurations
const DEFAULT_BATCH_CONFIG: MCPBatchConfig = {
  batchSize: 100,
  maxConcurrency: 5,
  retryAttempts: 3,
  retryDelay: 1000,
};

const DEFAULT_CACHE_CONFIG: MCPCacheConfig = {
  enabled: true,
  ttl: 300, // 5 minutes
  maxSize: 1000,
};

// Simple in-memory cache for MCP operations
class MCPCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private config: MCPCacheConfig;

  constructor(config: MCPCacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
  }

  get(key: string): any | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl?: number): void {
    if (!this.config.enabled) return;

    // Clean up old entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// MCP Database Operations Class
export class MCPDatabaseOperations {
  private client: SupabaseClient<Database>;
  private cache: MCPCache;
  private batchConfig: MCPBatchConfig;

  constructor(
    client: SupabaseClient<Database> = supabase,
    cacheConfig?: MCPCacheConfig,
    batchConfig?: MCPBatchConfig
  ) {
    this.client = client;
    this.cache = new MCPCache(cacheConfig);
    this.batchConfig = { ...DEFAULT_BATCH_CONFIG, ...batchConfig };
  }

  // Enhanced query with MCP optimizations
  async query<T extends keyof Database['public']['Tables']>(
    queryConfig: MCPQueryBuilder<T>
  ): Promise<MCPOperationResult<any[]> & { metrics: MCPPerformanceMetrics }> {
    const startTime = Date.now();
    const optimizations: string[] = [];
    
    // Generate cache key
    const cacheKey = this.generateCacheKey('query', queryConfig);
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult) {
      return {
        ...cachedResult,
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: true,
          rowsAffected: cachedResult.data?.length || 0,
          optimizationApplied: ['cache_hit'],
        },
      };
    }

    try {
      let query = this.client.from(queryConfig.table);

      // Apply select optimization
      const selectFields = this.optimizeSelectFields(queryConfig.select, queryConfig.table);
      query = query.select(selectFields);
      if (selectFields !== '*') {
        optimizations.push('select_optimization');
      }

      // Apply filters with index optimization
      if (queryConfig.filter) {
        const optimizedFilters = this.optimizeFilters(queryConfig.filter, queryConfig.table);
        Object.entries(optimizedFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
        optimizations.push('filter_optimization');
      }

      // Apply ordering with index awareness
      if (queryConfig.orderBy) {
        queryConfig.orderBy.forEach(({ column, ascending }) => {
          query = query.order(column as string, { ascending });
        });
        optimizations.push('order_optimization');
      }

      // Apply pagination
      if (queryConfig.limit) {
        query = query.limit(queryConfig.limit);
        if (queryConfig.offset) {
          query = query.range(queryConfig.offset, queryConfig.offset + queryConfig.limit - 1);
        }
        optimizations.push('pagination');
      }

      const result = await query;
      const queryTime = Date.now() - startTime;

      const operationResult = {
        data: result.data,
        error: result.error as SupabaseError | null,
        count: result.count || undefined,
        status: result.status,
        statusText: result.statusText,
      };

      // Cache successful results
      if (!result.error && result.data) {
        this.cache.set(cacheKey, operationResult);
      }

      return {
        ...operationResult,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: result.data?.length || 0,
          optimizationApplied: optimizations,
        },
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: 0,
          optimizationApplied: optimizations,
        },
      };
    }
  }

  // Optimized batch insert with chunking and concurrency control
  async batchInsert<T extends keyof Database['public']['Tables']>(
    table: T,
    records: TablesInsert<T>[],
    config?: Partial<MCPBatchConfig>
  ): Promise<MCPOperationResult<any[]> & { metrics: MCPPerformanceMetrics }> {
    const startTime = Date.now();
    const batchConfig = { ...this.batchConfig, ...config };
    const optimizations: string[] = ['batch_processing'];

    if (records.length === 0) {
      return {
        data: [],
        error: null,
        status: 200,
        statusText: 'OK',
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: 0,
          optimizationApplied: optimizations,
        },
      };
    }

    try {
      // Validate records before insertion
      const validationResult = this.validateRecords(table, records);
      if (!validationResult.isValid) {
        return {
          data: null,
          error: {
            name: 'ValidationError',
            message: `Validation failed: ${validationResult.errors.join(', ')}`,
            code: 'VALIDATION_ERROR',
          } as SupabaseError,
          status: 400,
          statusText: 'Bad Request',
          metrics: {
            queryTime: Date.now() - startTime,
            cacheHit: false,
            rowsAffected: 0,
            optimizationApplied: optimizations,
          },
        };
      }

      // Split records into batches
      const batches = this.chunkArray(records, batchConfig.batchSize);
      optimizations.push('chunking');

      // Process batches with concurrency control
      const results = await this.processBatchesConcurrently(
        batches,
        (batch) => this.client.from(table).insert(batch).select(),
        batchConfig.maxConcurrency
      );

      // Combine results
      const allData = results.flatMap(result => result.data || []);
      const errors = results.filter(result => result.error).map(result => result.error);

      if (errors.length > 0) {
        return {
          data: allData.length > 0 ? allData : null,
          error: {
            name: 'BatchInsertError',
            message: `${errors.length} batch(es) failed`,
            details: errors,
          } as SupabaseError,
          status: 207, // Multi-status
          statusText: 'Multi-Status',
          metrics: {
            queryTime: Date.now() - startTime,
            cacheHit: false,
            rowsAffected: allData.length,
            optimizationApplied: optimizations,
          },
        };
      }

      // Clear related cache entries
      this.invalidateTableCache(table);

      return {
        data: allData,
        error: null,
        status: 201,
        statusText: 'Created',
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: allData.length,
          optimizationApplied: optimizations,
        },
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: 0,
          optimizationApplied: optimizations,
        },
      };
    }
  }

  // Enhanced upsert with conflict resolution and validation
  async upsert<T extends keyof Database['public']['Tables']>(
    table: T,
    record: TablesInsert<T>,
    onConflict?: string,
    options?: { ignoreDuplicates?: boolean }
  ): Promise<MCPOperationResult<any> & { metrics: MCPPerformanceMetrics }> {
    const startTime = Date.now();
    const optimizations: string[] = ['upsert_optimization'];

    try {
      // Validate record
      const validationResult = this.validateRecords(table, [record]);
      if (!validationResult.isValid) {
        return {
          data: null,
          error: {
            name: 'ValidationError',
            message: `Validation failed: ${validationResult.errors.join(', ')}`,
            code: 'VALIDATION_ERROR',
          } as SupabaseError,
          status: 400,
          statusText: 'Bad Request',
          metrics: {
            queryTime: Date.now() - startTime,
            cacheHit: false,
            rowsAffected: 0,
            optimizationApplied: optimizations,
          },
        };
      }

      const result = await this.client
        .from(table)
        .upsert(record, { 
          onConflict,
          ignoreDuplicates: options?.ignoreDuplicates 
        })
        .select()
        .single();

      // Clear related cache entries
      this.invalidateTableCache(table);

      return {
        data: result.data,
        error: result.error as SupabaseError | null,
        status: result.status,
        statusText: result.statusText,
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: result.data ? 1 : 0,
          optimizationApplied: optimizations,
        },
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: 0,
          optimizationApplied: optimizations,
        },
      };
    }
  }

  // Call database functions with proper typing and caching
  async callFunction<T extends keyof Database['public']['Functions']>(
    functionName: T,
    args: Database['public']['Functions'][T]['Args']
  ): Promise<MCPOperationResult<Database['public']['Functions'][T]['Returns']> & { metrics: MCPPerformanceMetrics }> {
    const startTime = Date.now();
    const optimizations: string[] = ['function_call'];

    // Generate cache key for function calls
    const cacheKey = this.generateCacheKey('function', { functionName, args });
    const cachedResult = this.cache.get(cacheKey);

    if (cachedResult) {
      return {
        ...cachedResult,
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: true,
          rowsAffected: Array.isArray(cachedResult.data) ? cachedResult.data.length : 1,
          optimizationApplied: ['cache_hit'],
        },
      };
    }

    try {
      const result = await this.client.rpc(functionName as string, args);

      const operationResult = {
        data: result.data,
        error: result.error as SupabaseError | null,
        status: result.status,
        statusText: result.statusText,
      };

      // Cache successful function results
      if (!result.error && result.data) {
        this.cache.set(cacheKey, operationResult, 60); // Cache for 1 minute
      }

      return {
        ...operationResult,
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: Array.isArray(result.data) ? result.data.length : 1,
          optimizationApplied: optimizations,
        },
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: 0,
          optimizationApplied: optimizations,
        },
      };
    }
  }

  // Query views with optimization
  async queryView<T extends keyof Database['public']['Views']>(
    viewName: T,
    filters?: Partial<Database['public']['Views'][T]['Row']>,
    options?: {
      orderBy?: { column: keyof Database['public']['Views'][T]['Row']; ascending: boolean }[];
      limit?: number;
      offset?: number;
    }
  ): Promise<MCPOperationResult<Database['public']['Views'][T]['Row'][]> & { metrics: MCPPerformanceMetrics }> {
    const startTime = Date.now();
    const optimizations: string[] = ['view_query'];

    // Generate cache key
    const cacheKey = this.generateCacheKey('view', { viewName, filters, options });
    const cachedResult = this.cache.get(cacheKey);

    if (cachedResult) {
      return {
        ...cachedResult,
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: true,
          rowsAffected: cachedResult.data?.length || 0,
          optimizationApplied: ['cache_hit'],
        },
      };
    }

    try {
      let query = this.client.from(viewName).select('*');

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
        optimizations.push('filter_optimization');
      }

      // Apply ordering
      if (options?.orderBy) {
        options.orderBy.forEach(({ column, ascending }) => {
          query = query.order(column as string, { ascending });
        });
        optimizations.push('order_optimization');
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
        if (options.offset) {
          query = query.range(options.offset, options.offset + options.limit - 1);
        }
        optimizations.push('pagination');
      }

      const result = await query;

      const operationResult = {
        data: result.data,
        error: result.error as SupabaseError | null,
        count: result.count || undefined,
        status: result.status,
        statusText: result.statusText,
      };

      // Cache successful results
      if (!result.error && result.data) {
        this.cache.set(cacheKey, operationResult, 120); // Cache views for 2 minutes
      }

      return {
        ...operationResult,
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: result.data?.length || 0,
          optimizationApplied: optimizations,
        },
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
        metrics: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          rowsAffected: 0,
          optimizationApplied: optimizations,
        },
      };
    }
  }

  // Private helper methods
  private generateCacheKey(operation: string, config: any): string {
    return `mcp:${operation}:${JSON.stringify(config)}`;
  }

  private optimizeSelectFields<T extends keyof Database['public']['Tables']>(
    select: string[] | undefined,
    table: T
  ): string {
    if (!select || select.length === 0) {
      return '*';
    }

    // Remove unnecessary fields for optimization
    const optimizedFields = select.filter(field => {
      // Skip computed fields that might not exist in the actual table
      return !field.includes('?');
    });

    return optimizedFields.join(', ') || '*';
  }

  private optimizeFilters<T extends keyof Database['public']['Tables']>(
    filter: Partial<Database['public']['Tables'][T]['Row']>,
    table: T
  ): Partial<Database['public']['Tables'][T]['Row']> {
    // Remove null/undefined values and optimize filter order
    const optimizedFilter: any = {};
    
    // Prioritize indexed fields (id, company_id, etc.)
    const indexedFields = ['id', 'company_id', 'user_id', 'contact_id', 'product_id', 'order_id'];
    
    indexedFields.forEach(field => {
      if (filter[field as keyof typeof filter] !== undefined) {
        optimizedFilter[field] = filter[field as keyof typeof filter];
      }
    });

    // Add other fields
    Object.entries(filter).forEach(([key, value]) => {
      if (!indexedFields.includes(key) && value !== undefined && value !== null) {
        optimizedFilter[key] = value;
      }
    });

    return optimizedFilter;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async processBatchesConcurrently<T>(
    batches: any[][],
    processor: (batch: any[]) => Promise<any>,
    maxConcurrency: number
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < batches.length; i += maxConcurrency) {
      const currentBatches = batches.slice(i, i + maxConcurrency);
      const batchPromises = currentBatches.map(processor);
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ data: null, error: result.reason });
        }
      });
    }
    
    return results;
  }

  private validateRecords<T extends keyof Database['public']['Tables']>(
    table: T,
    records: any[]
  ): ValidationResult {
    // Basic validation - can be extended with more sophisticated rules
    const errors: string[] = [];

    records.forEach((record, index) => {
      if (!record || typeof record !== 'object') {
        errors.push(`Record ${index} is not a valid object`);
        return;
      }

      // Table-specific validation
      switch (table) {
        case 'users':
          if (!record.email || typeof record.email !== 'string') {
            errors.push(`Record ${index}: email is required and must be a string`);
          }
          if (!record.company_id) {
            errors.push(`Record ${index}: company_id is required`);
          }
          break;
        case 'companies':
          if (!record.name || typeof record.name !== 'string') {
            errors.push(`Record ${index}: name is required and must be a string`);
          }
          break;
        case 'products':
          if (!record.name || typeof record.name !== 'string') {
            errors.push(`Record ${index}: name is required and must be a string`);
          }
          if (!record.sku || typeof record.sku !== 'string') {
            errors.push(`Record ${index}: sku is required and must be a string`);
          }
          if (typeof record.price !== 'number' || record.price < 0) {
            errors.push(`Record ${index}: price must be a non-negative number`);
          }
          break;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private invalidateTableCache<T extends keyof Database['public']['Tables']>(table: T): void {
    // Simple cache invalidation - remove all entries related to the table
    const keysToDelete: string[] = [];
    
    // This is a simple implementation - in production, you might want more sophisticated cache invalidation
    this.cache.clear();
  }

  // Public utility methods
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size(),
      // Hit rate calculation would require tracking hits/misses
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  updateBatchConfig(config: Partial<MCPBatchConfig>): void {
    this.batchConfig = { ...this.batchConfig, ...config };
  }
}

// Create and export the MCP database operations instance
export const mcpDb = new MCPDatabaseOperations();

// Export utility functions
export { MCPCache };