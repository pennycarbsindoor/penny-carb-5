import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  MapPin, 
  Clock,
  Users,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface UnacceptedOrder {
  id: string;
  order_number: string;
  service_type: string;
  total_amount: number;
  delivery_address: string | null;
  panchayat_id: string;
  ward_number: number;
  created_at: string;
  updated_at: string;
  panchayat?: { name: string };
}

interface UnacceptedOrdersAlertProps {
  open: boolean;
  orders: UnacceptedOrder[];
  onDismiss: () => void;
  onRemove: (orderId: string) => void;
}

const UnacceptedOrdersAlert: React.FC<UnacceptedOrdersAlertProps> = ({
  open,
  orders,
  onDismiss,
  onRemove,
}) => {
  const navigate = useNavigate();
  const [ordersWithDetails, setOrdersWithDetails] = useState<UnacceptedOrder[]>([]);
  const [availableStaffCounts, setAvailableStaffCounts] = useState<Record<string, number>>({});

  // Fetch panchayat names and available staff counts
  useEffect(() => {
    const fetchDetails = async () => {
      if (orders.length === 0) return;

      // Get panchayat names
      const panchayatIds = [...new Set(orders.map(o => o.panchayat_id))];
      const { data: panchayats } = await supabase
        .from('panchayats')
        .select('id, name')
        .in('id', panchayatIds);

      const panchayatMap = new Map(panchayats?.map(p => [p.id, p.name]) || []);

      const enrichedOrders = orders.map(order => ({
        ...order,
        panchayat: { name: panchayatMap.get(order.panchayat_id) || 'Unknown' }
      }));

      setOrdersWithDetails(enrichedOrders);

      // Get available staff count for each order's location
      const staffCounts: Record<string, number> = {};
      for (const order of orders) {
        const { count } = await supabase
          .from('delivery_staff')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('is_approved', true)
          .eq('is_available', true)
          .contains('assigned_panchayat_ids', [order.panchayat_id]);

        staffCounts[order.id] = count || 0;
      }
      setAvailableStaffCounts(staffCounts);
    };

    fetchDetails();
  }, [orders]);

  const handleAssignManually = (orderId: string) => {
    onRemove(orderId);
    navigate('/admin/work-assignment');
  };

  const getWaitingTime = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (ordersWithDetails.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
            <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            Unaccepted Deliveries
            <Badge variant="destructive" className="ml-auto">
              {ordersWithDetails.length} Pending
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          These orders have been ready for delivery but no driver has accepted them.
          Consider manual assignment or contact available staff.
        </p>

        <div className="space-y-3 mt-2">
          {ordersWithDetails.map((order) => (
            <Card key={order.id} className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">#{order.order_number}</span>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {order.service_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="font-bold text-primary">₹{order.total_amount}</span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{order.panchayat?.name}, Ward {order.ward_number}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-destructive">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Waiting: {getWaitingTime(order.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{availableStaffCounts[order.id] || 0} staff available</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleAssignManually(order.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Assign Manually
                  </Button>
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(order.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onDismiss}>
            Close All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnacceptedOrdersAlert;
