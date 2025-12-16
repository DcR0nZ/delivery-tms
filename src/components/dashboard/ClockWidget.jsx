import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function ClockWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-blue-700 h-full">
      <CardContent className="p-6 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="text-white">
            <p className="text-sm font-medium opacity-90">Current Time</p>
            <p className="text-5xl font-bold mt-2">
              {format(currentTime, 'h:mm')}
              <span className="text-2xl ml-2">{format(currentTime, 'a')}</span>
            </p>
            <p className="text-lg mt-2 opacity-90">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Clock className="h-16 w-16 text-white opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}