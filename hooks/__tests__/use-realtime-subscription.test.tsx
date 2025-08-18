import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the realtime manager using factory function
vi.mock('../../lib/realtime-subscriptions', () => ({
  realtimeManager: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    getSubscriptionStatus: vi.fn(),
    getHealthStatus: vi.fn(),
    getAllSubscriptionStatuses: vi.fn(),
  },
}));

import {
  useRealtimeSubscription,
  useUserRealtimeSubscription,
  useCompanyRealtimeSubscription,
  useMultipleRealtimeSubscriptions,
  useRealtimeHealth,
} from '../use-realtime-subscription';
import { RealtimePayload } from '../../lib/realtime-subscriptions';

describe('useRealtimeSubscription', () => {
  const mockCallback = vi.fn();
  let mockRealtimeManager: any;

  beforeEach(async () => {
    // Get the mocked manager
    const { realtimeManager } = await import('../../lib/realtime-subscriptions');
    mockRealtimeManager = realtimeManager;
    
    vi.clearAllMocks();
    mockRealtimeManager.subscribe.mockResolvedValue({});
    mockRealtimeManager.getSubscriptionStatus.mockReturnValue({
      id: 'test-subscription',
      table: 'users',
      event: '*',
      status: 'SUBSCRIBED',
      isActive: true,
      retryCount: 0,
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe on mount when enabled', async () => {
    const { result } = renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback, {
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockRealtimeManager.subscribe).toHaveBeenCalledWith(
        'test-subscription',
        expect.objectContaining({
          table: 'users',
          event: '*',
          callback: mockCallback,
        })
      );
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should not subscribe when disabled', () => {
    renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback, {
        enabled: false,
      })
    );

    expect(mockRealtimeManager.subscribe).not.toHaveBeenCalled();
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback)
    );

    unmount();

    expect(mockRealtimeManager.unsubscribe).toHaveBeenCalledWith('test-subscription');
  });

  it('should handle subscription errors', async () => {
    const error = new Error('Subscription failed');
    mockRealtimeManager.subscribe.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback)
    );

    await waitFor(() => {
      expect(result.current.error).toBe(error);
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('should reconnect when reconnect is called', async () => {
    const { result } = renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback)
    );

    await act(async () => {
      await result.current.reconnect();
    });

    expect(mockRealtimeManager.unsubscribe).toHaveBeenCalledWith('test-subscription');
    expect(mockRealtimeManager.subscribe).toHaveBeenCalledTimes(2); // Initial + reconnect
  });

  it('should disconnect when disconnect is called', () => {
    const { result } = renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback)
    );

    act(() => {
      result.current.disconnect();
    });

    expect(mockRealtimeManager.unsubscribe).toHaveBeenCalledWith('test-subscription');
  });

  it('should update status periodically', async () => {
    const { result } = renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback)
    );

    await waitFor(() => {
      expect(result.current.status).toBeDefined();
      expect(result.current.status?.id).toBe('test-subscription');
    });
  });

  it('should apply custom event and filter', async () => {
    renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', mockCallback, {
        event: 'UPDATE',
        filter: 'id=eq.123',
      })
    );

    await waitFor(() => {
      expect(mockRealtimeManager.subscribe).toHaveBeenCalledWith(
        'test-subscription',
        expect.objectContaining({
          event: 'UPDATE',
          filter: 'id=eq.123',
        })
      );
    });
  });
});

describe('useUserRealtimeSubscription', () => {
  const mockCallback = vi.fn();
  let mockRealtimeManager: any;

  beforeEach(async () => {
    const { realtimeManager } = await import('../../lib/realtime-subscriptions');
    mockRealtimeManager = realtimeManager;
    vi.clearAllMocks();
    mockRealtimeManager.subscribe.mockResolvedValue({});
  });

  it('should create user-specific subscription', async () => {
    renderHook(() =>
      useUserRealtimeSubscription('user-123', mockCallback)
    );

    await waitFor(() => {
      expect(mockRealtimeManager.subscribe).toHaveBeenCalledWith(
        'user_user-123',
        expect.objectContaining({
          table: 'users',
          filter: 'id=eq.user-123',
          event: '*',
        })
      );
    });
  });
});

describe('useCompanyRealtimeSubscription', () => {
  const mockCallback = vi.fn();
  let mockRealtimeManager: any;

  beforeEach(async () => {
    const { realtimeManager } = await import('../../lib/realtime-subscriptions');
    mockRealtimeManager = realtimeManager;
    vi.clearAllMocks();
    mockRealtimeManager.subscribe.mockResolvedValue({});
  });

  it('should create company-specific subscription', async () => {
    renderHook(() =>
      useCompanyRealtimeSubscription('company-456', mockCallback)
    );

    await waitFor(() => {
      expect(mockRealtimeManager.subscribe).toHaveBeenCalledWith(
        'company_company-456',
        expect.objectContaining({
          table: 'companies',
          filter: 'id=eq.company-456',
          event: '*',
        })
      );
    });
  });
});

