import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Receipt, Upload, X, Smartphone, Building2, SendHorizonal } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  receipt_url: string | null;
  created_at: string;
}

type ExpenseCategory = 'esewa' | 'bank' | 'remittance';

const CATEGORIES: { key: ExpenseCategory; label: string; icon: typeof Smartphone; description: string }[] = [
  { key: 'esewa', label: 'eSewa', icon: Smartphone, description: 'Online payment deduction' },
  { key: 'bank', label: 'Account', icon: Building2, description: 'Bank transfer deduction' },
  { key: 'remittance', label: 'Remittance', icon: SendHorizonal, description: 'Remittance deduction' },
];

export const ExpenseTracker = ({ compact = false }: { compact?: boolean }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'NPR',
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

  const openCategoryDialog = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCategory) return;

    setUploading(true);
    try {
      let receiptUrl = null;

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

      const { error } = await supabase
        .from('expenses')
        .insert({
          staff_id: user.id,
          description: formData.description,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          category: selectedCategory,
          notes: formData.notes || null,
          receipt_url: receiptUrl,
          expense_date: format(new Date(), 'yyyy-MM-dd'),
        });

      if (error) throw error;

      toast({
        title: 'Expense Added',
        description: `${CATEGORIES.find(c => c.key === selectedCategory)?.label} expense recorded`,
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
    setFormData({ description: '', amount: '', currency: 'NPR', notes: '' });
    setReceiptFile(null);
    setSelectedCategory(null);
  };

  const getCategoryExpenses = (cat: string) => expenses.filter(e => e.category === cat);
  const totalNpr = expenses.filter(e => e.currency === 'NPR').reduce((sum, e) => sum + e.amount, 0);
  const totalInr = expenses.filter(e => e.currency === 'INR').reduce((sum, e) => sum + e.amount, 0);

  const categoryLabel = CATEGORIES.find(c => c.key === selectedCategory)?.label || '';

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          Deductions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 3 Category Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const catExpenses = getCategoryExpenses(cat.key);
            const catTotal = catExpenses.reduce((s, e) => s + e.amount, 0);
            return (
              <button
                key={cat.key}
                onClick={() => openCategoryDialog(cat.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50",
                  "bg-muted/50 hover:bg-muted active:scale-95 transition-all duration-150",
                  "relative"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <cat.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-foreground">{cat.label}</span>
                {catExpenses.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {catExpenses.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Today's Total */}
        {!compact && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted rounded-lg text-center">
              <p className="text-[9px] text-muted-foreground">NPR Deducted</p>
              <p className="text-sm font-bold">रू {totalNpr.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-muted rounded-lg text-center">
              <p className="text-[9px] text-muted-foreground">INR Deducted</p>
              <p className="text-sm font-bold">₹ {totalInr.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Recent list */}
        {!compact && !loading && expenses.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {expenses.slice(0, 4).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-2 border rounded-lg text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{expense.description}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{expense.category}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {expense.receipt_url && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(expense.receipt_url!, '_blank')}>
                      <Upload className="h-3 w-3" />
                    </Button>
                  )}
                  <span className="font-bold">
                    {expense.currency === 'NPR' ? 'रू' : '₹'} {expense.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategory && (() => {
                const Icon = CATEGORIES.find(c => c.key === selectedCategory)!.icon;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              {categoryLabel} Deduction
            </DialogTitle>
            <DialogDescription>
              Amount will be deducted from main balance. Upload slip.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label>Recipient Name *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Payment to vendor name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <Label>Slip / Receipt Upload</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {receiptFile && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReceiptFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {receiptFile && (
                  <p className="text-xs text-muted-foreground">📎 {receiptFile.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Saving...' : 'Deduct & Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
