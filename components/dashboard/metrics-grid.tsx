'use client';
import { memo, useMemo } from 'react';
import { StatsCard } from '@/components/ui/stats-card';
import {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertCircle,
  Shield,
  Wallet,
} from 'lucide-react';

interface MetricData {
  title: string;
  value: string;
  change: { value: number; type: 'positive' | 'negative' | 'neutral' };
  icon: React.ReactNode;
}

// Memoized metric data to prevent recreation on every render
const getMetricsData = (): MetricData[] => [
  {
    title: 'Total Revenue',
    value: '₹2,45,000',
    change: { value: 12.5, type: 'positive' as const },
    icon: <DollarSign />,
  },
  {
    title: 'Active Customers',
    value: '1,234',
    change: { value: 8.2, type: 'positive' as const },
    icon: <Users />,
  },
  {
    title: 'Total Orders',
    value: '89',
    change: { value: -2.1, type: 'negative' as const },
    icon: <ShoppingCart />,
  },
  {
    title: 'Monthly Growth',
    value: '15.3%',
    change: { value: 4.1, type: 'positive' as const },
    icon: <TrendingUp />,
  },
  {
    title: 'Products in Stock',
    value: '456',
    change: { value: 0, type: 'neutral' as const },
    icon: <Package />,
  },
  {
    title: 'Low Stock Alerts',
    value: '7',
    change: { value: -12.0, type: 'positive' as const },
    icon: <AlertCircle />,
  },
  {
    title: 'Legal Hygiene Score',
    value: '95/100',
    change: { value: 2.0, type: 'positive' as const },
    icon: <Shield />,
  },
  {
    title: 'Wallet Balance',
    value: '₹85,000',
    change: { value: 5.5, type: 'positive' as const },
    icon: <Wallet />,
  },
];

export const MetricsGrid = memo(function MetricsGrid() {
  // Memoize metrics data to prevent recreation on every render
  const metrics = useMemo(() => getMetricsData(), []);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <StatsCard
          key={`${metric.title}-${index}`} // More stable key
          title={metric.title}
          value={metric.value}
          change={metric.change}
          icon={metric.icon}
        />
      ))}
    </div>
  );
});