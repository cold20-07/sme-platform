/**
 * Example usage of the enhanced Supabase client with MCP integration
 * This file demonstrates how to use the new features added in task 4
 */

import { 
  supabase, 
  supabaseMCP, 
  mcpDb, 
  realtimeManager, 
  getConnectionStatus,
  retryOperation,
  handleSupabaseError,
  checkSupabaseHealth,
  type MCPQuery,
  type RealtimeSubscription
} from '../supabase';

// Example 1: Basic MCP query with enhanced error handling
export async function getCompanyUsers(companyId: string) {
  try {
    const queryConfig: MCPQuery<'users'> = {
      table: 'users',
      select: ['id', 'email', 'role', 'full_name', 'last_login'],
      filter: { company_id: companyId },
      orderBy: [{ column: 'created_at', ascending: false }],
      limit: 50
    };

    const result = await mcpDb.query(queryConfig);
    
    if (result.error) {
      throw handleSupabaseError(result.error);
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch company users:', error);
    throw error;
  }
}

// Example 2: Batch operations with retry logic
export async function createMultipleContacts(contacts: any[]) {
  return retryOperation(async () => {
    const result = await mcpDb.batchInsert('contacts', contacts);
    
    if (result.error) {
      throw handleSupabaseError(result.error);
    }

    return result.data;
  }, {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2
  });
}

// Example 3: Real-time subscriptions for live updates
export function subscribeToOrderUpdates(companyId: string, callback: (order: any) => void) {
  const subscriptionConfig: RealtimeSubscription = {
    table: 'orders',
    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
    filter: `company_id=eq.${companyId}`,
    callback: (payload) => {
      console.log('Order update received:', payload);
      callback(payload.new || payload.old);
    }
  };

  return realtimeManager.subscribe(`orders_${companyId}`, subscriptionConfig);
}

// Example 4: Enhanced upsert with conflict resolution
export async function upsertProduct(product: any) {
  try {
    const result = await mcpDb.upsert('products', product, 'sku');
    
    if (result.error) {
      throw handleSupabaseError(result.error);
    }

    return result.data;
  } catch (error) {
    console.error('Failed to upsert product:', error);
    throw error;
  }
}

// Example 5: Database function calls
export async function getCompanyMetrics(companyId: string, dateFrom?: string, dateTo?: string) {
  try {
    const result = await mcpDb.callFunction('get_company_metrics', {
      company_id: companyId,
      date_from: dateFrom,
      date_to: dateTo
    });

    if (result.error) {
      throw handleSupabaseError(result.error);
    }

    return result.data;
  } catch (error) {
    console.error('Failed to get company metrics:', error);
    throw error;
  }
}

// Example 6: Connection monitoring and health checks
export async function monitorConnection() {
  // Check current connection status
  const status = getConnectionStatus();
  console.log('Connection status:', status);

  // Perform health check
  const health = await checkSupabaseHealth();
  console.log('Health check:', health);

  if (!health.isHealthy) {
    console.warn('Supabase connection is unhealthy:', health.error);
  }

  return { status, health };
}

// Example 7: MCP-enabled client usage
export function getMCPClientInfo() {
  return {
    mcpEnabled: supabaseMCP.mcpEnabled,
    activeSubscriptions: supabaseMCP.realTimeSubscriptions.size,
    retryConfig: supabaseMCP.retryConfig,
    connectionStatus: getConnectionStatus()
  };
}

// Example 8: Complex query with joins (using raw Supabase client for advanced features)
export async function getOrdersWithDetails(companyId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        contacts:contact_id (
          name,
          email,
          type
        ),
        order_items (
          *,
          products:product_id (
            name,
            sku,
            price
          )
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw handleSupabaseError(error);
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch orders with details:', error);
    throw error;
  }
}

// Example 9: Cleanup subscriptions
export function cleanupSubscriptions() {
  realtimeManager.unsubscribeAll();
  console.log('All real-time subscriptions cleaned up');
}

// Example 10: Error handling with retry for critical operations
export async function criticalDatabaseOperation(operation: () => Promise<any>) {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const health = await checkSupabaseHealth();
      
      if (!health.isHealthy) {
        throw new Error(`Database unhealthy: ${health.error}`);
      }

      return await retryOperation(operation, {
        maxRetries: 3,
        baseDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2
      });
    } catch (error) {
      attempt++;
      console.error(`Critical operation failed (attempt ${attempt}):`, error);
      
      if (attempt >= maxRetries) {
        throw new Error(`Critical operation failed after ${maxRetries} attempts: ${error}`);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, attempt * 5000));
    }
  }
}