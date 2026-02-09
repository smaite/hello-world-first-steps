import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyLedgerReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LedgerData {
  // NPR (NC) side
  openingNpr: number;
  ncToIc: number; // NPR sold for INR
  takeNpr: number; // NPR received
  esewaInNpr: number; // Online payments received in NPR
  nastaKharcha: number; // Expenses in NPR
  icToNc: number; // INR converted to NPR (bought)
  hunuParneNpr: number; // Credit given in NPR
  chaNpr: number; // Credit received in NPR
  totalNpr: number;
  farakNpr: number; // Difference/Balance
  
  // INR (IC) side
  openingInr: number;
  icToNc_inr: number; // INR sold for NPR
  takeInr: number; // INR received
  esewaInInr: number; // Online payments in INR
  nastaKharchaInr: number; // Expenses in INR
  ncToIc_inr: number; // NPR converted to INR (sold)
  hunuParneInr: number; // Credit given in INR
  chaInr: number; // Credit received in INR
  totalInr: number;
  farakInr: number; // Difference/Balance
  
  date: Date;
}

export const DailyLedgerReport = ({ open, onOpenChange }: DailyLedgerReportProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchLedgerData = async (date: Date) => {
    setLoading(true);
    try {
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();
      const dateStr = format(date, 'yyyy-MM-dd');

      // Get cash tracker for opening balances
      const { data: cashTracker } = await supabase
        .from('staff_cash_tracker')
        .select('*')
        .eq('date', dateStr)
        .maybeSingle();

      // Get all transactions for the day
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // Get credit transactions
      const { data: creditTx } = await supabase
        .from('credit_transactions')
        .select('*')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('expense_date', dateStr);

      // Calculate NPR side
      let ncToIc = 0; // NPR sold (from_currency = NPR, we give NPR, take INR)
      let icToNc = 0; // INR sold to us (from_currency = INR, customer gives INR, takes NPR)
      let takeNpr = 0; // Cash NPR received
      let esewaInNpr = 0; // Online NPR received
      
      // Calculate INR side  
      let icToNc_inr = 0; // INR given by customer
      let ncToIc_inr = 0; // INR we give out
      let takeInr = 0; // Cash INR received
      let esewaInInr = 0; // Online INR received

      transactions?.forEach(t => {
        // Sell: Customer gives NPR, takes INR (we sell INR)
        if (t.transaction_type === 'sell') {
          ncToIc += Number(t.from_amount); // NPR coming in
          ncToIc_inr += Number(t.to_amount); // INR going out
          
          if (t.payment_method === 'online') {
            esewaInNpr += Number(t.from_amount);
          } else {
            takeNpr += Number(t.from_amount);
          }
        }
        // Buy: Customer gives INR, takes NPR (we buy INR)
        if (t.transaction_type === 'buy') {
          icToNc += Number(t.to_amount); // NPR going out
          icToNc_inr += Number(t.from_amount); // INR coming in
          
          if (t.payment_method === 'online') {
            esewaInInr += Number(t.from_amount);
          } else {
            takeInr += Number(t.from_amount);
          }
        }
      });

      // Credit transactions
      let hunuParneNpr = 0;
      let chaNpr = 0;
      let hunuParneInr = 0;
      let chaInr = 0;

      creditTx?.forEach(ct => {
        // Assuming credit is in NPR by default
        if (ct.transaction_type === 'credit_given') {
          hunuParneNpr += Number(ct.amount);
        } else if (ct.transaction_type === 'payment_received') {
          chaNpr += Number(ct.amount);
        }
      });

      // Expenses
      let nastaKharcha = 0;
      let nastaKharchaInr = 0;
      expenses?.forEach(e => {
        if (e.currency === 'NPR') {
          nastaKharcha += Number(e.amount);
        } else {
          nastaKharchaInr += Number(e.amount);
        }
      });

      const openingNpr = cashTracker ? Number(cashTracker.opening_npr) : 0;
      const openingInr = cashTracker ? Number(cashTracker.opening_inr) : 0;

      // Calculate totals
      // NPR: Opening + Received - Given Out
      const totalNprIn = openingNpr + ncToIc + chaNpr;
      const totalNprOut = icToNc + nastaKharcha + hunuParneNpr;
      const totalNpr = totalNprIn;
      const farakNpr = totalNprIn - totalNprOut;

      // INR: Opening + Received - Given Out
      const totalInrIn = openingInr + icToNc_inr + chaInr;
      const totalInrOut = ncToIc_inr + nastaKharchaInr + hunuParneInr;
      const totalInr = totalInrIn;
      const farakInr = totalInrIn - totalInrOut;

      setLedgerData({
        openingNpr,
        ncToIc,
        takeNpr,
        esewaInNpr,
        nastaKharcha,
        icToNc,
        hunuParneNpr,
        chaNpr,
        totalNpr,
        farakNpr,
        
        openingInr,
        icToNc_inr,
        takeInr,
        esewaInInr,
        nastaKharchaInr,
        ncToIc_inr,
        hunuParneInr,
        chaInr,
        totalInr,
        farakInr,
        
        date,
      });
    } catch (error) {
      console.error('Error fetching ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLedgerData(selectedDate);
    }
  }, [open, selectedDate]);

  const formatNum = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  const handlePrint = () => {
    if (!ledgerData) return;
    
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Ledger - ${format(ledgerData.date, 'dd/MM/yyyy')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 20px; }
          .date { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
          .ledger-container { display: flex; gap: 20px; }
          .ledger-table { flex: 1; border: 2px solid #000; }
          .ledger-table th { background: #f0f0f0; padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold; }
          .ledger-table td { padding: 6px 10px; border: 1px solid #000; }
          .ledger-table .amount { text-align: right; font-weight: bold; }
          .ledger-table .label { text-align: left; }
          .total-row { background: #f5f5f5; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MADANI MONEY EXCHANGE</h1>
          <p>Daily Ledger Report</p>
        </div>

        <div class="ledger-container">
          <table class="ledger-table">
            <thead>
              <tr>
                <th colspan="2">Balance (NC) - NPR</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="amount">${formatNum(ledgerData.openingNpr)}</td><td class="label">OPENING</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.ncToIc)}</td><td class="label">NC TO IC</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.takeNpr)}</td><td class="label">TAKE</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.esewaInNpr)}</td><td class="label">E-SEWA</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.nastaKharcha)}</td><td class="label">NASTA</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.icToNc)}</td><td class="label">IC TO NC</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.hunuParneNpr)}</td><td class="label">HUNU PARNE</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.chaNpr)}</td><td class="label">CHA</td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.totalNpr)}</td><td class="label">Total</td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.farakNpr)}</td><td class="label">Farak</td></tr>
            </tbody>
          </table>

          <table class="ledger-table">
            <thead>
              <tr>
                <th colspan="2">Balance (IC) - INR</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="amount">${formatNum(ledgerData.openingInr)}</td><td class="label">OPENING</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.icToNc_inr)}</td><td class="label">IC TO NC</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.takeInr)}</td><td class="label">TAKE</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.esewaInInr)}</td><td class="label">E-SEWA</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.nastaKharchaInr)}</td><td class="label">NASTA</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.ncToIc_inr)}</td><td class="label">NC TO IC</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.hunuParneInr)}</td><td class="label">HUNU PARNE</td></tr>
              <tr><td class="amount">${formatNum(ledgerData.chaInr)}</td><td class="label">CHA</td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.totalInr)}</td><td class="label">Total</td></tr>
              <tr class="total-row"><td class="amount">${formatNum(ledgerData.farakInr)}</td><td class="label">Farak</td></tr>
            </tbody>
          </table>
        </div>

        <div class="date">${format(ledgerData.date, 'd/M/yy')}</div>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Daily Ledger Report</span>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">Loading...</div>
        ) : ledgerData ? (
          <div className="grid grid-cols-2 gap-4">
            {/* NPR (NC) Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary text-primary-foreground text-center py-2 font-bold">
                Balance (NC) - NPR
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.openingNpr)}</td>
                    <td className="p-2">OPENING</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.ncToIc)}</td>
                    <td className="p-2">NC TO IC</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.takeNpr)}</td>
                    <td className="p-2">TAKE</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.esewaInNpr)}</td>
                    <td className="p-2">E-SEWA</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.nastaKharcha)}</td>
                    <td className="p-2">NASTA</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.icToNc)}</td>
                    <td className="p-2">IC TO NC</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.hunuParneNpr)}</td>
                    <td className="p-2">HUNU PARNE</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.chaNpr)}</td>
                    <td className="p-2">CHA</td>
                  </tr>
                  <tr className="border-b bg-muted">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.totalNpr)}</td>
                    <td className="p-2 font-bold">Total</td>
                  </tr>
                  <tr className="bg-muted">
                    <td className="p-2 text-right font-mono font-bold text-primary">{formatNum(ledgerData.farakNpr)}</td>
                    <td className="p-2 font-bold">Farak</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* INR (IC) Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary text-primary-foreground text-center py-2 font-bold">
                Balance (IC) - INR
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.openingInr)}</td>
                    <td className="p-2">OPENING</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.icToNc_inr)}</td>
                    <td className="p-2">IC TO NC</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.takeInr)}</td>
                    <td className="p-2">TAKE</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.esewaInInr)}</td>
                    <td className="p-2">E-SEWA</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.nastaKharchaInr)}</td>
                    <td className="p-2">NASTA</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.ncToIc_inr)}</td>
                    <td className="p-2">NC TO IC</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.hunuParneInr)}</td>
                    <td className="p-2">HUNU PARNE</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.chaInr)}</td>
                    <td className="p-2">CHA</td>
                  </tr>
                  <tr className="border-b bg-muted">
                    <td className="p-2 text-right font-mono font-bold">{formatNum(ledgerData.totalInr)}</td>
                    <td className="p-2 font-bold">Total</td>
                  </tr>
                  <tr className="bg-muted">
                    <td className="p-2 text-right font-mono font-bold text-primary">{formatNum(ledgerData.farakInr)}</td>
                    <td className="p-2 font-bold">Farak</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="text-center text-2xl font-bold text-foreground mt-4">
          {format(selectedDate, 'd/M/yy')}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
