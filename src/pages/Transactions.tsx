import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { FileText, CalendarIcon, ArrowDownRight, ArrowUpRight, Download, Printer, Search } from 'lucide-react';
import { TransactionViewDialog } from '@/components/transactions/TransactionViewDialog';
import { TransactionEditDialog } from '@/components/transactions/TransactionEditDialog';
import { TransactionCard } from '@/components/transactions/TransactionCard';
import { DailyLedgerReport } from '@/components/transactions/DailyLedgerReport';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { exportTransactionsToCSV, printTransactionsSheet } from '@/utils/exportUtils';

interface Transaction {
  id: string;
  invoice_number: string | null;
  staff_id: string;
  transaction_type: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  payment_method: string;
  is_credit: boolean;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  customers: { name: string } | null;
}

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'custom';

const Transactions = () => {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  
  // Dialog states
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [showLedgerReport, setShowLedgerReport] = useState(false);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canEdit = role === 'owner' || role === 'manager';
  const canDelete = role === 'owner';

  useEffect(() => {
    fetchTransactions();
  }, [datePreset, fromDate, toDate]);

  const getDateRange = () => {
    const today = new Date();
    switch (datePreset) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'last7days':
        return { start: startOfDay(subDays(today, 6)), end: endOfDay(today) };
      case 'custom':
        return { start: startOfDay(fromDate), end: endOfDay(toDate) };
      default:
        return { start: startOfDay(today), end: endOfDay(today) };
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, customers(name), invoice_number`)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTransaction) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deleteTransaction.id);

      if (error) throw error;
      
      toast.success('Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    } finally {
      setDeleting(false);
      setDeleteTransaction(null);
    }
  };

  const filtered = transactions.filter(t => {
    const typeMatch = filterType === 'all' || t.transaction_type === filterType;
    const searchMatch = !searchQuery || 
      (t.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return typeMatch && searchMatch;
  });

  // Calculate totals
  const totals = filtered.reduce((acc, t) => {
    if (t.transaction_type === 'buy') {
      acc.nprOut += t.from_currency === 'NPR' ? t.from_amount : t.to_amount;
      acc.inrIn += t.to_currency === 'INR' ? t.to_amount : (t.from_currency === 'INR' ? t.from_amount : 0);
    } else {
      acc.nprIn += t.to_currency === 'NPR' ? t.to_amount : t.from_amount;
      acc.inrOut += t.from_currency === 'INR' ? t.from_amount : (t.to_currency === 'INR' ? t.to_amount : 0);
    }
    return acc;
  }, { nprIn: 0, nprOut: 0, inrIn: 0, inrOut: 0 });

  const handleView = (transaction: Transaction) => {
    setViewTransaction(transaction);
  };

  const handleEditFromView = (transaction: Transaction) => {
    setViewTransaction(null);
    setEditTransaction(transaction);
  };

  const getDateLabel = () => {
    switch (datePreset) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7days': return 'Last 7 Days';
      case 'custom': return `${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d')}`;
    }
  };

  // Group transactions by date
  const groupedTransactions = filtered.reduce((groups, transaction) => {
    const date = format(new Date(transaction.created_at), 'yyyy-MM-dd');
    const label = format(new Date(transaction.created_at), 'EEEE, MMMM d');
    if (!groups[date]) {
      groups[date] = { label, transactions: [] };
    }
    groups[date].transactions.push(transaction);
    return groups;
  }, {} as Record<string, { label: string; transactions: Transaction[] }>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">{getDateLabel()} • {filtered.length} transactions</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number or customer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowLedgerReport(true)} className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Report</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportTransactionsToCSV(filtered, getDateLabel())}
            disabled={filtered.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => printTransactionsSheet(filtered, totals, getDateLabel())}
            disabled={filtered.length === 0}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          
          {/* Date Preset Selector */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          {datePreset === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(fromDate, 'MMM d')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => date && setFromDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(toDate, 'MMM d')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => date && setToDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">NPR Received</span>
            </div>
            <p className="text-xl font-bold text-primary">रू {totals.nprIn.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">NPR Given</span>
            </div>
            <p className="text-xl font-bold text-destructive">रू {totals.nprOut.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">INR Received</span>
            </div>
            <p className="text-xl font-bold text-primary">₹ {totals.inrIn.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">INR Given</span>
            </div>
            <p className="text-xl font-bold text-destructive">₹ {totals.inrOut.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <div className="space-y-6">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading transactions...</p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No transactions found</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedTransactions).map(([date, { label, transactions: dayTransactions }]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{dayTransactions.length} transactions</span>
              </div>
              <div className="space-y-3">
                {dayTransactions.map((t) => (
                  <TransactionCard
                    key={t.id}
                    transaction={t}
                    onView={handleView}
                    onEdit={canEdit ? (tx) => setEditTransaction(tx) : undefined}
                    onDelete={canDelete ? (tx) => setDeleteTransaction(tx) : undefined}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Dialog */}
      <TransactionViewDialog
        transaction={viewTransaction}
        open={!!viewTransaction}
        onOpenChange={(open) => !open && setViewTransaction(null)}
        onEdit={handleEditFromView}
        canEdit={canEdit}
      />

      {/* Edit Dialog */}
      <TransactionEditDialog
        transaction={editTransaction}
        open={!!editTransaction}
        onOpenChange={(open) => !open && setEditTransaction(null)}
        onSaved={fetchTransactions}
      />

      {/* Daily Ledger Report Dialog */}
      <DailyLedgerReport
        open={showLedgerReport}
        onOpenChange={setShowLedgerReport}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTransaction} onOpenChange={(open) => !open && setDeleteTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
              {deleteTransaction && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Type:</strong> {deleteTransaction.transaction_type.toUpperCase()}</p>
                  <p><strong>Amount:</strong> {deleteTransaction.from_amount} {deleteTransaction.from_currency} → {deleteTransaction.to_amount} {deleteTransaction.to_currency}</p>
                  <p><strong>Customer:</strong> {deleteTransaction.customers?.name || 'Walk-in'}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Transactions;
