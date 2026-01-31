import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import IndoorEventsShell from './IndoorEventsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Eye, Search, Calendar, Users, MapPin, Phone, ChefHat, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface IndoorEventOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  guest_count: number | null;
  event_date: string | null;
  event_details: string | null;
  delivery_address: string | null;
  order_type: string | null;
  created_at: string;
  customer_id: string;
  panchayat_id: string;
  ward_number: number;
  assigned_cook_id: string | null;
  event_type: { id: string; name: string; icon: string } | null;
  panchayat: { name: string } | null;
  profile: { name: string; mobile_number: string } | null;
  assigned_cooks?: { cook_id: string; cook_status: string }[];
}

interface Cook {
  id: string;
  kitchen_name: string;
  mobile_number: string;
  is_available: boolean;
  panchayat?: { name: string };
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-orange-500',
  ready: 'bg-purple-500',
  out_for_delivery: 'bg-indigo-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-destructive',
};

const IndoorEventsOrders: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<IndoorEventOrder | null>(null);
  const [cookSelectionOpen, setCookSelectionOpen] = useState(false);
  const [selectedCooks, setSelectedCooks] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['indoor-events-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, status, total_amount, guest_count, event_date, 
          event_details, delivery_address, order_type, created_at, customer_id,
          panchayat_id, ward_number, assigned_cook_id,
          event_type:event_types(id, name, icon),
          panchayat:panchayats(name)
        `)
        .eq('service_type', 'indoor_events')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as OrderStatus);
      }

      const { data: ordersData, error } = await query;
      if (error) throw error;

      // Fetch profiles for customer_ids
      const customerIds = ordersData?.map((o: any) => o.customer_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      // Fetch assigned cooks for orders
      const orderIds = ordersData?.map((o: any) => o.id) || [];
      const { data: assignedCooks } = await supabase
        .from('order_assigned_cooks')
        .select('order_id, cook_id, cook_status')
        .in('order_id', orderIds);

      const assignedCooksMap = new Map<string, { cook_id: string; cook_status: string }[]>();
      assignedCooks?.forEach((ac: any) => {
        if (!assignedCooksMap.has(ac.order_id)) {
          assignedCooksMap.set(ac.order_id, []);
        }
        assignedCooksMap.get(ac.order_id)!.push({ cook_id: ac.cook_id, cook_status: ac.cook_status });
      });

      return ordersData?.map((order: any) => ({
        ...order,
        profile: profileMap.get(order.customer_id) || null,
        assigned_cooks: assignedCooksMap.get(order.id) || [],
      })) as IndoorEventOrder[];
    },
  });

  // Fetch available cooks
  const { data: cooks } = useQuery({
    queryKey: ['available-cooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooks')
        .select('id, kitchen_name, mobile_number, is_available, panchayat:panchayats(name)')
        .eq('is_active', true)
        .order('kitchen_name');
      if (error) throw error;
      return data as Cook[];
    },
  });

  const filteredOrders = orders?.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      o.profile?.name?.toLowerCase().includes(s) ||
      o.profile?.mobile_number?.includes(s)
    );
  });

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      refetch();
      setSelectedOrder(null);
    }
  };

  const openCookSelection = (order: IndoorEventOrder) => {
    setSelectedOrder(order);
    // Pre-select already assigned cooks
    setSelectedCooks(order.assigned_cooks?.map(ac => ac.cook_id) || []);
    setCookSelectionOpen(true);
  };

  const assignCooksMutation = useMutation({
    mutationFn: async ({ orderId, cookIds }: { orderId: string; cookIds: string[] }) => {
      // First remove existing assignments
      await supabase
        .from('order_assigned_cooks')
        .delete()
        .eq('order_id', orderId);

      // Insert new assignments
      if (cookIds.length > 0) {
        const assignments = cookIds.map(cookId => ({
          order_id: orderId,
          cook_id: cookId,
          cook_status: 'pending',
        }));

        const { error } = await supabase
          .from('order_assigned_cooks')
          .insert(assignments);

        if (error) throw error;
      }

      // Update order status to preparing
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      toast({
        title: 'Cooks Assigned',
        description: `${selectedCooks.length} cook(s) assigned and order marked as preparing`,
      });
      setCookSelectionOpen(false);
      setSelectedCooks([]);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['indoor-events-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign cooks',
        variant: 'destructive',
      });
    },
  });

  const handleAssignCooksAndPrepare = () => {
    if (!selectedOrder || selectedCooks.length === 0) {
      toast({
        title: 'Select Cooks',
        description: 'Please select at least one cook',
        variant: 'destructive',
      });
      return;
    }

    assignCooksMutation.mutate({ orderId: selectedOrder.id, cookIds: selectedCooks });
  };

  const toggleCookSelection = (cookId: string) => {
    setSelectedCooks(prev =>
      prev.includes(cookId)
        ? prev.filter(id => id !== cookId)
        : [...prev, cookId]
    );
  };

  return (
    <IndoorEventsShell title="All Event Bookings">
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredOrders?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No event bookings found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders?.map((order) => (
            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${statusColors[order.status]}`} />
                        {order.status}
                      </Badge>
                      {order.assigned_cooks && order.assigned_cooks.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <ChefHat className="h-3 w-3 mr-1" />
                          {order.assigned_cooks.length} cook(s)
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{order.profile?.name || 'Unknown'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {order.event_date ? format(new Date(order.event_date), 'dd MMM yyyy') : 'No date'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {order.guest_count || '?'} guests
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Ward {order.ward_number}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-indoor-events">₹{order.total_amount?.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground">{order.event_type?.icon} {order.event_type?.name || 'Event'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder && !cookSelectionOpen} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selectedOrder.order_number}</span>
                  <Badge variant="outline" className="capitalize">
                    <span className={`mr-1.5 h-2 w-2 rounded-full ${statusColors[selectedOrder.status]}`} />
                    {selectedOrder.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder.event_type?.icon} {selectedOrder.event_type?.name || 'Event'} • {selectedOrder.order_type === 'full_event' ? 'Full Planning' : 'Quick Booking'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{selectedOrder.profile?.name}</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {selectedOrder.profile?.mobile_number}
                    </p>
                  </CardContent>
                </Card>

                {/* Event Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p>{selectedOrder.event_date ? format(new Date(selectedOrder.event_date), 'PPP') : 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Guests</p>
                        <p>{selectedOrder.guest_count || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p>Ward {selectedOrder.ward_number}, {selectedOrder.panchayat?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Venue Address</p>
                      <p>{selectedOrder.delivery_address || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Assigned Cooks */}
                {selectedOrder.assigned_cooks && selectedOrder.assigned_cooks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ChefHat className="h-4 w-4" />
                        Assigned Cooks ({selectedOrder.assigned_cooks.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="space-y-2">
                        {selectedOrder.assigned_cooks.map((ac, idx) => {
                          const cook = cooks?.find(c => c.id === ac.cook_id);
                          return (
                            <div key={ac.cook_id} className="flex items-center justify-between p-2 rounded bg-muted">
                              <span>{cook?.kitchen_name || 'Unknown Cook'}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {ac.cook_status}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Details / Planning Info */}
                {selectedOrder.event_details && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Planning Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-lg overflow-x-auto">
                        {selectedOrder.event_details}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Amount */}
                <Card className="bg-indoor-events/5 border-indoor-events/20">
                  <CardContent className="py-4 flex items-center justify-between">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-xl font-bold text-indoor-events">
                      ₹{selectedOrder.total_amount?.toLocaleString() || 0}
                    </span>
                  </CardContent>
                </Card>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === 'pending' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}>
                      Confirm Order
                    </Button>
                  )}
                  {selectedOrder.status === 'confirmed' && (
                    <Button size="sm" onClick={() => openCookSelection(selectedOrder)}>
                      <ChefHat className="h-4 w-4 mr-1" />
                      Assign Cooks & Start Preparing
                    </Button>
                  )}
                  {selectedOrder.status === 'preparing' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}>
                      Mark Delivered
                    </Button>
                  )}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cook Selection Dialog */}
      <Dialog open={cookSelectionOpen} onOpenChange={setCookSelectionOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Select Cooks for Order
            </DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.order_number} - Select one or more cooks to assign
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {cooks?.map((cook) => (
              <div
                key={cook.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCooks.includes(cook.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                }`}
                onClick={() => toggleCookSelection(cook.id)}
              >
                <Checkbox
                  checked={selectedCooks.includes(cook.id)}
                  onCheckedChange={() => toggleCookSelection(cook.id)}
                />
                <div className="flex-1">
                  <p className="font-medium">{cook.kitchen_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cook.mobile_number} • {cook.panchayat?.name || 'No panchayat'}
                  </p>
                </div>
                <Badge variant={cook.is_available ? 'default' : 'secondary'}>
                  {cook.is_available ? 'Online' : 'Offline'}
                </Badge>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCookSelectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignCooksAndPrepare}
              disabled={selectedCooks.length === 0 || assignCooksMutation.isPending}
            >
              {assignCooksMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign {selectedCooks.length} Cook(s) & Start Preparing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IndoorEventsShell>
  );
};

export default IndoorEventsOrders;