import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  realtimeManager,
  RealtimeSubscriptionConfig,
  RealtimePayload,
  SubscriptionStatus,
} from '../lib/realtime-subscriptions';
import type { Database } from '../lib/database-types';

// Hook options interface
export interface UseRealtimeSubscriptionOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onStatusChange?: (status: string) => void;
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
}

// Hook return type
export interface UseRealtimeSubscriptionReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  status: SubscriptionStatus | null;
  reconnect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Hook for managing real-time subscriptions
 */
export function useRealtimeSubscription(
  subscriptionId: string,
  table: keyof Database['public']['Tables'],
  callback: (payload: RealtimePayload) => void,
  options: UseRealtimeSubscriptionOptions & {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
  } = {}
): UseRealtimeSubscriptionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);
  const optionsRef = useRef(options);

  // Update refs when props change
  useEffect(() => {
    callbackRef.current = callback;
    optionsRef.current = options;
  }, [callback, options]);

  // Subscribe function
  const subscribe = useCallback(async () => {
    if (!optionsRef.current.enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const config: RealtimeSubscriptionConfig = {
        table,
        event: optionsRef.current.event || '*',
        filter: optionsRef.current.filter,
        callback: callbackRef.current,
        onError: (err: Error) => {
          setError(err);
          setIsConnected(false);
          optionsRef.current.onError?.(err);
        },
        onStatusChange: (statusChange: string) => {
          setIsConnected(statusChange === 'SUBSCRIBED');
          optionsRef.current.onStatusChange?.(statusChange);
        },
        retryConfig: optionsRef.current.retryConfig,
      };

      const channel = await realtimeManager.subscribe(subscriptionId, config);
      channelRef.current = channel;
      setIsConnected(true);
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId, table]);

  // Disconnect function
  const disconnect = useCallback(() => {
    realtimeManager.unsubscribe(subscriptionId);
    channelRef.current = null;
    setIsConnected(false);
    setError(null);
    setStatus(null);
  }, [subscriptionId]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    disconnect();
    await subscribe();
  }, [disconnect, subscribe]);

  // Update status periodically
  useEffect(() => {
    if (!optionsRef.current.enabled) {
      return;
    }

    const interval = setInterval(() => {
      const currentStatus = realtimeManager.getSubscriptionStatus(subscriptionId);
      setStatus(currentStatus || null);
    }, 1000);

    return () => clearInterval(interval);
  }, [subscriptionId, options.enabled]);

  // Subscribe on mount and when dependencies change
  useEffect(() => {
    if (options.enabled !== false) {
      subscribe();
    }

    return () => {
      disconnect();
    };
  }, [subscriptionId, table, options.enabled, subscribe, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isLoading,
    error,
    retryCount: status?.retryCount || 0,
    status,
    reconnect,
    disconnect,
  };
}

/**
 * Hook for subscribing to user-specific changes
 */
export function useUserRealtimeSubscription(
  userId: string,
  callback: (payload: RealtimePayload) => void,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn {
  return useRealtimeSubscription(
    `user_${userId}`,
    'users',
    callback,
    {
      ...options,
      filter: `id=eq.${userId}`,
      event: '*',
    }
  );
}

/**
 * Hook for subscribing to company-specific changes
 */
export function useCompanyRealtimeSubscription(
  companyId: string,
  callback: (payload: RealtimePayload) => void,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn {
  return useRealtimeSubscription(
    `company_${companyId}`,
    'companies',
    callback,
    {
      ...options,
      filter: `id=eq.${companyId}`,
      event: '*',
    }
  );
}

/**
 * Hook for subscribing to order changes for a specific user
 */
export function useOrderRealtimeSubscription(
  userId: string,
  callback: (payload: RealtimePayload) => void,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn {
  return useRealtimeSubscription(
    `orders_${userId}`,
    'orders',
    callback,
    {
      ...options,
      filter: `user_id=eq.${userId}`,
      event: '*',
    }
  );
}

/**
 * Hook for subscribing to product changes
 */
export function useProductRealtimeSubscription(
  callback: (payload: RealtimePayload) => void,
  options: UseRealtimeSubscriptionOptions & {
    companyId?: string;
  } = {}
): UseRealtimeSubscriptionReturn {
  const subscriptionId = options.companyId 
    ? `products_company_${options.companyId}`
    : 'products_all';
    
  const filter = options.companyId 
    ? `company_id=eq.${options.companyId}`
    : undefined;

  return useRealtimeSubscription(
    subscriptionId,
    'products',
    callback,
    {
      ...options,
      filter,
      event: '*',
    }
  );
}

/**
 * Hook for subscribing to wallet changes for a specific user
 */
export function useWalletRealtimeSubscription(
  userId: string,
  callback: (payload: RealtimePayload) => void,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn {
  return useRealtimeSubscription(
    `wallet_${userId}`,
    'wallets',
    callback,
    {
      ...options,
      filter: `user_id=eq.${userId}`,
      event: '*',
    }
  );
}

/**
 * Hook for managing multiple subscriptions
 */
export function useMultipleRealtimeSubscriptions(
  subscriptions: Array<{
    id: string;
    table: keyof Database['public']['Tables'];
    callback: (payload: RealtimePayload) => void;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
  }>,
  options: UseRealtimeSubscriptionOptions = {}
): {
  subscriptions: Record<string, UseRealtimeSubscriptionReturn>;
  isAllConnected: boolean;
  hasAnyError: boolean;
  reconnectAll: () => Promise<void>;
  disconnectAll: () => void;
} {
  const subscriptionResults: Record<string, UseRealtimeSubscriptionReturn> = {};

  // Create individual subscriptions
  subscriptions.forEach(sub => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    subscriptionResults[sub.id] = useRealtimeSubscription(
      sub.id,
      sub.table,
      sub.callback,
      {
        ...options,
        event: sub.event,
        filter: sub.filter,
      }
    );
  });

  const isAllConnected = Object.values(subscriptionResults).every(
    result => result.isConnected
  );

  const hasAnyError = Object.values(subscriptionResults).some(
    result => result.error !== null
  );

  const reconnectAll = useCallback(async () => {
    await Promise.all(
      Object.values(subscriptionResults).map(result => result.reconnect())
    );
  }, [subscriptionResults]);

  const disconnectAll = useCallback(() => {
    Object.values(subscriptionResults).forEach(result => result.disconnect());
  }, [subscriptionResults]);

  return {
    subscriptions: subscriptionResults,
    isAllConnected,
    hasAnyError,
    reconnectAll,
    disconnectAll,
  };
}

/**
 * Hook for monitoring real-time subscription health
 */
export function useRealtimeHealth(): {
  isHealthy: boolean;
  totalSubscriptions: number;
  activeSubscriptions: number;
  failedSubscriptions: number;
  reconnectAll: () => Promise<void>;
} {
  const [healthStatus, setHealthStatus] = useState({
    isHealthy: true,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    failedSubscriptions: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const status = realtimeManager.getHealthStatus();
      setHealthStatus(status);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const reconnectAll = useCallback(async () => {
    // This would need to be implemented in the manager
    // For now, we'll just refresh the health status
    const status = realtimeManager.getHealthStatus();
    setHealthStatus(status);
  }, []);

  return {
    ...healthStatus,
    reconnectAll,
  };
}