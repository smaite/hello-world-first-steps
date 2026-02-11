import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Send, CheckCircle, Clock, ArrowUpRight, Plus, MoreVertical, Pencil, Trash2, Search, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'month' | 'all';

const Receivings = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');

  // Add form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NPR');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Edit state
  const [editItem, setEditItem] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ amount: '', currency: 'NPR', method: 'cash', notes: '' });

  // Delete state
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = role === 'owner' || role === 'manager';

  const { data: receivings = [], isLoading } = useQuery({
    queryKey: ['receivings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('money_receivings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-receivings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const getStaffName = (staffId: string) => profiles.find(p => p.id === staffId)?.full_name || 'Unknown';

  // Filter
  const filtered = useMemo(() => {
    const today = new Date();
    return receivings.filter((r: any) => {
      const rDate = new Date(r.created_at);
      let dateMatch = true;
      switch (datePreset) {
        case 'today':
          dateMatch = format(rDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          break;
        case 'yesterday':
          dateMatch = format(rDate, 'yyyy-MM-dd') === format(subDays(today, 1), 'yyyy-MM-dd');
          break;
        case 'last7days':
          dateMatch = isWithinInterval(rDate, { start: startOfDay(subDays(today, 6)), end: endOfDay(today) });
          break;
        case 'month':
          dateMatch = isWithinInterval(rDate, { start: startOfMonth(today), end: endOfMonth(today) });
          break;
        default:
          dateMatch = true;
      }
      const searchMatch = !searchQuery ||
        (isAdmin && getStaffName(r.staff_id).toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.currency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return dateMatch && searchMatch;
    });
  }, [receivings, datePreset, searchQuery, profiles]);

  const totalNPR = filtered.filter((r: any) => r.currency === 'NPR').reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const totalINR = filtered.filter((r: any) => r.currency === 'INR').reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const pendingCount = filtered.filter((r: any) => !r.is_confirmed).length;

  // Group by date
  const grouped = filtered.reduce((groups: any, r: any) => {
    const date = format(new Date(r.created_at), 'yyyy-MM-dd');
    const label = format(new Date(r.created_at), 'EEEE, MMMM d');
    if (!groups[date]) groups[date] = { label, items: [] };
    groups[date].items.push(r);
    return groups;
  }, {} as Record<string, { label: string; items: any[] }>);

  const getDateLabel = () => {
    switch (datePreset) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7days': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  // Submit
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('money_receivings').insert({
        staff_id: user!.id, amount: parseFloat(amount), currency, method, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Receiving recorded!');
      setAmount(''); setNotes(''); setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['receivings'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Confirm
  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('money_receivings')
        .update({ is_confirmed: true, confirmed_by: user!.id, confirmed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Confirmed!'); queryClient.invalidateQueries({ queryKey: ['receivings'] }); },
    onError: (err: any) => toast.error(err.message),
  });

  // Edit
  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({ amount: item.amount.toString(), currency: item.currency, method: item.method, notes: item.notes || '' });
    setEditDialogOpen(true);
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('money_receivings').update({
        amount: parseFloat(editForm.amount), currency: editForm.currency, method: editForm.method, notes: editForm.notes || null,
      }).eq('id', editItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Updated!'); setEditDialogOpen(false); setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ['receivings'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete
  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('money_receivings').delete().eq('id', deleteItem.id);
      if (error) throw error;
      toast.success('Deleted!');
      queryClient.invalidateQueries({ queryKey: ['receivings'] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false); setDeleteItem(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    submitMutation.mutate();
  };

  const canEditItem = (item: any) => isAdmin || item.staff_id === user?.id;
  const canDeleteItem = (item: any) => isAdmin || item.staff_id === user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-3xl font-bold">Money Receiving</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{getDateLabel()} • {filtered.length} records</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Money Sent</DialogTitle>
              <DialogDescription>Record money sent to the company</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NPR">NPR</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="online">Online/Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Details about this transfer..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'Submitting...' : 'Record Receiving'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by staff, method, or notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">NPR Sent</span>
            </div>
            <p className="text-xl font-bold text-primary">रू {totalNPR.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">INR Sent</span>
            </div>
            <p className="text-xl font-bold text-primary">₹ {totalINR.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Confirmed</span>
            </div>
            <p className="text-xl font-bold">{filtered.length - pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Cards */}
      <div className="space-y-6">
        {isLoading ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Loading...</p></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No receivings found</p></CardContent></Card>
        ) : (
          Object.entries(grouped).map(([date, { label, items }]: [string, any]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{items.length} records</span>
              </div>
              <div className="space-y-3">
                {items.map((r: any) => (
                  <div
                    key={r.id}
                    className={cn(
                      "relative flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md border-l-4",
                      r.is_confirmed
                        ? "bg-primary/5 border-l-primary"
                        : "bg-yellow-500/5 border-l-yellow-500"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                      r.is_confirmed ? "bg-primary/10" : "bg-yellow-500/10"
                    )}>
                      <ArrowUpRight className={cn("h-5 w-5", r.is_confirmed ? "text-primary" : "text-yellow-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {r.is_confirmed ? (
                          <Badge variant="default" className="text-xs bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'HH:mm')}</span>
                        <Badge variant="outline" className="text-xs capitalize">{r.method}</Badge>
                      </div>
                      <p className="font-semibold mt-1 truncate">
                        {r.currency === 'NPR' ? 'रू' : '₹'} {Number(r.amount).toLocaleString()} {r.currency}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {isAdmin && <span className="text-xs text-muted-foreground">{getStaffName(r.staff_id)}</span>}
                        {r.notes && <span className="text-xs text-muted-foreground">• {r.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!r.is_confirmed && isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => confirmMutation.mutate(r.id)} disabled={confirmMutation.isPending}>
                          Confirm
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEditItem(r) && (
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                          )}
                          {canDeleteItem(r) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteItem(r)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
            <DialogTitle>Edit Receiving</DialogTitle>
            <DialogDescription>Update receiving details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={editForm.method} onValueChange={(v) => setEditForm({ ...editForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online/Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <Button onClick={() => editMutation.mutate()} className="w-full" disabled={editMutation.isPending}>
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receiving</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
              {deleteItem && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Amount:</strong> {deleteItem.currency === 'NPR' ? 'रू' : '₹'} {Number(deleteItem.amount).toLocaleString()}</p>
                  <p><strong>Method:</strong> {deleteItem.method}</p>
                  <p><strong>Status:</strong> {deleteItem.is_confirmed ? 'Confirmed' : 'Pending'}</p>
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

export default Receivings;
