import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, Clock, Package, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function RouteOptimizer({ 
  open, 
  onOpenChange, 
  selectedDate,
  trucks,
  timeSlots,
  unscheduledJobs,
  deliveryTypes,
  pickupLocations,
  onOptimizationApplied 
}) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedRoutes, setOptimizedRoutes] = useState(null);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const jobsData = unscheduledJobs.map(job => {
        const deliveryType = deliveryTypes.find(dt => dt.id === job.deliveryTypeId);
        const pickup = pickupLocations.find(p => p.id === job.pickupLocationId);
        
        return {
          id: job.id,
          customerName: job.customerName,
          deliveryLocation: job.deliveryLocation,
          deliveryLatitude: job.deliveryLatitude,
          deliveryLongitude: job.deliveryLongitude,
          sqm: job.sqm || 0,
          weightKg: job.weightKg || 0,
          totalUnits: job.totalUnits || 0,
          deliveryWindow: job.deliveryWindow,
          requestedDate: job.requestedDate,
          isDifficultDelivery: job.isDifficultDelivery,
          deliveryTypeName: job.deliveryTypeName,
          deliveryTypeCode: deliveryType?.code,
          pickupLocation: pickup?.address || pickup?.name,
          requiresCrane: deliveryType?.requiresCrane,
          requiresManitou: deliveryType?.requiresManitou,
          requiresBarge: deliveryType?.requiresBarge
        };
      });

      const trucksData = trucks.map(truck => ({
        id: truck.id,
        name: truck.name,
        capacity: truck.capacity || 2500
      }));

      const timeSlotsData = timeSlots.map(slot => ({
        id: slot.id,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        order: slot.order
      }));

      const prompt = `You are a logistics optimization expert. Analyze the following delivery jobs and create an optimal schedule.

JOBS TO SCHEDULE (${jobsData.length}):
${JSON.stringify(jobsData, null, 2)}

AVAILABLE TRUCKS (${trucksData.length}):
${JSON.stringify(trucksData, null, 2)}

TIME SLOTS:
${JSON.stringify(timeSlotsData, null, 2)}

TARGET DATE: ${selectedDate}

OPTIMIZATION CRITERIA:
1. Minimize total travel distance by grouping geographically close deliveries
2. Respect truck capacity limits (don't exceed capacity in m²)
3. Balance workload across available trucks
4. Prioritize deliveries with specific time windows
5. Consider pickup locations - group jobs from the same pickup together
6. Account for special equipment needs (crane, manitou, barge)
7. Place difficult deliveries early in the day when drivers are fresh
8. Consider delivery windows and match to appropriate time slots

IMPORTANT RULES:
- Each job can only be assigned to ONE truck and ONE time slot
- Truck capacity is in m² - don't exceed it
- Jobs with specific delivery windows MUST be assigned to matching time slots
- Jobs requiring special equipment (crane, manitou, barge) should be clearly flagged
- Difficult deliveries should be scheduled in earlier time slots when possible

Please provide an optimized schedule with reasoning for each assignment.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            routes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  truckId: { type: "string" },
                  truckName: { type: "string" },
                  totalLoad: { type: "number" },
                  estimatedDistance: { type: "number" },
                  assignments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        jobId: { type: "string" },
                        timeSlotId: { type: "string" },
                        reasoning: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            summary: { type: "string" },
            warnings: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setOptimizedRoutes(response);
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to generate route optimization. Please try again.",
        variant: "destructive"
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyOptimization = async () => {
    if (!optimizedRoutes?.routes) return;

    setApplying(true);
    try {
      const assignmentsToCreate = [];
      
      for (const route of optimizedRoutes.routes) {
        for (const assignment of route.assignments) {
          assignmentsToCreate.push({
            jobId: assignment.jobId,
            truckId: route.truckId,
            timeSlotId: assignment.timeSlotId,
            slotPosition: 1,
            date: selectedDate
          });
        }
      }

      // Create all assignments
      await base44.entities.Assignment.bulkCreate(assignmentsToCreate);

      // Update all jobs to SCHEDULED status
      const jobIds = assignmentsToCreate.map(a => a.jobId);
      for (const jobId of jobIds) {
        const job = unscheduledJobs.find(j => j.id === jobId);
        if (job) {
          await base44.entities.Job.update(jobId, { ...job, status: 'SCHEDULED' });
        }
      }

      toast({
        title: "Routes Applied!",
        description: `Successfully scheduled ${jobIds.length} jobs across ${optimizedRoutes.routes.length} trucks.`,
      });

      onOpenChange(false);
      onOptimizationApplied();
    } catch (error) {
      toast({
        title: "Failed to Apply Routes",
        description: error.message || "Could not apply the optimized routes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Route Optimization for {format(new Date(selectedDate), 'EEEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!optimizedRoutes ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">
                  Optimize {unscheduledJobs.length} unscheduled job{unscheduledJobs.length !== 1 ? 's' : ''} across {trucks.length} truck{trucks.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  AI will analyze locations, capacity, time windows, and delivery requirements to suggest the most efficient schedule.
                </p>
              </div>
              <Button onClick={handleOptimize} disabled={optimizing || unscheduledJobs.length === 0}>
                {optimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing Routes...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate Optimal Routes
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Optimization Summary</h3>
                  <p className="text-sm text-blue-700">{optimizedRoutes.summary}</p>
                  {optimizedRoutes.warnings?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {optimizedRoutes.warnings.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-orange-700">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Routes */}
              {optimizedRoutes.routes.map((route, idx) => {
                const truck = trucks.find(t => t.id === route.truckId);
                const utilizationPercent = truck?.capacity ? (route.totalLoad / truck.capacity) * 100 : 0;

                return (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold">{route.truckName}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {route.assignments.length} job{route.assignments.length !== 1 ? 's' : ''}
                          </Badge>
                          <div className="text-sm">
                            <span className="text-gray-600">{route.totalLoad.toLocaleString()}m² / {truck?.capacity || 2500}m²</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  utilizationPercent > 90 ? 'bg-red-500' : 
                                  utilizationPercent > 70 ? 'bg-green-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {route.assignments.map((assignment, assignIdx) => {
                          const job = unscheduledJobs.find(j => j.id === assignment.jobId);
                          const timeSlot = timeSlots.find(ts => ts.id === assignment.timeSlotId);
                          const deliveryType = deliveryTypes.find(dt => dt.id === job?.deliveryTypeId);

                          if (!job) return null;

                          return (
                            <div key={assignIdx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                {assignIdx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-semibold text-sm">{job.customerName}</span>
                                  {deliveryType?.code && (
                                    <Badge variant="outline" className="text-xs">
                                      {deliveryType.code}
                                    </Badge>
                                  )}
                                  {job.sqm && (
                                    <Badge variant="secondary" className="text-xs">
                                      {job.sqm.toLocaleString()}m²
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mb-1">{job.deliveryLocation}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{timeSlot?.label || assignment.timeSlotId}</span>
                                </div>
                                <p className="text-xs text-gray-500 italic mt-1">{assignment.reasoning}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {route.estimatedDistance && (
                        <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Estimated total distance: ~{route.estimatedDistance}km
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          {optimizedRoutes ? (
            <>
              <Button variant="outline" onClick={() => setOptimizedRoutes(null)}>
                Regenerate
              </Button>
              <Button onClick={handleApplyOptimization} disabled={applying}>
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Apply Optimized Routes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}