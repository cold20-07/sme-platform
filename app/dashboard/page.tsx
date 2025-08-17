import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { RevenueChart, OwnershipChart, ComplianceChart } from '@/components/dashboard/charts';
import { ProactiveInsights } from '@/components/dashboard/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <MetricsGrid />

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RevenueChart />
        <OwnershipChart />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComplianceChart />
        <ProactiveInsights />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm">New order #ORD-1234 received from ABC Corp</span>
              <span className="text-xs text-gray-500 ml-auto">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm">GST return filed successfully</span>
              <span className="text-xs text-gray-500 ml-auto">1 day ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-sm">Low stock alert: Product XYZ needs reorder</span>
              <span className="text-xs text-gray-500 ml-auto">2 days ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm">New customer registration: Tech Solutions Ltd</span>
              <span className="text-xs text-gray-500 ml-auto">3 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}