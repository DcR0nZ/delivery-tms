import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Search, Filter, X, AlertTriangle } from 'lucide-react';
import JobDetailsDialog from '../components/scheduling/JobDetailsDialog';
import { base44 } from '@/api/base44Client';
import GlobalSearchBar from '../components/search/GlobalSearchBar';
import AdvancedFilters from '../components/search/AdvancedFilters';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]); // State to store delivery types
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [trucks, setTrucks] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState({
    deliveryTypeIds: [],
    customerIds: [],
    statuses: [],
    truckIds: [],
    dateFrom: '',
    dateTo: '',
    isDifficultDelivery: false
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        const isCustomer = user.role !== 'admin' && user.appRole !== 'dispatcher';
        const isOutreach = user.appRole === 'outreach';

        const [allJobs, allAssignments, fetchedCustomers, fetchedDeliveryTypes, fetchedTrucks] = await Promise.all([
          base44.entities.Job.list(),
          base44.entities.Assignment.list(),
          base44.entities.Customer.list(),
          base44.entities.DeliveryType.list(),
          base44.entities.Truck.list()
        ]);

        let finalJobs = [...allJobs];

        if (isCustomer && (user.customerId || user.additionalCustomerIds?.length > 0)) {
          const allowedCustomerIds = [
            user.customerId,
            ...(user.additionalCustomerIds || [])
          ].filter(Boolean);

          finalJobs = finalJobs.filter(job => allowedCustomerIds.includes(job.customerId));
        }

        if (isOutreach) {
          const manitouCodes = ['UPDWN', 'UNITUP', 'MANS'];
          const manitouTypeIds = fetchedDeliveryTypes
            .filter(dt => manitouCodes.includes(dt.code))
            .map(dt => dt.id);
          
          finalJobs = finalJobs.filter(job => manitouTypeIds.includes(job.deliveryTypeId));
        }

        finalJobs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

        setJobs(finalJobs);
        setFilteredJobs(finalJobs);
        setAssignments(allAssignments);
        setCustomers(fetchedCustomers);
        setDeliveryTypes(fetchedDeliveryTypes);
        setTrucks(fetchedTrucks);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let result = [...jobs];

    // Apply advanced filters first
    if (advancedFilters.deliveryTypeIds?.length > 0) {
      result = result.filter(j => advancedFilters.deliveryTypeIds.includes(j.deliveryTypeId));
    }

    if (advancedFilters.customerIds?.length > 0) {
      result = result.filter(j => advancedFilters.customerIds.includes(j.customerId));
    }

    if (advancedFilters.statuses?.length > 0) {
      result = result.filter(j => advancedFilters.statuses.includes(j.status));
    }

    if (advancedFilters.truckIds?.length > 0) {
      const relevantAssignments = assignments.filter(a => advancedFilters.truckIds.includes(a.truckId));
      const jobIdsInTrucks = new Set(relevantAssignments.map(a => a.jobId));
      result = result.filter(j => jobIdsInTrucks.has(j.id));
    }

    if (advancedFilters.dateFrom) {
      result = result.filter(j => j.requestedDate >= advancedFilters.dateFrom);
    }

    if (advancedFilters.dateTo) {
      result = result.filter(j => j.requestedDate <= advancedFilters.dateTo);
    }

    if (advancedFilters.isDifficultDelivery) {
      result = result.filter(j => j.isDifficultDelivery === true);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(job => {
        const assignment = assignments.find(a => a.jobId === job.id);
        const searchableFields = [
          job.customerName,
          job.deliveryLocation,
          job.deliveryTypeName,
          job.pickupLocation,
          job.siteContactName,
          job.siteContactPhone,
          job.poSalesDocketNumber,
          job.deliveryNotes,
          job.status,
          assignment?.truckId || '',
          assignment?.timeSlotId || ''
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchableFields.includes(query);
      });
    }

    if (filterBy !== 'all') {
      result = result.sort((a, b) => {
        let compareA, compareB;

        switch (filterBy) {
          case 'customer':
            compareA = a.customerName || '';
            compareB = b.customerName || '';
            break;
          case 'deliveryLocation':
            compareA = a.deliveryLocation || '';
            compareB = b.deliveryLocation || '';
            break;
          case 'requestedDate':
            compareA = new Date(a.requestedDate).getTime();
            compareB = new Date(b.requestedDate).getTime();
            break;
          case 'scheduledDate':
            const assignmentA = assignments.find(asn => asn.jobId === a.id);
            const assignmentB = assignments.find(asn => asn.jobId === b.id);
            compareA = assignmentA ? new Date(assignmentA.date).getTime() : 0;
            compareB = assignmentB ? new Date(assignmentB.date).getTime() : 0;
            break;
          case 'deliveryWindow':
            compareA = a.deliveryWindow || '';
            compareB = b.deliveryWindow || '';
            break;
          case 'assignedTruck':
            const truckA = assignments.find(asn => asn.jobId === a.id)?.truckId || '';
            const truckB = assignments.find(asn => asn.jobId === b.id)?.truckId || '';
            compareA = truckA;
            compareB = truckB;
            break;
          case 'status':
            compareA = a.status || '';
            compareB = b.status || '';
            break;
          default:
            compareA = a.created_date;
            compareB = b.created_date;
        }

        if (typeof compareA === 'string') {
          if (sortOrder === 'asc') {
            return compareA.localeCompare(compareB);
          } else {
            return compareB.localeCompare(compareA);
          }
        } else {
          if (sortOrder === 'asc') {
            return compareA - compareB;
          } else {
            return compareB - compareA;
          }
        }
      });
    }

    setFilteredJobs(result);
  }, [searchQuery, filterBy, sortOrder, jobs, assignments, advancedFilters]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterBy('all');
    setSortOrder('desc');
    setAdvancedFilters({
      deliveryTypeIds: [],
      customerIds: [],
      statuses: [],
      truckIds: [],
      dateFrom: '',
      dateTo: '',
      isDifficultDelivery: false
    });
  };

  const getAssignmentForJob = (jobId) => {
    return assignments.find(a => a.jobId === jobId);
  };

  const getTruckForJob = (jobId) => {
    const assignment = assignments.find(a => a.jobId === jobId);
    return assignment?.truckId || null;
  };

  const getTimeSlotLabel = (timeSlotId) => {
    const timeSlots = {
      'first-am': 'First AM (6-9am)',
      'second-am': 'Second AM (9am-12pm)',
      'lunch': 'Lunch (12-3pm)',
      'afternoon': 'Afternoon (3-6pm)',
      'early-morning': 'Early AM (5-8am)',
      'morning-1': 'Morning 1 (8am-10:30am)',
      'morning-2': 'Morning 2 (10:30am-12:30pm)',
      'afternoon-1': 'Afternoon 1 (12:30pm-2pm)',
      'afternoon-2': 'Afternoon 2 (2pm-3:30pm)'
    };
    return timeSlots[timeSlotId] || timeSlotId;
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      SCHEDULED: 'bg-indigo-100 text-indigo-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center p-8">Loading jobs...</div>;
  }

  const isCustomer = currentUser && currentUser.role !== 'admin' && currentUser.appRole !== 'dispatcher';
  const pageTitle = isCustomer ? 'My Jobs' : 'All Jobs';
  const pageDescription = isCustomer 
    ? 'View all your delivery requests and their current status' 
    : 'A complete history of all delivery jobs';

  const hasActiveFilters = searchQuery.trim() || filterBy !== 'all';

  // Helper function to get colors and icon for delivery type
  const getDeliveryTypeStyles = (deliveryType, isDifficult) => {
    let bgColor = '';
    let pillBgClass = 'bg-blue-100';
    let pillTextClass = 'text-blue-700';
    let icon = '';

    if (isDifficult) {
      bgColor = 'bg-[#F1AC88]';
      pillBgClass = 'bg-[#FF7A86]';
      pillTextClass = 'text-white';
      icon = '⚠️';
    } else if (deliveryType?.code === 'HAND') {
      bgColor = 'bg-[#BBE9E0]'; // Updated bgColor
      pillBgClass = 'bg-[#ACD6F6]';
      pillTextClass = 'text-gray-900';
      icon = '✋';
    } else if (deliveryType?.code === 'MANS') {
      bgColor = 'bg-[#F8B2AF]';
      pillBgClass = 'bg-[#ED5461]';
      pillTextClass = 'text-white';
      icon = '🔼';
    } else if (deliveryType?.code === 'UNITUP') {
      bgColor = 'bg-[#B2D7FF]';
      pillBgClass = 'bg-[#47A0FF]';
      pillTextClass = 'text-white';
      icon = '⬆️';
    } else if (deliveryType?.code === 'UPDWN') {
      bgColor = 'bg-[#FFDBF3]';
      pillBgClass = 'bg-[#FF8EDC]';
      pillTextClass = 'text-white';
      icon = '↕️';
    } else if (deliveryType?.code === 'UNITDWN') {
      bgColor = 'bg-[#EEDBFF]';
      pillBgClass = 'bg-[#CA8EFF]';
      pillTextClass = 'text-white';
      icon = '⬇️';
    } else if (deliveryType?.code === 'LATE') {
      bgColor = 'bg-[#E2E8F0]';
      pillBgClass = 'bg-[#EFE9E0]';
      pillTextClass = 'text-gray-900';
      icon = '🌛';
    } else if (deliveryType?.code === 'BOAT') {
      bgColor = 'bg-[#BBD3F0]';
      pillBgClass = 'bg-[#F0D8BB]';
      pillTextClass = 'text-gray-900';
      icon = '⛵';
    }

    return { bgColor, pillBgClass, pillTextClass, icon };
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-gray-600 mt-1">{pageDescription}</p>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Global Search Bar */}
              <GlobalSearchBar 
                jobs={jobs}
                deliveryTypes={deliveryTypes}
                onJobSelect={(job) => {
                  setSelectedJob(job);
                  setDialogOpen(true);
                }}
                placeholder="Search by customer, address, docket..."
              />

              <AdvancedFilters
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                deliveryTypes={deliveryTypes}
                customers={customers}
                trucks={trucks}
                page="AdminJobs"
                onClearFilters={() => setAdvancedFilters({
                  deliveryTypeIds: [],
                  customerIds: [],
                  statuses: [],
                  truckIds: [],
                  dateFrom: '',
                  dateTo: '',
                  isDifficultDelivery: false
                })}
              />

              {/* Sort Options */}
              <div className="flex gap-2 flex-wrap">
                <div className="w-48">
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="Filter by..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All (No Filter)</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="deliveryLocation">Delivery Location</SelectItem>
                      <SelectItem value="requestedDate">Requested Date</SelectItem>
                      <SelectItem value="scheduledDate">Scheduled Date</SelectItem>
                      <SelectItem value="deliveryWindow">Delivery Window</SelectItem>
                      <SelectItem value="assignedTruck">Assigned Truck</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order Toggle */}
                {filterBy !== 'all' && (
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A → Z / Old → New</SelectItem>
                      <SelectItem value="desc">Z → A / New → Old</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClearFilters}
                    title="Clear all filters"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filter Indicator */}
            {(hasActiveFilters || Object.values(advancedFilters).some(v => Array.isArray(v) ? v.length > 0 : v)) && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                <span className="font-medium">Active:</span>
                {advancedFilters.deliveryTypeIds?.length > 0 && (
                  <Badge variant="outline">{advancedFilters.deliveryTypeIds.length} Delivery Types</Badge>
                )}
                {advancedFilters.customerIds?.length > 0 && (
                  <Badge variant="outline">{advancedFilters.customerIds.length} Customers</Badge>
                )}
                {advancedFilters.statuses?.length > 0 && (
                  <Badge variant="outline">{advancedFilters.statuses.length} Statuses</Badge>
                )}
                {advancedFilters.truckIds?.length > 0 && (
                  <Badge variant="outline">{advancedFilters.truckIds.length} Trucks</Badge>
                )}
                {advancedFilters.dateFrom && (
                  <Badge variant="outline">From: {format(new Date(advancedFilters.dateFrom), 'MMM d')}</Badge>
                )}
                {advancedFilters.dateTo && (
                  <Badge variant="outline">To: {format(new Date(advancedFilters.dateTo), 'MMM d')}</Badge>
                )}
                {advancedFilters.isDifficultDelivery && (
                  <Badge variant="outline">Difficult Only</Badge>
                )}
                {filterBy !== 'all' && (
                  <Badge variant="outline">Sort: {filterBy.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                )}
                <span className="text-gray-500">({filteredJobs.length} {filteredJobs.length === 1 ? 'result' : 'results'})</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isCustomer && <TableHead>Customer</TableHead>}
                  <TableHead>Delivery Location</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Delivery Window</TableHead>
                  <TableHead>Assigned Truck</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isCustomer ? 6 : 7} className="text-center py-8 text-gray-500">
                      {hasActiveFilters ? 'No jobs found matching your search criteria' : 'No jobs found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map(job => {
                    const assignedTruck = getTruckForJob(job.id);
                    const assignment = getAssignmentForJob(job.id);
                    const deliveryType = deliveryTypes.find(dt => dt.id === job.deliveryTypeId);
                    const styles = getDeliveryTypeStyles(deliveryType, job.isDifficultDelivery);

                    return (
                      <TableRow 
                        key={job.id}
                        className={`cursor-pointer ${styles.bgColor ? styles.bgColor : ''} hover:opacity-80 transition-opacity`}
                        onClick={() => {
                          setSelectedJob(job);
                          setDialogOpen(true);
                        }}
                      >
                        {!isCustomer && <TableCell>{job.customerName}</TableCell>}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {deliveryType?.code && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${styles.pillBgClass} ${styles.pillTextClass} flex items-center gap-0.5`}>
                                  {styles.icon && <span>{styles.icon}</span>}
                                  {deliveryType.code}
                                </span>
                              )}
                              {job.isDifficultDelivery && (
                                <Badge className="bg-orange-500 text-white text-xs border-orange-600">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Difficult Delivery
                                </Badge>
                              )}
                            </div>
                            <div>{job.deliveryLocation}</div>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(job.requestedDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          {assignment ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {format(new Date(assignment.date), 'dd MMM yyyy')}
                              </div>
                              <div className="text-xs text-indigo-600">
                                {getTimeSlotLabel(assignment.timeSlotId)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not scheduled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {job.deliveryWindow ? (
                            <span className="text-sm text-gray-600">{job.deliveryWindow}</span>
                          ) : (
                            <span className="text-sm text-gray-400">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignedTruck ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {assignedTruck}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job.status)}>{job.status.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <JobDetailsDialog
        job={selectedJob}
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        onJobUpdated={() => {
          setDialogOpen(false);
          window.location.reload(); 
        }}
      />
    </>
  );
}