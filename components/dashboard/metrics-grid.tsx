'use client';
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

const metrics = [
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

export function MetricsGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <StatsCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          icon={metric.icon}
        />
      ))}
    </div>
  );
}