import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Check, Clock, Printer, RefreshCw, FileText, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, subDays } from 'date-fns';
import { DenominationCounter, calculateDenominationTotal } from '@/components/cash-tracker/DenominationCounter';
import { LedgerSummary } from '@/components/cash-tracker/LedgerSummary';
import { EditClosingBalanceDialog } from '@/components/cash-tracker/EditClosingBalanceDialog';
import { EditOpeningBalanceDialog } from '@/components/cash-tracker/EditOpeningBalanceDialog';
import { useDailyLedger, LedgerData } from '@/hooks/useDailyLedger';
import { printDenominationSheet } from '@/utils/printUtils';

interface CashRecord {
  id: string;
  staff_id: string;
  date: string;
  opening_npr: number;
  opening_inr: number;
  closing_npr: number | null;
  closing_inr: number | null;
  total_npr_in: number;
  total_npr_out: number;
  total_inr_in: number;
  total_inr_out: number;
  is_closed: boolean;
  notes: string | null;
}

const CashTracker = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { ledgerData, loading: ledgerLoading, fetchLedgerData } = useDailyLedger();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState<CashRecord | null>(null);
  const [previousDayRecord, setPreviousDayRecord] = useState<CashRecord | null>(null);

  // Denomination state
  const [openingNprDenoms, setOpeningNprDenoms] = useState<Record<string, number>>({});
  const [openingInrDenoms, setOpeningInrDenoms] = useState<Record<string, number>>({});
  const [closingNprDenoms, setClosingNprDenoms] = useState<Record<string, number>>({});
  const [closingInrDenoms, setClosingInrDenoms] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const fetchPreviousDayRecord = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data } = await supabase
        .from('staff_cash_tracker')
        .select('*')
        .eq('staff_id', user.id)
        .eq('date', yesterday)
        .single();
      
      return data;
    } catch {
      return null;
    }
  }, [user, yesterday]);

  const fetchTodayRecord = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('staff_cash_tracker')
        .select('*')
        .eq('staff_id', user.id)
        .eq('date', today)
        .single();

      if (data) {
        setTodayRecord(data);
        setNotes(data.notes || '');
        
        // Load ledger data with existing record
        await fetchLedgerData(
          new Date(),
          data.opening_npr,
          data.opening_inr,
          data.closing_npr ?? undefined,
          data.closing_inr ?? undefined
        );
      } else {
        // Fetch previous day to auto-populate opening
        const prevDay = await fetchPreviousDayRecord();
        setPreviousDayRecord(prevDay);
        
        if (prevDay?.closing_npr !== null && prevDay?.closing_inr !== null) {
          // Auto-populate opening from previous closing
          // You could set denomination counts here if stored
        }
      }
    } catch {
      // No record for today
      const prevDay = await fetchPreviousDayRecord();
      setPreviousDayRecord(prevDay);
    } finally {
      setLoading(false);
    }
  }, [user, today, fetchPreviousDayRecord, fetchLedgerData]);

  useEffect(() => {
    fetchTodayRecord();
  }, [fetchTodayRecord]);

  const handleOpeningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const npr = calculateDenominationTotal(openingNprDenoms);
    const inr = calculateDenominationTotal(openingInrDenoms);

    if (npr === 0 && inr === 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter at least one denomination count',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('staff_cash_tracker')
        .insert({
          staff_id: user.id,
          date: today,
          opening_npr: npr,
          opening_inr: inr,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data);
      await fetchLedgerData(new Date(), npr, inr);
      
      toast({
        title: 'Opening Balance Set',
        description: 'Your opening balance for today has been recorded',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !todayRecord) return;

    const npr = calculateDenominationTotal(closingNprDenoms);
    const inr = calculateDenominationTotal(closingInrDenoms);

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('staff_cash_tracker')
        .update({
          closing_npr: npr,
          closing_inr: inr,
          is_closed: true,
          closed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', todayRecord.id)
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data);
      await fetchLedgerData(new Date(), data.opening_npr, data.opening_inr, npr, inr);
      
      toast({
        title: 'Day Closed',
        description: 'Your closing balance has been recorded',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshLedger = async () => {
    if (todayRecord) {
      await fetchLedgerData(
        new Date(),
        todayRecord.opening_npr,
        todayRecord.opening_inr,
        todayRecord.closing_npr ?? undefined,
        todayRecord.closing_inr ?? undefined
      );
    }
  };

  const handleDeleteDay = async () => {
    if (!user || !todayRecord) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('staff_cash_tracker')
        .delete()
        .eq('id', todayRecord.id);

      if (error) throw error;

      setTodayRecord(null);
      setNotes('');
      setOpeningNprDenoms({});
      setOpeningInrDenoms({});
      setClosingNprDenoms({});
      setClosingInrDenoms({});
      setDeleteDialogOpen(false);

      const prevDay = await fetchPreviousDayRecord();
      setPreviousDayRecord(prevDay);

      toast({
        title: 'Day Deleted',
        description: 'Today\'s cash tracker record has been deleted',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handlePrintDenomination = () => {
    printDenominationSheet({
      date: new Date(),
      staffName: profile?.full_name || 'N/A',
      openingNpr: {
        denominations: openingNprDenoms,
        total: todayRecord?.opening_npr || calculateDenominationTotal(openingNprDenoms),
      },
      openingInr: {
        denominations: openingInrDenoms,
        total: todayRecord?.opening_inr || calculateDenominationTotal(openingInrDenoms),
      },
      closingNpr: todayRecord?.is_closed ? {
        denominations: closingNprDenoms,
        total: todayRecord.closing_npr || 0,
      } : undefined,
      closingInr: todayRecord?.is_closed ? {
        denominations: closingInrDenoms,
        total: todayRecord.closing_inr || 0,
      } : undefined,
    });
  };

  const handlePrint = () => {
    if (!ledgerData) return;
    
    const formatNum = (num: number) => new Intl.NumberFormat('en-IN').format(Math.round(num));
    
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Ledger - ${format(new Date(), 'dd/MM/yyyy')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
          .header p { font-size: 12px; color: #666; margin-top: 4px; }
          .info-row { display: flex; justify-content: space-between; margin: 15px 0; }
          .date { font-size: 13px; font-weight: 600; }
          .staff { font-size: 12px; color: #555; }
          .ledger-container { display: flex; gap: 20px; margin-top: 20px; }
          .ledger-table { flex: 1; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
          .ledger-table th { background: linear-gradient(135deg, #2d5a27 0%, #3d7a37 100%); color: #fff; padding: 10px; text-align: center; font-size: 12px; font-weight: 600; }
          .ledger-table td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 11px; }
          .ledger-table tr:last-child td { border-bottom: none; }
          .ledger-table .amount { text-align: right; font-weight: 600; font-family: 'Consolas', monospace; min-width: 80px; }
          .ledger-table .label { text-align: left; color: #333; }
          .total-row { background: #f5f5f5; font-weight: bold; }
          .highlight-row { background: #e8f5e9; }
          .danger { color: #c62828; }
          .success { color: #2e7d32; }
          table { width: 100%; border-collapse: collapse; }
          .staff-owes { margin-top: 20px; border: 2px solid #ff9800; border-radius: 4px; overflow: hidden; }
          .staff-owes-header { background: #ff9800; color: #fff; padding: 8px; text-align: center; font-weight: bold; }
          .staff-owes-body { display: flex; }
          .staff-owes-item { flex: 1; text-align: center; padding: 12px; border-right: 1px solid #eee; }
          .staff-owes-item:last-child { border-right: none; }
          .staff-owes-amount { font-size: 18px; font-weight: bold; color: #e65100; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
          @media print {
            body { padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MADANI MONEY EXCHANGE</h1>
          <p>Daily Cash Ledger Report</p>
        </div>
        
        <div class="info-row">
          <div class="date">Date: ${format(new Date(), 'dd MMMM yyyy')}</div>
          <div class="staff">Staff: ${profile?.full_name || 'N/A'}</div>
        </div>

        <div class="ledger-container">
          <table class="ledger-table">
            <thead>
              <tr><th colspan="2">NPR Balance</th></tr>
            </thead>
            <tbody>
              <tr><td class="amount">${formatNum(ledgerData.openingNpr)}</td><td class="label">Opening Balance</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.ncToIc)}</td><td class="label">NPR Received</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.takeNpr)}</td><td class="label">Cash In</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.esewaInNpr)}</td><td class="label">Online In (eSewa)</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.nastaKharcha)}</td><td class="label">Expenses</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.icToNc)}</td><td class="label">NPR Paid Out</td></tr>
              <tr class="highlight-row"><td class="amount">${formatNum(ledgerData.hunuParneNpr)}</td><td class="label"><strong>Expected Balance</strong></td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.chaNpr)}</td><td class="label"><strong>Actual Balance</strong></td></tr>
              <tr class="total-row"><td class="amount ${ledgerData.farakNpr !== 0 ? (ledgerData.farakNpr > 0 ? 'danger' : 'success') : ''}">${formatNum(ledgerData.farakNpr)}</td><td class="label"><strong>Difference</strong></td></tr>
            </tbody>
          </table>

          <table class="ledger-table">
            <thead>
              <tr><th colspan="2">INR Balance</th></tr>
            </thead>
            <tbody>
              <tr><td class="amount">${formatNum(ledgerData.openingInr)}</td><td class="label">Opening Balance</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.icToNc_inr)}</td><td class="label">INR Received</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.takeInr)}</td><td class="label">Cash In</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.esewaInInr)}</td><td class="label">Online In (eSewa)</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.nastaKharchaInr)}</td><td class="label">Expenses</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.ncToIc_inr)}</td><td class="label">INR Paid Out (Sell)</td></tr>
              <tr class="highlight-row"><td class="amount">${formatNum(ledgerData.hunuParneInr)}</td><td class="label"><strong>Expected Balance</strong></td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.chaInr)}</td><td class="label"><strong>Actual Balance</strong></td></tr>
              <tr class="total-row"><td class="amount ${ledgerData.farakInr !== 0 ? (ledgerData.farakInr > 0 ? 'danger' : 'success') : ''}">${formatNum(ledgerData.farakInr)}</td><td class="label"><strong>Difference</strong></td></tr>
            </tbody>
          </table>
        </div>

        ${(ledgerData.staffOwesNpr ?? 0) > 0 || (ledgerData.staffOwesInr ?? 0) > 0 ? `
        <div class="staff-owes">
          <div class="staff-owes-header">Personal eSewa - Staff Owes</div>
          <div class="staff-owes-body">
            <div class="staff-owes-item">
              <div style="font-size: 10px; color: #666;">NPR</div>
              <div class="staff-owes-amount">${formatNum(ledgerData.staffOwesNpr ?? 0)}</div>
            </div>
            <div class="staff-owes-item">
              <div style="font-size: 10px; color: #666;">INR</div>
              <div class="staff-owes-amount">₹${formatNum(ledgerData.staffOwesInr ?? 0)}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')} • Madani Money Exchange
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const formatCurrency = (amount: number, currency: 'NPR' | 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'NPR' ? 'NPR' : 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Cash Tracker</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'MMMM d, yyyy')} • {profile?.full_name}
          </p>
        </div>
        {todayRecord && ledgerData && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRefreshLedger} disabled={ledgerLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${ledgerLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {!todayRecord?.is_closed && todayRecord && (
              <>
                <EditOpeningBalanceDialog
                  recordId={todayRecord.id}
                  currentOpeningNpr={todayRecord.opening_npr}
                  currentOpeningInr={todayRecord.opening_inr}
                  currentNotes={todayRecord.notes}
                  onUpdate={fetchTodayRecord}
                />
                <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Day
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handlePrintDenomination}>
              <FileText className="h-4 w-4 mr-1" />
              Denomination
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Ledger
            </Button>
          </div>
        )}
      </div>

      {/* Status Card */}
      <Card className={todayRecord?.is_closed ? 'border-green-500' : 'border-yellow-500'}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {todayRecord?.is_closed ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Day Closed
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-yellow-500" />
                  {todayRecord ? 'Day In Progress' : 'Not Started'}
                </>
              )}
            </div>
            {todayRecord?.is_closed && (
              <EditClosingBalanceDialog
                recordId={todayRecord.id}
                currentClosingNpr={todayRecord.closing_npr || 0}
                currentClosingInr={todayRecord.closing_inr || 0}
                onUpdate={fetchTodayRecord}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {todayRecord?.is_closed
              ? 'Your day has been closed. See the ledger summary below.'
              : todayRecord
                ? 'Enter closing denominations and view live calculations.'
                : previousDayRecord?.is_closed
                  ? `Previous day closing: NPR ${formatCurrency(previousDayRecord.closing_npr || 0, 'NPR')} / INR ${formatCurrency(previousDayRecord.closing_inr || 0, 'INR')}`
                  : 'Count your cash and start your day.'}
          </p>
        </CardContent>
      </Card>

      {/* Opening Balance Form */}
      {!todayRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Set Opening Balance
            </CardTitle>
            <CardDescription>
              Count each denomination to set your opening balance
              {previousDayRecord?.is_closed && (
                <span className="block text-primary mt-1">
                  Previous closing: NPR {formatCurrency(previousDayRecord.closing_npr || 0, 'NPR')} / INR {formatCurrency(previousDayRecord.closing_inr || 0, 'INR')}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOpeningSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DenominationCounter
                  currency="NPR"
                  denominations={openingNprDenoms}
                  onChange={setOpeningNprDenoms}
                />
                <DenominationCounter
                  currency="INR"
                  denominations={openingInrDenoms}
                  onChange={setOpeningInrDenoms}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes for today..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Saving...' : 'Start Day'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Day Summary with Ledger */}
      {todayRecord && ledgerData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Today's Ledger Summary</CardTitle>
              <CardDescription>
                Live calculations based on all transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LedgerSummary data={ledgerData} showActual={todayRecord.is_closed} />
            </CardContent>
          </Card>

          {/* Closing Balance Form */}
          {!todayRecord.is_closed && (
            <Card>
              <CardHeader>
                <CardTitle>Close Day - Count Cash</CardTitle>
                <CardDescription>
                  Count each denomination to set your closing balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleClosingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DenominationCounter
                      currency="NPR"
                      denominations={closingNprDenoms}
                      onChange={setClosingNprDenoms}
                    />
                    <DenominationCounter
                      currency="INR"
                      denominations={closingInrDenoms}
                      onChange={setClosingInrDenoms}
                    />
                  </div>
                  
                  {/* Live difference preview */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected NPR (HUNU PARNE)</p>
                      <p className="text-lg font-bold">{formatCurrency(ledgerData.hunuParneNpr, 'NPR')}</p>
                      <p className="text-sm text-muted-foreground mt-2">Your Count</p>
                      <p className="text-lg font-bold">{formatCurrency(calculateDenominationTotal(closingNprDenoms), 'NPR')}</p>
                      <p className="text-sm text-muted-foreground mt-2">Difference (FARAK)</p>
                      <p className={`text-lg font-bold ${Math.abs(ledgerData.hunuParneNpr - calculateDenominationTotal(closingNprDenoms)) > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {formatCurrency(ledgerData.hunuParneNpr - calculateDenominationTotal(closingNprDenoms), 'NPR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected INR (HUNU PARNE)</p>
                      <p className="text-lg font-bold">{formatCurrency(ledgerData.hunuParneInr, 'INR')}</p>
                      <p className="text-sm text-muted-foreground mt-2">Your Count</p>
                      <p className="text-lg font-bold">{formatCurrency(calculateDenominationTotal(closingInrDenoms), 'INR')}</p>
                      <p className="text-sm text-muted-foreground mt-2">Difference (FARAK)</p>
                      <p className={`text-lg font-bold ${Math.abs(ledgerData.hunuParneInr - calculateDenominationTotal(closingInrDenoms)) > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {formatCurrency(ledgerData.hunuParneInr - calculateDenominationTotal(closingInrDenoms), 'INR')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="closing-notes">Notes (Optional)</Label>
                    <Textarea
                      id="closing-notes"
                      placeholder="Any notes about today's transactions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Closing...' : 'Close Day'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}
      {/* Delete Day Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Today's Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete today's cash tracker record including opening balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDay} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CashTracker;
