import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Truck, Package } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function QuickActionsWidget({ currentUser }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          onClick={() => window.location.href = createPageUrl(currentUser?.appRole === 'driver' ? 'DriverMyRuns' : 'SchedulingBoard')}
          className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
        >
          <Calendar className="h-5 w-5 text-blue-600 mb-2" />
          <p className="font-semibold text-gray-900 text-sm mb-1">
            {currentUser?.appRole === 'driver' ? 'My Runs' : 'Open Scheduler'}
          </p>
          <p className="text-xs text-gray-600">
            {currentUser?.appRole === 'driver' ? 'View your schedule' : 'Manage deliveries'}
          </p>
        </button>

        <button
          onClick={() => window.location.href = createPageUrl('DailyJobBoard')}
          className="w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
        >
          <Truck className="h-5 w-5 text-green-600 mb-2" />
          <p className="font-semibold text-gray-900 text-sm mb-1">Daily Job Board</p>
          <p className="text-xs text-gray-600">View today's deliveries</p>
        </button>

        <button
          onClick={() => window.location.href = createPageUrl('AdminJobs')}
          className="w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
        >
          <Package className="h-5 w-5 text-purple-600 mb-2" />
          <p className="font-semibold text-gray-900 text-sm mb-1">All Jobs</p>
          <p className="text-xs text-gray-600">Browse complete list</p>
        </button>
      </CardContent>
    </Card>
  );
}