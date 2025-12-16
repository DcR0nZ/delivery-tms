import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Home,
  Calendar,
  Truck,
  Users,
  MapPin,
  Settings,
  Briefcase,
  Plus,
  LayoutGrid,
  CloudRain,
  BarChart3,
  Map,
  Library,
  Search
} from 'lucide-react';

export default function CommandPalette({ user }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isDispatcher = user?.appRole === 'dispatcher';
  const isDriver = user?.appRole === 'driver';
  const isCustomer = user?.appRole === 'customer';
  const isManager = user?.appRole === 'manager';

  const handleSelect = (callback) => {
    setOpen(false);
    callback();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden" aria-describedby="command-palette-description">
        <div id="command-palette-description" className="sr-only">
          Command palette for quick navigation and actions
        </div>
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="text-xs font-medium text-gray-500 px-2 py-1.5">
              <Command.Item
                onSelect={() => handleSelect(() => navigate(createPageUrl('Dashboard')))}
                className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>

              {(isAdmin || isDispatcher) && (
                <>
                  <Command.Item
                    onSelect={() => handleSelect(() => navigate(createPageUrl('SchedulingBoard')))}
                    className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Scheduling Board</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect(() => navigate(createPageUrl('Map')))}
                    className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                  >
                    <Map className="h-4 w-4" />
                    <span>Map View</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect(() => navigate(createPageUrl('LiveTracking')))}
                    className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Live Tracking</span>
                  </Command.Item>
                </>
              )}

              <Command.Item
                onSelect={() => handleSelect(() => navigate(createPageUrl('DailyJobBoard')))}
                className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
              >
                <Calendar className="h-4 w-4" />
                <span>Daily Job Board</span>
              </Command.Item>

              {isDriver && (
                <Command.Item
                  onSelect={() => handleSelect(() => navigate(createPageUrl('DriverMyRuns')))}
                  className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                >
                  <Truck className="h-4 w-4" />
                  <span>My Runs</span>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => handleSelect(() => navigate(createPageUrl('WeatherToday')))}
                className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
              >
                <CloudRain className="h-4 w-4" />
                <span>Weather Today</span>
              </Command.Item>

              {(isAdmin || isDispatcher || isManager) && (
                <Command.Item
                  onSelect={() => handleSelect(() => navigate(createPageUrl('Reports')))}
                  className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                </Command.Item>
              )}
            </Command.Group>

            {/* Library / Management */}
            {(isAdmin || isDispatcher || isManager || isCustomer) && (
              <Command.Group heading="Library" className="text-xs font-medium text-gray-500 px-2 py-1.5 mt-2">
                <Command.Item
                  onSelect={() => handleSelect(() => navigate(createPageUrl('AdminJobs')))}
                  className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                >
                  <Briefcase className="h-4 w-4" />
                  <span>All Jobs</span>
                </Command.Item>

                {(isAdmin || isDispatcher || isManager) && (
                  <Command.Item
                    onSelect={() => handleSelect(() => navigate(createPageUrl('AdminCustomers')))}
                    className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                  >
                    <Users className="h-4 w-4" />
                    <span>Customers</span>
                  </Command.Item>
                )}

                {(isAdmin || isDispatcher) && (
                  <>
                    <Command.Item
                      onSelect={() => handleSelect(() => navigate(createPageUrl('AdminTrucks')))}
                      className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Trucks</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => handleSelect(() => navigate(createPageUrl('AdminTimeSlots')))}
                      className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Time Slots</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => handleSelect(() => navigate(createPageUrl('AdminPickupLocations')))}
                      className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Pickup Locations</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => handleSelect(() => navigate(createPageUrl('AdminDeliveryTypes')))}
                      className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                    >
                      <Library className="h-4 w-4" />
                      <span>Delivery Types</span>
                    </Command.Item>
                  </>
                )}

                {isAdmin && (
                  <Command.Item
                    onSelect={() => handleSelect(() => navigate(createPageUrl('AdminUsers')))}
                    className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                  >
                    <Users className="h-4 w-4" />
                    <span>System Users</span>
                  </Command.Item>
                )}
              </Command.Group>
            )}

            {/* Quick Actions */}
            {isCustomer && (
              <Command.Group heading="Actions" className="text-xs font-medium text-gray-500 px-2 py-1.5 mt-2">
                <Command.Item
                  onSelect={() => handleSelect(() => navigate(createPageUrl('CustomerRequestDelivery')))}
                  className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
                  <span>Request Delivery</span>
                </Command.Item>
              </Command.Group>
            )}

            {/* Keyboard Shortcuts */}
            <Command.Group heading="Tips" className="text-xs font-medium text-gray-500 px-2 py-1.5 mt-2">
              <Command.Item
                disabled
                className="flex items-center justify-between px-2 py-2 text-xs text-gray-500"
              >
                <span>Use ↑ ↓ to navigate</span>
              </Command.Item>
              <Command.Item
                disabled
                className="flex items-center justify-between px-2 py-2 text-xs text-gray-500"
              >
                <span>Press Enter to select</span>
              </Command.Item>
              <Command.Item
                disabled
                className="flex items-center justify-between px-2 py-2 text-xs text-gray-500"
              >
                <span>Press Esc to close</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}