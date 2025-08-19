"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/ui/chart-wrapper';


// Enhanced mock data for dashboard
const metrics = {
  totalContacts: 42,
  totalProducts: 17,
  totalOrders: 8,
  totalRevenue: 1250000,
  activeUsers: 1200,
  conversionRate: '4.2%',
  churnRate: '1.1%',
};

const recentActivity = [
  { type: 'Order', order_number: 'ORD-1234', created_at: '2025-08-18T10:15:00Z', detail: 'New order received from ABC Corp.' },
  { type: 'Contact', order_number: '', created_at: '2025-08-17T14:30:00Z', detail: 'New contact added: Priya Patel.' },
  { type: 'Product', order_number: '', created_at: '2025-08-16T09:45:00Z', detail: 'Product B stock updated.' },
  { type: 'Order', order_number: 'ORD-1233', created_at: '2025-08-15T16:20:00Z', detail: 'Order ORD-1233 marked as delivered.' },
  { type: 'Insight', order_number: '', created_at: '2025-08-14T11:05:00Z', detail: 'Conversion rate improved by 0.5%.' },
];

const revenueChartData = [
  { month: 'Mar', revenue: 900000 },
  { month: 'Apr', revenue: 1000000 },
  { month: 'May', revenue: 1100000 },
  { month: 'Jun', revenue: 1200000 },
  { month: 'Jul', revenue: 1250000 },
  { month: 'Aug', revenue: 1300000 },
];

const insights = [
  { title: 'Top Product', value: 'Product B', description: 'Highest sales this month.' },
  { title: 'Best Customer', value: 'ABC Corp', description: 'Most orders placed.' },
  { title: 'Low Stock Alert', value: 'Product C', description: 'Stock below reorder level.' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{metrics.totalContacts}</div><p className="text-sm text-muted-foreground">Total Contacts</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{metrics.totalProducts}</div><p className="text-sm text-muted-foreground">Total Products</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{metrics.totalOrders}</div><p className="text-sm text-muted-foreground">Total Orders</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString()}</div><p className="text-sm text-muted-foreground">Total Revenue</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{metrics.activeUsers}</div><p className="text-sm text-muted-foreground">Active Users</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{metrics.conversionRate}</div><p className="text-sm text-muted-foreground">Conversion Rate</p></CardContent></Card>
      </div>

      {/* Revenue Chart - Styled Line Chart */}
      <div className="mt-8">
        <Card>
          <CardHeader><CardTitle>Revenue Trend (Last 6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 14 }} />
                <YAxis tickFormatter={(v: number) => `₹${v/1000}k`} tick={{ fontSize: 14 }} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-4 text-sm text-gray-600">
              {revenueChartData.map((d, idx) => (
                <div key={idx}>{d.month}: ₹{d.revenue.toLocaleString()}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mt-8">
        {insights.map((insight, idx) => (
          <Card key={idx}>
            <CardHeader><CardTitle>{insight.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xl font-bold mb-2">{insight.value}</div>
              <div className="text-sm text-gray-600">{insight.description}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Timeline */}
      <div className="mt-8">
        <Card>
          <CardHeader><CardTitle>Recent Activity Timeline</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {recentActivity.map((item, idx) => (
                <li key={idx} className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
                  <div>
                    <span className="font-medium">{item.type}</span>
                    {item.order_number && (
                      <span className="ml-2 text-xs text-gray-500">{item.order_number}</span>
                    )}
                    <span className="ml-2 text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</span>
                    <span className="ml-2 text-gray-700">{item.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Order {item.order_number}</span>
                <span className="text-xs text-gray-500 ml-auto">{new Date(item.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
