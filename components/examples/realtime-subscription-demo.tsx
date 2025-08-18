'use client';

import React, { useState, useCallback } from 'react';
import {
  useRealtimeSubscription,
  useUserRealtimeSubscription,
  useCompanyRealtimeSubscription,
  useOrderRealtimeSubscription,
  useProductRealtimeSubscription,
  useMultipleRealtimeSubscriptions,
} from '../../hooks/use-realtime-subscription';
import { RealtimePayload } from '../../lib/realtime-subscriptions';
import { RealtimeStatus, RealtimeDebugPanel } from '../ui/realtime-status';

interface RealtimeEvent {
  id: string;
  timestamp: Date;
  table: string;
  event: string;
  data: any;
}

export function RealtimeSubscriptionDemo() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(false);

  // Generic event handler
  const handleRealtimeEvent = useCallback((table: string) => {
    return (payload: RealtimePayload) => {
      const event: RealtimeEvent = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        table: payload.table,
        event: payload.eventType,
        data: payload.new || payload.old,
      };
      
      setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
    };
  }, []);

  // User subscription
  const userSubscription = useUserRealtimeSubscription(
    selectedUserId,
    handleRealtimeEvent('users'),
    {
      enabled: subscriptionsEnabled && !!selectedUserId,
      onError: (error) => console.error('User subscription error:', error),
    }
  );

  // Company subscription
  const companySubscription = useCompanyRealtimeSubscription(
    selectedCompanyId,
    handleRealtimeEvent('companies'),
    {
      enabled: subscriptionsEnabled && !!selectedCompanyId,
      onError: (error) => console.error('Company subscription error:', error),
    }
  );

  // Order subscription
  const orderSubscription = useOrderRealtimeSubscription(
    selectedUserId,
    handleRealtimeEvent('orders'),
    {
      enabled: subscriptionsEnabled && !!selectedUserId,
      onError: (error) => console.error('Order subscription error:', error),
    }
  );

  // Product subscription
  const productSubscription = useProductRealtimeSubscription(
    handleRealtimeEvent('products'),
    {
      enabled: subscriptionsEnabled,
      companyId: selectedCompanyId || undefined,
      onError: (error) => console.error('Product subscription error:', error),
    }
  );

  // Multiple subscriptions example
  const multipleSubscriptions = useMultipleRealtimeSubscriptions(
    [
      {
        id: 'all_users',
        table: 'users',
        callback: handleRealtimeEvent('users'),
        event: 'INSERT',
      },
      {
        id: 'all_companies',
        table: 'companies',
        callback: handleRealtimeEvent('companies'),
        event: '*',
      },
    ],
    {
      enabled: subscriptionsEnabled,
      onError: (error) => console.error('Multiple subscriptions error:', error),
    }
  );

  const clearEvents = () => setEvents([]);

  const getSubscriptionStatus = (subscription: any) => {
    if (subscription.isLoading) return '🟡 Connecting...';
    if (subscription.error) return `🔴 Error: ${subscription.error.message}`;
    if (subscription.isConnected) return '🟢 Connected';
    return '⚪ Disconnected';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Real-time Subscription Demo</h1>
        <RealtimeStatus showDetails={true} className="mb-4" />
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h2 className="text-lg font-semibold mb-4">Subscription Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              User ID (for user and order subscriptions)
            </label>
            <input
              type="text"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Company ID (for company and product subscriptions)
            </label>
            <input
              type="text"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              placeholder="Enter company ID"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={subscriptionsEnabled}
              onChange={(e) => setSubscriptionsEnabled(e.target.checked)}
              className="mr-2"
            />
            Enable Subscriptions
          </label>
          
          <button
            onClick={clearEvents}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear Events
          </button>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h2 className="text-lg font-semibold mb-4">Subscription Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>User Subscription:</span>
              <span className="text-sm">{getSubscriptionStatus(userSubscription)}</span>
            </div>
            <div className="flex justify-between">
              <span>Company Subscription:</span>
              <span className="text-sm">{getSubscriptionStatus(companySubscription)}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Subscription:</span>
              <span className="text-sm">{getSubscriptionStatus(orderSubscription)}</span>
            </div>
            <div className="flex justify-between">
              <span>Product Subscription:</span>
              <span className="text-sm">{getSubscriptionStatus(productSubscription)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Multiple Subscriptions:</span>
              <span className="text-sm">
                {multipleSubscriptions.isAllConnected ? '🟢 All Connected' : 
                 multipleSubscriptions.hasAnyError ? '🔴 Has Errors' : '🟡 Connecting'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Active: {Object.values(multipleSubscriptions.subscriptions).filter(s => s.isConnected).length} / {Object.keys(multipleSubscriptions.subscriptions).length}
            </div>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => userSubscription.reconnect()}
            disabled={userSubscription.isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Reconnect User
          </button>
          <button
            onClick={() => multipleSubscriptions.reconnectAll()}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Reconnect All Multiple
          </button>
        </div>
      </div>

      {/* Events Log */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Real-time Events ({events.length})</h2>
        
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No events received yet. Enable subscriptions and make changes to see real-time updates.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{event.table}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      event.event === 'INSERT' ? 'bg-green-100 text-green-800' :
                      event.event === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                      event.event === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.event}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <RealtimeDebugPanel />
    </div>
  );
}

// Simple usage examples for different scenarios
export function SimpleUserSubscriptionExample() {
  const [userId] = useState('user-123');
  const [userData, setUserData] = useState<any>(null);

  const { isConnected, error } = useUserRealtimeSubscription(
    userId,
    (payload) => {
      if (payload.eventType === 'UPDATE') {
        setUserData(payload.new);
      }
    }
  );

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">User Data Sync</h3>
      <div className="text-sm mb-2">
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        {error && <span className="text-red-600 ml-2">Error: {error.message}</span>}
      </div>
      {userData && (
        <pre className="text-xs bg-gray-100 p-2 rounded">
          {JSON.stringify(userData, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function SimpleProductListExample() {
  const [products, setProducts] = useState<any[]>([]);
  const [companyId] = useState('company-456');

  const { isConnected } = useProductRealtimeSubscription(
    (payload) => {
      setProducts(prev => {
        switch (payload.eventType) {
          case 'INSERT':
            return [...prev, payload.new];
          case 'UPDATE':
            return prev.map(p => p.id === payload.new.id ? payload.new : p);
          case 'DELETE':
            return prev.filter(p => p.id !== payload.old.id);
          default:
            return prev;
        }
      });
    },
    { companyId }
  );

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">
        Product List (Company: {companyId})
        {isConnected ? ' 🟢' : ' 🔴'}
      </h3>
      <div className="text-sm">
        {products.length} products
      </div>
    </div>
  );
}