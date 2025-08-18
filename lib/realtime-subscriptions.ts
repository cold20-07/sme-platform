import { RealtimeChannel, RealtimeChannelSendResponse, REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Database } from './database-types';

// Enhanced real-time subscription configuration
export interface RealtimeSubscriptionConfig {
  table: keyof Database['public']['Tables'];
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
  callback: (payload: RealtimePayload) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: REALTIME_SUBSCRIBE_STATES) => void;
  retryConfig?: SubscriptionRetryConfig;
}

// Retry configuration for subscriptions
export interface SubscriptionRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Real-time payload interface
export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
  errors?: any;
  table: string;
  schema: string;
  commit_timestamp: string;
}

// Subscription status interface
export interface SubscriptionStatus {
  id: string;
  table: string;
  event: string;
  status: REALTIME_SUBSCRIBE_STATES;
  isActive: boolean;
  retryCount: number;
  lastError?: Error;
  createdAt: Date;
  lastRetryAt?: Date;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: SubscriptionRetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

// Real-time subscription manager class
export class RealtimeSubscriptionManager {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private subscriptionConfigs: Map<string, RealtimeSubscriptionConfig> = new Map();
  private subscriptionStatuses: Map<string, SubscriptionStatus> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isCleaningUp = false;

  constructor() {
    // Set up global error handling
    this.setupGlobalErrorHandling();
    
    // Set up cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
      window.addEventListener('pagehide', () => this.cleanup());
    }
  }

  /**
   * Subscribe to real-time changes on a table
   */
  subscribe(
    subscriptionId: string,
    config: RealtimeSubscriptionConfig
  ): Promise<RealtimeChannel> {
    return new Promise((resolve, reject) => {
      try {
        // Remove existing subscription if it exists
        this.unsubscribe(subscriptionId);

        // Store configuration for retry purposes
        this.subscriptionConfigs.set(subscriptionId, config);

        // Initialize subscription status
        this.subscriptionStatuses.set(subscriptionId, {
          id: subscriptionId,
          table: config.table,
          event: config.event,
          status: REALTIME_SUBSCRIBE_STATES.JOINING,
          isActive: false,
          retryCount: 0,
          createdAt: new Date(),
        });

        // Create the channel
        const channelName = `${config.table}_${subscriptionId}_${Date.now()}`;
        const channel = supabase.channel(channelName);

        // Set up the subscription
        channel.on(
          'postgres_changes' as any,
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload: any) => {
            try {
              const enhancedPayload: RealtimePayload = {
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old,
                errors: payload.errors,
                table: payload.table,
                schema: payload.schema,
                commit_timestamp: payload.commit_timestamp,
              };
              config.callback(enhancedPayload);
            } catch (error) {
              this.handleSubscriptionError(subscriptionId, error as Error);
            }
          }
        );

        // Handle subscription status changes
        channel.onError((error: Error) => {
          this.handleSubscriptionError(subscriptionId, error);
        });

        // Subscribe to the channel
        channel.subscribe((status: string) => {
          const subscriptionStatus = this.subscriptionStatuses.get(subscriptionId);
          if (subscriptionStatus) {
            subscriptionStatus.status = status as REALTIME_SUBSCRIBE_STATES;
            subscriptionStatus.isActive = status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED;
            
            // Call status change callback if provided
            config.onStatusChange?.(status as REALTIME_SUBSCRIBE_STATES);

            if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
              // Reset retry count on successful subscription
              subscriptionStatus.retryCount = 0;
              subscriptionStatus.lastError = undefined;
              resolve(channel);
            } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
              const error = new Error(`Subscription failed for ${subscriptionId}`);
              this.handleSubscriptionError(subscriptionId, error);
              reject(error);
            }
          }
        });

        // Store the channel
        this.subscriptions.set(subscriptionId, channel);

      } catch (error) {
        this.handleSubscriptionError(subscriptionId, error as Error);
        reject(error);
      }
    });
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): void {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn(`Error removing channel for ${subscriptionId}:`, error);
      }
    }

    // Clear retry timeout
    const timeout = this.retryTimeouts.get(subscriptionId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(subscriptionId);
    }

    // Clean up all related data
    this.subscriptions.delete(subscriptionId);
    this.subscriptionConfigs.delete(subscriptionId);
    this.subscriptionStatuses.delete(subscriptionId);
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    subscriptionIds.forEach(id => this.unsubscribe(id));
  }

  /**
   * Get active subscription IDs
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys()).filter(id => {
      const status = this.subscriptionStatuses.get(id);
      return status?.isActive;
    });
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(subscriptionId: string): SubscriptionStatus | undefined {
    return this.subscriptionStatuses.get(subscriptionId);
  }

  /**
   * Get all subscription statuses
   */
  getAllSubscriptionStatuses(): SubscriptionStatus[] {
    return Array.from(this.subscriptionStatuses.values());
  }

  /**
   * Retry a failed subscription
   */
  private async retrySubscription(subscriptionId: string): Promise<void> {
    const config = this.subscriptionConfigs.get(subscriptionId);
    const status = this.subscriptionStatuses.get(subscriptionId);

    if (!config || !status || this.isCleaningUp) {
      return;
    }

    const retryConfig = config.retryConfig || DEFAULT_RETRY_CONFIG;

    if (status.retryCount >= retryConfig.maxRetries) {
      console.error(`Max retries exceeded for subscription ${subscriptionId}`);
      config.onError?.(new Error(`Max retries exceeded for subscription ${subscriptionId}`));
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, status.retryCount),
      retryConfig.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitteredDelay = delay + Math.random() * 1000;

    status.retryCount++;
    status.lastRetryAt = new Date();

    // Set retry timeout
    const timeout = setTimeout(async () => {
      try {
        await this.subscribe(subscriptionId, config);
      } catch (error) {
        console.error(`Retry failed for subscription ${subscriptionId}:`, error);
      }
    }, jitteredDelay);

    this.retryTimeouts.set(subscriptionId, timeout);
  }

  /**
   * Handle subscription errors
   */
  private handleSubscriptionError(subscriptionId: string, error: Error): void {
    const status = this.subscriptionStatuses.get(subscriptionId);
    const config = this.subscriptionConfigs.get(subscriptionId);

    if (status) {
      status.lastError = error;
      status.isActive = false;
    }

    // Call error callback if provided
    config?.onError?.(error);

    // Log error
    console.error(`Subscription error for ${subscriptionId}:`, error);

    // Attempt retry if not cleaning up
    if (!this.isCleaningUp) {
      this.retrySubscription(subscriptionId);
    }
  }

  /**
   * Set up global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Handle global Supabase realtime errors
    supabase.realtime.onError((error: Error) => {
      console.error('Global Supabase realtime error:', error);
      
      // Attempt to reconnect all subscriptions
      this.reconnectAllSubscriptions();
    });

    // Handle connection state changes
    supabase.realtime.onOpen(() => {
      console.log('Supabase realtime connection opened');
    });

    supabase.realtime.onClose(() => {
      console.log('Supabase realtime connection closed');
    });
  }

  /**
   * Reconnect all subscriptions
   */
  private async reconnectAllSubscriptions(): Promise<void> {
    if (this.isCleaningUp) {
      return;
    }

    const subscriptionIds = Array.from(this.subscriptionConfigs.keys());
    
    for (const subscriptionId of subscriptionIds) {
      const config = this.subscriptionConfigs.get(subscriptionId);
      if (config) {
        try {
          await this.subscribe(subscriptionId, config);
        } catch (error) {
          console.error(`Failed to reconnect subscription ${subscriptionId}:`, error);
        }
      }
    }
  }

  /**
   * Clean up all subscriptions and resources
   */
  cleanup(): void {
    this.isCleaningUp = true;

    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Unsubscribe from all subscriptions
    this.unsubscribeAll();

    // Clear all maps
    this.subscriptions.clear();
    this.subscriptionConfigs.clear();
    this.subscriptionStatuses.clear();
  }

  /**
   * Check if subscription manager is healthy
   */
  isHealthy(): boolean {
    const activeSubscriptions = this.getActiveSubscriptions();
    const totalSubscriptions = this.subscriptions.size;
    
    // Consider healthy if at least 80% of subscriptions are active
    return totalSubscriptions === 0 || (activeSubscriptions.length / totalSubscriptions) >= 0.8;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    totalSubscriptions: number;
    activeSubscriptions: number;
    failedSubscriptions: number;
  } {
    const totalSubscriptions = this.subscriptions.size;
    const activeSubscriptions = this.getActiveSubscriptions().length;
    const failedSubscriptions = Array.from(this.subscriptionStatuses.values())
      .filter(status => status.lastError && !status.isActive).length;

    return {
      isHealthy: this.isHealthy(),
      totalSubscriptions,
      activeSubscriptions,
      failedSubscriptions,
    };
  }
}

