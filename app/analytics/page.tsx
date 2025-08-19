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


const analyticsData = [
  { metric: 'Active Users', value: 1200 },
  { metric: 'Sessions', value: 3400 },
  { metric: 'Conversion Rate', value: '4.2%' },
  { metric: 'Revenue', value: '₹2,50,000' },
  { metric: 'Churn Rate', value: '1.1%' },
  { metric: 'Avg. Session Duration', value: '3m 20s' },
];

const trafficSources = [
  { source: 'Organic Search', percent: 48 },
  { source: 'Direct', percent: 22 },
  { source: 'Referral', percent: 18 },
  { source: 'Social', percent: 12 },
];

const conversionFunnel = [
  { stage: 'Visited', value: 3400 },
  { stage: 'Signed Up', value: 800 },
  { stage: 'Activated', value: 500 },
  { stage: 'Paid', value: 120 },
];

const monthlyTrend = [
  { month: 'Mar', users: 900 },
  { month: 'Apr', users: 1000 },
  { month: 'May', users: 1100 },
  { month: 'Jun', users: 1150 },
  { month: 'Jul', users: 1200 },
  { month: 'Aug', users: 1250 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Overview</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
        {analyticsData.map((item, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-sm text-muted-foreground">{item.metric}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Traffic Sources Breakdown */}
      <div className="mt-8">
        <Card>
          <CardHeader><CardTitle>Traffic Sources</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {trafficSources.map((src, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="font-medium">{src.source}</span>
                  <span className="text-blue-600 font-bold">{src.percent}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <div className="mt-8">
        <Card>
          <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {conversionFunnel.map((stage, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-lg font-bold">{stage.value}</div>
                  <div className="text-xs text-gray-600">{stage.stage}</div>
                  {idx < conversionFunnel.length - 1 && (
                    <span className="mx-2 text-gray-400">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Active Users Trend - Styled Line Chart */}
      <div className="mt-8">
        <Card>
          <CardHeader><CardTitle>Monthly Active Users Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 14 }} />
                <YAxis tick={{ fontSize: 14 }} />
                <Tooltip formatter={(v: number) => [`${v}`, 'Users']} />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} dot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-4 text-sm text-gray-600">
              {monthlyTrend.map((d, idx) => (
                <div key={idx}>{d.month}: {d.users}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
