import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const COLOR_OPTIONS = [
  { value: 'bg-blue-100', label: 'Blue' },
  { value: 'bg-green-100', label: 'Green' },
  { value: 'bg-yellow-100', label: 'Yellow' },
  { value: 'bg-orange-100', label: 'Orange' },
  { value: 'bg-purple-100', label: 'Purple' },
  { value: 'bg-pink-100', label: 'Pink' },
  { value: 'bg-red-100', label: 'Red' },
  { value: 'bg-indigo-100', label: 'Indigo' },
  { value: 'bg-gray-100', label: 'Gray' },
];

export default function AdminTimeSlotsPage() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [deletingSlot, setDeletingSlot] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    label: '', 
    startTime: '', 
    endTime: '', 
    order: '', 
    color: 'bg-blue-100'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [localSlots, setLocalSlots] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: timeSlots = [], isLoading } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: () => base44.entities.TimeSlot.list({ sort: { order: 1 } }),
  });

  useEffect(() => {
    if (timeSlots.length > 0) {
      setLocalSlots(timeSlots);
    }
  }, [timeSlots]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeSlot.create({ ...data, tenantId: user?.tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      setCreateOpen(false);
      setFormData({ name: '', label: '', startTime: '', endTime: '', order: '', color: 'bg-blue-100' });
      toast({
        title: "Time Slot Created",
        description: "The time slot has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create time slot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeSlot.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      setEditingSlot(null);
      setFormData({ name: '', label: '', startTime: '', endTime: '', order: '', color: 'bg-blue-100' });
      toast({
        title: "Time Slot Updated",
        description: "The time slot has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update time slot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeSlot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      setDeletingSlot(null);
      toast({
        title: "Time Slot Deleted",
        description: "The time slot has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete time slot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, slot }) => 
      base44.entities.TimeSlot.update(id, {
        ...slot,
        status: slot.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      toast({
        title: "Status Updated",
        description: "Time slot status has been changed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (newOrder) => {
      const updates = newOrder.map((item, index) => 
        base44.entities.TimeSlot.update(item.id, { order: index + 1 })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      toast({
        title: "Order Updated",
        description: "Time slots reordered successfully.",
      });
    }
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localSlots);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalSlots(items);
    reorderMutation.mutate(items);
  };

  const handleCreate = () => {
    const nextOrder = timeSlots.length > 0 ? Math.max(...timeSlots.map(s => s.order || 0)) + 1 : 1;
    setFormData({ 
      name: '', 
      label: '', 
      startTime: '', 
      endTime: '', 
      order: nextOrder.toString(), 
      color: 'bg-blue-100'
    });
    setCreateOpen(true);
  };

  const handleEdit = (slot) => {
    setFormData({ 
      name: slot.name, 
      label: slot.label,
      startTime: slot.startTime || '',
      endTime: slot.endTime || '',
      order: slot.order?.toString() || '',
      color: slot.color || 'bg-blue-100'
    });
    setEditingSlot(slot);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      name: formData.name.trim(),
      label: formData.label.trim(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      order: formData.order ? parseInt(formData.order) : undefined,
      color: formData.color,
      status: 'ACTIVE'
    };

    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, data: { ...editingSlot, ...data } });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Slots</h1>
          <p className="text-gray-600 mt-1">Manage your delivery time windows</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Time Slot
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="timeSlots">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {localSlots.map((slot, index) => (
                <Draggable key={slot.id} draggableId={slot.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between ${slot.status === 'INACTIVE' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${slot.color || 'bg-gray-100'}`}>
                          <Clock className="h-5 w-5 text-gray-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{slot.label}</h3>
                            <Badge variant={slot.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                              {slot.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {slot.startTime} - {slot.endTime} • Order: {slot.order}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(slot)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleStatusMutation.mutate({ id: slot.id, slot })}
                          className="h-8 w-8 p-0"
                          title={slot.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          <span className={`w-2 h-2 rounded-full ${slot.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingSlot(slot)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {timeSlots.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Time Slots Yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first time slot</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Time Slot
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingSlot} onOpenChange={(open) => {
        if (!open) {
          setCreateOpen(false);
          setEditingSlot(null);
          setFormData({ name: '', label: '', startTime: '', endTime: '', order: '', color: 'bg-blue-100' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlot ? 'Edit Time Slot' : 'Add New Time Slot'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Internal Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., first-am"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (no spaces)</p>
              </div>
              <div>
                <Label htmlFor="label">Display Label *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., 6-8am (1st AM)"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="order">Display Order *</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  placeholder="e.g., 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <select
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  {COLOR_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className={`mt-2 h-8 rounded ${formData.color}`}></div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setEditingSlot(null);
                  setFormData({ name: '', label: '', startTime: '', endTime: '', order: '', color: 'bg-blue-100' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSlot ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSlot} onOpenChange={(open) => !open && setDeletingSlot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSlot?.label}"? This action cannot be undone.
              Any assignments using this time slot will remain but reference a deleted slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingSlot.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}