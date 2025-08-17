'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  Plus, 
  Minus,
  PieChart,
  Calendar,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data
const walletBalance = 85000;
const monthlyRevenue = 60000;
const monthlyExpenses = 49955;
const netBurn = monthlyRevenue - monthlyExpenses;
const runway = walletBalance / Math.abs(netBurn);

const investmentData = [
  { type: 'Fixed Deposit', amount: 25000, return: 6.5, status: 'active' },
  { type: 'Liquid Fund', amount: 15000, return: 4.2, status: 'active' },
  { type: 'Govt. Bonds', amount: 20000, return: 7.1, status: 'active' },
];

const performanceData = [
  { month: 'Jan', balance: 75000, investment: 50000 },
  { month: 'Feb', balance: 78000, investment: 52000 },
  { month: 'Mar', balance: 82000, investment: 55000 },
  { month: 'Apr', balance: 79000, investment: 58000 },
  { month: 'May', balance: 83000, investment: 60000 },
  { month: 'Jun', balance: 85000, investment: 60000 },
];

const allocationData = [
  { name: 'Wallet Balance', value: 25000, color: '#3b82f6' },
  { name: 'Fixed Deposit', value: 25000, color: '#10b981' },
  { name: 'Liquid Fund', value: 15000, color: '#f59e0b' },
  { name: 'Govt. Bonds', value: 20000, color: '#8b5cf6' },
];

const recentTransactions = [
  { id: 1, type: 'credit', amount: 15000, description: 'Client Payment - ABC Corp', date: '2024-01-15' },
  { id: 2, type: 'debit', amount: 5000, description: 'Investment in Liquid Fund', date: '2024-01-14' },
  { id: 3, type: 'credit', amount: 8500, description: 'Investment Return - Fixed Deposit', date: '2024-01-12' },
  { id: 4, type: 'debit', amount: 12000, description: 'Vendor Payment - XYZ Suppliers', date: '2024-01-10' },
];

export default function WalletPage() {
  const [parkAmount, setParkAmount] = useState('');

  const totalInvestments = investmentData.reduce((sum, inv) => sum + inv.amount, 0);
  const avgReturn = investmentData.reduce((sum, inv) => sum + (inv.return * inv.amount), 0) / totalInvestments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallet & Investments</h1>
          <p className="text-gray-600 mt-1">
            Manage your funds and park surplus money for optimal returns
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Money
          </Button>
          <Button>
            <TrendingUp className="mr-2 h-4 w-4" />
            Park Funds
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">₹{walletBalance.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">₹{totalInvestments.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Investments</p>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="mr-1 h-3 w-3" />
              {avgReturn.toFixed(1)}% avg return
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {netBurn >= 0 ? '+' : ''}₹{netBurn.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Monthly Net Cash</p>
            <Badge variant="secondary" className={netBurn >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {netBurn >= 0 ? 'Profitable' : 'Burning'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{runway.toFixed(0)} months</div>
            <p className="text-sm text-muted-foreground">Cash Runway</p>
            <div className="flex items-center text-sm text-blue-600 mt-1">
              <Calendar className="mr-1 h-3 w-3" />
              Based on current burn
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet & Investment Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Wallet Balance"
                />
                <Line 
                  type="monotone" 
                  dataKey="investment" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Investments"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {allocationData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">₹{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Parking & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Investment Parking */}
        <Card>
          <CardHeader>
            <CardTitle>Park Your Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Quick Park</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Park surplus funds instantly in liquid investments
                </p>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Amount to park"
                    value={parkAmount}
                    onChange={(e) => setParkAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button>Park Now</Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Current Investments</h4>
                {investmentData.map((investment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{investment.type}</div>
                      <div className="text-sm text-gray-600">
                        {investment.return}% annual return
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₹{investment.amount.toLocaleString()}</div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {investment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'credit' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-gray-600">{transaction.date}</div>
                    </div>
                  </div>
                  <div className={`font-medium ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}