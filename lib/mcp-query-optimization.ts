// MCP Query Optimization
// This module provides query optimization, performance monitoring, and intelligent caching for MCP operations

import type { 
  Database, 
  Tables, 
  Views,
  Functions,
  MCPOperationResult,
  SupabaseError
} from './database-types';

// Query optimization interfaces
export interface QueryOptimizationHint {
  useIndex?: string;
  preferredJoinOrder?: string[];
  cacheStrategy?: 'aggressive' | 'conservative' | 'none';
  batchSize?: number;
}

export interface QueryPerformanceMetrics {
  executionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  cacheHit: boolean;
  indexesUsed: string[];
  optimizationsApplied: string[];
  cost: number; // Estimated query cost
}

export interface OptimizedQuery {
  sql: string;
  parameters: any[];
  hints: QueryOptimizationHint;
  estimatedCost: number;
}

// Query pattern analysis
export interface QueryPattern {
  table: keyof Database['public']['Tables'];
  operation: 'select' | 'insert' | 'update' | 'delete';
  filters: string[];
  joins: string[];
  orderBy: string[];
  frequency: number;
  avgExecutionTime: number;
}

// Index recommendation
export interface IndexRecommendation {
  table: keyof Database['public']['Tables'];
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: number; // Percentage
  priority: 'high' | 'medium' | 'low';
}

// MCP Query Optimizer Class
export class MCPQueryOptimizer {
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private performanceHistory: Map<string, QueryPerformanceMetrics[]> = new Map();
  private indexRecommendations: IndexRecommendation[] = [];

  // Optimize a select query
  optimizeSelectQuery<T extends keyof Database['public']['Tables']>(
    table: T,
    options: {
      select?: string[];
      filter?: Partial<Database['public']['Tables'][T]['Row']>;
      orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
      limit?: number;
      offset?: number;
      joins?: string[];
    }
  ): OptimizedQuery {
    const optimizations: string[] = [];
    let estimatedCost = 1;

    // Optimize SELECT fields
    const selectFields = this.optimizeSelectFields(options.select, table);
    if (selectFields !== '*') {
      optimizations.push('field_selection');
      estimatedCost *= 0.8; // Reduce cost for selective fields
    }

    // Optimize WHERE clause
    const optimizedFilters = this.optimizeFilters(options.filter || {}, table);
    if (Object.keys(optimizedFilters).length > 0) {
      optimizations.push('filter_optimization');
      estimatedCost *= this.calculateFilterCost(optimizedFilters, table);
    }

    // Optimize ORDER BY
    const orderByOptimization = this.optimizeOrderBy(options.orderBy, table);
    if (orderByOptimization.canUseIndex) {
      optimizations.push('order_by_index');
      estimatedCost *= 0.9;
    }

    // Optimize LIMIT/OFFSET
    if (options.limit) {
      optimizations.push('pagination');
      estimatedCost *= Math.min(options.limit / 1000, 1); // Reduce cost for smaller limits
    }

    // Generate optimized SQL (pseudo-SQL for demonstration)
    const sql = this.generateOptimizedSQL(table, {
      select: selectFields,
      filters: optimizedFilters,
      orderBy: options.orderBy,
      limit: options.limit,
      offset: options.offset,
    });

    return {
      sql,
      parameters: Object.values(optimizedFilters),
      hints: {
        useIndex: this.recommendIndex(table, optimizedFilters),
        cacheStrategy: this.recommendCacheStrategy(table, options),
        batchSize: this.recommendBatchSize(table),
      },
      estimatedCost,
    };
  }

