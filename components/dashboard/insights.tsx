'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

const insights = [
  {
    type: 'opportunity',
    icon: <TrendingUp className="w-4 h-4" />,
    title: 'Revenue Growth Opportunity',
    description: 'Your monthly revenue has grown 12.5%. Consider expanding your product line.',
    priority: 'high',
    action: 'Explore New Products',
  },
  {
    type: 'compliance',
    icon: <Clock className="w-4 h-4" />,
    title: 'Upcoming Filing Deadline',
    description: 'GST return filing is due in 5 days. Ensure all invoices are ready.',
    priority: 'urgent',
    action: 'Prepare Filing',
  },
  {
    type: 'financial',
    icon: <Lightbulb className="w-4 h-4" />,
    title: 'Investment Opportunity',
    description: 'You have ₹85,000 in wallet. Consider parking funds in short-term investments.',
    priority: 'medium',
    action: 'View Options',
  },
  {
    type: 'inventory',
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Low Stock Alert',
    description: '7 products are below reorder level. Replenish stock to avoid stockouts.',
    priority: 'medium',
    action: 'Reorder Products',
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-green-100 text-green-800';
  }
};

export function ProactiveInsights() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <span>AI Insights & Recommendations</span>
        </CardTitle>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          4 insights
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 p-2 rounded-full bg-blue-100 text-blue-600">
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {insight.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={getPriorityColor(insight.priority)}
                      >
                        {insight.priority}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                        {insight.action}
                        <ArrowRight className="ml-1 w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}