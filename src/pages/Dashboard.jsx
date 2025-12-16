import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Truck, Package, AlertTriangle, CalendarRange, Lock, Unlock, RotateCcw } from 'lucide-react';
import { startOfDay, startOfWeek, addDays } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import ClockWidget from '../components/dashboard/ClockWidget';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import StatWidget from '../components/dashboard/StatWidget';
import QuickActionsWidget from '../components/dashboard/QuickActionsWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardPage() {
  const [todayStats, setTodayStats] = useState({
    totalSqm: 0,
    totalDeliveries: 0,
    totalWeight: 0,
    scheduledJobs: 0,
    approvedJobs: 0,
    difficultDeliveries: 0
  });
  const [weekAheadStats, setWeekAheadStats] = useState({
    totalJobs: 0,
    totalSqm: 0,
    difficultDeliveries: 0
  });
  const [thisWeekStats, setThisWeekStats] = useState({
    totalSqm: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [layouts, setLayouts] = useState({
    lg: [
      { i: 'clock', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2 },
      { i: 'weather', x: 6, y: 0, w: 6, h: 2, minW: 4, minH: 2 },
      { i: 'deliveries', x: 0, y: 2, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'sqm', x: 4, y: 2, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'pending', x: 8, y: 2, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'difficult', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'week-delivered', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'week-scheduled', x: 4, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'week-difficult', x: 8, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'actions', x: 0, y: 8, w: 12, h: 3, minW: 6, minH: 3 },
    ],
    md: [
      { i: 'clock', x: 0, y: 0, w: 5, h: 2, minW: 4, minH: 2 },
      { i: 'weather', x: 5, y: 0, w: 5, h: 2, minW: 4, minH: 2 },
      { i: 'deliveries', x: 0, y: 2, w: 5, h: 2, minW: 3, minH: 2 },
      { i: 'sqm', x: 5, y: 2, w: 5, h: 2, minW: 3, minH: 2 },
      { i: 'pending', x: 0, y: 4, w: 5, h: 2, minW: 3, minH: 2 },
      { i: 'difficult', x: 5, y: 4, w: 5, h: 2, minW: 3, minH: 2 },
      { i: 'week-delivered', x: 0, y: 6, w: 3, h: 2, minW: 3, minH: 2 },
      { i: 'week-scheduled', x: 3, y: 6, w: 3, h: 2, minW: 3, minH: 2 },
      { i: 'week-difficult', x: 6, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'actions', x: 0, y: 8, w: 10, h: 3, minW: 6, minH: 3 },
    ],
    sm: [
      { i: 'clock', x: 0, y: 0, w: 6, h: 2 },
      { i: 'weather', x: 0, y: 2, w: 6, h: 2 },
      { i: 'deliveries', x: 0, y: 4, w: 6, h: 2 },
      { i: 'sqm', x: 0, y: 6, w: 6, h: 2 },
      { i: 'pending', x: 0, y: 8, w: 6, h: 2 },
      { i: 'difficult', x: 0, y: 10, w: 6, h: 2 },
      { i: 'week-delivered', x: 0, y: 12, w: 6, h: 2 },
      { i: 'week-scheduled', x: 0, y: 14, w: 6, h: 2 },
      { i: 'week-difficult', x: 0, y: 16, w: 6, h: 2 },
      { i: 'actions', x: 0, y: 18, w: 6, h: 3 },
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const mondayThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday this week
        const sundayThisWeek = addDays(mondayThisWeek, 6); // Sunday this week
        
        // Fetch delivery types and filter for Manitou jobs if outreach user
        const [todayAssignments, allJobs, deliveryTypes] = await Promise.all([
          base44.entities.Assignment.filter({ date: today }),
          base44.entities.Job.list(),
          base44.entities.DeliveryType.list()
        ]);

        const isOutreach = user.appRole === 'outreach';
        const isCustomer = user.role !== 'admin' && user.appRole !== 'dispatcher' && user.appRole !== 'manager' && user.appRole !== 'outreach' && user.appRole !== 'driver';
        
        // Determine filtering based on user role
        let filteredJobs = allJobs;
        
        if (isCustomer) {
          // Customer: filter by their customer ID(s)
          const allowedCustomerIds = [
            user.customerId,
            ...(user.additionalCustomerIds || [])
          ].filter(Boolean);
          filteredJobs = filteredJobs.filter(job => allowedCustomerIds.includes(job.customerId));
        } else if (isOutreach) {
          // Outreach: filter by Manitou delivery types
          const manitouCodes = ['UPDWN', 'UNITUP', 'MANS'];
          const manitouTypeIds = deliveryTypes
            .filter(dt => manitouCodes.includes(dt.code))
            .map(dt => dt.id);
          filteredJobs = filteredJobs.filter(job => manitouTypeIds.includes(job.deliveryTypeId));
        }
        // Admin, dispatcher, manager: see all jobs (no additional filtering)

        // Today's stats (jobs scheduled for today)
        const jobIds = todayAssignments.map(a => a.jobId);
        const todayJobs = filteredJobs.filter(job => jobIds.includes(job.id));

        const totalSqm = todayJobs.reduce((sum, job) => sum + (job.sqm || 0), 0);
        const totalWeight = todayJobs.reduce((sum, job) => sum + (job.weightKg || 0), 0);
        const scheduledJobs = filteredJobs.filter(job => job.status === 'SCHEDULED').length;
        const approvedJobs = filteredJobs.filter(job => job.status === 'APPROVED' || job.status === 'PENDING_APPROVAL').length;
        const difficultDeliveries = todayJobs.filter(job => job.isDifficultDelivery).length;

        setTodayStats({
          totalSqm,
          totalDeliveries: todayJobs.length,
          totalWeight,
          scheduledJobs,
          approvedJobs,
          difficultDeliveries
        });

        // Week Ahead stats (now → end of Sunday this week)
        const allAssignments = await base44.entities.Assignment.list();
        const weekAheadAssignments = allAssignments.filter(a => {
          const assignmentDate = new Date(a.date);
          const now = new Date();
          return assignmentDate >= now && assignmentDate <= sundayThisWeek;
        });
        
        const weekAheadJobIds = weekAheadAssignments.map(a => a.jobId);
        const weekAheadJobs = filteredJobs.filter(job => 
          weekAheadJobIds.includes(job.id) && 
          (job.status === 'SCHEDULED' || job.status === 'DELIVERED')
        );
        
        setWeekAheadStats({
          totalJobs: weekAheadJobs.length,
          totalSqm: weekAheadJobs.reduce((sum, job) => sum + (job.sqm || 0), 0),
          difficultDeliveries: weekAheadJobs.filter(job => job.isDifficultDelivery).length
        });

        // This Week stats (Monday 00:00 → now)
        const thisWeekAssignments = allAssignments.filter(a => {
          const assignmentDate = new Date(a.date);
          return assignmentDate >= mondayThisWeek && assignmentDate <= new Date();
        });
        
        const thisWeekJobIds = thisWeekAssignments.map(a => a.jobId);
        const thisWeekJobs = filteredJobs.filter(job => 
          thisWeekJobIds.includes(job.id) && 
          (job.status === 'SCHEDULED' || job.status === 'DELIVERED')
        );
        
        setThisWeekStats({
          totalSqm: thisWeekJobs.reduce((sum, job) => sum + (job.sqm || 0), 0)
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const savedLayouts = localStorage.getItem('dashboardLayouts');
    if (savedLayouts) {
      setLayouts(JSON.parse(savedLayouts));
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleLayoutChange = (layout, allLayouts) => {
    if (!isLocked) {
      setLayouts(allLayouts);
      localStorage.setItem('dashboardLayouts', JSON.stringify(allLayouts));
    }
  };

  const handleResetLayout = () => {
    localStorage.removeItem('dashboardLayouts');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isOutreach = currentUser?.appRole === 'outreach';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {currentUser?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-gray-600 mt-1">Here's what's happening today</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLocked(!isLocked)}
            className="gap-2"
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {isLocked ? 'Unlock Layout' : 'Lock Layout'}
          </Button>
          {!isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetLayout}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={60}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        margin={[16, 16]}
      >
        <div key="clock">
          <ClockWidget />
        </div>
        <div key="weather">
          <WeatherWidget />
        </div>
        <div key="deliveries">
          <StatWidget
            title={isOutreach ? 'Jobs Today' : 'Deliveries Today'}
            value={todayStats.totalDeliveries}
            subtitle={isOutreach ? 'Scheduled for today' : 'Scheduled for delivery'}
            icon={Truck}
            color="blue"
            onClick={() => window.location.href = createPageUrl('DailyJobBoard')}
          />
        </div>
        <div key="sqm">
          <StatWidget
            title={isOutreach ? 'Total Hours Booked Today' : 'Total m² Today'}
            value={isOutreach ? `${todayStats.totalSqm.toLocaleString()}h` : todayStats.totalSqm.toLocaleString()}
            subtitle={isOutreach ? 'Across all machines' : 'Square meters scheduled'}
            icon={Package}
            color="green"
            onClick={() => window.location.href = createPageUrl('DailyJobBoard')}
          />
        </div>
        <div key="pending">
          <StatWidget
            title="Awaiting Schedule"
            value={todayStats.approvedJobs}
            subtitle="Jobs ready to schedule"
            icon={Package}
            color="amber"
            onClick={() => window.location.href = createPageUrl('SchedulingBoard')}
          />
        </div>
        {todayStats.difficultDeliveries > 0 && (
          <div key="difficult">
            <StatWidget
              title="Difficult Deliveries"
              value={todayStats.difficultDeliveries}
              subtitle="Requires special attention"
              icon={AlertTriangle}
              color="orange"
              onClick={() => window.location.href = createPageUrl('DailyJobBoard')}
            />
          </div>
        )}
        <div key="week-delivered">
          <StatWidget
            title="Delivered This Week"
            value={isOutreach ? `${thisWeekStats.totalSqm.toLocaleString()}h` : thisWeekStats.totalSqm.toLocaleString()}
            subtitle={isOutreach ? 'Hours completed since Monday' : 'Total m² delivered'}
            icon={CalendarRange}
            color="purple"
          />
        </div>
        <div key="week-scheduled">
          <StatWidget
            title={isOutreach ? 'Total Hours' : 'Scheduled This Week'}
            value={isOutreach ? `${weekAheadStats.totalSqm.toLocaleString()}h` : weekAheadStats.totalSqm.toLocaleString()}
            subtitle={isOutreach ? 'Booked machine hours' : 'Total m² still to deliver'}
            icon={Package}
            color="purple"
          />
        </div>
        <div key="week-difficult">
          <StatWidget
            title="Difficult Deliveries"
            value={weekAheadStats.difficultDeliveries}
            subtitle="Special attention required"
            icon={AlertTriangle}
            color="purple"
          />
        </div>
        <div key="actions">
          <QuickActionsWidget currentUser={currentUser} />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}