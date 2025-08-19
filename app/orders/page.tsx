"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const orders = [
  { id: 1, number: 'ORD-1234', customer: 'ABC Corp', amount: 50000, status: 'Delivered', date: '2025-08-18' },
  { id: 2, number: 'ORD-1233', customer: 'XYZ Ltd', amount: 32000, status: 'Processing', date: '2025-08-17' },
  { id: 3, number: 'ORD-1232', customer: 'Tech Solutions', amount: 15000, status: 'Cancelled', date: '2025-08-16' },
];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Orders</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{order.number}</div>
                <div className="text-sm text-gray-600">{order.customer}</div>
                <div className="text-xs text-gray-500">{order.date}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">₹{order.amount.toLocaleString()}</div>
                <div className="text-xs text-green-600">{order.status}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
