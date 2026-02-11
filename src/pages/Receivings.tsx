import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Send, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';

const Receivings = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NPR');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const isAdmin = role === 'owner' || role === 'manager';

  // Fetch receivings
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

  // Fetch staff profiles for admin view
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-receivings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const getStaffName = (staffId: string) => {
    const profile = profiles.find(p => p.id === staffId);
    return profile?.full_name || 'Unknown';
  };

  // Submit receiving
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('money_receivings').insert({
        staff_id: user!.id,
        amount: parseFloat(amount),
        currency,
        method,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Money receiving recorded successfully!');
      setAmount('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['receivings'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Confirm receiving (admin only)
  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('money_receivings')
        .update({ is_confirmed: true, confirmed_by: user!.id, confirmed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Receiving confirmed!');
      queryClient.invalidateQueries({ queryKey: ['receivings'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Money Receiving</h1>
        <p className="text-muted-foreground">Record money sent to the company</p>
      </div>

      {/* Submit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5" />
            Report Money Sent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
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
              <Textarea
                placeholder="Any details about this transfer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button type="submit" disabled={submitMutation.isPending}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              {submitMutation.isPending ? 'Submitting...' : 'Record Receiving'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isAdmin ? 'All Staff Receivings' : 'My Receivings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : receivings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No receivings recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {receivings.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      {isAdmin && (
                        <p className="text-xs text-muted-foreground">{getStaffName(r.staff_id)}</p>
                      )}
                      <p className="font-semibold">
                        {Number(r.amount).toLocaleString()} {r.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')} • {r.method}
                      </p>
                      {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.is_confirmed ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Confirmed
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" /> Pending
                        </Badge>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmMutation.mutate(r.id)}
                            disabled={confirmMutation.isPending}
                          >
                            Confirm
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Receivings;
