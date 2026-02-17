import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Banknote
} from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface LedgerData {
  openingNpr: number;
  ncToIc: number;
  takeNpr: number;
  esewaInNpr: number;
  nastaKharcha: number;
  icToNc: number;
  hunuParneNpr: number;
  chaNpr: number;
  totalNpr: number;
  farakNpr: number;
  
  openingInr: number;
  icToNc_inr: number;
  takeInr: number;
  esewaInInr: number;
  nastaKharchaInr: number;
  ncToIc_inr: number;
  hunuParneInr: number;
  chaInr: number;
  totalInr: number;
  farakInr: number;
}

interface Transaction {
  id: string;
  transaction_type: string;
  from_amount: number;
  from_currency: string;
  to_amount: number;
  to_currency: string;
  created_at: string;
  payment_method: string;
  customer_id: string | null;
  customers?: { name: string } | null;
}

const NPR_DENOMS = [1000, 500, 100, 50, 20, 10, 5];
const INR_DENOMS = [500, 200, 100, 50, 20, 10];

const DenominationReadonly = ({ title, denoms, currency }: { title: string; denoms: Record<string, number>; currency: 'NPR' | 'INR' }) => {
  const denomList = currency === 'NPR' ? NPR_DENOMS : INR_DENOMS;
  const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);
  const total = Object.entries(denoms).reduce((s, [k, v]) => s + (k === 'coins' ? 1 : parseInt(k)) * v, 0);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="py-1.5 px-2 text-left font-medium text-muted-foreground">Note</th>
              <th className="py-1.5 px-2 text-center font-medium text-muted-foreground">Qty</th>
              <th className="py-1.5 px-2 text-right font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {denomList.map((d) => {
              const key = d.toString();
              const count = denoms[key] || 0;
              if (count === 0) return null;
              return (
                <tr key={key} className="border-t border-border/50">
                  <td className="py-1 px-2 font-medium">{key}</td>
                  <td className="py-1 px-2 text-center">{count}</td>
                  <td className="py-1 px-2 text-right font-mono">{fmt(d * count)}</td>
                </tr>
              );
            })}
            {denoms['coins'] > 0 && (
              <tr className="border-t border-border/50">
                <td className="py-1 px-2 font-medium">Coins</td>
                <td className="py-1 px-2 text-center">{denoms['coins']}</td>
                <td className="py-1 px-2 text-right font-mono">{fmt(denoms['coins'])}</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-primary/5">
            <tr className="border-t">
              <td colSpan={2} className="py-1.5 px-2 font-semibold">Total</td>
              <td className="py-1.5 px-2 text-right font-mono font-bold">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const DailyReports = () => {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState({ npr: 0, inr: 0 });
  const [receivedTotal, setReceivedTotal] = useState({ npr: 0, inr: 0 });
  const [cashTracker, setCashTracker] = useState<any>(null);
  const [denomOpen, setDenomOpen] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [selectedDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [cashTrackerRes, transactionsRes, creditTxRes, expensesRes, receivingsRes] = await Promise.all([
        supabase.from('staff_cash_tracker').select('*').eq('date', dateStr),
        supabase.from('transactions').select('*, customers(name)').gte('created_at', dayStart).lte('created_at', dayEnd).order('created_at', { ascending: false }),
        supabase.from('credit_transactions').select('*').gte('created_at', dayStart).lte('created_at', dayEnd),
        supabase.from('expenses').select('*').eq('expense_date', dateStr),
        supabase.from('money_receivings').select('*').gte('created_at', dayStart).lte('created_at', dayEnd),
      ]);

      const cashTrackerRecords = cashTrackerRes.data || [];
      const cashTrackerData = cashTrackerRecords.length > 0 ? cashTrackerRecords[0] : null;
      setCashTracker(cashTrackerRecords);
      const txList = transactionsRes.data || [];
      const creditTx = creditTxRes.data || [];
      const expenses = expensesRes.data || [];
      const receivings = receivingsRes.data || [];

      // Calculate expenses vs received totals
      const expNpr = expenses.filter(e => e.currency === 'NPR').reduce((s, e) => s + Number(e.amount), 0);
      const expInr = expenses.filter(e => e.currency === 'INR').reduce((s, e) => s + Number(e.amount), 0);
      const recNpr = receivings.filter((r: any) => r.currency === 'NPR').reduce((s: number, r: any) => s + Number(r.amount), 0);
      const recInr = receivings.filter((r: any) => r.currency === 'INR').reduce((s: number, r: any) => s + Number(r.amount), 0);
      setExpensesTotal({ npr: expNpr, inr: expInr });
      setReceivedTotal({ npr: recNpr, inr: recInr });

      setTransactions(txList);
      setTransactionCount(txList.length);

      // Calculate NPR side
      let ncToIc = 0, icToNc = 0, takeNpr = 0, esewaInNpr = 0;
      let icToNc_inr = 0, ncToIc_inr = 0, takeInr = 0, esewaInInr = 0;

      txList.forEach(t => {
        if (t.transaction_type === 'sell') {
          ncToIc += Number(t.from_amount);
          ncToIc_inr += Number(t.to_amount);
          if (t.payment_method === 'online') {
            esewaInNpr += Number(t.from_amount);
          } else {
            takeNpr += Number(t.from_amount);
          }
        }
        if (t.transaction_type === 'buy') {
          icToNc += Number(t.to_amount);
          icToNc_inr += Number(t.from_amount);
          if (t.payment_method === 'online') {
            esewaInInr += Number(t.from_amount);
          } else {
            takeInr += Number(t.from_amount);
          }
        }
      });

      let hunuParneNpr = 0, chaNpr = 0, hunuParneInr = 0, chaInr = 0;
      creditTx.forEach(ct => {
        if (ct.transaction_type === 'credit_given') {
          hunuParneNpr += Number(ct.amount);
        } else if (ct.transaction_type === 'payment_received') {
          chaNpr += Number(ct.amount);
        }
      });

      let nastaKharcha = 0, nastaKharchaInr = 0;
      expenses.forEach(e => {
        if (e.currency === 'NPR') {
          nastaKharcha += Number(e.amount);
        } else {
          nastaKharchaInr += Number(e.amount);
        }
      });

      const openingNpr = cashTrackerData ? Number(cashTrackerData.opening_npr) : 0;
      const openingInr = cashTrackerData ? Number(cashTrackerData.opening_inr) : 0;

      const totalNprIn = openingNpr + ncToIc + chaNpr;
      const totalNprOut = icToNc + nastaKharcha + hunuParneNpr;
      const farakNpr = totalNprIn - totalNprOut;

      const totalInrIn = openingInr + icToNc_inr + chaInr;
      const totalInrOut = ncToIc_inr + nastaKharchaInr + hunuParneInr;
      const farakInr = totalInrIn - totalInrOut;

      setLedgerData({
        openingNpr, ncToIc, takeNpr, esewaInNpr, nastaKharcha, icToNc,
        hunuParneNpr, chaNpr, totalNpr: totalNprIn, farakNpr,
        openingInr, icToNc_inr, takeInr, esewaInInr, nastaKharchaInr, ncToIc_inr,
        hunuParneInr, chaInr, totalInr: totalInrIn, farakInr,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNum = (num: number) => new Intl.NumberFormat('en-IN').format(Math.round(num));

  const formatCurrency = (amount: number, currency: 'NPR' | 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'NPR' ? 'NPR' : 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const handlePrint = () => {
    if (!ledgerData) return;
    
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Report - ${format(selectedDate, 'dd/MM/yyyy')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 22px; margin-bottom: 4px; }
          .header .subtitle { font-size: 14px; color: #666; }
          .date-badge { text-align: center; margin: 15px 0; }
          .date-badge span { background: #f0f0f0; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 16px; }
          .ledger-container { display: flex; gap: 20px; margin-bottom: 20px; }
          .ledger-table { flex: 1; border: 2px solid #000; }
          .ledger-table th { background: #1a365d; color: white; padding: 10px; border: 1px solid #000; text-align: center; font-weight: bold; }
          .ledger-table td { padding: 6px 10px; border: 1px solid #ddd; }
          .ledger-table .amount { text-align: right; font-weight: bold; font-family: monospace; }
          .ledger-table .label { text-align: left; }
          .total-row { background: #e2e8f0; font-weight: bold; }
          .farak-row { background: #fef3c7; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          .summary-section { margin-top: 20px; }
          .summary-section h2 { font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .stat-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; }
          .stat-box .value { font-size: 18px; font-weight: bold; }
          .stat-box .label { font-size: 11px; color: #666; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MADANI MONEY EXCHANGE</h1>
          <p class="subtitle">Daily Ledger Report</p>
        </div>

        <div class="date-badge">
          <span>${format(selectedDate, 'EEEE, dd MMMM yyyy')}</span>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="value">${transactionCount}</div>
            <div class="label">Total Transactions</div>
          </div>
          <div class="stat-box">
            <div class="value" style="color: #16a34a;">+${formatNum(ledgerData.ncToIc)}</div>
            <div class="label">NPR Received</div>
          </div>
          <div class="stat-box">
            <div class="value" style="color: #dc2626;">-${formatNum(ledgerData.icToNc)}</div>
            <div class="label">NPR Given</div>
          </div>
          <div class="stat-box">
            <div class="value">${formatNum(ledgerData.farakNpr)}</div>
            <div class="label">NPR Balance</div>
          </div>
        </div>

        <div class="ledger-container">
          <table class="ledger-table">
            <thead>
              <tr><th colspan="2">Balance (NC) - NPR</th></tr>
            </thead>
            <tbody>
              <tr><td class="amount">${formatNum(ledgerData.openingNpr)}</td><td class="label">Opening Balance</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.ncToIc)}</td><td class="label">NPR Received</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.takeNpr)}</td><td class="label">Cash In</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.esewaInNpr)}</td><td class="label">Online (eSewa)</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.nastaKharcha)}</td><td class="label">Expenses</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.icToNc)}</td><td class="label">NPR Paid Out</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.hunuParneNpr)}</td><td class="label">Expected Balance</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.chaNpr)}</td><td class="label">Actual Balance</td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.totalNpr)}</td><td class="label">Total</td></tr>
              <tr class="farak-row"><td class="amount">${formatNum(ledgerData.farakNpr)}</td><td class="label">Difference</td></tr>
            </tbody>
          </table>

          <table class="ledger-table">
            <thead>
              <tr><th colspan="2">Balance (IC) - INR</th></tr>
            </thead>
            <tbody>
              <tr><td class="amount">${formatNum(ledgerData.openingInr)}</td><td class="label">Opening Balance</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.icToNc_inr)}</td><td class="label">INR Received</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.takeInr)}</td><td class="label">Cash In</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.esewaInInr)}</td><td class="label">Online (eSewa)</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.nastaKharchaInr)}</td><td class="label">Expenses</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.ncToIc_inr)}</td><td class="label">INR Paid Out</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.hunuParneInr)}</td><td class="label">Expected Balance</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.chaInr)}</td><td class="label">Actual Balance</td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.totalInr)}</td><td class="label">Total</td></tr>
              <tr class="farak-row"><td class="amount">${formatNum(ledgerData.farakInr)}</td><td class="label">Difference</td></tr>
            </tbody>
          </table>
        </div>

        ${cashTracker && cashTracker.length > 0 ? cashTracker.map((rec: any, idx: number) => {
          const nprDenoms = rec.opening_npr_denoms as Record<string, number> | null;
          const inrDenoms = rec.opening_inr_denoms as Record<string, number> | null;
          const hasNpr = nprDenoms && Object.values(nprDenoms).some((v: any) => v > 0);
          const hasInr = inrDenoms && Object.values(inrDenoms).some((v: any) => v > 0);
          if (!hasNpr && !hasInr) return '';
          return `
        <div class="summary-section">
          <h2>Denomination Details${cashTracker.length > 1 ? ` - Staff #${idx + 1}` : ''}</h2>
          <div class="ledger-container" style="margin-top: 10px;">
            ${hasNpr ? `
            <table class="ledger-table">
              <thead><tr><th colspan="3">Opening NPR Denominations</th></tr></thead>
              <thead><tr><th>Note</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>
                ${NPR_DENOMS.filter(d => (nprDenoms![d.toString()] || 0) > 0).map(d => {
                  const count = nprDenoms![d.toString()] || 0;
                  return `<tr><td class="label">${d}</td><td class="amount">${count}</td><td class="amount">${formatNum(d * count)}</td></tr>`;
                }).join('')}
                <tr class="total-row"><td class="label" colspan="2">Total</td><td class="amount">${formatNum(Object.entries(nprDenoms!).reduce((s, [k, v]) => s + (k === 'coins' ? 1 : parseInt(k)) * (v as number), 0))}</td></tr>
              </tbody>
            </table>` : ''}
            ${hasInr ? `
            <table class="ledger-table">
              <thead><tr><th colspan="3">Opening INR Denominations</th></tr></thead>
              <thead><tr><th>Note</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>
                ${INR_DENOMS.filter(d => (inrDenoms![d.toString()] || 0) > 0).map(d => {
                  const count = inrDenoms![d.toString()] || 0;
                  return `<tr><td class="label">${d}</td><td class="amount">${count}</td><td class="amount">${formatNum(d * count)}</td></tr>`;
                }).join('')}
                ${(inrDenoms!['coins'] || 0) > 0 ? `<tr><td class="label">Coins</td><td class="amount">${inrDenoms!['coins']}</td><td class="amount">${formatNum(inrDenoms!['coins'])}</td></tr>` : ''}
                <tr class="total-row"><td class="label" colspan="2">Total</td><td class="amount">${formatNum(Object.entries(inrDenoms!).reduce((s, [k, v]) => s + (k === 'coins' ? 1 : parseInt(k)) * (v as number), 0))}</td></tr>
              </tbody>
            </table>` : ''}
          </div>
          ${rec.closing_npr !== null ? `
          <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-top: 10px;">
            <div class="stat-box"><div class="value">${formatNum(Number(rec.closing_npr))}</div><div class="label">Closing NPR</div></div>
            <div class="stat-box"><div class="value">${formatNum(Number(rec.closing_inr))}</div><div class="label">Closing INR</div></div>
          </div>` : ''}
        </div>`;
        }).join('') : ''}

        <div class="footer">
          <p>Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} by ${profile?.full_name || 'System'}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
         <div>
           <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
             <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
             Daily Report
          </h1>
          <p className="text-muted-foreground">
            {isToday ? "Today's" : format(selectedDate, 'dd MMM yyyy')} financial summary
          </p>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[160px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {isToday ? 'Today' : format(selectedDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={handlePrint} disabled={!ledgerData}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactionCount}</div>
                <p className="text-xs text-muted-foreground">Total exchanges</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NPR Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", ledgerData && ledgerData.farakNpr >= 0 ? "text-primary" : "text-destructive")}>
                  {ledgerData ? formatCurrency(ledgerData.farakNpr, 'NPR') : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Expected balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">INR Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", ledgerData && ledgerData.farakInr >= 0 ? "text-primary" : "text-destructive")}>
                  {ledgerData ? formatCurrency(ledgerData.farakInr, 'INR') : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Expected balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {ledgerData ? formatCurrency(ledgerData.nastaKharcha + ledgerData.nastaKharchaInr, 'NPR') : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Today's expenses</p>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Tables */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* NPR Ledger */}
            <Card>
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="text-center">Balance (NC) - NPR</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ledgerData && (
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        { amount: ledgerData.openingNpr, label: 'Opening Balance', highlight: false },
                        { amount: ledgerData.ncToIc, label: 'NPR Received', highlight: false },
                        { amount: ledgerData.takeNpr, label: 'Cash In', highlight: false },
                        { amount: ledgerData.esewaInNpr, label: 'Online (eSewa)', highlight: false },
                        { amount: ledgerData.nastaKharcha, label: 'Expenses', highlight: false },
                        { amount: ledgerData.icToNc, label: 'NPR Paid Out', highlight: false },
                        { amount: ledgerData.hunuParneNpr, label: 'Expected Balance', highlight: false },
                        { amount: ledgerData.chaNpr, label: 'Actual Balance', highlight: false },
                        { amount: ledgerData.totalNpr, label: 'Total', highlight: true },
                        { amount: ledgerData.farakNpr, label: 'Difference', highlight: true, primary: true },
                      ].map((row, i) => (
                        <tr key={i} className={cn("border-b", row.highlight && "bg-muted font-bold")}>
                          <td className={cn("p-3 text-right font-mono", row.primary && "text-primary")}>{formatNum(row.amount)}</td>
                          <td className="p-3">{row.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* INR Ledger */}
            <Card>
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="text-center">Balance (IC) - INR</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ledgerData && (
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        { amount: ledgerData.openingInr, label: 'Opening Balance', highlight: false },
                        { amount: ledgerData.icToNc_inr, label: 'INR Received', highlight: false },
                        { amount: ledgerData.takeInr, label: 'Cash In', highlight: false },
                        { amount: ledgerData.esewaInInr, label: 'Online (eSewa)', highlight: false },
                        { amount: ledgerData.nastaKharchaInr, label: 'Expenses', highlight: false },
                        { amount: ledgerData.ncToIc_inr, label: 'INR Paid Out', highlight: false },
                        { amount: ledgerData.hunuParneInr, label: 'Expected Balance', highlight: false },
                        { amount: ledgerData.chaInr, label: 'Actual Balance', highlight: false },
                        { amount: ledgerData.totalInr, label: 'Total', highlight: true },
                        { amount: ledgerData.farakInr, label: 'Difference', highlight: true, primary: true },
                      ].map((row, i) => (
                        <tr key={i} className={cn("border-b", row.highlight && "bg-muted font-bold")}>
                          <td className={cn("p-3 text-right font-mono", row.primary && "text-primary")}>{formatNum(row.amount)}</td>
                          <td className="p-3">{row.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Denomination Details */}
          {cashTracker && cashTracker.length > 0 && (
            <Collapsible open={denomOpen} onOpenChange={setDenomOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-primary" />
                        Denomination Details
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", denomOpen && "rotate-180")} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {cashTracker.map((record: any, idx: number) => {
                      const hasNprDenoms = record.opening_npr_denoms && typeof record.opening_npr_denoms === 'object' && Object.values(record.opening_npr_denoms).some((v: any) => v > 0);
                      const hasInrDenoms = record.opening_inr_denoms && typeof record.opening_inr_denoms === 'object' && Object.values(record.opening_inr_denoms).some((v: any) => v > 0);
                      if (!hasNprDenoms && !hasInrDenoms) return null;
                      return (
                        <div key={record.id}>
                          {cashTracker.length > 1 && (
                            <p className="text-xs font-medium text-muted-foreground mb-2">Staff Record #{idx + 1}</p>
                          )}
                          <div className="grid gap-4 md:grid-cols-2">
                            {hasNprDenoms && (
                              <DenominationReadonly title="Opening NPR" denoms={record.opening_npr_denoms as Record<string, number>} currency="NPR" />
                            )}
                            {hasInrDenoms && (
                              <DenominationReadonly title="Opening INR" denoms={record.opening_inr_denoms as Record<string, number>} currency="INR" />
                            )}
                          </div>
                          {record.closing_npr !== null && record.closing_inr !== null && (
                            <div className="mt-3 grid grid-cols-2 gap-4">
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Closing NPR</p>
                                <p className="text-lg font-bold">{formatNum(Number(record.closing_npr))}</p>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Closing INR</p>
                                <p className="text-lg font-bold">{formatNum(Number(record.closing_inr))}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transaction Summary</span>
                <span className="text-sm font-normal text-muted-foreground">{transactionCount} transactions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border border-border">
                  <ArrowDownLeft className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">NPR Received</p>
                    <p className="font-bold text-primary">{ledgerData ? formatCurrency(ledgerData.ncToIc, 'NPR') : '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-border">
                  <ArrowUpRight className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">NPR Given</p>
                    <p className="font-bold text-destructive">{ledgerData ? formatCurrency(ledgerData.icToNc, 'NPR') : '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border border-border">
                  <ArrowDownLeft className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">INR Received</p>
                    <p className="font-bold text-primary">{ledgerData ? formatCurrency(ledgerData.icToNc_inr, 'INR') : '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-border">
                  <ArrowUpRight className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">INR Given</p>
                    <p className="font-bold text-destructive">{ledgerData ? formatCurrency(ledgerData.ncToIc_inr, 'INR') : '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses vs Received */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Expenses vs Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <Wallet className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-lg font-bold">रू {expensesTotal.npr.toLocaleString()}</p>
                  {expensesTotal.inr > 0 && <p className="text-sm font-semibold">₹ {expensesTotal.inr.toLocaleString()}</p>}
                </div>
                <div className="p-3 rounded-lg bg-primary/10 text-center">
                  <CheckCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="text-lg font-bold text-primary">रू {receivedTotal.npr.toLocaleString()}</p>
                  {receivedTotal.inr > 0 && <p className="text-sm font-semibold text-primary">₹ {receivedTotal.inr.toLocaleString()}</p>}
                </div>
                <div className={cn("p-3 rounded-lg text-center", (expensesTotal.npr - receivedTotal.npr) > 0 ? "bg-destructive/10" : "bg-primary/10")}>
                  <AlertTriangle className={cn("h-4 w-4 mx-auto mb-1", (expensesTotal.npr - receivedTotal.npr) > 0 ? "text-destructive" : "text-primary")} />
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className={cn("text-lg font-bold", (expensesTotal.npr - receivedTotal.npr) > 0 ? "text-destructive" : "text-primary")}>
                    रू {Math.abs(expensesTotal.npr - receivedTotal.npr).toLocaleString()}
                  </p>
                  {(expensesTotal.inr > 0 || receivedTotal.inr > 0) && (
                    <p className={cn("text-sm font-semibold", (expensesTotal.inr - receivedTotal.inr) > 0 ? "text-destructive" : "text-primary")}>
                      ₹ {Math.abs(expensesTotal.inr - receivedTotal.inr).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">From</th>
                        <th className="text-right p-2">To</th>
                        <th className="text-left p-2">Customer</th>
                        <th className="text-left p-2">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{format(new Date(tx.created_at), 'HH:mm')}</td>
                          <td className="p-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              tx.transaction_type === 'sell' ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                            )}>
                              {tx.transaction_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono">{formatCurrency(tx.from_amount, tx.from_currency as 'NPR' | 'INR')}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(tx.to_amount, tx.to_currency as 'NPR' | 'INR')}</td>
                          <td className="p-2">{tx.customers?.name || 'Walk-in'}</td>
                          <td className="p-2 capitalize">{tx.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactions.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Showing 10 of {transactions.length} transactions
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DailyReports;
