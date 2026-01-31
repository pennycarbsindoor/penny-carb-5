import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, ChefHat, Phone, MapPin, Loader2, User, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Cook } from '@/types/cook';

const cookSchema = z.object({
  staffId: z.string().optional(),
  kitchenName: z.string().min(2, 'Kitchen name is required'),
  mobileNumber: z.string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  panchayatId: z.string().min(1, 'Please select a panchayat'),
  allowedOrderTypes: z.array(z.string()).min(1, 'Select at least one order type'),
});

type CookFormData = z.infer<typeof cookSchema>;

interface StaffProfile {
  id: string;
  user_id: string;
  name: string;
  mobile_number: string;
  panchayat_id: string | null;
}

interface CookAssignment {
  id: string;
  order_id: string;
  cook_id: string;
  cook_status: string;
  assigned_at: string;
  order?: {
    order_number: string;
    status: string;
    total_amount: number;
    guest_count: number | null;
    event_date: string | null;
    service_type: string;
    customer_id: string;
  };
  customer?: {
    name: string;
    mobile_number: string;
  };
  cook?: Cook;
}

const orderTypes = [
  { value: 'indoor_events', label: 'Indoor Events' },
  { value: 'cloud_kitchen', label: 'Cloud Kitchen' },
  { value: 'homemade', label: 'Homemade Food' },
];

