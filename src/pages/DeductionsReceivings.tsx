import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Receipt, ArrowUpRight, Printer, FileDown, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { generateDeductionsReceivingsPDF, printDeductionsReceivings } from '@/utils/deductionsReceivingsPrint';
import { useToast } from '@/hooks/use-toast';
import Expenses from './Expenses';
import Receivings from './Receivings';

const DeductionsReceivings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all data for print/PDF
  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses-for-print'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      // Get staff names
      const staffIds = [...new Set(data?.map(e => e.staff_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', staffIds);
      return (data || []).map(e => ({
        ...e,
        staff_name: profiles?.find(p => p.id === e.staff_id)?.full_name || 'Unknown',
      }));
    },
  });

  const { data: allReceivings = [] } = useQuery({
    queryKey: ['receivings-for-print'],
    queryFn: async () => {
      const { data, error } = await supabase.from('money_receivings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-print'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const getStaffName = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  // Use today's data for print/PDF (matching default filter)
  const todayExpenses = useMemo(() => {
    const today = new Date();
    return allExpenses.filter(e => format(new Date(e.expense_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
  }, [allExpenses]);

  const todayReceivings = useMemo(() => {
    const today = new Date();
    return allReceivings.filter((r: any) => format(new Date(r.created_at), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
  }, [allReceivings]);

  const buildPrintData = () => {
    const expensesNPR = todayExpenses.filter(e => e.currency === 'NPR').reduce((s, e) => s + e.amount, 0);
    const expensesINR = todayExpenses.filter(e => e.currency === 'INR').reduce((s, e) => s + e.amount, 0);
    const receivedNPR = todayReceivings.filter((r: any) => r.currency === 'NPR').reduce((s: number, r: any) => s + Number(r.amount), 0);
    const receivedINR = todayReceivings.filter((r: any) => r.currency === 'INR').reduce((s: number, r: any) => s + Number(r.amount), 0);

    return {
      expenses: todayExpenses,
      receivings: todayReceivings,
      dateLabel: 'Today',
      getStaffName,
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

  const handlePDF = () => {
    const data = buildPrintData();
    if (data.expenses.length === 0 && data.receivings.length === 0) {
      toast({ title: 'No data', description: 'No records found for today', variant: 'destructive' });
      return;
    }
    generateDeductionsReceivingsPDF(data);
    toast({ title: 'PDF Generated', description: 'PDF downloaded successfully' });
  };

  const handlePrint = () => {
    const data = buildPrintData();
    if (data.expenses.length === 0 && data.receivings.length === 0) {
      toast({ title: 'No data', description: 'No records found for today', variant: 'destructive' });
      return;
    }
    printDeductionsReceivings(data);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              <span className="text-xs">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} className="gap-2">
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
          <Expenses />
        </TabsContent>
        <TabsContent value="receivings" className="mt-3">
          <Receivings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeductionsReceivings;
