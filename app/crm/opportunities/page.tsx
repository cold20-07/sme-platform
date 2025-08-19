"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const opportunities = [
  { id: 1, name: 'Big Deal with ABC Corp', stage: 'Negotiation', value: 120000, expectedClose: '2025-09-10' },
  { id: 2, name: 'Renewal with XYZ Ltd', stage: 'Proposal Sent', value: 80000, expectedClose: '2025-09-20' },
  { id: 3, name: 'New Lead: Tech Solutions', stage: 'Qualification', value: 200000, expectedClose: '2025-09-30' },
];

export default function OpportunitiesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Opportunities</h1>
      <div className="space-y-4">
        {opportunities.map(opp => (
          <Card key={opp.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{opp.name}</div>
                <div className="text-sm text-gray-600">Stage: {opp.stage}</div>
                <div className="text-xs text-gray-500">Expected Close: {opp.expectedClose}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">₹{opp.value.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
