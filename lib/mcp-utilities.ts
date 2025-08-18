// MCP Utilities - Comprehensive MCP Integration Layer
// This module provides high-level utilities that combine all MCP functionality

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { MCPDatabaseOperations } from './mcp-integration';
import { mcpValidator, validateTableRecord, validateTableRecords } from './mcp-schema-validation';
import { mcpOptimizer, optimizeQuery, recordPerformance } from './mcp-query-optimization';
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
  CompanyDashboard,
  LowStockProduct,
  CustomerOrderHistory,
  ProductPerformance,
  FinancialSummary
} from './database-types';

// MCP Configuration
export interface MCPConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  enableOptimization: boolean;
  enableValidation: boolean;
  enablePerformanceTracking: boolean;
  batchSize: number;
  maxConcurrency: number;
}

// Default MCP configuration
const DEFAULT_MCP_CONFIG: MCPConfig = {
  enableCaching: true,
  cacheTimeout: 300, // 5 minutes
  enableOptimization: true,
  enableValidation: true,
  enablePerformanceTracking: true,
  batchSize: 100,
  maxConcurrency: 3,
};

// Enhanced MCP Client
export class MCPClient {
  private db: MCPDatabaseOperations;
  private config: MCPConfig;
  private client: SupabaseClient<Database>;

  constructor(
    client: SupabaseClient<Database> = supabase,
    config: Partial<MCPConfig> = {}
  ) {
    this.client = client;
    this.config = { ...DEFAULT_MCP_CONFIG, ...config };
    this.db = new MCPDatabaseOperations(client);
  }

