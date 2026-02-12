import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Check, Clock, Printer, RefreshCw, FileText, Trash2, PlayCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, subDays, addDays } from 'date-fns';
import { DenominationCounter, calculateDenominationTotal } from '@/components/cash-tracker/DenominationCounter';
import { LedgerSummary } from '@/components/cash-tracker/LedgerSummary';
import { EditClosingBalanceDialog } from '@/components/cash-tracker/EditClosingBalanceDialog';
import { EditOpeningBalanceDialog } from '@/components/cash-tracker/EditOpeningBalanceDialog';
import { useDailyLedger, LedgerData } from '@/hooks/useDailyLedger';
import { printDenominationSheet } from '@/utils/printUtils';
import { FormSkeleton } from '@/components/ui/page-skeleton';

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

  const [startNextDayDialogOpen, setStartNextDayDialogOpen] = useState(false);
  const [nextDayDate, setNextDayDate] = useState('');
  const [startingNextDay, setStartingNextDay] = useState(false);
  const [workingDate, setWorkingDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
          date: workingDate,
          opening_npr: npr,
          opening_inr: inr,
          opening_npr_denoms: openingNprDenoms,
          opening_inr_denoms: openingInrDenoms,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data);
      await fetchLedgerData(new Date(workingDate), npr, inr);
      
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
  const handleStartNextDay = async () => {
    if (!user || !todayRecord || !nextDayDate) return;
    setStartingNextDay(true);
    try {
      // Check if record already exists for that date
      const { data: existing } = await supabase
        .from('staff_cash_tracker')
        .select('*')
        .eq('staff_id', user.id)
        .eq('date', nextDayDate)
        .maybeSingle();

      if (existing) {
        // Delete existing record and proceed
        const { error: delError } = await supabase
          .from('staff_cash_tracker')
          .delete()
          .eq('id', existing.id);
        if (delError) throw delError;
      }

      // Reset UI to show opening balance form for the new date
      const prevClosingNpr = todayRecord.closing_npr || 0;
      const prevClosingInr = todayRecord.closing_inr || 0;

      setWorkingDate(nextDayDate);
      setTodayRecord(null);
      setPreviousDayRecord(todayRecord);
      setNotes('');
      setOpeningNprDenoms({});
      setOpeningInrDenoms({});
      setClosingNprDenoms({});
      setClosingInrDenoms({});
      setStartNextDayDialogOpen(false);

      toast({
        title: 'Ready for New Day',
        description: `Enter opening denominations for ${format(new Date(nextDayDate), 'dd MMM yyyy')}. Previous closing: NPR ${prevClosingNpr.toLocaleString()} / INR ${prevClosingInr.toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setStartingNextDay(false);
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
    return <FormSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold leading-tight">Cash Tracker</h1>
          <p className="text-[11px] text-muted-foreground truncate">
            {format(new Date(workingDate), 'MMM d, yyyy')} • {profile?.full_name}
          </p>
        </div>
        {todayRecord && ledgerData && (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handleRefreshLedger} disabled={ledgerLoading} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${ledgerLoading ? 'animate-spin' : ''}`} />
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
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)} title="Delete Day">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handlePrintDenomination} title="Denomination">
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handlePrint} title="Ledger">
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Status Pill */}
      <div className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 text-sm border",
        todayRecord?.is_closed 
          ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
          : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
      )}>
        <div className="flex items-center gap-2">
          {todayRecord?.is_closed ? (
            <Check className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span className="font-medium text-xs">
            {todayRecord?.is_closed ? 'Day Closed' : todayRecord ? 'In Progress' : 'Not Started'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {todayRecord?.is_closed && (
            <EditClosingBalanceDialog
              recordId={todayRecord.id}
              currentClosingNpr={todayRecord.closing_npr || 0}
              currentClosingInr={todayRecord.closing_inr || 0}
              onUpdate={fetchTodayRecord}
            />
          )}
          {!todayRecord && previousDayRecord?.is_closed && (
            <span className="text-[10px] text-muted-foreground">
              Prev: {formatCurrency(previousDayRecord.closing_npr || 0, 'NPR')}
            </span>
          )}
        </div>
      </div>

      {/* Start Next Day Button */}
      {todayRecord?.is_closed && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            setNextDayDate(format(addDays(new Date(todayRecord.date), 1), 'yyyy-MM-dd'));
            setStartNextDayDialogOpen(true);
          }}
        >
          <PlayCircle className="h-4 w-4" />
          Start Next Day
        </Button>
      )}

      {/* Opening Balance Form */}
      {!todayRecord && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Wallet className="h-4 w-4" />
              Opening Balance
            </CardTitle>
            {previousDayRecord?.is_closed && (
              <CardDescription className="text-[11px]">
                Prev: {formatCurrency(previousDayRecord.closing_npr || 0, 'NPR')} / {formatCurrency(previousDayRecord.closing_inr || 0, 'INR')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <form onSubmit={handleOpeningSubmit} className="space-y-3 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <DenominationCounter currency="NPR" denominations={openingNprDenoms} onChange={setOpeningNprDenoms} />
                <DenominationCounter currency="INR" denominations={openingInrDenoms} onChange={setOpeningInrDenoms} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea id="notes" placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px] text-xs" />
              </div>
              <Button type="submit" className="w-full h-9 text-sm" disabled={submitting}>
                {submitting ? 'Saving...' : 'Start Day'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Day Summary with Ledger */}
      {todayRecord && ledgerData && (
        <>
          <Card className="border-border/50">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base">Ledger</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <LedgerSummary data={ledgerData} showActual={todayRecord.is_closed} />
            </CardContent>
          </Card>

          {/* Closing Balance Form */}
          {!todayRecord.is_closed && (
            <Card className="border-border/50">
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-sm sm:text-base">Close Day</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <form onSubmit={handleClosingSubmit} className="space-y-3 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                    <DenominationCounter currency="NPR" denominations={closingNprDenoms} onChange={setClosingNprDenoms} />
                    <DenominationCounter currency="INR" denominations={closingInrDenoms} onChange={setClosingInrDenoms} />
                  </div>
                  
                  {/* Compact difference preview */}
                  <div className="grid grid-cols-2 gap-2 p-2 sm:p-4 bg-muted/50 rounded-lg text-xs sm:text-sm">
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Expected NPR</p>
                        <p className="font-bold">{formatCurrency(ledgerData.hunuParneNpr, 'NPR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Your Count</p>
                        <p className="font-bold">{formatCurrency(calculateDenominationTotal(closingNprDenoms), 'NPR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Diff</p>
                        <p className={`font-bold ${Math.abs(ledgerData.hunuParneNpr - calculateDenominationTotal(closingNprDenoms)) > 0 ? 'text-destructive' : 'text-primary'}`}>
                          {formatCurrency(ledgerData.hunuParneNpr - calculateDenominationTotal(closingNprDenoms), 'NPR')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Expected INR</p>
                        <p className="font-bold">{formatCurrency(ledgerData.hunuParneInr, 'INR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Your Count</p>
                        <p className="font-bold">{formatCurrency(calculateDenominationTotal(closingInrDenoms), 'INR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Diff</p>
                        <p className={`font-bold ${Math.abs(ledgerData.hunuParneInr - calculateDenominationTotal(closingInrDenoms)) > 0 ? 'text-destructive' : 'text-primary'}`}>
                          {formatCurrency(ledgerData.hunuParneInr - calculateDenominationTotal(closingInrDenoms), 'INR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="closing-notes" className="text-xs">Notes</Label>
                    <Textarea id="closing-notes" placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px] text-xs" />
                  </div>
                  <Button type="submit" className="w-full h-9 text-sm" disabled={submitting}>
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

      {/* Start Next Day Dialog */}
      <AlertDialog open={startNextDayDialogOpen} onOpenChange={setStartNextDayDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Next Day</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new day record using today's closing balance (NPR {formatCurrency(todayRecord?.closing_npr || 0, 'NPR')} / {formatCurrency(todayRecord?.closing_inr || 0, 'INR')}) as the opening balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Label className="text-xs">Date for next day</Label>
            <Input type="date" value={nextDayDate} onChange={(e) => setNextDayDate(e.target.value)} className="mt-1" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={startingNextDay}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNextDay} disabled={startingNextDay || !nextDayDate}>
              {startingNextDay ? 'Starting...' : 'Start Day'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CashTracker;
