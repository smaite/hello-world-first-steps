import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Plus, Pencil, Trash2, UserPlus, Check } from 'lucide-react';
import { FormSkeleton } from '@/components/ui/page-skeleton';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

interface UserSub {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  starts_at: string;
  expires_at: string | null;
  notes: string | null;
  profiles?: { full_name: string; email: string | null };
  subscription_plans?: { name: string } | null;
}

const Subscription = () => {
  const { isSuperuser } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubs, setUserSubs] = useState<UserSub[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; email: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan dialog
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', description: '', price: '0', duration_days: '30', features: '' });
  const [savingPlan, setSavingPlan] = useState(false);

  // Assign dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: '', plan_id: '', notes: '' });
  const [savingAssign, setSavingAssign] = useState(false);

  // Delete dialog
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [plansRes, subsRes, profilesRes] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('price'),
      supabase.from('user_subscriptions').select('*, profiles:user_id(full_name, email), subscription_plans:plan_id(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email'),
    ]);
    if (plansRes.data) setPlans(plansRes.data.map(p => ({ ...p, features: (p.features as string[]) || [] })));
    if (subsRes.data) setUserSubs(subsRes.data as any);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', description: '', price: '0', duration_days: '30', features: '' });
    setShowPlanDialog(true);
  };

  const openEditPlan = (p: Plan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      description: p.description || '',
      price: p.price.toString(),
      duration_days: p.duration_days.toString(),
      features: p.features.join('\n'),
    });
    setShowPlanDialog(true);
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    const payload = {
      name: planForm.name.trim(),
      description: planForm.description.trim() || null,
      price: parseFloat(planForm.price) || 0,
      duration_days: parseInt(planForm.duration_days) || 30,
      features: planForm.features.split('\n').map(f => f.trim()).filter(Boolean),
    };
    try {
      if (editingPlan) {
        const { error } = await supabase.from('subscription_plans').update(payload).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscription_plans').insert(payload);
        if (error) throw error;
      }
      toast({ title: 'Plan saved' });
      setShowPlanDialog(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingPlan(false); }
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    const { error } = await supabase.from('subscription_plans').delete().eq('id', deletePlanId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Plan deleted' }); fetchAll(); }
    setDeletePlanId(null);
  };

  const handleAssign = async () => {
    setSavingAssign(true);
    const plan = plans.find(p => p.id === assignForm.plan_id);
    const expiresAt = plan ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null;
    try {
      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: assignForm.user_id,
        plan_id: assignForm.plan_id,
        status: 'active',
        expires_at: expiresAt,
        notes: assignForm.notes.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Subscription assigned' });
      setShowAssignDialog(false);
      setAssignForm({ user_id: '', plan_id: '', notes: '' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingAssign(false); }
  };

  if (!isSuperuser()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to manage subscriptions.</p>
      </div>
    );
  }

  if (loading) return <FormSkeleton />;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-6 w-6" /> Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manage plans and assign them to users</p>
        </div>
      </div>

      {/* Plans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Plans</h2>
          <Button size="sm" onClick={openNewPlan}><Plus className="h-4 w-4 mr-1" /> New Plan</Button>
        </div>
        {plans.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No plans created yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(p => (
              <Card key={p.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.description && <CardDescription className="text-xs mt-1">{p.description}</CardDescription>}
                    </div>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-bold">Rs {p.price}<span className="text-xs font-normal text-muted-foreground"> / {p.duration_days} days</span></p>
                  {p.features.length > 0 && (
                    <ul className="space-y-1">
                      {p.features.map((f, i) => (
                        <li key={i} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Check className="h-3 w-3 text-primary" />{f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEditPlan(p)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletePlanId(p.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* User Subscriptions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">User Subscriptions</h2>
          <Button size="sm" onClick={() => setShowAssignDialog(true)} disabled={plans.length === 0}>
            <UserPlus className="h-4 w-4 mr-1" /> Assign
          </Button>
        </div>
        {userSubs.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No subscriptions assigned yet.</CardContent></Card>
        ) : (
          <div className="rounded-xl border bg-card divide-y divide-border overflow-hidden">
            {userSubs.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{(s as any).profiles?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{(s as any).subscription_plans?.name || 'No plan'}</p>
                </div>
                <div className="text-right">
                  <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-xs">{s.status}</Badge>
                  {s.expires_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Expires {new Date(s.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Dialog */}
      <AlertDialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingPlan ? 'Edit Plan' : 'New Plan'}</AlertDialogTitle>
            <AlertDialogDescription>Fill in the plan details below.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="Pro Plan" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (Rs)</Label>
                <Input type="number" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (days)</Label>
                <Input type="number" value={planForm.duration_days} onChange={e => setPlanForm(f => ({ ...f, duration_days: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Features (one per line)</Label>
              <Textarea value={planForm.features} onChange={e => setPlanForm(f => ({ ...f, features: e.target.value }))} rows={3} placeholder="Unlimited transactions&#10;Priority support" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSavePlan} disabled={savingPlan || !planForm.name.trim()}>
              {savingPlan ? 'Saving...' : 'Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Dialog */}
      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Subscription</AlertDialogTitle>
            <AlertDialogDescription>Choose a user and plan to assign.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select value={assignForm.user_id} onValueChange={v => setAssignForm(f => ({ ...f, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name} {p.email ? `(${p.email})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={assignForm.plan_id} onValueChange={v => setAssignForm(f => ({ ...f, plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — Rs {p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssign} disabled={savingAssign || !assignForm.user_id || !assignForm.plan_id}>
              {savingAssign ? 'Assigning...' : 'Assign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this plan. Existing user subscriptions referencing it will keep their records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Subscription;