  // Enhanced query method with full MCP integration
  async query<T extends keyof Database['public']['Tables']>(
    table: T,
    options: {
      select?: string[];
      filter?: Partial<Database['public']['Tables'][T]['Row']>;
      orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row'][]> & { 
    metrics?: any;
    optimizations?: string[];
  }> {
    const startTime = Date.now();
    const queryId = this.generateQueryId('select', table, options);

    try {
      // Apply query optimization if enabled
      let optimizedOptions = options;
      if (this.config.enableOptimization) {
        const optimization = optimizeQuery(table, options);
        // Apply optimization hints (simplified for this example)
        optimizedOptions = { ...options };
      }

      // Execute the query
      const result = await this.db.query({
        table,
        select: optimizedOptions.select,
        filter: optimizedOptions.filter,
        orderBy: optimizedOptions.orderBy,
        limit: optimizedOptions.limit,
        offset: optimizedOptions.offset,
      });

      // Record performance metrics if enabled
      if (this.config.enablePerformanceTracking) {
        recordPerformance(queryId, {
          executionTime: Date.now() - startTime,
          rowsScanned: result.data?.length || 0,
          rowsReturned: result.data?.length || 0,
          cacheHit: result.metrics?.cacheHit || false,
          indexesUsed: [],
          optimizationsApplied: result.metrics?.optimizationApplied || [],
          cost: 1,
        });
      }

      return {
        data: result.data,
        error: result.error,
        count: result.count,
        status: result.status,
        statusText: result.statusText,
        metrics: result.metrics,
        optimizations: result.metrics?.optimizationApplied,
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
      };
    }
  }

  // Enhanced insert with validation and optimization
  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    record: TablesInsert<T>
  ): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row']> & { 
    validationResult?: ValidationResult;
  }> {
    const startTime = Date.now();

    try {
      // Validate record if enabled
      let validationResult: ValidationResult | undefined;
      if (this.config.enableValidation) {
        validationResult = validateTableRecord(table, record);
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
            validationResult,
          };
        }
      }

      // Execute insert
      const result = await this.client
        .from(table)
        .insert(record)
        .select()
        .single();

      // Record performance if enabled
      if (this.config.enablePerformanceTracking) {
        const queryId = this.generateQueryId('insert', table, record);
        recordPerformance(queryId, {
          executionTime: Date.now() - startTime,
          rowsScanned: 1,
          rowsReturned: result.data ? 1 : 0,
          cacheHit: false,
          indexesUsed: [],
          optimizationsApplied: ['validation'],
          cost: 1,
        });
      }

      return {
        data: result.data,
        error: result.error as SupabaseError | null,
        status: result.status,
        statusText: result.statusText,
        validationResult,
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
      };
    }
  }

  // Enhanced batch insert
  async batchInsert<T extends keyof Database['public']['Tables']>(
    table: T,
    records: TablesInsert<T>[]
  ): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row'][]> & { 
    validationResult?: ValidationResult;
    metrics?: any;
  }> {
    const startTime = Date.now();

    try {
      // Validate records if enabled
      let validationResult: ValidationResult | undefined;
      if (this.config.enableValidation) {
        validationResult = validateTableRecords(table, records);
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
            validationResult,
          };
        }
      }

      // Execute batch insert with optimization
      const result = await this.db.batchInsert(table, records, {
        batchSize: this.config.batchSize,
        maxConcurrency: this.config.maxConcurrency,
        retryAttempts: 3,
        retryDelay: 1000,
      });

      // Record performance if enabled
      if (this.config.enablePerformanceTracking) {
        const queryId = this.generateQueryId('batch_insert', table, { count: records.length });
        recordPerformance(queryId, {
          executionTime: Date.now() - startTime,
          rowsScanned: records.length,
          rowsReturned: result.data?.length || 0,
          cacheHit: false,
          indexesUsed: [],
          optimizationsApplied: result.metrics?.optimizationApplied || [],
          cost: records.length / 100,
        });
      }

      return {
        data: result.data,
        error: result.error,
        status: result.status,
        statusText: result.statusText,
        validationResult,
        metrics: result.metrics,
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
      };
    }
  }

  // Enhanced update with validation
  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    filter: Partial<Database['public']['Tables'][T]['Row']>,
    updates: TablesUpdate<T>
  ): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row'][]> & { 
    validationResult?: ValidationResult;
  }> {
    const startTime = Date.now();

    try {
      // Validate updates if enabled
      let validationResult: ValidationResult | undefined;
      if (this.config.enableValidation) {
        validationResult = validateTableRecord(table, updates, true);
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
            validationResult,
          };
        }
      }

      // Build update query
      let query = this.client.from(table).update(updates);

      // Apply filters
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const result = await query.select();

      // Record performance if enabled
      if (this.config.enablePerformanceTracking) {
        const queryId = this.generateQueryId('update', table, { filter, updates });
        recordPerformance(queryId, {
          executionTime: Date.now() - startTime,
          rowsScanned: result.data?.length || 0,
          rowsReturned: result.data?.length || 0,
          cacheHit: false,
          indexesUsed: [],
          optimizationsApplied: ['validation'],
          cost: 1,
        });
      }

      return {
        data: result.data,
        error: result.error as SupabaseError | null,
        status: result.status,
        statusText: result.statusText,
        validationResult,
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
      };
    }
  }

  // Enhanced upsert
  async upsert<T extends keyof Database['public']['Tables']>(
    table: T,
    record: TablesInsert<T>,
    onConflict?: string
  ): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row']> & { 
    validationResult?: ValidationResult;
    metrics?: any;
  }> {
    const startTime = Date.now();

    try {
      // Validate record if enabled
      let validationResult: ValidationResult | undefined;
      if (this.config.enableValidation) {
        validationResult = validateTableRecord(table, record);
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
            validationResult,
          };
        }
      }

      // Execute upsert with optimization
      const result = await this.db.upsert(table, record, onConflict);

      // Record performance if enabled
      if (this.config.enablePerformanceTracking) {
        const queryId = this.generateQueryId('upsert', table, record);
        recordPerformance(queryId, {
          executionTime: Date.now() - startTime,
          rowsScanned: 1,
          rowsReturned: result.data ? 1 : 0,
          cacheHit: false,
          indexesUsed: [],
          optimizationsApplied: result.metrics?.optimizationApplied || [],
          cost: 1,
        });
      }

      return {
        data: result.data,
        error: result.error,
        status: result.status,
        statusText: result.statusText,
        validationResult,
        metrics: result.metrics,
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
      };
    }
  }

  // Query views with optimization
  async queryView<T extends keyof Database['public']['Views']>(
    viewName: T,
    options: {
      filter?: Partial<Database['public']['Views'][T]['Row']>;
      orderBy?: { column: keyof Database['public']['Views'][T]['Row']; ascending: boolean }[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MCPOperationResult<Database['public']['Views'][T]['Row'][]> & { 
    metrics?: any;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.db.queryView(viewName, options.filter, {
        orderBy: options.orderBy,
        limit: options.limit,
        offset: options.offset,
      });

      // Record performance if enabled
      if (this.config.enablePerformanceTracking) {
        const queryId = this.generateQueryId('view', viewName, options);
        recordPerformance(queryId, {
          executionTime: Date.now() - startTime,
          rowsScanned: result.data?.length || 0,
          rowsReturned: result.data?.length || 0,
          cacheHit: result.metrics?.cacheHit || false,
          indexesUsed: [],
          optimizationsApplied: result.metrics?.optimizationApplied || [],
          cost: 1,
        });
      }

      return {
        data: result.data,
        error: result.error,
        count: result.count,
        status: result.status,
        statusText: result.statusText,
        metrics: result.metrics,
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
      };
    }
  }

  // Call database functions
  async callFunction<T extends keyof Database['public']['Functions']>(
    functionName: T,
    args: Database['public']['Functions'][T]['Args']
  ): Promise<MCPOperationResult<Database['public']['Functions'][T]['Returns']> & { 
    metrics?: any;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.db.callFunction(functionName, args);

      // Record performance if enabled
      if (this.config.enablePerformanceTracking) {
        const queryId = this.generateQueryId('function', functionName, args);
        recordPerformance(queryId, {
          executionTime: Date.now() - startTime,
          rowsScanned: Array.isArray(result.data) ? result.data.length : 1,
          rowsReturned: Array.isArray(result.data) ? result.data.length : 1,
          cacheHit: result.metrics?.cacheHit || false,
          indexesUsed: [],
          optimizationsApplied: result.metrics?.optimizationApplied || [],
          cost: 1,
        });
      }

      return {
        data: result.data,
        error: result.error,
        status: result.status,
        statusText: result.statusText,
        metrics: result.metrics,
      };
    } catch (error) {
      return {
        data: null,
        error: error as SupabaseError,
        status: 500,
        statusText: 'Internal Server Error',
      };
    }
  }

  // High-level dashboard data fetching
  async getDashboardData(companyId: string): Promise<{
    dashboard: CompanyDashboard | null;
    lowStockProducts: LowStockProduct[];
    topCustomers: CustomerOrderHistory[];
    recentOrders: Tables<'orders'>[];
    error?: SupabaseError;
  }> {
    try {
      // Fetch dashboard overview
      const dashboardResult = await this.queryView('company_dashboard', {
        filter: { company_id: companyId },
      });

      // Fetch low stock products
      const lowStockResult = await this.queryView('low_stock_products', {
        filter: { company_id: companyId },
        limit: 10,
      });

      // Fetch top customers
      const customersResult = await this.queryView('customer_order_history', {
        filter: { company_id: companyId },
        orderBy: [{ column: 'total_spent', ascending: false }],
        limit: 10,
      });

      // Fetch recent orders
      const ordersResult = await this.query('orders', {
        filter: { company_id: companyId },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 10,
      });

      return {
        dashboard: dashboardResult.data?.[0] || null,
        lowStockProducts: lowStockResult.data || [],
        topCustomers: customersResult.data || [],
        recentOrders: ordersResult.data || [],
        error: dashboardResult.error || lowStockResult.error || customersResult.error || ordersResult.error || undefined,
      };
    } catch (error) {
      return {
        dashboard: null,
        lowStockProducts: [],
        topCustomers: [],
        recentOrders: [],
        error: error as SupabaseError,
      };
    }
  }

  // Get performance insights
  getPerformanceInsights(): {
    patterns: any[];
    recommendations: any[];
    insights: string[];
    cacheStats: any;
  } {
    const analysis = mcpOptimizer.analyzeQueryPatterns();
    const cacheStats = this.db.getCacheStats();

    return {
      patterns: analysis.patterns,
      recommendations: analysis.recommendations,
      insights: analysis.insights,
      cacheStats,
    };
  }

  // Update configuration
  updateConfig(config: Partial<MCPConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update batch configuration
    this.db.updateBatchConfig({
      batchSize: this.config.batchSize,
      maxConcurrency: this.config.maxConcurrency,
    });
  }

  // Clear cache
  clearCache(): void {
    this.db.clearCache();
  }

  // Private helper methods
  private generateQueryId(operation: string, table: string | keyof Database['public']['Views'] | keyof Database['public']['Functions'], options: any): string {
    const optionsHash = JSON.stringify(options).slice(0, 50);
    return `mcp:${operation}:${table}:${optionsHash}`;
  }
}

