'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart,
  Users,
  Plus,
  TrendingUp,
  FileText,
  Calendar,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from '@/components/ui/chart-wrapper';



// Mock data
const capTableData = {
  totalShares: 17131,
  issuedShares: 17131,
  founderOwnership: 56.4,
  investorOwnership: 36.1,
  esopPool: 8.0,
};

const shareholders = [
  {
    id: 1,
    name: 'Rahul Sharma',
    type: 'Founder',
    shares: 6000,
    percentage: 35.0,
    valuation: '₹35,00,000',
    investmentRound: 'Incorporation',
  },
  {
    id: 2,
    name: 'Priya Patel',
    type: 'Founder',
    shares: 3662,
    percentage: 21.4,
    valuation: '₹21,40,000',
    investmentRound: 'Incorporation',
  },
  {
    id: 3,
    name: 'Sequoia Capital',
    type: 'Investor',
    shares: 4200,
    percentage: 24.5,
    valuation: '₹42,00,000',
    investmentRound: 'Series Seed',
  },
  {
    id: 4,
    name: 'Accel Partners',
    type: 'Investor',
    shares: 2000,
    percentage: 11.7,
    valuation: '₹20,00,000',
    investmentRound: 'Series Seed',
  },
  {
    id: 5,
    name: 'ESOP Pool',
    type: 'ESOP',
    shares: 1269,
    percentage: 7.4,
    valuation: '₹12,69,000',
    investmentRound: 'Reserved',
  },
];

const ownershipData = [
  { name: 'Founders', value: capTableData.founderOwnership, color: '#3b82f6' },
  { name: 'Investors', value: capTableData.investorOwnership, color: '#10b981' },
  { name: 'ESOP Pool', value: capTableData.esopPool, color: '#f59e0b' },
];

const fundingHistory = [
  { round: 'Incorporation', amount: 1000000, date: '2022-01', investors: 2 },
  { round: 'Series Seed', amount: 5000000, date: '2023-06', investors: 2 },
  { round: 'Series A', amount: 0, date: 'Planned', investors: 0 },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Founder': return 'bg-blue-100 text-blue-800';
    case 'Investor': return 'bg-green-100 text-green-800';
    case 'ESOP': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function CapTablePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cap Table & ESOPs</h1>
          <p className="text-gray-600 mt-1">
            Manage equity distribution and employee stock ownership plans
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export Cap Table
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Issuance
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{capTableData.totalShares?.toLocaleString?.() ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Shares</p>
            <div className="text-xs text-gray-500 mt-1">Issued and Outstanding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{capTableData.founderOwnership ?? 0}%</div>
            <p className="text-sm text-muted-foreground">Founder Ownership</p>
            <div className="text-xs text-gray-500 mt-1">Of total issued equity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{capTableData.investorOwnership ?? 0}%</div>
            <p className="text-sm text-muted-foreground">Investor Ownership</p>
            <div className="text-xs text-gray-500 mt-1">Post-series seed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-yellow-600">{capTableData.esopPool ?? 0}%</div>
            <p className="text-sm text-muted-foreground">ESOP Pool</p>
            <div className="text-xs text-gray-500 mt-1">Reserved for employees</div>
          </CardContent>
        </Card>
      </div>

      {/* Ownership Structure & Funding History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ownership Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Ownership Structure</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={ownershipData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ownershipData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}%`, '']} />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              {ownershipData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Funding History */}
        <Card>
          <CardHeader>
            <CardTitle>Funding History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fundingHistory.filter(h => h.amount > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="round" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`₹${(value as number / 100000).toFixed(1)}L`, 'Amount']} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {fundingHistory.map((round, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{round.round}</div>
                    <div className="text-sm text-gray-600">{round.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {round.amount > 0 ? `₹${(round.amount / 100000).toFixed(1)}L` : 'Planned'}
                    </div>
                    <div className="text-sm text-gray-600">{round.investors} investors</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shareholder Ledger */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shareholder Ledger</CardTitle>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Mould Round
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Shareholder</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Shares</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Percentage</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Valuation</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Investment Round</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shareholders.map((shareholder) => (
                  <tr key={shareholder.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{shareholder.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={getTypeColor(shareholder.type)}>
                        {shareholder.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {shareholder.shares?.toLocaleString?.() ?? 0}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {shareholder.percentage ?? 0}%
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {shareholder.valuation ?? ''}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">
                        {shareholder.investmentRound ?? ''}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-600">Remove</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}