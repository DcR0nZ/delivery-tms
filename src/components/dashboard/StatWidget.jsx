import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatWidget({ title, value, subtitle, icon: Icon, color = 'blue', onClick }) {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow h-full ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-5 w-5 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}