// Create singleton instance
export const realtimeManager = new RealtimeSubscriptionManager();

// Convenience functions for common subscription patterns
export const subscribeToTable = (
  subscriptionId: string,
  table: keyof Database['public']['Tables'],
  callback: (payload: RealtimePayload) => void,
  options?: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onError?: (error: Error) => void;
  }
): Promise<RealtimeChannel> => {
  return realtimeManager.subscribe(subscriptionId, {
    table,
    event: options?.event || '*',
    filter: options?.filter,
    callback,
    onError: options?.onError,
  });
};

export const subscribeToUserChanges = (
  userId: string,
  callback: (payload: RealtimePayload) => void
): Promise<RealtimeChannel> => {
  return subscribeToTable(
    `user_${userId}`,
    'users',
    callback,
    {
      filter: `id=eq.${userId}`,
      event: '*',
    }
  );
};

export const subscribeToCompanyChanges = (
  companyId: string,
  callback: (payload: RealtimePayload) => void
): Promise<RealtimeChannel> => {
  return subscribeToTable(
    `company_${companyId}`,
    'companies',
    callback,
    {
      filter: `id=eq.${companyId}`,
      event: '*',
    }
  );
};

export const subscribeToOrderChanges = (
  userId: string,
  callback: (payload: RealtimePayload) => void
): Promise<RealtimeChannel> => {
  return subscribeToTable(
    `orders_${userId}`,
    'orders',
    callback,
    {
      filter: `user_id=eq.${userId}`,
      event: '*',
    }
  );
};

// Export types
export type {
  RealtimeSubscriptionConfig,
  SubscriptionRetryConfig,
  RealtimePayload,
  SubscriptionStatus,
};