import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, ArrowUpRight, Printer, FileDown, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { generateDeductionsReceivingsPDF, printDeductionsReceivings } from '@/utils/deductionsReceivingsPrint';
import { useToast } from '@/hooks/use-toast';
import Expenses from './Expenses';
import Receivings from './Receivings';

const EXPENSE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'esewa', label: 'eSewa' },
  { value: 'bank', label: 'Account' },
  { value: 'remittance', label: 'Remittance' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'salary', label: 'Salary' },
  { value: 'rent', label: 'Rent' },
  { value: 'other', label: 'Other' },
];

type ExportMode = 'pdf' | 'print' | null;

const DeductionsReceivings = () => {
  const { toast } = useToast();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>(null);

  // Filter state
  const [dateType, setDateType] = useState<'preset' | 'custom'>('preset');
  const [datePreset, setDatePreset] = useState('today');
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(EXPENSE_CATEGORIES.map(c => c.value));
  const [includeReceivings, setIncludeReceivings] = useState(true);

  // Fetch data
  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses-for-export'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      const staffIds = [...new Set(data?.map(e => e.staff_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', staffIds);
      return (data || []).map(e => ({
        ...e,
        staff_name: profiles?.find(p => p.id === e.staff_id)?.full_name || 'Unknown',
      }));
    },
  });

  const { data: allReceivings = [] } = useQuery({
    queryKey: ['receivings-for-export'],
    queryFn: async () => {
      const { data, error } = await supabase.from('money_receivings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-export'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const getStaffName = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const selectAllCategories = () => setSelectedCategories(EXPENSE_CATEGORIES.map(c => c.value));
  const clearAllCategories = () => setSelectedCategories([]);

  const openExportDialog = (mode: ExportMode) => {
    setExportMode(mode);
    setExportDialogOpen(true);
  };

  const getFilteredData = () => {
    const today = new Date();

    const dateFilter = (dateStr: string) => {
      const d = new Date(dateStr);
      if (dateType === 'custom') {
        return isWithinInterval(d, { start: startOfDay(new Date(dateFrom)), end: endOfDay(new Date(dateTo)) });
      }
      switch (datePreset) {
        case 'today': return format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        case 'yesterday': return format(d, 'yyyy-MM-dd') === format(subDays(today, 1), 'yyyy-MM-dd');
        case 'last7days': return isWithinInterval(d, { start: startOfDay(subDays(today, 6)), end: endOfDay(today) });
        case 'month': return isWithinInterval(d, { start: startOfMonth(today), end: endOfMonth(today) });
        case 'all': return true;
        default: return true;
      }
    };

    const filteredExpenses = allExpenses
      .filter(e => dateFilter(e.expense_date))
      .filter(e => selectedCategories.includes(e.category));

    const filteredReceivings = includeReceivings
      ? allReceivings.filter((r: any) => dateFilter(r.created_at))
      : [];

    const expensesNPR = filteredExpenses.filter(e => e.currency === 'NPR').reduce((s, e) => s + e.amount, 0);
    const expensesINR = filteredExpenses.filter(e => e.currency === 'INR').reduce((s, e) => s + e.amount, 0);
    const receivedNPR = filteredReceivings.filter((r: any) => r.currency === 'NPR').reduce((s: number, r: any) => s + Number(r.amount), 0);
    const receivedINR = filteredReceivings.filter((r: any) => r.currency === 'INR').reduce((s: number, r: any) => s + Number(r.amount), 0);

    let label = '';
    if (dateType === 'custom') {
      label = `${format(new Date(dateFrom), 'dd MMM yyyy')} - ${format(new Date(dateTo), 'dd MMM yyyy')}`;
    } else {
      const labels: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', last7days: 'Last 7 Days', month: 'This Month', all: 'All Time' };
      label = labels[datePreset] || 'Today';
    }

    return {
      expenses: filteredExpenses,
      receivings: filteredReceivings,
      dateLabel: label,
      getStaffName,
      includeReceivings,
      totals: {
        expensesNPR,
        expensesINR,
        receivedNPR,
        receivedINR,
        remainingNPR: expensesNPR - receivedNPR,
        remainingINR: expensesINR - receivedINR,
      },
    };
  };

  const handleExport = () => {
    const data = getFilteredData();
    if (data.expenses.length === 0 && data.receivings.length === 0) {
      toast({ title: 'No data', description: 'No records found for the selected filters', variant: 'destructive' });
      return;
    }

    if (exportMode === 'pdf') {
      generateDeductionsReceivingsPDF(data);
      toast({ title: 'PDF Generated', description: `${data.expenses.length} deductions${data.includeReceivings ? ` & ${data.receivings.length} receivings` : ''} exported` });
    } else {
      printDeductionsReceivings(data);
    }
    setExportDialogOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openExportDialog('pdf')} className="gap-2">
              <FileDown className="h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openExportDialog('print')} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="deductions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10">
          <TabsTrigger value="deductions" className="gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            Deductions
          </TabsTrigger>
          <TabsTrigger value="receivings" className="gap-1.5 text-xs sm:text-sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Receivings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="deductions" className="mt-3">
          <Expenses filterCategories={['esewa', 'bank', 'remittance']} hideDeductionButtons={false} title="Deductions" />
        </TabsContent>
        <TabsContent value="receivings" className="mt-3">
          <Receivings />
        </TabsContent>
      </Tabs>

      {/* Export Filter Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportMode === 'pdf' ? <FileDown className="h-5 w-5" /> : <Printer className="h-5 w-5" />}
              {exportMode === 'pdf' ? 'Download PDF' : 'Print Report'}
            </DialogTitle>
            <DialogDescription>Choose date range and categories to include</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Date Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Date Range</Label>
              <Select value={dateType} onValueChange={(v) => setDateType(v as 'preset' | 'custom')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preset">Quick Select</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {dateType === 'preset' ? (
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'last7days', label: 'Last 7 Days' },
                    { value: 'month', label: 'This Month' },
                    { value: 'all', label: 'All Time' },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      variant={datePreset === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => setDatePreset(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Categories</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={selectAllCategories}>All</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAllCategories}>None</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map(cat => (
                  <label key={cat.value} className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selectedCategories.includes(cat.value)}
                      onCheckedChange={() => toggleCategory(cat.value)}
                    />
                    <span className="text-xs">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Include Receivings */}
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={includeReceivings}
                onCheckedChange={(v) => setIncludeReceivings(!!v)}
              />
              <div>
                <span className="text-sm font-medium">Include Receivings</span>
                <p className="text-xs text-muted-foreground">Add money receivings data to the report</p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} className="gap-2">
              {exportMode === 'pdf' ? <FileDown className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
              {exportMode === 'pdf' ? 'Generate PDF' : 'Print'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeductionsReceivings;
