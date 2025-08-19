"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


const tasks = [
  { id: 1, title: 'File GST Return', deadline: '2025-08-25', status: 'Pending', assignedTo: 'Priya Patel', type: 'Tax', priority: 'High' },
  { id: 2, title: 'Renew Trade License', deadline: '2025-09-01', status: 'Completed', assignedTo: 'Rahul Sharma', type: 'Legal', priority: 'Medium' },
  { id: 3, title: 'Submit ESOP Report', deadline: '2025-09-10', status: 'Pending', assignedTo: 'Tech Solutions', type: 'HR', priority: 'Low' },
  { id: 4, title: 'Update Company Policies', deadline: '2025-09-15', status: 'Pending', assignedTo: 'ABC Corp', type: 'Legal', priority: 'Medium' },
  { id: 5, title: 'Quarterly Audit', deadline: '2025-09-20', status: 'Pending', assignedTo: 'XYZ Ltd', type: 'Finance', priority: 'High' },
];

const summary = {
  total: tasks.length,
  pending: tasks.filter(t => t.status === 'Pending').length,
  completed: tasks.filter(t => t.status === 'Completed').length,
  highPriority: tasks.filter(t => t.priority === 'High').length,
};

export default function ComplianceTasksPage() {
  return (
    <div className="space-y-6">
      <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">This is the Compliance Tasks & Deadlines page. Routing and rendering confirmed.</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Compliance Tasks & Deadlines</h1>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{summary.total}</div><p className="text-sm text-muted-foreground">Total Tasks</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{summary.pending}</div><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{summary.completed}</div><p className="text-sm text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{summary.highPriority}</div><p className="text-sm text-muted-foreground">High Priority</p></CardContent></Card>
      </div>

      {/* Task List Table */}
      <div className="mt-8">
        <Card>
          <CardHeader><CardTitle>Upcoming Tasks & Deadlines</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {tasks && tasks.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-4 text-left">Task</th>
                      <th className="py-2 px-4 text-left">Type</th>
                      <th className="py-2 px-4 text-left">Assigned To</th>
                      <th className="py-2 px-4 text-left">Deadline</th>
                      <th className="py-2 px-4 text-left">Priority</th>
                      <th className="py-2 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{task.title}</td>
                        <td className="py-2 px-4">{task.type}</td>
                        <td className="py-2 px-4">{task.assignedTo}</td>
                        <td className="py-2 px-4">{task.deadline}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{task.priority}</span>
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{task.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-400 py-8">No compliance tasks available.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
