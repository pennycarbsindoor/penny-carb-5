import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import IndoorEventsShell from './IndoorEventsShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Percent, DollarSign, Clock, CheckCircle, AlertTriangle, User, Phone } from 'lucide-react';

interface ReferralData {
  id: string;
  commission_percent: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  order: {
    id: string;
    order_number: string;
    service_type: string;
    total_amount: number;
    event_date: string | null;
    referral_code: string | null;
    profile: { name: string; mobile_number: string } | null;
  } | null;
  referrer: { name: string; mobile_number: string } | null;
}

interface OrderWithReferral {
  id: string;
  order_number: string;
  total_amount: number;
  event_date: string | null;
  referral_code: string | null;
  created_at: string;
  customer: { name: string; mobile_number: string } | null;
  referrerInfo: {
    type: 'profile' | 'cook' | 'delivery' | 'missing';
    name?: string;
    mobile?: string;
  } | null;
}

const IndoorEventsCommissions: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  // Get referrals for indoor_events orders
  const { data: referrals, isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['indoor-events-commissions'],
    queryFn: async () => {
      // First get referrals with orders
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id, commission_percent, commission_amount, status, created_at, paid_at, referrer_id,
          order:orders(id, order_number, service_type, total_amount, event_date, referral_code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // Get referrer profiles separately (since no FK exists)
      const referrerIds = data.map(r => r.referrer_id).filter(Boolean);
      const { data: referrerProfiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', referrerIds);
      
      const referrerMap = new Map(referrerProfiles?.map(p => [p.user_id, { name: p.name, mobile_number: p.mobile_number }]) || []);
      
      // Get customer profiles separately
      const orderIds = data.map(r => r.order?.id).filter(Boolean) || [];
      const { data: orders } = await supabase
        .from('orders')
        .select('id, customer_id')
        .in('id', orderIds);
      
      const customerIds = orders?.map(o => o.customer_id).filter(Boolean) || [];
      const { data: customerProfiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);
      
      // Map customer profiles to orders
      const customerMap = new Map(customerProfiles?.map(p => [p.user_id, p]) || []);
      const orderCustomerMap = new Map(orders?.map(o => [o.id, customerMap.get(o.customer_id)]) || []);
      
      // Filter for indoor_events orders and add customer + referrer info
      return data
        .filter((r: any) => r.order?.service_type === 'indoor_events')
        .map((r: any) => ({
          ...r,
          referrer: referrerMap.get(r.referrer_id) || null,
          order: r.order ? {
            ...r.order,
            profile: orderCustomerMap.get(r.order.id) || null
          } : null
        })) as ReferralData[];
    },
  });

  // Get all indoor event orders with referral codes to match with references
  const { data: ordersWithReferences, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['indoor-events-orders-references'],
    queryFn: async () => {
      // Get orders with referral codes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, event_date, referral_code, created_at, customer_id')
        .eq('service_type', 'indoor_events')
        .not('referral_code', 'is', null)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return { matched: [], missing: [] };
      
      // Get customer profiles
      const customerIds = orders.map(o => o.customer_id).filter(Boolean);
      const { data: customerProfiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);
      
      const customerMap = new Map(customerProfiles?.map(p => [p.user_id, { name: p.name, mobile_number: p.mobile_number }]) || []);

      // Get all profiles, cooks, and delivery staff to match mobile numbers
      const [profilesRes, cooksRes, deliveryRes] = await Promise.all([
        supabase.from('profiles').select('name, mobile_number'),
        supabase.from('cooks').select('kitchen_name, mobile_number'),
        supabase.from('delivery_staff').select('name, mobile_number'),
      ]);

      const profiles = profilesRes.data || [];
      const cooks = cooksRes.data || [];
      const deliveryStaff = deliveryRes.data || [];

      const matched: OrderWithReferral[] = [];
      const missing: OrderWithReferral[] = [];

      for (const order of orders) {
        const refCode = order.referral_code?.trim();
        if (!refCode) continue;

        // Try to find the referrer by mobile number
        const profile = profiles.find((p) => p.mobile_number === refCode);
        const cook = cooks.find((c) => c.mobile_number === refCode);
        const delivery = deliveryStaff.find((d) => d.mobile_number === refCode);

        let referrerInfo: OrderWithReferral['referrerInfo'] = null;

        if (profile) {
          referrerInfo = { type: 'profile', name: profile.name, mobile: profile.mobile_number };
        } else if (cook) {
          referrerInfo = { type: 'cook', name: cook.kitchen_name, mobile: cook.mobile_number };
        } else if (delivery) {
          referrerInfo = { type: 'delivery', name: delivery.name, mobile: delivery.mobile_number };
        } else {
          referrerInfo = { type: 'missing', mobile: refCode };
        }

        const orderData: OrderWithReferral = {
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          event_date: order.event_date,
          referral_code: order.referral_code,
          created_at: order.created_at,
          customer: customerMap.get(order.customer_id) || null,
          referrerInfo,
        };

        if (referrerInfo.type === 'missing') {
          missing.push(orderData);
        } else {
          matched.push(orderData);
        }
      }

      return { matched, missing };
    },
  });

  const totals = {
    pending: referrals?.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.commission_amount, 0) || 0,
    approved: referrals?.filter((r) => r.status === 'approved').reduce((sum, r) => sum + r.commission_amount, 0) || 0,
    paid: referrals?.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.commission_amount, 0) || 0,
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    approved: 'bg-blue-500',
    paid: 'bg-green-500',
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    profile: { label: 'Customer', color: 'bg-blue-500' },
    cook: { label: 'Cook', color: 'bg-orange-500' },
    delivery: { label: 'Delivery', color: 'bg-green-500' },
    missing: { label: 'Unknown', color: 'bg-red-500' },
  };

  const isLoading = isLoadingReferrals || isLoadingOrders;

  return (
    <IndoorEventsShell title="Commission Tracking">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-lg font-bold text-yellow-600">₹{totals.pending.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <p className="text-lg font-bold text-blue-600">₹{totals.approved.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-lg font-bold text-green-600">₹{totals.paid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Referrals</TabsTrigger>
          <TabsTrigger value="matched">
            Matched ({ordersWithReferences?.matched.length || 0})
          </TabsTrigger>
          <TabsTrigger value="missing" className="relative">
            Missing
            {(ordersWithReferences?.missing.length || 0) > 0 && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                {ordersWithReferences?.missing.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Referrals Tab */}
        <TabsContent value="all">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : referrals?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Percent className="h-12 w-12 mx-auto mb-3 opacity-50" />
                No commissions tracked yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {referrals?.map((ref) => (
                <Card key={ref.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm">{ref.order?.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Referrer: {ref.referrer?.name || 'Unknown'} ({ref.referrer?.mobile_number})
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer: {ref.order?.profile?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs capitalize">
                          <span className={`mr-1.5 h-2 w-2 rounded-full inline-block ${statusColors[ref.status]}`} />
                          {ref.status}
                        </Badge>
                        <p className="font-bold text-indoor-events mt-1">₹{ref.commission_amount?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{ref.commission_percent}%</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Order: ₹{ref.order?.total_amount?.toLocaleString()} • {ref.order?.event_date ? format(new Date(ref.order.event_date), 'dd MMM yyyy') : ''}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Matched References Tab */}
        <TabsContent value="matched">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : ordersWithReferences?.matched.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                No matched references found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ordersWithReferences?.matched.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-sm font-medium">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.event_date ? format(new Date(order.event_date), 'dd MMM yyyy') : format(new Date(order.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <p className="font-bold">₹{order.total_amount?.toLocaleString()}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground mb-1">Customer</p>
                        <p className="font-medium truncate">{order.customer?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer?.mobile_number}
                        </p>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-xs text-muted-foreground">Referrer</p>
                          <Badge className={`text-[10px] px-1 py-0 ${typeLabels[order.referrerInfo?.type || 'missing'].color}`}>
                            {typeLabels[order.referrerInfo?.type || 'missing'].label}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{order.referrerInfo?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.referrerInfo?.mobile}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Missing References Tab */}
        <TabsContent value="missing">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : ordersWithReferences?.missing.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                All references are matched!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-medium">
                      {ordersWithReferences?.missing.length} orders have unmatched reference numbers
                    </p>
                  </div>
                </CardContent>
              </Card>

              {ordersWithReferences?.missing.map((order) => (
                <Card key={order.id} className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-sm font-medium">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.event_date ? format(new Date(order.event_date), 'dd MMM yyyy') : format(new Date(order.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <p className="font-bold">₹{order.total_amount?.toLocaleString()}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground mb-1">Customer</p>
                        <p className="font-medium truncate">{order.customer?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer?.mobile_number}
                        </p>
                      </div>
                      
                      <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-xs text-muted-foreground">Reference</p>
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            Not Found
                          </Badge>
                        </div>
                        <p className="font-medium text-destructive flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.referral_code}
                        </p>
                        <p className="text-xs text-muted-foreground">Not in database</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </IndoorEventsShell>
  );
};

export default IndoorEventsCommissions;
