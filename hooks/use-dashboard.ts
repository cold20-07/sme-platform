import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase, mcpDb } from '@/lib/supabase';
import { queryKeys, createLoadingState } from '@/lib/react-query';

// Dashboard overview interface
export interface DashboardOverview {
  company_id: string;
  company_name: string;
  total_users: number;
  total_orders: number;
  total_revenue: number;
  active_products: number;
  wallet_balance: number;
  total_investments: number;
}

// Dashboard metrics interface
export interface DashboardMetrics {
  period: string;
  orders: {
    total: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
  revenue: {
    total: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
  customers: {
    total: number;
    new: number;
    growth: number;
  };
  products: {
    total: number;
    low_stock: number;
    out_of_stock: number;
  };
}

// Recent activity interface
export interface RecentActivity {
  id: string;
  type: 'order' | 'product' | 'customer' | 'investment';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  status?: string;
}

// Hook to fetch dashboard overview
export function useDashboardOverview(companyId: string) {
  const query = useQuery({
    queryKey: queryKeys.dashboard.overview(companyId),
    queryFn: async (): Promise<DashboardOverview> => {
      const { data, error } = await supabase
        .from('company_dashboard')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to fetch dashboard metrics with period comparison
export function useDashboardMetrics(companyId: string, period: 'day' | 'week' | 'month' | 'year' = 'month') {
  const query = useQuery({
    queryKey: queryKeys.dashboard.metrics(companyId, period),
    queryFn: async (): Promise<DashboardMetrics> => {
      // Calculate date ranges for current and previous periods
      const now = new Date();
      const currentPeriodStart = new Date();
      const previousPeriodStart = new Date();
      const previousPeriodEnd = new Date();

      switch (period) {
        case 'day':
          currentPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodStart.setDate(now.getDate() - 1);
          previousPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodEnd.setDate(now.getDate() - 1);
          previousPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          currentPeriodStart.setDate(now.getDate() - dayOfWeek);
          currentPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodStart.setDate(currentPeriodStart.getDate() - 7);
          previousPeriodEnd.setDate(previousPeriodStart.getDate() + 6);
          previousPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case 'month':
          currentPeriodStart.setDate(1);
          currentPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodStart.setMonth(now.getMonth() - 1, 1);
          previousPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodEnd.setMonth(now.getMonth(), 0);
          previousPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case 'year':
          currentPeriodStart.setMonth(0, 1);
          currentPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodStart.setFullYear(now.getFullYear() - 1, 0, 1);
          previousPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodEnd.setFullYear(now.getFullYear() - 1, 11, 31);
          previousPeriodEnd.setHours(23, 59, 59, 999);
          break;
      }

      // Fetch current period metrics
      const currentMetrics = await mcpDb.callFunction('get_company_metrics', {
        company_id: companyId,
        date_from: currentPeriodStart.toISOString(),
        date_to: now.toISOString(),
      });

      // Fetch previous period metrics for comparison
      const previousMetrics = await mcpDb.callFunction('get_company_metrics', {
        company_id: companyId,
        date_from: previousPeriodStart.toISOString(),
        date_to: previousPeriodEnd.toISOString(),
      });

      if (currentMetrics.error) throw currentMetrics.error;
      if (previousMetrics.error) throw previousMetrics.error;

      const current = currentMetrics.data?.[0] || {
        total_orders: 0,
        total_revenue: 0,
        avg_order_value: 0,
        customer_count: 0,
      };

      const previous = previousMetrics.data?.[0] || {
        total_orders: 0,
        total_revenue: 0,
        avg_order_value: 0,
        customer_count: 0,
      };

      // Calculate growth percentages and trends
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const getTrend = (growth: number): 'up' | 'down' | 'stable' => {
        if (growth > 5) return 'up';
        if (growth < -5) return 'down';
        return 'stable';
      };

      const orderGrowth = calculateGrowth(current.total_orders, previous.total_orders);
      const revenueGrowth = calculateGrowth(current.total_revenue, previous.total_revenue);
      const customerGrowth = calculateGrowth(current.customer_count, previous.customer_count);

      // Get product counts
      const productsResult = await mcpDb.query({
        table: 'products',
        select: ['id', 'stock_quantity', 'reorder_level'],
        filter: { company_id: companyId, status: 'active' },
      });

      const products = productsResult.data || [];
      const lowStockProducts = products.filter(p => p.stock_quantity <= p.reorder_level);
      const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

      return {
        period,
        orders: {
          total: current.total_orders,
          growth: orderGrowth,
          trend: getTrend(orderGrowth),
        },
        revenue: {
          total: current.total_revenue,
          growth: revenueGrowth,
          trend: getTrend(revenueGrowth),
        },
        customers: {
          total: current.customer_count,
          new: Math.max(0, current.customer_count - previous.customer_count),
          growth: customerGrowth,
        },
        products: {
          total: products.length,
          low_stock: lowStockProducts.length,
          out_of_stock: outOfStockProducts.length,
        },
      };
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to fetch recent activity
export function useRecentActivity(companyId: string, limit: number = 10) {
  const query = useQuery({
    queryKey: [...queryKeys.dashboard.overview(companyId), 'recent-activity', limit],
    queryFn: async (): Promise<RecentActivity[]> => {
      const activities: RecentActivity[] = [];

      // Fetch recent orders
      const ordersResult = await mcpDb.query({
        table: 'orders',
        select: ['id', 'order_number', 'total_amount', 'status', 'created_at'],
        filter: { company_id: companyId },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 5,
      });

      if (ordersResult.data) {
        ordersResult.data.forEach(order => {
          activities.push({
            id: `order-${order.id}`,
            type: 'order',
            title: `Order ${order.order_number}`,
            description: `New order for $${order.total_amount}`,
            timestamp: order.created_at,
            amount: order.total_amount,
            status: order.status,
          });
        });
      }

      // Fetch recent products
      const productsResult = await mcpDb.query({
        table: 'products',
        select: ['id', 'name', 'created_at'],
        filter: { company_id: companyId },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 3,
      });

      if (productsResult.data) {
        productsResult.data.forEach(product => {
          activities.push({
            id: `product-${product.id}`,
            type: 'product',
            title: `Product Added`,
            description: `${product.name} was added to inventory`,
            timestamp: product.created_at,
          });
        });
      }

      // Fetch recent contacts
      const contactsResult = await mcpDb.query({
        table: 'contacts',
        select: ['id', 'name', 'type', 'created_at'],
        filter: { company_id: companyId },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 3,
      });

      if (contactsResult.data) {
        contactsResult.data.forEach(contact => {
          activities.push({
            id: `contact-${contact.id}`,
            type: 'customer',
            title: `New ${contact.type}`,
            description: `${contact.name} was added as a ${contact.type}`,
            timestamp: contact.created_at,
          });
        });
      }

      // Fetch recent investments
      const investmentsResult = await mcpDb.query({
        table: 'investments',
        select: ['id', 'amount', 'investment_type', 'created_at'],
        filter: { company_id: companyId },
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: 2,
      });

      if (investmentsResult.data) {
        investmentsResult.data.forEach(investment => {
          activities.push({
            id: `investment-${investment.id}`,
            type: 'investment',
            title: `New Investment`,
            description: `$${investment.amount} invested in ${investment.investment_type}`,
            timestamp: investment.created_at,
            amount: investment.amount,
          });
        });
      }

      // Sort by timestamp and limit results
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    },
    enabled: !!companyId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });

  return {
    ...query,
    loadingState: createLoadingState(query),
  };
}

// Hook to fetch multiple dashboard data in parallel
export function useDashboardData(companyId: string) {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.overview(companyId),
        queryFn: async (): Promise<DashboardOverview> => {
          const { data, error } = await supabase
            .from('company_dashboard')
            .select('*')
            .eq('company_id', companyId)
            .single();

          if (error) throw error;
          return data;
        },
        enabled: !!companyId,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: queryKeys.dashboard.metrics(companyId, 'month'),
        queryFn: async (): Promise<DashboardMetrics> => {
          // Simplified version - in real implementation, use the full logic from useDashboardMetrics
          const result = await mcpDb.callFunction('get_company_metrics', {
            company_id: companyId,
          });

          if (result.error) throw result.error;

          const data = result.data?.[0] || {
            total_orders: 0,
            total_revenue: 0,
            avg_order_value: 0,
            customer_count: 0,
          };

          return {
            period: 'month',
            orders: { total: data.total_orders, growth: 0, trend: 'stable' },
            revenue: { total: data.total_revenue, growth: 0, trend: 'stable' },
            customers: { total: data.customer_count, new: 0, growth: 0 },
            products: { total: 0, low_stock: 0, out_of_stock: 0 },
          };
        },
        enabled: !!companyId,
        staleTime: 3 * 60 * 1000,
      },
      {
        queryKey: [...queryKeys.dashboard.overview(companyId), 'recent-activity', 10],
        queryFn: async (): Promise<RecentActivity[]> => {
          // Simplified version - fetch only recent orders
          const result = await mcpDb.query({
            table: 'orders',
            select: ['id', 'order_number', 'total_amount', 'status', 'created_at'],
            filter: { company_id: companyId },
            orderBy: [{ column: 'created_at', ascending: false }],
            limit: 10,
          });

          if (result.error) throw result.error;

          return (result.data || []).map(order => ({
            id: `order-${order.id}`,
            type: 'order' as const,
            title: `Order ${order.order_number}`,
            description: `New order for $${order.total_amount}`,
            timestamp: order.created_at,
            amount: order.total_amount,
            status: order.status,
          }));
        },
        enabled: !!companyId,
        staleTime: 1 * 60 * 1000,
      },
    ],
  });

  const [overviewQuery, metricsQuery, activityQuery] = queries;

  return {
    overview: {
      ...overviewQuery,
      loadingState: createLoadingState(overviewQuery),
    },
    metrics: {
      ...metricsQuery,
      loadingState: createLoadingState(metricsQuery),
    },
    recentActivity: {
      ...activityQuery,
      loadingState: createLoadingState(activityQuery),
    },
    // Combined loading state
    isLoading: queries.some(q => q.isLoading),
    isError: queries.some(q => q.isError),
    errors: queries.filter(q => q.error).map(q => q.error),
  };
}