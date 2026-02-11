import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, Receipt, Download, FileText, Search, MoreVertical, Pencil, Eye, ArrowDownRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { CardListSkeleton } from '@/components/ui/page-skeleton';

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  expense_date: string;
  notes: string | null;
  staff_id: string;
  created_at: string;
  staff_name?: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'salary', label: 'Salary' },
  { value: 'rent', label: 'Rent' },
  { value: 'other', label: 'Other' },
];

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'month' | 'all';

const Expenses = () => {
  const { user, isOwner, isManager, hasPermission } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');

  // Edit state
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ description: '', amount: '', currency: 'NPR', category: 'general', expense_date: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    currency: 'NPR',
    category: 'general',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const canEdit = isOwner() || isManager();
  const canDelete = isOwner() || isManager();

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data: expensesData, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;

      const staffIds = [...new Set(expensesData?.map(e => e.staff_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', staffIds);

      setExpenses((expensesData || []).map(expense => ({
        ...expense,
        staff_name: profiles?.find(p => p.id === expense.staff_id)?.full_name || 'Unknown',
      })));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const today = new Date();
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.expense_date);
      let dateMatch = true;
      switch (datePreset) {
        case 'today':
          dateMatch = format(expenseDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          break;
        case 'yesterday':
          dateMatch = format(expenseDate, 'yyyy-MM-dd') === format(subDays(today, 1), 'yyyy-MM-dd');
          break;
        case 'last7days':
          dateMatch = isWithinInterval(expenseDate, { start: startOfDay(subDays(today, 6)), end: endOfDay(today) });
          break;
        case 'month':
          dateMatch = isWithinInterval(expenseDate, { start: startOfMonth(today), end: endOfMonth(today) });
          break;
        default:
          dateMatch = true;
      }
      const searchMatch = !searchQuery ||
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.staff_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return dateMatch && searchMatch;
    });
  }, [expenses, datePreset, searchQuery]);

  const totalNPR = filteredExpenses.filter(e => e.currency === 'NPR').reduce((sum, e) => sum + e.amount, 0);
  const totalINR = filteredExpenses.filter(e => e.currency === 'INR').reduce((sum, e) => sum + e.amount, 0);

  // Group by date
  const grouped = filteredExpenses.reduce((groups, expense) => {
    const date = expense.expense_date;
    const label = format(parseISO(date), 'EEEE, MMMM d');
    if (!groups[date]) groups[date] = { label, expenses: [] };
    groups[date].expenses.push(expense);
    return groups;
  }, {} as Record<string, { label: string; expenses: Expense[] }>);

  const getDateLabel = () => {
    switch (datePreset) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7days': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast({ title: 'Error', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        currency: newExpense.currency,
        category: newExpense.category,
        expense_date: newExpense.expense_date,
        notes: newExpense.notes || null,
        staff_id: user!.id,
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Expense recorded' });
      setDialogOpen(false);
      setNewExpense({ description: '', amount: '', currency: 'NPR', category: 'general', expense_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      fetchExpenses();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (expense: Expense) => {
    setEditExpense(expense);
    setEditForm({
      description: expense.description,
      amount: expense.amount.toString(),
      currency: expense.currency,
      category: expense.category,
      expense_date: expense.expense_date,
      notes: expense.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editExpense || !editForm.description || !editForm.amount) return;
    setEditSaving(true);
    try {
      const { error } = await supabase.from('expenses').update({
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        currency: editForm.currency,
        category: editForm.category,
        expense_date: editForm.expense_date,
        notes: editForm.notes || null,
      }).eq('id', editExpense.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Expense updated' });
      setEditDialogOpen(false);
      setEditExpense(null);
      fetchExpenses();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteExpense) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', deleteExpense.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Expense deleted' });
      fetchExpenses();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteExpense(null);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Recorded By', 'Notes'];
    const rows = filteredExpenses.map(e => [
      format(parseISO(e.expense_date), 'yyyy-MM-dd'), e.description, e.category,
      e.amount.toString(), e.currency, e.staff_name || 'Unknown', e.notes || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Success', description: 'CSV exported' });
  };

  if (!hasPermission('view_expenses') && !isOwner() && !isManager()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-3xl font-bold">Expenses</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{getDateLabel()} • {filteredExpenses.length} expenses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
              <DialogDescription>Add a new expense to the records</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={newExpense.currency} onValueChange={(v) => setNewExpense({ ...newExpense, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NPR">NPR</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={newExpense.expense_date} onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={newExpense.notes} onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })} placeholder="Additional notes (optional)" />
              </div>
              <Button onClick={handleAddExpense} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                {saving ? 'Recording...' : 'Record Expense'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by description, category, or staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={exportToCSV} disabled={filteredExpenses.length === 0} className="gap-2">
          <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span>
        </Button>
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last7days">Last 7 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">NPR Expenses</span>
            </div>
            <p className="text-xl font-bold text-destructive">रू {totalNPR.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">INR Expenses</span>
            </div>
            <p className="text-xl font-bold text-destructive">₹ {totalINR.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Entries</span>
            </div>
            <p className="text-xl font-bold text-primary">{filteredExpenses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Expense Cards */}
      <div className="space-y-6">
        {loading ? (
          <CardListSkeleton count={4} />
        ) : filteredExpenses.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No expenses found</p></CardContent></Card>
        ) : (
          Object.entries(grouped).map(([date, { label, expenses: dayExpenses }]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{dayExpenses.length} expenses</span>
              </div>
              <div className="space-y-3">
                {dayExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="relative flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md bg-destructive/5 border-l-4 border-l-destructive"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{expense.category}</Badge>
                        <span className="text-xs text-muted-foreground">{expense.staff_name}</span>
                      </div>
                      <p className="font-semibold mt-1 truncate">
                        {expense.currency === 'NPR' ? 'रू' : '₹'} {expense.amount.toLocaleString()} • {expense.description}
                      </p>
                      {expense.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{expense.notes}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEdit(expense)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteExpense(expense)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={editForm.currency} onValueChange={(v) => setEditForm({ ...editForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NPR">NPR</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={editForm.expense_date} onChange={(e) => setEditForm({ ...editForm, expense_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleEditSave} className="w-full" disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={(open) => !open && setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
              {deleteExpense && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Description:</strong> {deleteExpense.description}</p>
                  <p><strong>Amount:</strong> {deleteExpense.currency === 'NPR' ? 'रू' : '₹'} {deleteExpense.amount.toLocaleString()}</p>
                  <p><strong>Category:</strong> {deleteExpense.category}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Expenses;