describe('useMultipleRealtimeSubscriptions', () => {
  const mockCallback1 = vi.fn();
  const mockCallback2 = vi.fn();
  let mockRealtimeManager: any;

  beforeEach(async () => {
    const { realtimeManager } = await import('../../lib/realtime-subscriptions');
    mockRealtimeManager = realtimeManager;
    vi.clearAllMocks();
    mockRealtimeManager.subscribe.mockResolvedValue({});
    mockRealtimeManager.getSubscriptionStatus.mockReturnValue({
      id: 'test',
      table: 'users',
      event: '*',
      status: 'SUBSCRIBED',
      isActive: true,
      retryCount: 0,
      createdAt: new Date(),
    });
  });

  it('should create multiple subscriptions', async () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        table: 'users' as const,
        callback: mockCallback1,
        event: 'INSERT' as const,
      },
      {
        id: 'subscription-2',
        table: 'companies' as const,
        callback: mockCallback2,
        filter: 'active=eq.true',
      },
    ];

    const { result } = renderHook(() =>
      useMultipleRealtimeSubscriptions(subscriptions)
    );

    await waitFor(() => {
      expect(mockRealtimeManager.subscribe).toHaveBeenCalledTimes(2);
      expect(result.current.subscriptions['subscription-1']).toBeDefined();
      expect(result.current.subscriptions['subscription-2']).toBeDefined();
    });
  });

  it('should report connection status correctly', async () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        table: 'users' as const,
        callback: mockCallback1,
      },
      {
        id: 'subscription-2',
        table: 'companies' as const,
        callback: mockCallback2,
      },
    ];

    const { result } = renderHook(() =>
      useMultipleRealtimeSubscriptions(subscriptions)
    );

    await waitFor(() => {
      expect(result.current.isAllConnected).toBe(true);
      expect(result.current.hasAnyError).toBe(false);
    });
  });

  it('should reconnect all subscriptions', async () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        table: 'users' as const,
        callback: mockCallback1,
      },
    ];

    const { result } = renderHook(() =>
      useMultipleRealtimeSubscriptions(subscriptions)
    );

    await act(async () => {
      await result.current.reconnectAll();
    });

    // Should be called twice: initial + reconnect
    expect(mockRealtimeManager.subscribe).toHaveBeenCalledTimes(2);
  });

  it('should disconnect all subscriptions', () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        table: 'users' as const,
        callback: mockCallback1,
      },
      {
        id: 'subscription-2',
        table: 'companies' as const,
        callback: mockCallback2,
      },
    ];

    const { result } = renderHook(() =>
      useMultipleRealtimeSubscriptions(subscriptions)
    );

    act(() => {
      result.current.disconnectAll();
    });

    expect(mockRealtimeManager.unsubscribe).toHaveBeenCalledWith('subscription-1');
    expect(mockRealtimeManager.unsubscribe).toHaveBeenCalledWith('subscription-2');
  });
});

describe('useRealtimeHealth', () => {
  let mockRealtimeManager: any;

  beforeEach(async () => {
    const { realtimeManager } = await import('../../lib/realtime-subscriptions');
    mockRealtimeManager = realtimeManager;
    vi.clearAllMocks();
    mockRealtimeManager.getHealthStatus.mockReturnValue({
      isHealthy: true,
      totalSubscriptions: 2,
      activeSubscriptions: 2,
      failedSubscriptions: 0,
    });
  });

  it('should return health status', async () => {
    const { result } = renderHook(() => useRealtimeHealth());

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
      expect(result.current.totalSubscriptions).toBe(2);
      expect(result.current.activeSubscriptions).toBe(2);
      expect(result.current.failedSubscriptions).toBe(0);
    });
  });

  it('should update health status periodically', async () => {
    const { result } = renderHook(() => useRealtimeHealth());

    // Change the mock return value
    mockRealtimeManager.getHealthStatus.mockReturnValue({
      isHealthy: false,
      totalSubscriptions: 2,
      activeSubscriptions: 1,
      failedSubscriptions: 1,
    });

    // Wait for the interval to trigger
    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
      expect(result.current.failedSubscriptions).toBe(1);
    }, { timeout: 6000 });
  });

  it('should provide reconnectAll function', () => {
    const { result } = renderHook(() => useRealtimeHealth());

    expect(typeof result.current.reconnectAll).toBe('function');
  });
});

describe('Hook cleanup and memory leaks', () => {
  it('should clean up intervals on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() =>
      useRealtimeSubscription('test-subscription', 'users', vi.fn())
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should update refs when props change', async () => {
    const initialCallback = vi.fn();
    const newCallback = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => useRealtimeSubscription('test-subscription', 'users', callback),
      { initialProps: { callback: initialCallback } }
    );

    // Rerender with new callback
    rerender({ callback: newCallback });

    // The subscription should use the new callback
    await waitFor(() => {
      expect(mockRealtimeManager.subscribe).toHaveBeenCalledWith(
        'test-subscription',
        expect.objectContaining({
          callback: newCallback,
        })
      );
    });
  });
});