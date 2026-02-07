import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Wallet, 
  IndianRupee, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  CheckCircle,
  History,
  Search
} from 'lucide-react';

interface DeliveryStaffWithWallet {
  id: string;
  name: string;
  mobile_number: string;
  staff_type: string;
  wallet?: {
    id: string;
    collected_amount: number;
    job_earnings: number;
    total_settled: number;
  };
}

interface WalletTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  order_id: string | null;
}

const DeliveryStaffWalletTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<DeliveryStaffWithWallet | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Fetch all delivery staff with wallets
  const { data: staffList, isLoading } = useQuery({
    queryKey: ['admin-delivery-wallets'],
    queryFn: async () => {
      const { data: staff, error } = await supabase
        .from('delivery_staff')
        .select('id, name, mobile_number, staff_type')
        .eq('is_approved', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Fetch wallets for all staff
      const staffIds = staff?.map(s => s.id) || [];
      const { data: wallets } = await supabase
        .from('delivery_wallets')
        .select('*')
        .in('delivery_staff_id', staffIds);

      const walletMap = new Map(wallets?.map(w => [w.delivery_staff_id, w]) || []);

      return staff?.map(s => ({
        ...s,
        wallet: walletMap.get(s.id) || undefined,
      })) as DeliveryStaffWithWallet[];
    },
  });

  // Fetch transaction history for selected staff
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['admin-wallet-transactions', selectedStaff?.id],
    queryFn: async () => {
      if (!selectedStaff?.id) return [];

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('delivery_staff_id', selectedStaff.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!selectedStaff?.id && isHistoryDialogOpen,
  });

  // Process payout (transfer job earnings to staff)
  const payoutMutation = useMutation({
    mutationFn: async ({ staffId, amount }: { staffId: string; amount: number }) => {
      // Get current wallet
      const { data: wallet, error: walletError } = await supabase
        .from('delivery_wallets')
        .select('*')
        .eq('delivery_staff_id', staffId)
        .single();

      if (walletError) throw new Error('Wallet not found');
      if (wallet.job_earnings < amount) throw new Error('Insufficient job earnings');

      // Update wallet - deduct from job_earnings, add to total_settled
      const { error: updateError } = await supabase
        .from('delivery_wallets')
        .update({
          job_earnings: wallet.job_earnings - amount,
          total_settled: wallet.total_settled + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('delivery_staff_id', staffId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          delivery_staff_id: staffId,
          transaction_type: 'settlement',
          amount: amount,
          description: `Job earnings payout of ₹${amount}`,
          status: 'approved',
          approved_at: new Date().toISOString(),
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-transactions'] });
      toast({ title: 'Payout processed successfully' });
      setIsPayoutDialogOpen(false);
      setPayoutAmount('');
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Payout failed', description: error.message, variant: 'destructive' });
    },
  });

  // Process settlement (admin collects cash from staff)
  const settlementMutation = useMutation({
    mutationFn: async ({ staffId, amount }: { staffId: string; amount: number }) => {
      // Get current wallet
      const { data: wallet, error: walletError } = await supabase
        .from('delivery_wallets')
        .select('*')
        .eq('delivery_staff_id', staffId)
        .single();

      if (walletError) throw new Error('Wallet not found');
      if (wallet.collected_amount < amount) throw new Error('Amount exceeds collected balance');

      // Update wallet - deduct from collected_amount
      const { error: updateError } = await supabase
        .from('delivery_wallets')
        .update({
          collected_amount: wallet.collected_amount - amount,
          total_settled: wallet.total_settled + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('delivery_staff_id', staffId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          delivery_staff_id: staffId,
          transaction_type: 'settlement',
          amount: -amount, // Negative because it's deducted
          description: `Cash settlement of ₹${amount} collected by admin`,
          status: 'approved',
          approved_at: new Date().toISOString(),
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-transactions'] });
      toast({ title: 'Settlement processed successfully' });
      setIsSettlementDialogOpen(false);
      setSettlementAmount('');
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Settlement failed', description: error.message, variant: 'destructive' });
    },
  });

  const filteredStaff = staffList?.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mobile_number.includes(searchQuery)
  );

  const openPayoutDialog = (staff: DeliveryStaffWithWallet) => {
    setSelectedStaff(staff);
    setPayoutAmount(staff.wallet?.job_earnings?.toString() || '0');
    setIsPayoutDialogOpen(true);
  };

  const openSettlementDialog = (staff: DeliveryStaffWithWallet) => {
    setSelectedStaff(staff);
    setSettlementAmount(staff.wallet?.collected_amount?.toString() || '0');
    setIsSettlementDialogOpen(true);
  };

  const openHistoryDialog = (staff: DeliveryStaffWithWallet) => {
    setSelectedStaff(staff);
    setIsHistoryDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total Collections</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              ₹{staffList?.reduce((sum, s) => sum + (s.wallet?.collected_amount || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-blue-600">Cash to be collected from staff</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Job Earnings</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ₹{staffList?.reduce((sum, s) => sum + (s.wallet?.job_earnings || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-green-600">Payouts pending to staff</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">Total Settled</span>
            </div>
            <p className="text-2xl font-bold text-gray-600 mt-2">
              ₹{staffList?.reduce((sum, s) => sum + (s.wallet?.total_settled || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">All-time cleared amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Staff List */}
      <div className="space-y-3">
        {filteredStaff?.map((staff) => (
          <Card key={staff.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{staff.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {staff.staff_type === 'fixed_salary' ? 'Fixed Salary' : 'Partner'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{staff.mobile_number}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Collections</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₹{staff.wallet?.collected_amount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Earnings</p>
                    <p className="text-lg font-bold text-green-600">
                      ₹{staff.wallet?.job_earnings?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Settled</p>
                    <p className="text-lg font-bold text-gray-600">
                      ₹{staff.wallet?.total_settled?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openHistoryDialog(staff)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!staff.wallet?.job_earnings || staff.wallet.job_earnings <= 0}
                    onClick={() => openPayoutDialog(staff)}
                  >
                    <ArrowUpFromLine className="h-4 w-4 mr-1" />
                    Payout
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!staff.wallet?.collected_amount || staff.wallet.collected_amount <= 0}
                    onClick={() => openSettlementDialog(staff)}
                  >
                    <ArrowDownToLine className="h-4 w-4 mr-1" />
                    Settle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredStaff?.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No delivery staff found</p>
          </Card>
        )}
      </div>

      {/* Payout Dialog */}
      <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Transfer job earnings to {selectedStaff?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                Available Earnings: <strong>₹{selectedStaff?.wallet?.job_earnings?.toLocaleString() || 0}</strong>
              </p>
            </div>
            <div>
              <Label>Payout Amount (₹)</Label>
              <Input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                min={0}
                max={selectedStaff?.wallet?.job_earnings || 0}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedStaff && payoutAmount) {
                    payoutMutation.mutate({
                      staffId: selectedStaff.id,
                      amount: parseFloat(payoutAmount),
                    });
                  }
                }}
                disabled={!payoutAmount || parseFloat(payoutAmount) <= 0 || payoutMutation.isPending}
              >
                {payoutMutation.isPending ? 'Processing...' : 'Confirm Payout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settlement Dialog */}
      <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Collections</DialogTitle>
            <DialogDescription>
              Record cash collection from {selectedStaff?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Total Collections: <strong>₹{selectedStaff?.wallet?.collected_amount?.toLocaleString() || 0}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This is the cash collected from customers that staff needs to hand over.
              </p>
            </div>
            <div>
              <Label>Settlement Amount (₹)</Label>
              <Input
                type="number"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                min={0}
                max={selectedStaff?.wallet?.collected_amount || 0}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsSettlementDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedStaff && settlementAmount) {
                    settlementMutation.mutate({
                      staffId: selectedStaff.id,
                      amount: parseFloat(settlementAmount),
                    });
                  }
                }}
                disabled={!settlementAmount || parseFloat(settlementAmount) <= 0 || settlementMutation.isPending}
              >
                {settlementMutation.isPending ? 'Processing...' : 'Confirm Settlement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              {selectedStaff?.name}'s wallet transactions
            </DialogDescription>
          </DialogHeader>
          {transactionsLoading ? (
            <Skeleton className="h-40" />
          ) : transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {format(new Date(tx.created_at), 'dd MMM, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        tx.transaction_type === 'earning' ? 'default' :
                        tx.transaction_type === 'collection' ? 'secondary' : 'outline'
                      }>
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.status === 'approved' ? 'default' : 'secondary'}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No transactions found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryStaffWalletTab;
