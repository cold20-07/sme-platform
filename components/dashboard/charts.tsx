'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 45000, expenses: 35000 },
  { month: 'Feb', revenue: 52000, expenses: 38000 },
  { month: 'Mar', revenue: 48000, expenses: 36000 },
  { month: 'Apr', revenue: 61000, expenses: 42000 },
  { month: 'May', revenue: 55000, expenses: 41000 },
  { month: 'Jun', revenue: 67000, expenses: 45000 },
];

const ownershipData = [
  { name: 'Founders', value: 56.4, color: '#3b82f6' },
  { name: 'Investors', value: 36.1, color: '#10b981' },
  { name: 'ESOP Pool', value: 8.0, color: '#f59e0b' },
];

const complianceData = [
  { month: 'Jan', completed: 12, pending: 3 },
  { month: 'Feb', completed: 15, pending: 2 },
  { month: 'Mar', completed: 18, pending: 1 },
  { month: 'Apr', completed: 14, pending: 4 },
  { month: 'May', completed: 20, pending: 2 },
  { month: 'Jun', completed: 16, pending: 3 },
];

export function RevenueChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Revenue vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
            <Area
              type="monotone"
              dataKey="revenue"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stackId="2"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OwnershipChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ownership Structure</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={ownershipData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {ownershipData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value}%`, '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {ownershipData.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ComplianceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={complianceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completed" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="pending" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}