// Create and export MCP client instance
export const mcpClient = new MCPClient();

// Export convenience functions
export async function mcpQuery<T extends keyof Database['public']['Tables']>(
  table: T,
  options?: {
    select?: string[];
    filter?: Partial<Database['public']['Tables'][T]['Row']>;
    orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
    limit?: number;
    offset?: number;
  }
): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row'][]>> {
  return mcpClient.query(table, options);
}

export async function mcpInsert<T extends keyof Database['public']['Tables']>(
  table: T,
  record: TablesInsert<T>
): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row']>> {
  return mcpClient.insert(table, record);
}

export async function mcpBatchInsert<T extends keyof Database['public']['Tables']>(
  table: T,
  records: TablesInsert<T>[]
): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row'][]>> {
  return mcpClient.batchInsert(table, records);
}

export async function mcpUpdate<T extends keyof Database['public']['Tables']>(
  table: T,
  filter: Partial<Database['public']['Tables'][T]['Row']>,
  updates: TablesUpdate<T>
): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row'][]>> {
  return mcpClient.update(table, filter, updates);
}

export async function mcpUpsert<T extends keyof Database['public']['Tables']>(
  table: T,
  record: TablesInsert<T>,
  onConflict?: string
): Promise<MCPOperationResult<Database['public']['Tables'][T]['Row']>> {
  return mcpClient.upsert(table, record, onConflict);
}

export async function mcpQueryView<T extends keyof Database['public']['Views']>(
  viewName: T,
  options?: {
    filter?: Partial<Database['public']['Views'][T]['Row']>;
    orderBy?: { column: keyof Database['public']['Views'][T]['Row']; ascending: boolean }[];
    limit?: number;
    offset?: number;
  }
): Promise<MCPOperationResult<Database['public']['Views'][T]['Row'][]>> {
  return mcpClient.queryView(viewName, options);
}

export async function mcpCallFunction<T extends keyof Database['public']['Functions']>(
  functionName: T,
  args: Database['public']['Functions'][T]['Args']
): Promise<MCPOperationResult<Database['public']['Functions'][T]['Returns']>> {
  return mcpClient.callFunction(functionName, args);
}

export async function mcpGetDashboard(companyId: string) {
  return mcpClient.getDashboardData(companyId);
}

// Export types and classes
export { MCPConfig };
export type { MCPOperationResult, SupabaseError, ValidationResult };