import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseConfig, getApiConfig } from './config';
import type { Database } from './database-types';

// Get validated configuration
const supabaseConfig = getSupabaseConfig();
const apiConfig = getApiConfig();

// Enhanced Supabase client interface for MCP integration
export interface SupabaseMCPClient {
  client: SupabaseClient<Database>;
  mcpEnabled: boolean;
  realTimeSubscriptions: Map<string, RealtimeChannel>;
  retryConfig: RetryConfig;
}

// Retry configuration interface
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Connection status interface
export interface ConnectionStatus {
  isConnected: boolean;
  lastError?: Error;
  retryCount: number;
  lastRetryAt?: Date;
}

// Default retry configuration
const defaultRetryConfig: RetryConfig = {
  maxRetries: apiConfig.maxRetries || 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Connection status tracker
let connectionStatus: ConnectionStatus = {
  isConnected: false,
  retryCount: 0,
};

// Create enhanced Supabase client with retry logic and error handling
function createEnhancedSupabaseClient(): SupabaseClient<Database> {
  const client = createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      heartbeatIntervalMs: 30000,
      reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
    },
    global: {
      headers: {
        'X-Client-Info': 'sme-platform',
        'X-MCP-Enabled': supabaseConfig.enableMCP ? 'true' : 'false',
      },
      fetch: enhancedFetch,
    },
    db: {
      schema: 'public',
    },
  });

  // Set up connection monitoring
  setupConnectionMonitoring(client);

  return client;
}

// Enhanced fetch with retry logic
async function enhancedFetch(
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= defaultRetryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(apiConfig.timeoutMs || 30000),
      });

      // Update connection status on successful response
      if (response.ok) {
        connectionStatus.isConnected = true;
        connectionStatus.retryCount = 0;
        connectionStatus.lastError = undefined;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      connectionStatus.isConnected = false;
      connectionStatus.lastError = lastError;
      connectionStatus.retryCount = attempt + 1;
      connectionStatus.lastRetryAt = new Date();

      // Don't retry on the last attempt
      if (attempt === defaultRetryConfig.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        defaultRetryConfig.baseDelay * Math.pow(defaultRetryConfig.backoffMultiplier, attempt),
        defaultRetryConfig.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError!;
}

// Set up connection monitoring
function setupConnectionMonitoring(client: SupabaseClient<Database>) {
  // Monitor auth state changes
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      connectionStatus.isConnected = true;
      connectionStatus.retryCount = 0;
    } else if (event === 'SIGNED_OUT') {
      connectionStatus.isConnected = false;
    }
  });

  // Set up periodic health check
  setInterval(async () => {
    try {
      const { error } = await client.from('users').select('id').limit(1);
      if (!error) {
        connectionStatus.isConnected = true;
        connectionStatus.retryCount = 0;
      }
    } catch (error) {
      connectionStatus.isConnected = false;
      connectionStatus.lastError = error as Error;
    }
  }, 60000); // Check every minute
}

// Create the enhanced client instance
export const supabase = createEnhancedSupabaseClient();

// MCP-enhanced client wrapper
export const supabaseMCP: SupabaseMCPClient = {
  client: supabase,
  mcpEnabled: supabaseConfig.enableMCP,
  realTimeSubscriptions: new Map(),
  retryConfig: defaultRetryConfig,
};

// Connection status getter
export const getConnectionStatus = (): ConnectionStatus => ({ ...connectionStatus });

// Retry a failed operation
export async function retryOperation<T>(
  operation: () => Promise<T>,
  customRetryConfig?: Partial<RetryConfig>
): Promise<T> {
  const config = { ...defaultRetryConfig, ...customRetryConfig };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === config.maxRetries) {
        break;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Database types are now imported from database-types.ts

// MCP Query interface for enhanced database operations
export interface MCPQuery<T extends keyof Database['public']['Tables']> {
  table: T;
  select?: string[];
  filter?: Partial<Database['public']['Tables'][T]['Row']>;
  orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
  limit?: number;
  offset?: number;
  joins?: string[];
}

// Real-time subscription interface
export interface RealtimeSubscription {
  table: keyof Database['public']['Tables'];
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: any) => void;
}

// Enhanced error types for better error handling
export interface SupabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
}

// MCP operation result interface
export interface MCPOperationResult<T = any> {
  data: T | null;
  error: SupabaseError | null;
  count?: number;
  status: number;
  statusText: string;
}