const AdminCooks: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { panchayats } = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [activeTab, setActiveTab] = useState('cooks');

  // Fetch existing staff profiles
  const { data: staffProfiles } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, mobile_number, panchayat_id')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as StaffProfile[];
    },
  });

  const { data: cooks, isLoading: cooksLoading } = useQuery({
    queryKey: ['admin-cooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooks')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Cook[];
    },
  });

  // Fetch pending orders (assigned to cooks but not finished)
  const { data: pendingAssignments, isLoading: pendingLoading } = useQuery({
    queryKey: ['cook-pending-orders'],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('order_assigned_cooks')
        .select(`
          id, order_id, cook_id, cook_status, assigned_at,
          order:orders(order_number, status, total_amount, guest_count, event_date, service_type, customer_id)
        `)
        .in('cook_status', ['pending', 'accepted', 'preparing', 'cooked'])
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch cook details
      const cookIds = [...new Set(assignments?.map((a: any) => a.cook_id) || [])];
      const { data: cooksData } = await supabase
        .from('cooks')
        .select('id, kitchen_name, mobile_number')
        .in('id', cookIds);

      const cookMap = new Map(cooksData?.map((c: any) => [c.id, c]) || []);

      // Fetch customer profiles
      const customerIds = [...new Set(assignments?.map((a: any) => a.order?.customer_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      return assignments?.map((a: any) => ({
        ...a,
        cook: cookMap.get(a.cook_id),
        customer: a.order?.customer_id ? profileMap.get(a.order.customer_id) : null,
      })) as CookAssignment[];
    },
  });

  // Fetch finished orders
  const { data: finishedAssignments, isLoading: finishedLoading } = useQuery({
    queryKey: ['cook-finished-orders'],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('order_assigned_cooks')
        .select(`
          id, order_id, cook_id, cook_status, assigned_at,
          order:orders(order_number, status, total_amount, guest_count, event_date, service_type, customer_id)
        `)
        .eq('cook_status', 'ready')
        .order('assigned_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch cook details
      const cookIds = [...new Set(assignments?.map((a: any) => a.cook_id) || [])];
      const { data: cooksData } = await supabase
        .from('cooks')
        .select('id, kitchen_name, mobile_number')
        .in('id', cookIds);

      const cookMap = new Map(cooksData?.map((c: any) => [c.id, c]) || []);

      // Fetch customer profiles
      const customerIds = [...new Set(assignments?.map((a: any) => a.order?.customer_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      return assignments?.map((a: any) => ({
        ...a,
        cook: cookMap.get(a.cook_id),
        customer: a.order?.customer_id ? profileMap.get(a.order.customer_id) : null,
      })) as CookAssignment[];
    },
  });

  const form = useForm<CookFormData>({
    resolver: zodResolver(cookSchema),
    defaultValues: {
      staffId: '',
      kitchenName: '',
      mobileNumber: '',
      password: '',
      panchayatId: '',
      allowedOrderTypes: ['indoor_events', 'cloud_kitchen', 'homemade'],
    },
  });

  const handleStaffSelect = (staffId: string) => {
    const staff = staffProfiles?.find(s => s.id === staffId);
    if (staff) {
      setSelectedStaff(staff);
      form.setValue('staffId', staffId);
      form.setValue('kitchenName', staff.name + "'s Kitchen");
      form.setValue('mobileNumber', staff.mobile_number);
      if (staff.panchayat_id) {
        form.setValue('panchayatId', staff.panchayat_id);
      }
    } else {
      setSelectedStaff(null);
      form.setValue('staffId', '');
    }
  };

  const handleSubmit = async (data: CookFormData) => {
    setIsSubmitting(true);
    try {
      let userId: string | undefined;

      if (selectedStaff) {
        userId = selectedStaff.user_id;
      } else {
        const email = `${data.mobileNumber}@pennycarbs.local`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: data.password,
        });

        if (authError) throw authError;
        userId = authData.user?.id;
      }

      const { error: cookError } = await supabase
        .from('cooks')
        .insert({
          user_id: userId,
          kitchen_name: data.kitchenName,
          mobile_number: data.mobileNumber,
          panchayat_id: data.panchayatId,
          allowed_order_types: data.allowedOrderTypes,
          created_by: user?.id,
        });

      if (cookError) throw cookError;

      if (userId) {
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'cook',
          });
      }

      toast({
        title: "Cook Registered",
        description: `${data.kitchenName} has been registered successfully`,
      });

      form.reset();
      setSelectedStaff(null);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-cooks'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register cook",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCookStatus = async (cookId: string, isActive: boolean) => {
    try {
      await supabase
        .from('cooks')
        .update({ is_active: !isActive })
        .eq('id', cookId);

      queryClient.invalidateQueries({ queryKey: ['admin-cooks'] });
      toast({
        title: "Status Updated",
        description: `Cook ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      accepted: 'bg-blue-500',
      preparing: 'bg-orange-500',
      cooked: 'bg-purple-500',
      ready: 'bg-green-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const renderAssignmentCard = (assignment: CookAssignment) => (
    <Card key={assignment.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-medium">{assignment.order?.order_number}</span>
              <Badge variant="outline" className="text-xs capitalize">
                <span className={`mr-1.5 h-2 w-2 rounded-full ${getStatusColor(assignment.cook_status)}`} />
                {assignment.cook_status}
              </Badge>
            </div>
            <p className="text-sm font-medium">{assignment.cook?.kitchen_name}</p>
            <p className="text-xs text-muted-foreground">
              Customer: {assignment.customer?.name || 'Unknown'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
              {assignment.order?.event_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(assignment.order.event_date), 'dd MMM yyyy')}
                </span>
              )}
              {assignment.order?.guest_count && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {assignment.order.guest_count} guests
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-primary">₹{assignment.order?.total_amount?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground capitalize">{assignment.order?.service_type?.replace('_', ' ')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Cook Management</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Cook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Register New Cook
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  {/* Staff Selection */}
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Select Existing Staff (Optional)
                    </FormLabel>
                    <Select onValueChange={handleStaffSelect} value={form.watch('staffId') || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select from existing staff or leave empty for new" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover max-h-60">
                        <SelectItem value="new">-- Create New User --</SelectItem>
                        {staffProfiles?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name} ({staff.mobile_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select an existing staff member to auto-fill their details
                    </p>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="kitchenName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kitchen Name (Unique)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter kitchen name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="10-digit mobile" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Password {selectedStaff && <span className="text-xs text-muted-foreground">(for cook login)</span>}
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 6 characters" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {selectedStaff 
                            ? "Set a new password for cook portal access" 
                            : "Create login password for new cook account"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="panchayatId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Panchayat</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select panchayat" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover">
                            {panchayats.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allowedOrderTypes"
                    render={() => (
                      <FormItem>
                        <FormLabel>Allowed Order Types</FormLabel>
                        <div className="space-y-2">
                          {orderTypes.map((type) => (
                            <div key={type.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={type.value}
                                checked={form.watch('allowedOrderTypes').includes(type.value)}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues('allowedOrderTypes');
                                  if (checked) {
                                    form.setValue('allowedOrderTypes', [...current, type.value]);
                                  } else {
                                    form.setValue('allowedOrderTypes', current.filter(t => t !== type.value));
                                  }
                                }}
                              />
                              <label htmlFor={type.value} className="text-sm">
                                {type.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Register Cook
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="cooks" className="flex-1">
              <ChefHat className="h-4 w-4 mr-1" />
              Cooks ({cooks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">
              Pending ({pendingAssignments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="finished" className="flex-1">
              Finished ({finishedAssignments?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Cooks Tab */}
          <TabsContent value="cooks" className="space-y-4">
            {cooksLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : cooks && cooks.length > 0 ? (
              cooks.map((cook) => (
                <Card key={cook.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <ChefHat className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{cook.kitchen_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {cook.mobile_number}
                          </p>
                          {cook.panchayat && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cook.panchayat.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={cook.is_active ? "default" : "secondary"}>
                        {cook.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-1">
                      {cook.allowed_order_types.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant={cook.is_active ? "destructive" : "default"}
                        onClick={() => toggleCookStatus(cook.id, cook.is_active)}
                      >
                        {cook.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center">
                <ChefHat className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No cooks registered yet</p>
              </Card>
            )}
          </TabsContent>

          {/* Pending Orders Tab */}
          <TabsContent value="pending" className="space-y-3">
            {pendingLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : pendingAssignments && pendingAssignments.length > 0 ? (
              pendingAssignments.map(renderAssignmentCard)
            ) : (
              <Card className="p-6 text-center">
                <ChefHat className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No pending orders</p>
              </Card>
            )}
          </TabsContent>

          {/* Finished Orders Tab */}
          <TabsContent value="finished" className="space-y-3">
            {finishedLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : finishedAssignments && finishedAssignments.length > 0 ? (
              finishedAssignments.map(renderAssignmentCard)
            ) : (
              <Card className="p-6 text-center">
                <ChefHat className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No finished orders yet</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminCooks;