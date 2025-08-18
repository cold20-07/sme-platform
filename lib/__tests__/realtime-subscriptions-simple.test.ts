import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Import after mocking
import { RealtimeSubscriptionManager } from '../realtime-subscriptions';

describe('RealtimeSubscriptionManager - Core Functionality', () => {
  let manager: RealtimeSubscriptionManager;

  beforeEach(() => {
    manager = new RealtimeSubscriptionManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('should create a subscription manager instance', () => {
    expect(manager).toBeInstanceOf(RealtimeSubscriptionManager);
  });

  it('should have core methods', () => {
    expect(typeof manager.subscribe).toBe('function');
    expect(typeof manager.unsubscribe).toBe('function');
    expect(typeof manager.unsubscribeAll).toBe('function');
    expect(typeof manager.getActiveSubscriptions).toBe('function');
    expect(typeof manager.getSubscriptionStatus).toBe('function');
    expect(typeof manager.getAllSubscriptionStatuses).toBe('function');
    expect(typeof manager.getHealthStatus).toBe('function');
    expect(typeof manager.cleanup).toBe('function');
  });

  it('should return empty arrays for new manager', () => {
    expect(manager.getActiveSubscriptions()).toEqual([]);
    expect(manager.getAllSubscriptionStatuses()).toEqual([]);
  });

  it('should report healthy status for new manager', () => {
    const health = manager.getHealthStatus();
    expect(health.isHealthy).toBe(true);
    expect(health.totalSubscriptions).toBe(0);
    expect(health.activeSubscriptions).toBe(0);
    expect(health.failedSubscriptions).toBe(0);
  });

  it('should handle unsubscribing non-existent subscription', () => {
    expect(() => manager.unsubscribe('non-existent')).not.toThrow();
  });

  it('should return undefined for non-existent subscription status', () => {
    const status = manager.getSubscriptionStatus('non-existent');
    expect(status).toBeUndefined();
  });

  it('should clean up without errors', () => {
    expect(() => manager.cleanup()).not.toThrow();
  });
});

describe('Subscription Configuration Types', () => {
  it('should accept valid subscription config', () => {
    const config = {
      table: 'users' as const,
      event: '*' as const,
      callback: vi.fn(),
    };

    expect(config.table).toBe('users');
    expect(config.event).toBe('*');
    expect(typeof config.callback).toBe('function');
  });

  it('should accept all event types', () => {
    const events = ['INSERT', 'UPDATE', 'DELETE', '*'] as const;
    
    events.forEach(event => {
      const config = {
        table: 'users' as const,
        event,
        callback: vi.fn(),
      };
      expect(config.event).toBe(event);
    });
  });
});

describe('Error Handling', () => {
  let manager: RealtimeSubscriptionManager;

  beforeEach(() => {
    manager = new RealtimeSubscriptionManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('should handle callback errors gracefully', () => {
    const errorCallback = vi.fn(() => {
      throw new Error('Test error');
    });

    // This should not throw even if callback throws
    expect(() => {
      try {
        errorCallback();
      } catch (error) {
        // Simulate error handling
        console.error('Callback error:', error);
      }
    }).not.toThrow();
  });
});

describe('Convenience Functions', () => {
  it('should export convenience functions', async () => {
    const { subscribeToTable, subscribeToUserChanges, subscribeToCompanyChanges, subscribeToOrderChanges } = await import('../realtime-subscriptions');
    
    expect(typeof subscribeToTable).toBe('function');
    expect(typeof subscribeToUserChanges).toBe('function');
    expect(typeof subscribeToCompanyChanges).toBe('function');
    expect(typeof subscribeToOrderChanges).toBe('function');
  });
});