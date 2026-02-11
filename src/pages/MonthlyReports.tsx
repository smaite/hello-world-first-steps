 import { useEffect, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Calendar, TrendingUp, TrendingDown, DollarSign, ArrowDownLeft, ArrowUpRight, Printer, Wallet, CheckCircle, AlertTriangle } from 'lucide-react';
  import { StatCardsSkeleton } from '@/components/ui/page-skeleton';
 import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
 
 interface MonthlyData {
   totalTransactions: number;
   nprReceived: number;
   nprGiven: number;
   inrReceived: number;
   inrGiven: number;
   totalExpensesNpr: number;
   totalExpensesInr: number;
  creditGiven: number;
  creditReceived: number;
  receivedNpr: number;
  receivedInr: number;
}
 
 const MonthlyReports = () => {
   const { toast } = useToast();
   const [loading, setLoading] = useState(true);
   const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [data, setData] = useState<MonthlyData>({
    totalTransactions: 0, nprReceived: 0, nprGiven: 0,
    inrReceived: 0, inrGiven: 0, totalExpensesNpr: 0,
    totalExpensesInr: 0, creditGiven: 0, creditReceived: 0,
    receivedNpr: 0, receivedInr: 0,
  });
 
   useEffect(() => {
     fetchMonthlyData();
   }, [selectedMonth]);
 
   const fetchMonthlyData = async () => {
     setLoading(true);
     try {
       const monthDate = new Date(selectedMonth + '-01');
       const monthStart = startOfMonth(monthDate).toISOString();
       const monthEnd = endOfMonth(monthDate).toISOString();
 
       // Fetch transactions
       const { data: transactions, error: transError } = await supabase
         .from('transactions')
         .select('*')
         .gte('created_at', monthStart)
         .lte('created_at', monthEnd);
 
       if (transError) throw transError;
 
       // Calculate transaction totals
       let nprReceived = 0, nprGiven = 0, inrReceived = 0, inrGiven = 0;
       
       transactions?.forEach(t => {
         if (t.transaction_type === 'sell') {
           nprReceived += Number(t.from_amount);
           inrGiven += Number(t.to_amount);
         } else if (t.transaction_type === 'buy') {
           inrReceived += Number(t.from_amount);
           nprGiven += Number(t.to_amount);
         }
       });
 
       // Fetch expenses
       const firstDay = format(monthDate, 'yyyy-MM-01');
       const lastDay = format(endOfMonth(monthDate), 'yyyy-MM-dd');
       
       const { data: expenses, error: expError } = await supabase
         .from('expenses')
         .select('*')
         .gte('expense_date', firstDay)
         .lte('expense_date', lastDay);
 
       if (expError) throw expError;
 
       const expensesNpr = expenses?.filter(e => e.currency === 'NPR').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
       const expensesInr = expenses?.filter(e => e.currency === 'INR').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
 
       // Fetch credit transactions
       const { data: creditTrans, error: creditError } = await supabase
         .from('credit_transactions')
         .select('*')
         .gte('created_at', monthStart)
         .lte('created_at', monthEnd);

       if (creditError) throw creditError;

       // Fetch receivings
       const { data: receivingsData, error: recError } = await supabase
         .from('money_receivings')
         .select('*')
         .gte('created_at', monthStart)
         .lte('created_at', monthEnd);

       if (recError) throw recError;

       const creditGiven = creditTrans?.filter(t => t.transaction_type === 'credit_given').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
       const creditReceived = creditTrans?.filter(t => t.transaction_type === 'credit_received').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

       const receivedNpr = receivingsData?.filter((r: any) => r.currency === 'NPR').reduce((sum: number, r: any) => sum + Number(r.amount), 0) || 0;
       const receivedInr = receivingsData?.filter((r: any) => r.currency === 'INR').reduce((sum: number, r: any) => sum + Number(r.amount), 0) || 0;

       setData({
         totalTransactions: transactions?.length || 0,
         nprReceived, nprGiven, inrReceived, inrGiven,
         totalExpensesNpr: expensesNpr, totalExpensesInr: expensesInr,
         creditGiven, creditReceived, receivedNpr, receivedInr,
       });
     } catch (error: any) {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     } finally {
       setLoading(false);
     }
   };
 
   const handlePrint = () => {
     const monthName = format(new Date(selectedMonth + '-01'), 'MMMM yyyy');
     const printHtml = `
       <!DOCTYPE html>
       <html>
       <head>
         <title>Monthly Report - ${monthName}</title>
         <style>
           * { margin: 0; padding: 0; box-sizing: border-box; }
           body { font-family: Arial, sans-serif; padding: 30px; }
           .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
           h1 { font-size: 24px; margin-bottom: 5px; }
           .subtitle { color: #666; font-size: 14px; }
           .section { margin: 30px 0; }
           .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
           .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
           .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
           .card-title { font-size: 12px; color: #666; margin-bottom: 8px; }
           .card-value { font-size: 24px; font-weight: bold; }
           .positive { color: #16a34a; }
           .negative { color: #dc2626; }
           @media print { body { padding: 15px; } }
         </style>
       </head>
       <body>
         <div class="header">
           <h1>MADANI MONEY EXCHANGE</h1>
           <p class="subtitle">Monthly Report - ${monthName}</p>
         </div>
         
         <div class="section">
           <div class="section-title">Transaction Summary</div>
           <div class="grid">
             <div class="card">
               <div class="card-title">Total Transactions</div>
               <div class="card-value">${data.totalTransactions}</div>
             </div>
             <div class="card">
               <div class="card-title">NPR Received</div>
               <div class="card-value positive">रू ${data.nprReceived.toLocaleString()}</div>
             </div>
             <div class="card">
               <div class="card-title">NPR Given</div>
               <div class="card-value negative">रू ${data.nprGiven.toLocaleString()}</div>
             </div>
             <div class="card">
               <div class="card-title">INR Received</div>
               <div class="card-value positive">₹ ${data.inrReceived.toLocaleString()}</div>
             </div>
             <div class="card">
               <div class="card-title">INR Given</div>
               <div class="card-value negative">₹ ${data.inrGiven.toLocaleString()}</div>
             </div>
           </div>
         </div>
         
         <div class="section">
           <div class="section-title">Expenses</div>
           <div class="grid">
             <div class="card">
               <div class="card-title">NPR Expenses</div>
               <div class="card-value">रू ${data.totalExpensesNpr.toLocaleString()}</div>
             </div>
             <div class="card">
               <div class="card-title">INR Expenses</div>
               <div class="card-value">₹ ${data.totalExpensesInr.toLocaleString()}</div>
             </div>
           </div>
         </div>
         
         <div class="section">
           <div class="section-title">Credit Summary</div>
           <div class="grid">
             <div class="card">
               <div class="card-title">Credit Given</div>
               <div class="card-value">रू ${data.creditGiven.toLocaleString()}</div>
             </div>
             <div class="card">
               <div class="card-title">Credit Received</div>
               <div class="card-value positive">रू ${data.creditReceived.toLocaleString()}</div>
             </div>
           </div>
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
 
   const netNpr = data.nprReceived - data.nprGiven - data.totalExpensesNpr;
   const netInr = data.inrReceived - data.inrGiven - data.totalExpensesInr;
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
            <h1 className="text-lg sm:text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-8 sm:w-8" />
              Monthly Reports
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Monthly business performance</p>
         </div>
         <div className="flex items-center gap-2">
           <Select value={selectedMonth} onValueChange={setSelectedMonth}>
             <SelectTrigger className="w-48">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {Array.from({ length: 12 }, (_, i) => {
                 const date = new Date();
                 date.setMonth(date.getMonth() - i);
                 const value = format(date, 'yyyy-MM');
                 const label = format(date, 'MMMM yyyy');
                 return (
                   <SelectItem key={value} value={value}>
                     {label}
                   </SelectItem>
                 );
               })}
             </SelectContent>
           </Select>
           <Button variant="outline" onClick={handlePrint}>
             <Printer className="h-4 w-4 mr-2" />
             Print
           </Button>
         </div>
       </div>
 
        {loading ? (
          <div className="space-y-6">
            <StatCardsSkeleton count={4} />
            <StatCardsSkeleton count={4} />
          </div>
       ) : (
         <>
           {/* Transaction Summary */}
           <Card>
             <CardHeader>
               <CardTitle>Transaction Summary</CardTitle>
               <CardDescription>
                 {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')} exchange activity
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid gap-4 md:grid-cols-3">
                 <div className="p-4 border rounded-lg">
                   <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                     <DollarSign className="h-4 w-4" />
                     Total Transactions
                   </div>
                   <div className="text-3xl font-bold">{data.totalTransactions}</div>
                 </div>
                 <div className="p-4 border rounded-lg border-l-4 border-l-primary">
                   <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                     <ArrowDownLeft className="h-4 w-4 text-primary" />
                     NPR Received
                   </div>
                   <div className="text-2xl font-bold text-primary">
                     रू {data.nprReceived.toLocaleString()}
                   </div>
                 </div>
                 <div className="p-4 border rounded-lg border-l-4 border-l-destructive">
                   <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                     <ArrowUpRight className="h-4 w-4 text-destructive" />
                     NPR Given
                   </div>
                   <div className="text-2xl font-bold text-destructive">
                     रू {data.nprGiven.toLocaleString()}
                   </div>
                 </div>
                 <div className="p-4 border rounded-lg border-l-4 border-l-primary">
                   <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                     <ArrowDownLeft className="h-4 w-4 text-primary" />
                     INR Received
                   </div>
                   <div className="text-2xl font-bold text-primary">
                     ₹ {data.inrReceived.toLocaleString()}
                   </div>
                 </div>
                 <div className="p-4 border rounded-lg border-l-4 border-l-destructive">
                   <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                     <ArrowUpRight className="h-4 w-4 text-destructive" />
                     INR Given
                   </div>
                   <div className="text-2xl font-bold text-destructive">
                     ₹ {data.inrGiven.toLocaleString()}
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
 
           {/* Expenses & Credit */}
           <div className="grid gap-4 md:grid-cols-2">
             <Card>
               <CardHeader>
                 <CardTitle>Monthly Expenses</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                   <span className="font-medium">NPR Expenses</span>
                   <span className="text-lg font-bold">रू {data.totalExpensesNpr.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                   <span className="font-medium">INR Expenses</span>
                   <span className="text-lg font-bold">₹ {data.totalExpensesInr.toLocaleString()}</span>
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle>Credit Activity</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                   <span className="font-medium">Credit Given</span>
                   <span className="text-lg font-bold text-destructive">रू {data.creditGiven.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                   <span className="font-medium">Credit Received</span>
                   <span className="text-lg font-bold text-primary">रू {data.creditReceived.toLocaleString()}</span>
                 </div>
               </CardContent>
             </Card>
           </div>
 
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
                    <p className="text-lg font-bold">रू {data.totalExpensesNpr.toLocaleString()}</p>
                    {data.totalExpensesInr > 0 && <p className="text-sm font-semibold">₹ {data.totalExpensesInr.toLocaleString()}</p>}
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <CheckCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Received</p>
                    <p className="text-lg font-bold text-primary">रू {data.receivedNpr.toLocaleString()}</p>
                    {data.receivedInr > 0 && <p className="text-sm font-semibold text-primary">₹ {data.receivedInr.toLocaleString()}</p>}
                  </div>
                  <div className={cn("p-3 rounded-lg text-center", (data.totalExpensesNpr - data.receivedNpr) > 0 ? "bg-destructive/10" : "bg-primary/10")}>
                    <AlertTriangle className={cn("h-4 w-4 mx-auto mb-1", (data.totalExpensesNpr - data.receivedNpr) > 0 ? "text-destructive" : "text-primary")} />
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className={cn("text-lg font-bold", (data.totalExpensesNpr - data.receivedNpr) > 0 ? "text-destructive" : "text-primary")}>
                      रू {Math.abs(data.totalExpensesNpr - data.receivedNpr).toLocaleString()}
                    </p>
                    {(data.totalExpensesInr > 0 || data.receivedInr > 0) && (
                      <p className={cn("text-sm font-semibold", (data.totalExpensesInr - data.receivedInr) > 0 ? "text-destructive" : "text-primary")}>
                        ₹ {Math.abs(data.totalExpensesInr - data.receivedInr).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Performance */}
           <Card>
             <CardHeader>
               <CardTitle>Net Performance</CardTitle>
               <CardDescription>After expenses</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid gap-4 md:grid-cols-2">
                 <div className="p-6 border rounded-lg">
                   <div className="flex items-center gap-2 mb-2">
                     {netNpr >= 0 ? (
                       <TrendingUp className="h-5 w-5 text-primary" />
                     ) : (
                       <TrendingDown className="h-5 w-5 text-destructive" />
                     )}
                     <span className="text-sm text-muted-foreground">Net NPR</span>
                   </div>
                   <div className={`text-3xl font-bold ${netNpr >= 0 ? 'text-primary' : 'text-destructive'}`}>
                     रू {Math.abs(netNpr).toLocaleString()}
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">
                     {netNpr >= 0 ? 'Profit' : 'Loss'}
                   </p>
                 </div>
                 <div className="p-6 border rounded-lg">
                   <div className="flex items-center gap-2 mb-2">
                     {netInr >= 0 ? (
                       <TrendingUp className="h-5 w-5 text-primary" />
                     ) : (
                       <TrendingDown className="h-5 w-5 text-destructive" />
                     )}
                     <span className="text-sm text-muted-foreground">Net INR</span>
                   </div>
                   <div className={`text-3xl font-bold ${netInr >= 0 ? 'text-primary' : 'text-destructive'}`}>
                     ₹ {Math.abs(netInr).toLocaleString()}
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">
                     {netInr >= 0 ? 'Profit' : 'Loss'}
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>
         </>
       )}
     </div>
   );
 };
 
 export default MonthlyReports;