import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Order, OrderStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';
import { calculatePlatformMargin } from '@/lib/priceUtils';

interface OrderWithCustomerTotal extends Order {
  customerTotal?: number;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-warning text-warning-foreground', icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-primary text-primary-foreground', icon: <CheckCircle className="h-4 w-4" /> },
  preparing: { label: 'Preparing', color: 'bg-primary text-primary-foreground', icon: <Package className="h-4 w-4" /> },
  ready: { label: 'Ready', color: 'bg-success text-success-foreground', icon: <Package className="h-4 w-4" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-cloud-kitchen text-white', icon: <Truck className="h-4 w-4" /> },
  delivered: { label: 'Delivered', color: 'bg-success text-success-foreground', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-destructive text-destructive-foreground', icon: <XCircle className="h-4 w-4" /> },
};

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithCustomerTotal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const ordersList = data as Order[];

        if (ordersList.length === 0) {
          setOrders([]);
          return;
        }

        // Fetch order items with food item margin data to calculate customer totals
        const orderIds = ordersList.map(o => o.id);
        const { data: itemsData } = await supabase
          .from('order_items')
          .select(`
            order_id, quantity,
            food_item:food_items(price, platform_margin_type, platform_margin_value)
          `)
          .in('order_id', orderIds);

        // Calculate customer total per order
        const orderTotals = new Map<string, number>();
        itemsData?.forEach((item: any) => {
          const fi = item.food_item;
          if (!fi) return;
          const marginType = (fi.platform_margin_type || 'percent') as 'percent' | 'fixed';
          const marginValue = fi.platform_margin_value || 0;
          const margin = calculatePlatformMargin(fi.price, marginType, marginValue);
          const customerPrice = fi.price + margin;
          const current = orderTotals.get(item.order_id) || 0;
          orderTotals.set(item.order_id, current + customerPrice * item.quantity);
        });

        setOrders(ordersList.map(o => ({
          ...o,
          customerTotal: orderTotals.get(o.id),
        })));
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 pb-20">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Login to view orders</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Sign in to see your order history
        </p>
        <Button className="mt-6" onClick={() => navigate('/auth')}>
          Login / Sign Up
        </Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">My Orders</h1>
      </header>

      <main className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No orders yet</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Your order history will appear here
            </p>
            <Button className="mt-6" onClick={() => navigate('/')}>
              Start Ordering
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status];
              
              return (
                <Card 
                  key={order.id} 
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/order/${order.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">#{order.order_number}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge className={`gap-1 ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">
                        {order.service_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="font-semibold">₹{order.customerTotal ?? order.total_amount}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Orders;
