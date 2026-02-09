import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Trash2, Receipt, Download, FileText, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

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

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const Expenses = () => {
  const { user, isOwner, isManager, hasPermission } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filter states
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    currency: 'NPR',
    category: 'general',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch staff names
      const staffIds = [...new Set(expensesData?.map(e => e.staff_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds);

      const expensesWithStaff = (expensesData || []).map(expense => ({
        ...expense,
        staff_name: profiles?.find(p => p.id === expense.staff_id)?.full_name || 'Unknown',
      }));

      setExpenses(expensesWithStaff);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses based on date filter
  const filteredExpenses = useMemo(() => {
    const today = new Date();
    
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.expense_date);
      
      switch (dateFilter) {
        case 'today':
          return format(expenseDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        case 'week':
          return isWithinInterval(expenseDate, {
            start: startOfWeek(today, { weekStartsOn: 0 }),
            end: endOfWeek(today, { weekStartsOn: 0 }),
          });
        case 'month':
          return isWithinInterval(expenseDate, {
            start: startOfMonth(today),
            end: endOfMonth(today),
          });
        case 'custom':
          return isWithinInterval(expenseDate, {
            start: parseISO(customStartDate),
            end: parseISO(customEndDate),
          });
        default:
          return true;
      }
    });
  }, [expenses, dateFilter, customStartDate, customEndDate]);

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
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

      toast({ title: 'Success', description: 'Expense recorded successfully' });
      setDialogOpen(false);
      setNewExpense({
        description: '',
        amount: '',
        currency: 'NPR',
        category: 'general',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
      fetchExpenses();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!isOwner() && !isManager()) {
      toast({ title: 'Error', description: 'Only owners and managers can delete expenses', variant: 'destructive' });
      return;
    }

    setDeleting(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Expense deleted' });
      fetchExpenses();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      general: 'default',
      transport: 'secondary',
      supplies: 'outline',
      utilities: 'secondary',
      maintenance: 'outline',
      salary: 'default',
      rent: 'secondary',
      other: 'outline',
    };
    return colors[category] || 'outline';
  };

  const totalNPR = filteredExpenses.filter(e => e.currency === 'NPR').reduce((sum, e) => sum + e.amount, 0);
  const totalINR = filteredExpenses.filter(e => e.currency === 'INR').reduce((sum, e) => sum + e.amount, 0);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!isOwner() && !isManager()) return;
    
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: 'Expenses Deleted',
        description: `${selectedIds.length} expense(s) removed`,
      });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const toExport = selectedIds.length > 0 
      ? filteredExpenses.filter(e => selectedIds.includes(e.id))
      : filteredExpenses;

    const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Recorded By', 'Notes'];
    const rows = toExport.map(expense => [
      format(parseISO(expense.expense_date), 'yyyy-MM-dd'),
      expense.description,
      expense.category,
      expense.amount.toString(),
      expense.currency,
      expense.staff_name || 'Unknown',
      expense.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'Success', description: 'CSV exported successfully' });
  };

  // Export to PDF (print)
  const exportToPDF = () => {
    const getDateRangeText = () => {
      const today = new Date();
      switch (dateFilter) {
        case 'today':
          return format(today, 'dd MMMM yyyy');
        case 'week':
          return `${format(startOfWeek(today, { weekStartsOn: 0 }), 'dd MMM')} - ${format(endOfWeek(today, { weekStartsOn: 0 }), 'dd MMM yyyy')}`;
        case 'month':
          return format(today, 'MMMM yyyy');
        case 'custom':
          return `${format(parseISO(customStartDate), 'dd MMM yyyy')} - ${format(parseISO(customEndDate), 'dd MMM yyyy')}`;
        default:
          return 'All Time';
      }
    };

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Report - ${getDateRangeText()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
          .summary-card h3 { font-size: 12px; color: #666; margin-bottom: 5px; }
          .summary-card .value { font-size: 20px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; font-size: 12px; }
          th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .category-badge { padding: 2px 8px; border-radius: 4px; background: #e5e7eb; font-size: 11px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print {
            body { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MADANI MONEY EXCHANGE</h1>
          <p>Expense Report</p>
        </div>

        <div class="meta">
          <div><strong>Period:</strong> ${getDateRangeText()}</div>
          <div><strong>Generated:</strong> ${format(new Date(), 'dd MMM yyyy, HH:mm')}</div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total NPR Expenses</h3>
            <div class="value">रू ${totalNPR.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Total INR Expenses</h3>
            <div class="value">₹ ${totalINR.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Total Entries</h3>
            <div class="value">${filteredExpenses.length}</div>
          </div>
        </div>

        <h2 style="margin-bottom: 15px; font-size: 16px;">Expense Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th class="text-right">Amount</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.map(expense => `
              <tr>
                <td>${format(parseISO(expense.expense_date), 'dd/MM/yyyy')}</td>
                <td>
                  ${expense.description}
                  ${expense.notes ? `<br><small style="color: #666;">${expense.notes}</small>` : ''}
                </td>
                <td><span class="category-badge">${expense.category}</span></td>
                <td class="text-right">${expense.currency === 'NPR' ? 'रू' : '₹'} ${expense.amount.toLocaleString()}</td>
                <td>${expense.staff_name}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #f5f5f5;">
              <td colspan="3">TOTAL</td>
              <td class="text-right">
                ${totalNPR > 0 ? `रू ${totalNPR.toLocaleString()}` : ''}
                ${totalNPR > 0 && totalINR > 0 ? ' + ' : ''}
                ${totalINR > 0 ? `₹ ${totalINR.toLocaleString()}` : ''}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <p>Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          <p>Madani Money Exchange</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track and manage business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            {selectedIds.length > 0 ? `CSV (${selectedIds.length})` : 'CSV'}
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
                <DialogDescription>Add a new expense to the records</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="What was this expense for?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={newExpense.currency}
                      onValueChange={(value) => setNewExpense({ ...newExpense, currency: value })}
                    >
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    placeholder="Additional notes (optional)"
                  />
                </div>
                <Button onClick={handleAddExpense} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                  {saving ? 'Recording...' : 'Record Expense'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Card className="border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.length} expense(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
                {(isOwner() || isManager()) && (
                  <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total NPR Expenses</CardDescription>
            <CardTitle className="text-2xl">रू {totalNPR.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total INR Expenses</CardDescription>
            <CardTitle className="text-2xl">₹ {totalINR.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filtered Entries</CardDescription>
            <CardTitle className="text-2xl">{filteredExpenses.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>
            {dateFilter === 'all' ? 'All expenses' : `Showing ${filteredExpenses.length} expenses for selected period`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses found for the selected period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recorded By</TableHead>
                  {(isOwner() || isManager()) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(expense.id)}
                        onCheckedChange={() => toggleSelect(expense.id)}
                      />
                    </TableCell>
                    <TableCell>{format(parseISO(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground">{expense.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadge(expense.category) as any} className="capitalize">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.currency === 'NPR' ? 'रू' : '₹'} {expense.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{expense.staff_name}</TableCell>
                    {(isOwner() || isManager()) && (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={deleting === expense.id}
                        >
                          {deleting === expense.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} expense(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Expenses;