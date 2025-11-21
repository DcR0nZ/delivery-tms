import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Truck, Plus, Pencil, Trash2 } from 'lucide-react';
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

export default function AdminTrucksPage() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [deletingTruck, setDeletingTruck] = useState(null);
  const [formData, setFormData] = useState({ name: '', capacity: '' });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Truck.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setCreateOpen(false);
      setFormData({ name: '', capacity: '' });
      toast({
        title: "Truck Created",
        description: "The truck has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create truck. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Truck.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setEditingTruck(null);
      setFormData({ name: '', capacity: '' });
      toast({
        title: "Truck Updated",
        description: "The truck has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update truck. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Truck.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setDeletingTruck(null);
      toast({
        title: "Truck Deleted",
        description: "The truck has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete truck. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, truck }) => 
      base44.entities.Truck.update(id, {
        ...truck,
        status: truck.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast({
        title: "Status Updated",
        description: "Truck status has been changed.",
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

  const handleCreate = () => {
    setFormData({ name: '', capacity: '' });
    setCreateOpen(true);
  };

  const handleEdit = (truck) => {
    setFormData({ name: truck.name, capacity: truck.capacity || '' });
    setEditingTruck(truck);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      name: formData.name.trim(),
      capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
      status: 'ACTIVE'
    };

    if (editingTruck) {
      updateMutation.mutate({ id: editingTruck.id, data: { ...editingTruck, ...data } });
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
          <h1 className="text-3xl font-bold text-gray-900">Trucks</h1>
          <p className="text-gray-600 mt-1">Manage your fleet of delivery vehicles</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Truck
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trucks.map((truck) => (
          <Card key={truck.id} className={truck.status === 'INACTIVE' ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span>{truck.name}</span>
                </div>
                <Badge variant={truck.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {truck.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {truck.capacity && (
                <p className="text-sm text-gray-600 mb-3">
                  Capacity: {truck.capacity} m²
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(truck)}
                  className="flex-1"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleStatusMutation.mutate({ id: truck.id, truck })}
                  className="flex-1"
                >
                  {truck.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeletingTruck(truck)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {trucks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trucks Yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first truck</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Truck
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingTruck} onOpenChange={(open) => {
        if (!open) {
          setCreateOpen(false);
          setEditingTruck(null);
          setFormData({ name: '', capacity: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTruck ? 'Edit Truck' : 'Add New Truck'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Truck Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ACCO1, Truck 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity (m² or pallets)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g., 14"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setEditingTruck(null);
                  setFormData({ name: '', capacity: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTruck ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTruck} onOpenChange={(open) => !open && setDeletingTruck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Truck?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTruck?.name}"? This action cannot be undone.
              Any assignments or data associated with this truck will remain but will reference a deleted truck.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingTruck.id)}
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