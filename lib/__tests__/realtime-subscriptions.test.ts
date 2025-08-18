import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase using factory function
vi.mock('../supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    onError: vi.fn(),
  };

  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      realtime: {
        onError: vi.fn(),
        onOpen: vi.fn(),
        onClose: vi.fn(),
      },
    },
  };
});

// Now import the modules
import { RealtimeSubscriptionManager, realtimeManager } from '../realtime-subscriptions';

describe('RealtimeSubscriptionManager', () => {
  let manager: RealtimeSubscriptionManager;
  let mockSupabase: any;
  let mockChannel: any;

  beforeEach(async () => {
    // Get the mocked supabase instance
    const { supabase } = await import('../supabase');
    mockSupabase = supabase as any;
    mockChannel = mockSupabase.channel();
    
    manager = new RealtimeSubscriptionManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('subscribe', () => {
    it('should create a subscription successfully', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      // Mock successful subscription
      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      const channel = await manager.subscribe('test-subscription', config);

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('users_test-subscription_')
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: undefined,
        },
        expect.any(Function)
      );
      expect(channel).toBe(mockChannel);
    });

    it('should handle subscription errors', async () => {
      const callback = vi.fn();
      const onError = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
        onError,
      };

      // Mock failed subscription
      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('CHANNEL_ERROR'), 0);
      });

      await expect(manager.subscribe('test-subscription', config)).rejects.toThrow();
      expect(onError).toHaveBeenCalled();
    });

    it('should replace existing subscription with same ID', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      // Create first subscription
      await manager.subscribe('test-subscription', config);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);

      // Create second subscription with same ID
      await manager.subscribe('test-subscription', config);
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
    });

    it('should apply filters correctly', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: 'UPDATE' as const,
        filter: 'id=eq.123',
        callback,
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      await manager.subscribe('test-subscription', config);

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: 'id=eq.123',
        },
        expect.any(Function)
      );
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription and clean up resources', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      await manager.subscribe('test-subscription', config);
      manager.unsubscribe('test-subscription');

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
      expect(manager.getActiveSubscriptions()).toHaveLength(0);
    });

    it('should handle unsubscribing non-existent subscription', () => {
      expect(() => manager.unsubscribe('non-existent')).not.toThrow();
    });
  });

  describe('unsubscribeAll', () => {
    it('should remove all subscriptions', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      await manager.subscribe('subscription-1', config);
      await manager.subscribe('subscription-2', config);

      expect(manager.getActiveSubscriptions()).toHaveLength(2);

      manager.unsubscribeAll();

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
      expect(manager.getActiveSubscriptions()).toHaveLength(0);
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return subscription status', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      await manager.subscribe('test-subscription', config);

      const status = manager.getSubscriptionStatus('test-subscription');
      expect(status).toBeDefined();
      expect(status?.id).toBe('test-subscription');
      expect(status?.table).toBe('users');
      expect(status?.event).toBe('*');
      expect(status?.isActive).toBe(true);
    });

    it('should return undefined for non-existent subscription', () => {
      const status = manager.getSubscriptionStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed subscriptions', async () => {
      const callback = vi.fn();
      const onError = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
        onError,
        retryConfig: {
          maxRetries: 2,
          baseDelay: 100,
          maxDelay: 1000,
          backoffMultiplier: 2,
        },
      };

      let subscribeAttempts = 0;
      mockChannel.subscribe.mockImplementation((statusCallback) => {
        subscribeAttempts++;
        if (subscribeAttempts === 1) {
          setTimeout(() => statusCallback('CHANNEL_ERROR'), 0);
        } else {
          setTimeout(() => statusCallback('SUBSCRIBED'), 0);
        }
      });

      // First attempt should fail and trigger retry
      try {
        await manager.subscribe('test-subscription', config);
      } catch (error) {
        // Expected to fail on first attempt
      }

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(subscribeAttempts).toBeGreaterThan(1);
    });

    it('should stop retrying after max attempts', async () => {
      const callback = vi.fn();
      const onError = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
        onError,
        retryConfig: {
          maxRetries: 1,
          baseDelay: 50,
          maxDelay: 1000,
          backoffMultiplier: 2,
        },
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('CHANNEL_ERROR'), 0);
      });

      try {
        await manager.subscribe('test-subscription', config);
      } catch (error) {
        // Expected to fail
      }

      // Wait for potential retries
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = manager.getSubscriptionStatus('test-subscription');
      expect(status?.retryCount).toBeLessThanOrEqual(1);
    });
  });

  describe('health monitoring', () => {
    it('should report healthy status when all subscriptions are active', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      await manager.subscribe('subscription-1', config);
      await manager.subscribe('subscription-2', config);

      const healthStatus = manager.getHealthStatus();
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.totalSubscriptions).toBe(2);
      expect(healthStatus.activeSubscriptions).toBe(2);
      expect(healthStatus.failedSubscriptions).toBe(0);
    });

    it('should report unhealthy status when subscriptions fail', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      let subscribeCount = 0;
      mockChannel.subscribe.mockImplementation((statusCallback) => {
        subscribeCount++;
        if (subscribeCount === 1) {
          setTimeout(() => statusCallback('SUBSCRIBED'), 0);
        } else {
          setTimeout(() => statusCallback('CHANNEL_ERROR'), 0);
        }
      });

      await manager.subscribe('subscription-1', config);
      
      try {
        await manager.subscribe('subscription-2', config);
      } catch (error) {
        // Expected to fail
      }

      const healthStatus = manager.getHealthStatus();
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.totalSubscriptions).toBe(2);
      expect(healthStatus.activeSubscriptions).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up all resources', async () => {
      const callback = vi.fn();
      const config = {
        table: 'users' as const,
        event: '*' as const,
        callback,
      };

      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 0);
      });

      await manager.subscribe('subscription-1', config);
      await manager.subscribe('subscription-2', config);

      manager.cleanup();

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
      expect(manager.getActiveSubscriptions()).toHaveLength(0);
      expect(manager.getAllSubscriptionStatuses()).toHaveLength(0);
    });
  });
});

