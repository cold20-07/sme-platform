"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const scenarios = [
  { id: 1, name: 'Base Case', runway: 12, notes: 'Current burn rate and cash position.' },
  { id: 2, name: 'Aggressive Growth', runway: 8, notes: 'Increased hiring and marketing.' },
  { id: 3, name: 'Cost Optimization', runway: 18, notes: 'Reduced expenses and slower growth.' },
];

export default function RunwayScenariosPage() {
  // Mock runway metrics
  const runwayMetrics = [
    { label: 'Current Runway', value: '14 months' },
    { label: 'Monthly Burn Rate', value: '$32,000' },
    { label: 'Cash on Hand', value: '$450,000' },
    { label: 'Next Funding Milestone', value: 'Series A' },
  ];

  // Chart data
  const runwayChartData = [
    { month: 'Aug', runway: 14 },
    { month: 'Sep', runway: 13 },
    { month: 'Oct', runway: 12 },
    { month: 'Nov', runway: 11 },
    { month: 'Dec', runway: 10 },
    { month: 'Jan', runway: 9 },
  ];

  // Scenario analysis table
  const scenarioData = [
    { scenario: 'Base Case', months: 14, burn: 32000, outcome: 'Stable' },
    { scenario: 'Aggressive Growth', months: 9, burn: 48000, outcome: 'Requires Funding' },
    { scenario: 'Cost Cutting', months: 20, burn: 22000, outcome: 'Extended Runway' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">This is the Runway & Scenarios page. Routing and rendering confirmed.</div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Runway & Scenarios</h1>
        {/* Runway metrics summary */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {runwayMetrics && runwayMetrics.length > 0 ? (
            runwayMetrics.map((m) => (
              <div key={m.label} className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                <div className="text-lg font-semibold text-gray-700">{m.label}</div>
                <div className="text-2xl font-bold text-blue-700 mt-2">{m.value}</div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-gray-400">No runway metrics available.</div>
          )}
        </div>
        {/* Runway trend chart (mock) */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Runway Trend (Demo)</h2>
          <div className="w-full h-56 flex items-center justify-center">
            <span className="text-gray-400">[Runway Trend Chart Placeholder]</span>
          </div>
        </div>
        {/* Scenario analysis table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Scenario Analysis (Demo)</h2>
          {scenarioData && scenarioData.length > 0 ? (
            <table className="min-w-full text-left border rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700">Scenario</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700">Runway (months)</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700">Burn Rate</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {scenarioData.map((row) => (
                  <tr key={row.scenario} className="border-b last:border-b-0">
                    <td className="px-3 py-2 text-xs text-gray-800">{row.scenario}</td>
                    <td className="px-3 py-2 text-xs text-blue-700 font-bold">{row.months}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">${row.burn.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-xs font-semibold ${row.outcome === 'Stable' ? 'text-green-700' : row.outcome === 'Requires Funding' ? 'text-red-700' : 'text-yellow-700'}`}>{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-400">No scenario data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