// MCP-enhanced database operations
export class MCPDatabaseOperations {
  private client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // Enhanced query with MCP optimizations
  async query<T extends keyof Database['public']['Tables']>(
    queryConfig: MCPQuery<T>
  ): Promise<MCPOperationResult<any[]>> {
    try {
      let query = this.client.from(queryConfig.table).select(
        queryConfig.select?.join(', ') || '*'
      );

      // Apply filters
      if (queryConfig.filter) {
        Object.entries(queryConfig.filter).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (queryConfig.orderBy) {
        queryConfig.orderBy.forEach(({ column, ascending }) => {
          query = query.order(column as string, { ascending });
        });
      }

      // Apply pagination
      if (queryConfig.limit) {
        query = query.limit(queryConfig.limit);
      }
      if (queryConfig.offset) {
        query = query.range(queryConfig.offset, queryConfig.offset + (queryConfig.limit || 10) - 1);
      }

      const result = await query;

      return {
        data: result.data,
        error: result.error as SupabaseError | null,
        count: result.count || undefined,
        status: result.status,
        statusText: result.statusText,
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

  // Batch operations for MCP efficiency
  async batchInsert<T extends keyof Database['public']['Tables']>(
    table: T,
    records: any[]
  ): Promise<MCPOperationResult<any[]>> {
    try {
      const result = await this.client.from(table).insert(records).select();

      return {
        data: result.data,
        error: result.error as SupabaseError | null,
        status: result.status,
        statusText: result.statusText,
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

  // Enhanced upsert with conflict resolution
  async upsert<T extends keyof Database['public']['Tables']>(
    table: T,
    record: any,
    onConflict?: string
  ): Promise<MCPOperationResult<any>> {
    try {
      const result = await this.client
        .from(table)
        .upsert(record, { onConflict })
        .select()
        .single();

      return {
        data: result.data,
        error: result.error as SupabaseError | null,
        status: result.status,
        statusText: result.statusText,
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

  // Call database functions with proper typing
  async callFunction(
    functionName: string,
    args: any
  ): Promise<MCPOperationResult<any>> {
    try {
      const result = await this.client.rpc(functionName as string, args);

      return {
        data: result.data,
        error: result.error as SupabaseError | null,
        status: result.status,
        statusText: result.statusText,
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
}

// Legacy real-time subscription manager (deprecated - use realtime-subscriptions.ts instead)
export class RealtimeSubscriptionManager {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
    console.warn('RealtimeSubscriptionManager is deprecated. Use the enhanced version from realtime-subscriptions.ts');
  }

  // Subscribe to real-time changes
  subscribe(
    subscriptionId: string,
    config: RealtimeSubscription
  ): RealtimeChannel {
    // Remove existing subscription if it exists
    this.unsubscribe(subscriptionId);

    const channel = this.client
      .channel(`${config.table}_${subscriptionId}`)
      .on(
        'postgres_changes' as any,
        {
          event: config.event,
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        config.callback
      )
      .subscribe();

    this.subscriptions.set(subscriptionId, channel);
    supabaseMCP.realTimeSubscriptions.set(subscriptionId, channel);

    return channel;
  }

  // Unsubscribe from real-time changes
  unsubscribe(subscriptionId: string): void {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      this.client.removeChannel(channel);
      this.subscriptions.delete(subscriptionId);
      supabaseMCP.realTimeSubscriptions.delete(subscriptionId);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel, id) => {
      this.client.removeChannel(channel);
    });
    this.subscriptions.clear();
    supabaseMCP.realTimeSubscriptions.clear();
  }

  // Get active subscriptions
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Create MCP database operations instance
export const mcpDb = new MCPDatabaseOperations(supabase);

// Create legacy real-time subscription manager instance (deprecated)
export const legacyRealtimeManager = new RealtimeSubscriptionManager(supabase);

// Enhanced error handler for Supabase operations
export function handleSupabaseError(error: any): SupabaseError {
  const supabaseError: SupabaseError = {
    name: 'SupabaseError',
    message: error?.message || 'An unknown error occurred',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };

  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('Supabase Error:', supabaseError);
  }

  return supabaseError;
}

// Health check function
export async function checkSupabaseHealth(): Promise<{
  isHealthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    const latency = Date.now() - startTime;

    if (error) {
      return {
        isHealthy: false,
        latency,
        error: error.message,
      };
    }

    return {
      isHealthy: true,
      latency,
    };
  } catch (error) {
    return {
      isHealthy: false,
      latency: Date.now() - startTime,
      error: (error as Error).message,
    };
  }
}

// Types are already exported as interfaces above