  // Optimize batch operations
  optimizeBatchOperation<T extends keyof Database['public']['Tables']>(
    table: T,
    operation: 'insert' | 'update' | 'delete',
    recordCount: number
  ): {
    batchSize: number;
    maxConcurrency: number;
    strategy: 'sequential' | 'parallel' | 'hybrid';
    estimatedTime: number;
  } {
    const tableSize = this.estimateTableSize(table);
    const complexity = this.calculateOperationComplexity(table, operation);

    let batchSize = 100;
    let maxConcurrency = 3;
    let strategy: 'sequential' | 'parallel' | 'hybrid' = 'parallel';

    // Adjust based on table size and operation complexity
    if (tableSize > 100000) {
      batchSize = 50; // Smaller batches for large tables
      maxConcurrency = 2;
    } else if (tableSize < 10000) {
      batchSize = 200; // Larger batches for small tables
      maxConcurrency = 5;
    }

    // Adjust based on operation type
    if (operation === 'insert') {
      batchSize = Math.min(batchSize * 2, 500); // Inserts can handle larger batches
    } else if (operation === 'update') {
      batchSize = Math.max(batchSize / 2, 25); // Updates need smaller batches
      strategy = 'hybrid';
    } else if (operation === 'delete') {
      batchSize = Math.max(batchSize / 3, 20); // Deletes need smallest batches
      strategy = 'sequential';
    }

    // Adjust based on complexity
    if (complexity > 0.7) {
      batchSize = Math.max(batchSize / 2, 10);
      maxConcurrency = Math.max(maxConcurrency - 1, 1);
    }

    const estimatedTime = this.estimateExecutionTime(recordCount, batchSize, maxConcurrency, complexity);

    return {
      batchSize,
      maxConcurrency,
      strategy,
      estimatedTime,
    };
  }

  // Analyze query patterns and recommend optimizations
  analyzeQueryPatterns(): {
    patterns: QueryPattern[];
    recommendations: IndexRecommendation[];
    insights: string[];
  } {
    const patterns = Array.from(this.queryPatterns.values());
    const insights: string[] = [];

    // Analyze frequent queries
    const frequentQueries = patterns
      .filter(p => p.frequency > 10)
      .sort((a, b) => b.frequency - a.frequency);

    if (frequentQueries.length > 0) {
      insights.push(`Found ${frequentQueries.length} frequently executed queries`);
    }

    // Analyze slow queries
    const slowQueries = patterns
      .filter(p => p.avgExecutionTime > 1000) // > 1 second
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime);

    if (slowQueries.length > 0) {
      insights.push(`Found ${slowQueries.length} slow queries that need optimization`);
    }

    // Generate index recommendations
    this.generateIndexRecommendations(patterns);

