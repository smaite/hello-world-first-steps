 import { useEffect, useState } from 'react';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Textarea } from '@/components/ui/textarea';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Badge } from '@/components/ui/badge';
 import { useToast } from '@/hooks/use-toast';
 import { DollarSign, TrendingUp, Users, Plus, CheckCircle } from 'lucide-react';
 import { format } from 'date-fns';
 import type { Database } from '@/integrations/supabase/types';
 
 type PaymentMethod = Database['public']['Enums']['payment_method'];
 
 interface Customer {
   id: string;
   name: string;
   credit_balance: number;
   credit_limit: number;
 }
 
 interface CreditTransaction {
   id: string;
   amount: number;
   transaction_type: string;
   payment_method: PaymentMethod;
   created_at: string;
   notes: string | null;
   customers: { name: string };
 }
 
 const CreditManagement = () => {
   const { user } = useAuth();
   const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quickPayCustomer, setQuickPayCustomer] = useState<Customer | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayMethod, setQuickPayMethod] = useState<PaymentMethod>('cash');
  const [quickPaySubmitting, setQuickPaySubmitting] = useState(false);
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const fetchData = async () => {
     setLoading(true);
     try {
      // Fetch all customers who have or had credit
      const { data: allCustData, error: allCustError } = await supabase
        .from('customers')
        .select('*')
        .order('credit_balance', { ascending: false });

      if (allCustError) throw allCustError;
      
      // All customers that ever had credit (balance > 0 or have credit_limit > 0 or have transactions)
      const custWithCredit = (allCustData || []).filter(c => c.credit_balance > 0 || c.credit_limit > 0);
      setAllCustomers(custWithCredit);
      setCustomers(custWithCredit.filter(c => c.credit_balance > 0));
 
       // Fetch recent credit transactions
       const { data: transData, error: transError } = await supabase
         .from('credit_transactions')
         .select('*, customers(name)')
         .order('created_at', { ascending: false })
         .limit(10);
 
       if (transError) throw transError;
       setTransactions(transData as CreditTransaction[] || []);
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
 
   const handlePayment = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !selectedCustomer) return;
 
     const paymentAmount = parseFloat(amount);
     if (isNaN(paymentAmount) || paymentAmount <= 0) {
       toast({
         title: 'Invalid Amount',
         description: 'Please enter a valid payment amount',
         variant: 'destructive',
       });
       return;
     }
 
     setSubmitting(true);
     try {
       const customer = customers.find(c => c.id === selectedCustomer);
       if (!customer) throw new Error('Customer not found');
 
       // Ensure payment doesn't exceed credit balance
       const actualPayment = Math.min(paymentAmount, customer.credit_balance);
       const newBalance = customer.credit_balance - actualPayment;
 
       // Update customer credit balance
       const { error: updateError } = await supabase
         .from('customers')
         .update({ credit_balance: newBalance })
         .eq('id', selectedCustomer);
 
       if (updateError) throw updateError;
 
       // Record credit payment transaction
       const { error: transError } = await supabase
         .from('credit_transactions')
         .insert({
           customer_id: selectedCustomer,
           staff_id: user.id,
           amount: actualPayment,
           transaction_type: 'credit_received',
           payment_method: paymentMethod,
           notes: notes || null,
         });
 
       if (transError) throw transError;
 
       toast({
         title: 'Payment Recorded',
         description: `Payment of रू ${actualPayment.toLocaleString()} received from ${customer.name}`,
       });
 
       setDialogOpen(false);
       resetForm();
       fetchData();
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
 
   const resetForm = () => {
     setSelectedCustomer('');
     setAmount('');
     setPaymentMethod('cash');
     setNotes('');
   };
 
   const totalCredit = customers.reduce((sum, c) => sum + c.credit_balance, 0);
 
   return (
     <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
           <h1 className="text-3xl font-bold">Credit Management</h1>
           <p className="text-muted-foreground">Track and manage customer credit balances</p>
         </div>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogTrigger asChild>
             <Button>
               <Plus className="h-4 w-4 mr-2" />
               Receive Payment
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Record Credit Payment</DialogTitle>
               <DialogDescription>
                 Record payment received from customer to reduce credit balance
               </DialogDescription>
             </DialogHeader>
             <form onSubmit={handlePayment}>
               <div className="space-y-4 py-4">
                 <div className="space-y-2">
                   <Label>Customer *</Label>
                   <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select customer" />
                     </SelectTrigger>
                     <SelectContent>
                       {customers.map((c) => (
                         <SelectItem key={c.id} value={c.id}>
                           {c.name} (Balance: रू {c.credit_balance.toLocaleString()})
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label>Payment Amount *</Label>
                   <Input
                     type="number"
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
                     placeholder="0.00"
                     step="0.01"
                     required
                   />
                   {selectedCustomer && (
                     <p className="text-xs text-muted-foreground">
                       Current balance:{' '}
                       {customers.find(c => c.id === selectedCustomer)?.credit_balance.toLocaleString()}
                     </p>
                   )}
                 </div>
                 <div className="space-y-2">
                   <Label>Payment Method *</Label>
                   <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="cash">Cash</SelectItem>
                       <SelectItem value="online">Online Transfer</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label>Notes</Label>
                   <Textarea
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     placeholder="Additional notes"
                   />
                 </div>
               </div>
               <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                   Cancel
                 </Button>
                 <Button type="submit" disabled={submitting}>
                   {submitting ? 'Processing...' : 'Record Payment'}
                 </Button>
               </DialogFooter>
             </form>
           </DialogContent>
         </Dialog>
       </div>
 
       {/* Summary Cards */}
       <div className="grid gap-4 md:grid-cols-3">
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <DollarSign className="h-4 w-4" />
               Total Credit Outstanding
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-destructive">
               रू {totalCredit.toLocaleString()}
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <Users className="h-4 w-4" />
               Customers with Credit
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{customers.length}</div>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <TrendingUp className="h-4 w-4" />
               Highest Balance
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">
               रू {customers[0]?.credit_balance.toLocaleString() || 0}
             </div>
             {customers[0] && (
               <p className="text-xs text-muted-foreground mt-1">{customers[0].name}</p>
             )}
           </CardContent>
         </Card>
       </div>
 
       {/* Customers with Credit */}
       <Card>
         <CardHeader>
           <CardTitle>Customers with Outstanding Credit</CardTitle>
           <CardDescription>Customers who have pending credit balances</CardDescription>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Customer Name</TableHead>
                 <TableHead className="text-right">Credit Balance</TableHead>
                 <TableHead className="text-right">Credit Limit</TableHead>
                 <TableHead>Status</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {loading ? (
                 <TableRow>
                   <TableCell colSpan={4} className="text-center py-8">
                     Loading...
                   </TableCell>
                 </TableRow>
               ) : customers.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                     No customers with credit balance
                   </TableCell>
                 </TableRow>
               ) : (
                 customers.map((customer) => {
                   const utilizationPercent = customer.credit_limit > 0
                     ? (customer.credit_balance / customer.credit_limit) * 100
                     : 0;
                   return (
                     <TableRow key={customer.id}>
                       <TableCell className="font-medium">{customer.name}</TableCell>
                       <TableCell className="text-right font-bold text-destructive">
                         रू {customer.credit_balance.toLocaleString()}
                       </TableCell>
                       <TableCell className="text-right">
                         रू {customer.credit_limit.toLocaleString()}
                       </TableCell>
                       <TableCell>
                         {utilizationPercent >= 90 ? (
                           <Badge variant="destructive">Near Limit</Badge>
                         ) : utilizationPercent >= 70 ? (
                           <Badge className="bg-yellow-500">Warning</Badge>
                         ) : (
                           <Badge variant="secondary">Normal</Badge>
                         )}
                       </TableCell>
                     </TableRow>
                   );
                 })
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       {/* Recent Transactions */}
       <Card>
         <CardHeader>
           <CardTitle>Recent Credit Transactions</CardTitle>
           <CardDescription>Last 10 credit-related transactions</CardDescription>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Date</TableHead>
                 <TableHead>Customer</TableHead>
                 <TableHead>Type</TableHead>
                 <TableHead className="text-right">Amount</TableHead>
                 <TableHead>Method</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {transactions.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                     No transactions found
                   </TableCell>
                 </TableRow>
               ) : (
                 transactions.map((trans) => (
                   <TableRow key={trans.id}>
                     <TableCell>{format(new Date(trans.created_at), 'MMM d, HH:mm')}</TableCell>
                     <TableCell>{trans.customers.name}</TableCell>
                     <TableCell>
                       <Badge variant={trans.transaction_type === 'credit_received' ? 'default' : 'secondary'}>
                         {trans.transaction_type === 'credit_received' ? 'Payment' : 'Credit Given'}
                       </Badge>
                     </TableCell>
                     <TableCell className="text-right font-bold">
                       रू {trans.amount.toLocaleString()}
                     </TableCell>
                     <TableCell className="capitalize">{trans.payment_method}</TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default CreditManagement;