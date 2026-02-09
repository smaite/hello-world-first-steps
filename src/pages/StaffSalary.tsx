import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, Wallet, Users } from 'lucide-react';
import { format } from 'date-fns';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
}

interface SalaryRecord {
  id: string;
  staff_id: string;
  month_year: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_amount: number;
  payment_date: string | null;
  is_paid: boolean;
  notes: string | null;
  created_at: string;
}

const StaffSalary = () => {
  const { isOwner, isManager } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedStaff, setSelectedStaff] = useState('');
  const [monthYear, setMonthYear] = useState(format(new Date(), 'yyyy-MM'));
  const [baseSalary, setBaseSalary] = useState('');
  const [bonus, setBonus] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch staff members
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (staffData) setStaff(staffData);

      // Fetch salary records
      const { data: salaryData } = await supabase
        .from('staff_salaries')
        .select('*')
        .order('month_year', { ascending: false });

      if (salaryData) setSalaries(salaryData as SalaryRecord[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNet = () => {
    const base = parseFloat(baseSalary) || 0;
    const bon = parseFloat(bonus) || 0;
    const ded = parseFloat(deductions) || 0;
    return base + bon - ded;
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !baseSalary) {
      toast({
        title: 'Missing Fields',
        description: 'Please select staff and enter base salary',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('staff_salaries')
        .insert({
          staff_id: selectedStaff,
          month_year: `${monthYear}-01`,
          base_salary: parseFloat(baseSalary),
          bonus: parseFloat(bonus) || 0,
          deductions: parseFloat(deductions) || 0,
          net_amount: calculateNet(),
          notes: notes || null,
        } as any);

      if (error) throw error;

      toast({
        title: 'Salary Added',
        description: 'Salary record has been created',
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

  const handleMarkPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_salaries')
        .update({
          is_paid: true,
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Marked as Paid',
        description: 'Salary has been marked as paid',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setSelectedStaff('');
    setMonthYear(format(new Date(), 'yyyy-MM'));
    setBaseSalary('');
    setBonus('0');
    setDeductions('0');
    setNotes('');
  };

  const getStaffName = (staffId: string) => {
    return staff.find(s => s.id === staffId)?.full_name || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOwner() && !isManager()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staff Salary</h1>
          <p className="text-muted-foreground">Manage staff salaries and payments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Salary
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Salary Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSalary} className="space-y-4">
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month & Year</Label>
                <Input
                  type="month"
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Base Salary</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deductions</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Net Amount</span>
                  <span className="text-xl font-bold">{formatCurrency(calculateNet())}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Any notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Saving...' : 'Add Salary Record'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salaries.filter(s => !s.is_paid).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4" />
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salaries.filter(s => s.is_paid && s.month_year.startsWith(format(new Date(), 'yyyy-MM'))).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Records</CardTitle>
          <CardDescription>All staff salary records</CardDescription>
        </CardHeader>
        <CardContent>
          {salaries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No salary records yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.map((salary) => (
                  <TableRow key={salary.id}>
                    <TableCell className="font-medium">{getStaffName(salary.staff_id)}</TableCell>
                    <TableCell>{format(new Date(salary.month_year), 'MMM yyyy')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(salary.base_salary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(salary.bonus)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(salary.deductions)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(salary.net_amount)}</TableCell>
                    <TableCell>
                      {salary.is_paid ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!salary.is_paid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPaid(salary.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSalary;