    return {
      patterns,
      recommendations: this.indexRecommendations,
      insights,
    };
  }

  // Record query performance metrics
  recordQueryPerformance(
    queryId: string,
    metrics: QueryPerformanceMetrics
  ): void {
    if (!this.performanceHistory.has(queryId)) {
      this.performanceHistory.set(queryId, []);
    }

    const history = this.performanceHistory.get(queryId)!;
    history.push(metrics);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    // Update query patterns
    this.updateQueryPattern(queryId, metrics);
  }

  // Get performance insights for a specific query
  getQueryInsights(queryId: string): {
    avgExecutionTime: number;
    cacheHitRate: number;
    performanceTrend: 'improving' | 'degrading' | 'stable';
    recommendations: string[];
  } {
    const history = this.performanceHistory.get(queryId) || [];
    if (history.length === 0) {
      return {
        avgExecutionTime: 0,
        cacheHitRate: 0,
        performanceTrend: 'stable',
        recommendations: [],
      };
    }

    const avgExecutionTime = history.reduce((sum, m) => sum + m.executionTime, 0) / history.length;
    const cacheHitRate = history.filter(m => m.cacheHit).length / history.length;

    // Analyze performance trend
    const recentMetrics = history.slice(-10);
    const olderMetrics = history.slice(-20, -10);
    
    let performanceTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (recentMetrics.length > 0 && olderMetrics.length > 0) {
      const recentAvg = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length;
      const olderAvg = olderMetrics.reduce((sum, m) => sum + m.executionTime, 0) / olderMetrics.length;
      
      if (recentAvg < olderAvg * 0.9) {
        performanceTrend = 'improving';
      } else if (recentAvg > olderAvg * 1.1) {
        performanceTrend = 'degrading';
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgExecutionTime > 1000) {
      recommendations.push('Consider adding indexes for frequently filtered columns');
    }
    if (cacheHitRate < 0.3) {
      recommendations.push('Consider increasing cache TTL or improving cache key strategy');
    }
    if (performanceTrend === 'degrading') {
      recommendations.push('Performance is degrading - investigate recent changes');
    }

    return {
      avgExecutionTime,
      cacheHitRate,
      performanceTrend,
      recommendations,
    };
  }

  // Private helper methods
  private optimizeSelectFields<T extends keyof Database['public']['Tables']>(
    select: string[] | undefined,
    table: T
  ): string {
    if (!select || select.length === 0) {
      // Return commonly used fields instead of *
      const commonFields = this.getCommonFields(table);
      return commonFields.join(', ');
    }

    // Remove unnecessary computed fields that might not exist
    const optimizedFields = select.filter(field => {
      return !field.includes('?') && !field.startsWith('_');
    });

    return optimizedFields.length > 0 ? optimizedFields.join(', ') : '*';
  }

  private optimizeFilters<T extends keyof Database['public']['Tables']>(
    filters: Partial<Database['public']['Tables'][T]['Row']>,
    table: T
  ): Record<string, any> {
    const optimizedFilters: Record<string, any> = {};

    // Prioritize indexed fields
    const indexedFields = this.getIndexedFields(table);
    
    // Add indexed fields first
    indexedFields.forEach(field => {
      if (filters[field as keyof typeof filters] !== undefined) {
        optimizedFilters[field] = filters[field as keyof typeof filters];
      }
    });

    // Add other fields
    Object.entries(filters).forEach(([key, value]) => {
      if (!indexedFields.includes(key) && value !== undefined && value !== null) {
        optimizedFilters[key] = value;
      }
    });

    return optimizedFilters;
  }

  private optimizeOrderBy<T extends keyof Database['public']['Tables']>(
    orderBy: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[] | undefined,
    table: T
  ): { canUseIndex: boolean; recommendedIndex?: string } {
    if (!orderBy || orderBy.length === 0) {
      return { canUseIndex: false };
    }

    const indexedFields = this.getIndexedFields(table);
    const orderByFields = orderBy.map(o => o.column as string);

    // Check if we can use an existing index
    const canUseIndex = orderByFields.every(field => indexedFields.includes(field));

    return {
      canUseIndex,
      recommendedIndex: canUseIndex ? undefined : `idx_${table}_${orderByFields.join('_')}`,
    };
  }

  private calculateFilterCost(filters: Record<string, any>, table: keyof Database['public']['Tables']): number {
    const indexedFields = this.getIndexedFields(table);
    let cost = 1;

    Object.keys(filters).forEach(field => {
      if (indexedFields.includes(field)) {
        cost *= 0.1; // Very low cost for indexed fields
      } else {
        cost *= 0.8; // Higher cost for non-indexed fields
      }
    });

    return Math.max(cost, 0.01); // Minimum cost
  }

  private recommendIndex<T extends keyof Database['public']['Tables']>(
    table: T,
    filters: Record<string, any>
  ): string | undefined {
    const indexedFields = this.getIndexedFields(table);
    const filterFields = Object.keys(filters);

    // Find fields that are filtered but not indexed
    const unindexedFields = filterFields.filter(field => !indexedFields.includes(field));

    if (unindexedFields.length > 0) {
      return `idx_${table}_${unindexedFields.join('_')}`;
    }

    return undefined;
  }

  private recommendCacheStrategy<T extends keyof Database['public']['Tables']>(
    table: T,
    options: any
  ): 'aggressive' | 'conservative' | 'none' {
    // Static/reference tables should use aggressive caching
    const staticTables = ['companies', 'products'];
    if (staticTables.includes(table as string)) {
      return 'aggressive';
    }

    // Frequently changing tables should use conservative caching
    const dynamicTables = ['orders', 'order_items'];
    if (dynamicTables.includes(table as string)) {
      return 'conservative';
    }

    // Complex queries should use caching
    if (options.joins && options.joins.length > 0) {
      return 'aggressive';
    }

    return 'conservative';
  }

  private recommendBatchSize<T extends keyof Database['public']['Tables']>(table: T): number {
    const tableComplexity = this.calculateTableComplexity(table);
    
    if (tableComplexity > 0.8) {
      return 50; // Small batches for complex tables
    } else if (tableComplexity > 0.5) {
      return 100; // Medium batches
    } else {
      return 200; // Large batches for simple tables
    }
  }

  private generateOptimizedSQL<T extends keyof Database['public']['Tables']>(
    table: T,
    options: {
      select: string;
      filters: Record<string, any>;
      orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
      limit?: number;
      offset?: number;
    }
  ): string {
    let sql = `SELECT ${options.select} FROM ${table}`;

    // Add WHERE clause
    if (Object.keys(options.filters).length > 0) {
      const whereConditions = Object.keys(options.filters).map((key, index) => `${key} = $${index + 1}`);
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (options.orderBy && options.orderBy.length > 0) {
      const orderByClause = options.orderBy
        .map(o => `${o.column as string} ${o.ascending ? 'ASC' : 'DESC'}`)
        .join(', ');
      sql += ` ORDER BY ${orderByClause}`;
    }

    // Add LIMIT/OFFSET
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    return sql;
  }

  private getCommonFields<T extends keyof Database['public']['Tables']>(table: T): string[] {
    const commonFieldsMap: Record<string, string[]> = {
      users: ['id', 'email', 'role', 'company_id', 'created_at'],
      companies: ['id', 'name', 'industry', 'created_at'],
      contacts: ['id', 'name', 'email', 'type', 'status', 'company_id'],
      products: ['id', 'name', 'sku', 'price', 'stock_quantity', 'status'],
      orders: ['id', 'order_number', 'status', 'total_amount', 'order_date'],
      order_items: ['id', 'product_id', 'quantity', 'unit_price', 'subtotal'],
      wallets: ['id', 'company_id', 'balance', 'currency'],
      investments: ['id', 'amount', 'investment_type', 'status', 'investment_date'],
    };

    return commonFieldsMap[table as string] || ['id', 'created_at'];
  }

  private getIndexedFields<T extends keyof Database['public']['Tables']>(table: T): string[] {
    // These would ideally come from actual database introspection
    const indexedFieldsMap: Record<string, string[]> = {
      users: ['id', 'email', 'company_id'],
      companies: ['id', 'name'],
      contacts: ['id', 'company_id', 'email', 'type'],
      products: ['id', 'company_id', 'sku', 'status'],
      orders: ['id', 'company_id', 'contact_id', 'order_number', 'status'],
      order_items: ['id', 'order_id', 'product_id'],
      wallets: ['id', 'company_id'],
      investments: ['id', 'company_id', 'status'],
    };

    return indexedFieldsMap[table as string] || ['id'];
  }

  private estimateTableSize<T extends keyof Database['public']['Tables']>(table: T): number {
    // Estimated table sizes - would come from actual statistics in production
    const tableSizeMap: Record<string, number> = {
      users: 10000,
      companies: 5000,
      contacts: 50000,
      products: 25000,
      orders: 100000,
      order_items: 500000,
      wallets: 5000,
      investments: 15000,
    };

    return tableSizeMap[table as string] || 1000;
  }

  private calculateOperationComplexity<T extends keyof Database['public']['Tables']>(
    table: T,
    operation: 'insert' | 'update' | 'delete'
  ): number {
    // Base complexity
    let complexity = 0.3;

    // Table-specific complexity
    const tableComplexityMap: Record<string, number> = {
      users: 0.4,
      companies: 0.3,
      contacts: 0.4,
      products: 0.5,
      orders: 0.7,
      order_items: 0.6,
      wallets: 0.5,
      investments: 0.6,
    };

    complexity += tableComplexityMap[table as string] || 0.3;

    // Operation-specific complexity
    if (operation === 'update') {
      complexity += 0.2;
    } else if (operation === 'delete') {
      complexity += 0.3;
    }

    return Math.min(complexity, 1);
  }

  private calculateTableComplexity<T extends keyof Database['public']['Tables']>(table: T): number {
    // Based on number of relationships, constraints, triggers, etc.
    const complexityMap: Record<string, number> = {
      users: 0.4,
      companies: 0.3,
      contacts: 0.5,
      products: 0.6,
      orders: 0.8,
      order_items: 0.7,
      wallets: 0.4,
      investments: 0.5,
    };

    return complexityMap[table as string] || 0.5;
  }

  private estimateExecutionTime(
    recordCount: number,
    batchSize: number,
    maxConcurrency: number,
    complexity: number
  ): number {
    const batches = Math.ceil(recordCount / batchSize);
    const parallelBatches = Math.ceil(batches / maxConcurrency);
    const baseTimePerBatch = 100; // milliseconds
    
    return parallelBatches * baseTimePerBatch * (1 + complexity);
  }

  private updateQueryPattern(queryId: string, metrics: QueryPerformanceMetrics): void {
    // Extract pattern information from queryId (would need more sophisticated parsing)
    const parts = queryId.split(':');
    if (parts.length < 3) return;

    const table = parts[1] as keyof Database['public']['Tables'];
    const operation = parts[2] as 'select' | 'insert' | 'update' | 'delete';

    const pattern = this.queryPatterns.get(queryId) || {
      table,
      operation,
      filters: [],
      joins: [],
      orderBy: [],
      frequency: 0,
      avgExecutionTime: 0,
    };

    pattern.frequency += 1;
    pattern.avgExecutionTime = (pattern.avgExecutionTime * (pattern.frequency - 1) + metrics.executionTime) / pattern.frequency;

    this.queryPatterns.set(queryId, pattern);
  }

  private generateIndexRecommendations(patterns: QueryPattern[]): void {
    this.indexRecommendations = [];

    patterns.forEach(pattern => {
      if (pattern.frequency > 5 && pattern.avgExecutionTime > 500) {
        // Recommend indexes for frequently used, slow queries
        pattern.filters.forEach(filter => {
          const recommendation: IndexRecommendation = {
            table: pattern.table,
            columns: [filter],
            type: 'btree',
            reason: `Frequently filtered column in slow queries (${pattern.frequency} times, avg ${pattern.avgExecutionTime}ms)`,
            estimatedImprovement: Math.min(pattern.avgExecutionTime / 100, 80),
            priority: pattern.avgExecutionTime > 1000 ? 'high' : 'medium',
          };

          this.indexRecommendations.push(recommendation);
        });
      }
    });
  }
}

// Create and export optimizer instance
export const mcpOptimizer = new MCPQueryOptimizer();

// Export utility functions
export function optimizeQuery<T extends keyof Database['public']['Tables']>(
  table: T,
  options: {
    select?: string[];
    filter?: Partial<Database['public']['Tables'][T]['Row']>;
    orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
    limit?: number;
    offset?: number;
  }
): OptimizedQuery {
  return mcpOptimizer.optimizeSelectQuery(table, options);
}

export function recordPerformance(queryId: string, metrics: QueryPerformanceMetrics): void {
  mcpOptimizer.recordQueryPerformance(queryId, metrics);
}

export function getPerformanceInsights(queryId: string) {
  return mcpOptimizer.getQueryInsights(queryId);
}

export function analyzePatterns() {
  return mcpOptimizer.analyzeQueryPatterns();
}