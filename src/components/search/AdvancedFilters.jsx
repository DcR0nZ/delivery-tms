import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, Save, Star, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function AdvancedFilters({ 
  filters, 
  onFiltersChange, 
  deliveryTypes = [], 
  customers = [],
  trucks = [],
  page,
  onClearFilters 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [savedFilters, setSavedFilters] = useState([]);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (isOpen) {
      loadSavedFilters();
    }
  }, [isOpen, page]);

  const loadSavedFilters = async () => {
    try {
      const filters = await base44.entities.SavedFilter.filter({ page });
      setSavedFilters(filters);
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const emptyFilters = {
      deliveryTypeIds: [],
      customerIds: [],
      statuses: [],
      truckIds: [],
      dateFrom: '',
      dateTo: '',
      isDifficultDelivery: false
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    if (onClearFilters) onClearFilters();
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this filter preset.",
        variant: "destructive"
      });
      return;
    }

    try {
      await base44.entities.SavedFilter.create({
        name: saveFilterName,
        filterConfig: localFilters,
        page,
        isDefault: false
      });
      
      toast({
        title: "Filter Saved",
        description: `"${saveFilterName}" has been saved.`
      });
      
      setSaveFilterName('');
      setShowSaveDialog(false);
      loadSavedFilters();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save filter preset.",
        variant: "destructive"
      });
    }
  };

  const handleLoadFilter = (savedFilter) => {
    setLocalFilters(savedFilter.filterConfig);
    onFiltersChange(savedFilter.filterConfig);
    setIsOpen(false);
    toast({
      title: "Filter Applied",
      description: `Loaded "${savedFilter.name}"`
    });
  };

  const handleDeleteFilter = async (filterId) => {
    try {
      await base44.entities.SavedFilter.delete(filterId);
      toast({
        title: "Filter Deleted",
        description: "Filter preset has been removed."
      });
      loadSavedFilters();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete filter preset.",
        variant: "destructive"
      });
    }
  };

  const activeFilterCount = Object.values(localFilters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return v === true;
    return v !== '' && v !== null && v !== undefined;
  }).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-600 text-white">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>
            Refine your search with multiple criteria
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Saved Presets</Label>
              <div className="space-y-2">
                {savedFilters.map(savedFilter => (
                  <div key={savedFilter.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadFilter(savedFilter)}
                      className="flex-1 justify-start gap-2"
                    >
                      <Star className="h-3 w-3 text-yellow-500" />
                      {savedFilter.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFilter(savedFilter.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">From</Label>
                <Input
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">To</Label>
                <Input
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Delivery Types */}
          {deliveryTypes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Delivery Types</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {deliveryTypes.map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.id}`}
                      checked={localFilters.deliveryTypeIds?.includes(type.id)}
                      onCheckedChange={(checked) => {
                        const current = localFilters.deliveryTypeIds || [];
                        setLocalFilters({
                          ...localFilters,
                          deliveryTypeIds: checked
                            ? [...current, type.id]
                            : current.filter(id => id !== type.id)
                        });
                      }}
                    />
                    <label
                      htmlFor={`type-${type.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {type.name} {type.code && `(${type.code})`}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {customers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Customers</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {customers.map(customer => (
                  <div key={customer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`customer-${customer.id}`}
                      checked={localFilters.customerIds?.includes(customer.id)}
                      onCheckedChange={(checked) => {
                        const current = localFilters.customerIds || [];
                        setLocalFilters({
                          ...localFilters,
                          customerIds: checked
                            ? [...current, customer.id]
                            : current.filter(id => id !== customer.id)
                        });
                      }}
                    />
                    <label
                      htmlFor={`customer-${customer.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {customer.customerName}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trucks */}
          {trucks.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Trucks</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {trucks.map(truck => (
                  <div key={truck.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`truck-${truck.id}`}
                      checked={localFilters.truckIds?.includes(truck.id)}
                      onCheckedChange={(checked) => {
                        const current = localFilters.truckIds || [];
                        setLocalFilters({
                          ...localFilters,
                          truckIds: checked
                            ? [...current, truck.id]
                            : current.filter(id => id !== truck.id)
                        });
                      }}
                    />
                    <label
                      htmlFor={`truck-${truck.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {truck.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Status */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Job Status</Label>
            <div className="space-y-2">
              {['PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={localFilters.statuses?.includes(status)}
                    onCheckedChange={(checked) => {
                      const current = localFilters.statuses || [];
                      setLocalFilters({
                        ...localFilters,
                        statuses: checked
                          ? [...current, status]
                          : current.filter(s => s !== status)
                      });
                    }}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {status.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Difficult Delivery */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="difficult-delivery"
              checked={localFilters.isDifficultDelivery || false}
              onCheckedChange={(checked) => setLocalFilters({ ...localFilters, isDifficultDelivery: checked })}
            />
            <label htmlFor="difficult-delivery" className="text-sm cursor-pointer">
              Difficult Deliveries Only
            </label>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            {!showSaveDialog ? (
              <>
                <Button onClick={handleApply} className="w-full">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={() => setShowSaveDialog(true)} className="w-full gap-2">
                  <Save className="h-4 w-4" />
                  Save as Preset
                </Button>
                <Button variant="ghost" onClick={handleClear} className="w-full gap-2">
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">Preset Name</Label>
                <Input
                  placeholder="e.g., High Priority Jobs"
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveFilter} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}