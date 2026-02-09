 import { useState, useEffect } from 'react';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Textarea } from '@/components/ui/textarea';
 import { useToast } from '@/hooks/use-toast';
 import { Receipt, Upload, X } from 'lucide-react';
 import { format } from 'date-fns';
 
 interface Expense {
   id: string;
   description: string;
   amount: number;
   currency: string;
   category: string;
   receipt_url: string | null;
   created_at: string;
 }
 
 export const ExpenseTracker = () => {
   const { user } = useAuth();
   const { toast } = useToast();
   const [expenses, setExpenses] = useState<Expense[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [receiptFile, setReceiptFile] = useState<File | null>(null);
   
   const [formData, setFormData] = useState({
     description: '',
     amount: '',
     currency: 'NPR',
     category: 'esewa',
     notes: '',
   });
 
   useEffect(() => {
     fetchTodayExpenses();
   }, []);
 
   const fetchTodayExpenses = async () => {
     try {
       const today = format(new Date(), 'yyyy-MM-dd');
       const { data, error } = await supabase
         .from('expenses')
         .select('*')
         .eq('expense_date', today)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       setExpenses(data || []);
     } catch (error: any) {
       console.error('Error fetching expenses:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
       setReceiptFile(e.target.files[0]);
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user) return;
 
     setUploading(true);
     try {
       let receiptUrl = null;
 
       // Upload receipt if provided
       if (receiptFile) {
         const fileExt = receiptFile.name.split('.').pop();
         const fileName = `${user.id}/${Date.now()}.${fileExt}`;
         
         const { error: uploadError } = await supabase.storage
           .from('receipts')
           .upload(fileName, receiptFile);
 
         if (uploadError) throw uploadError;
 
         const { data: { publicUrl } } = supabase.storage
           .from('receipts')
           .getPublicUrl(fileName);
         
         receiptUrl = publicUrl;
       }
 
       // Create expense record
       const { error } = await supabase
         .from('expenses')
         .insert({
           staff_id: user.id,
           description: formData.description,
           amount: parseFloat(formData.amount),
           currency: formData.currency,
           category: formData.category,
           notes: formData.notes || null,
           receipt_url: receiptUrl,
           expense_date: format(new Date(), 'yyyy-MM-dd'),
         });
 
       if (error) throw error;
 
       toast({
         title: 'Expense Added',
         description: 'Expense has been recorded successfully',
       });
 
       setDialogOpen(false);
       resetForm();
       fetchTodayExpenses();
     } catch (error: any) {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     } finally {
       setUploading(false);
     }
   };
 
   const resetForm = () => {
     setFormData({
       description: '',
       amount: '',
       currency: 'NPR',
       category: 'esewa',
       notes: '',
     });
     setReceiptFile(null);
   };
 
   const totalNpr = expenses.filter(e => e.currency === 'NPR').reduce((sum, e) => sum + e.amount, 0);
   const totalInr = expenses.filter(e => e.currency === 'INR').reduce((sum, e) => sum + e.amount, 0);
 
   return (
     <Card>
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
             <CardTitle className="flex items-center gap-2">
               <Receipt className="h-5 w-5" />
               Today's Expenses
             </CardTitle>
             <CardDescription>Track deductions from main balance</CardDescription>
           </div>
           <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
             <DialogTrigger asChild>
               <Button size="sm">Add Expense</Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Record Expense</DialogTitle>
                 <DialogDescription>
                   Add expense details and upload receipt slip
                 </DialogDescription>
               </DialogHeader>
               <form onSubmit={handleSubmit}>
                 <div className="space-y-4 py-4">
                   <div className="space-y-2">
                     <Label>Category *</Label>
                     <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="esewa">eSewa / Online Payment</SelectItem>
                         <SelectItem value="bank">Bank Account Transfer</SelectItem>
                         <SelectItem value="remittance">Remittance</SelectItem>
                         <SelectItem value="general">General Expense</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Description *</Label>
                     <Input
                       value={formData.description}
                       onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                       placeholder="e.g., Payment to vendor name"
                       required
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Amount *</Label>
                       <Input
                         type="number"
                         value={formData.amount}
                         onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                         placeholder="0.00"
                         step="0.01"
                         required
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Currency *</Label>
                       <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="NPR">NPR</SelectItem>
                           <SelectItem value="INR">INR</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label>Receipt / Slip (Optional)</Label>
                     <div className="flex items-center gap-2">
                       <Input
                         type="file"
                         accept="image/*,.pdf"
                         onChange={handleFileChange}
                         className="flex-1"
                       />
                       {receiptFile && (
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           onClick={() => setReceiptFile(null)}
                         >
                           <X className="h-4 w-4" />
                         </Button>
                       )}
                     </div>
                     {receiptFile && (
                       <p className="text-xs text-muted-foreground">
                         Selected: {receiptFile.name}
                       </p>
                     )}
                   </div>
                   <div className="space-y-2">
                     <Label>Notes</Label>
                     <Textarea
                       value={formData.notes}
                       onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                       placeholder="Additional details"
                     />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                     Cancel
                   </Button>
                   <Button type="submit" disabled={uploading}>
                     {uploading ? 'Saving...' : 'Add Expense'}
                   </Button>
                 </DialogFooter>
               </form>
             </DialogContent>
           </Dialog>
         </div>
       </CardHeader>
       <CardContent>
         <div className="space-y-4">
           {/* Summary */}
           <div className="grid grid-cols-2 gap-4">
             <div className="p-3 bg-muted rounded-lg">
               <p className="text-xs text-muted-foreground">NPR Expenses</p>
               <p className="text-lg font-bold">रू {totalNpr.toLocaleString()}</p>
             </div>
             <div className="p-3 bg-muted rounded-lg">
               <p className="text-xs text-muted-foreground">INR Expenses</p>
               <p className="text-lg font-bold">₹ {totalInr.toLocaleString()}</p>
             </div>
           </div>
 
           {/* Recent Expenses */}
           {loading ? (
             <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
           ) : expenses.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">No expenses today</p>
           ) : (
             <div className="space-y-2">
               {expenses.slice(0, 3).map((expense) => (
                 <div key={expense.id} className="flex items-center justify-between p-2 border rounded-lg">
                   <div className="flex-1">
                     <p className="text-sm font-medium">{expense.description}</p>
                     <p className="text-xs text-muted-foreground capitalize">{expense.category}</p>
                   </div>
                   <div className="flex items-center gap-2">
                     {expense.receipt_url && (
                       <Button
                         size="icon"
                         variant="ghost"
                         onClick={() => window.open(expense.receipt_url!, '_blank')}
                       >
                         <Upload className="h-4 w-4" />
                       </Button>
                     )}
                     <p className="text-sm font-bold">
                       {expense.currency === 'NPR' ? 'रू' : '₹'} {expense.amount.toLocaleString()}
                     </p>
                   </div>
                 </div>
               ))}
               {expenses.length > 3 && (
                 <p className="text-xs text-center text-muted-foreground">
                   +{expenses.length - 3} more expenses
                 </p>
               )}
             </div>
           )}
         </div>
       </CardContent>
     </Card>
   );
 };