"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const communications = [
  { id: 1, type: 'Email', subject: 'Proposal Sent', contact: 'Priya Patel', date: '2025-08-18' },
  { id: 2, type: 'Call', subject: 'Follow-up', contact: 'Rahul Sharma', date: '2025-08-17' },
  { id: 3, type: 'Meeting', subject: 'Demo Scheduled', contact: 'Tech Solutions', date: '2025-08-16' },
];

export default function CommunicationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">CRM Communication</h1>
      <div className="space-y-4">
        {communications.map(comm => (
          <Card key={comm.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{comm.type}</div>
                <div className="text-sm text-gray-600">{comm.subject}</div>
                <div className="text-xs text-gray-500">{comm.contact}</div>
                <div className="text-xs text-gray-400">{comm.date}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