describe('Singleton realtimeManager', () => {
  it('should be a singleton instance', () => {
    expect(realtimeManager).toBeInstanceOf(RealtimeSubscriptionManager);
  });

  it('should maintain state across imports', async () => {
    const callback = vi.fn();
    const config = {
      table: 'users' as const,
      event: '*' as const,
      callback,
    };

    mockChannel.subscribe.mockImplementation((statusCallback) => {
      setTimeout(() => statusCallback('SUBSCRIBED'), 0);
    });

    await realtimeManager.subscribe('global-subscription', config);
    expect(realtimeManager.getActiveSubscriptions()).toContain('global-subscription');
  });
});

describe('Payload handling', () => {
  it('should transform payload correctly', async () => {
    const callback = vi.fn();
    const config = {
      table: 'users' as const,
      event: '*' as const,
      callback,
    };

    let payloadHandler: (payload: any) => void;
    mockChannel.on.mockImplementation((event, config, handler) => {
      payloadHandler = handler;
      return mockChannel;
    });

    mockChannel.subscribe.mockImplementation((statusCallback) => {
      setTimeout(() => statusCallback('SUBSCRIBED'), 0);
    });

    await realtimeManager.subscribe('test-subscription', config);

    // Simulate incoming payload
    const mockPayload = {
      eventType: 'INSERT',
      new: { id: 1, name: 'Test User' },
      old: null,
      table: 'users',
      schema: 'public',
      commit_timestamp: '2023-01-01T00:00:00Z',
    };

    payloadHandler!(mockPayload);

    expect(callback).toHaveBeenCalledWith({
      eventType: 'INSERT',
      new: { id: 1, name: 'Test User' },
      old: null,
      errors: undefined,
      table: 'users',
      schema: 'public',
      commit_timestamp: '2023-01-01T00:00:00Z',
    });
  });

  it('should handle callback errors gracefully', async () => {
    const callback = vi.fn().mockImplementation(() => {
      throw new Error('Callback error');
    });
    const onError = vi.fn();
    const config = {
      table: 'users' as const,
      event: '*' as const,
      callback,
      onError,
    };

    let payloadHandler: (payload: any) => void;
    mockChannel.on.mockImplementation((event, config, handler) => {
      payloadHandler = handler;
      return mockChannel;
    });

    mockChannel.subscribe.mockImplementation((statusCallback) => {
      setTimeout(() => statusCallback('SUBSCRIBED'), 0);
    });

    await realtimeManager.subscribe('test-subscription', config);

    const mockPayload = {
      eventType: 'INSERT',
      new: { id: 1, name: 'Test User' },
      table: 'users',
      schema: 'public',
      commit_timestamp: '2023-01-01T00:00:00Z',
    };

    payloadHandler!(mockPayload);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});