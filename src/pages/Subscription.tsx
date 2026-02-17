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
import { Crown, Plus, Pencil, Trash2, Check, Zap, CalendarClock } from 'lucide-react';
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

interface SystemSub {
  id: string;
  plan_id: string | null;
  status: string;
  starts_at: string;
  expires_at: string | null;
  notes: string | null;
  subscription_plans?: { name: string } | null;
}

const Subscription = () => {
  const { isSuperuser } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [systemSub, setSystemSub] = useState<SystemSub | null>(null);
  const [loading, setLoading] = useState(true);

  // Plan dialog
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', description: '', price: '0', duration_days: '30', features: '' });
  const [savingPlan, setSavingPlan] = useState(false);

  // Activate dialog
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [activateForm, setActivateForm] = useState({ plan_id: '', notes: '' });
  const [savingActivate, setSavingActivate] = useState(false);

  // Delete dialog
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [plansRes, subRes] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('price'),
      supabase.from('system_subscription' as any).select('*, subscription_plans:plan_id(name)').order('created_at', { ascending: false }).limit(1).single(),
    ]);
    if (plansRes.data) setPlans(plansRes.data.map(p => ({ ...p, features: (p.features as string[]) || [] })));
    if (subRes.data) setSystemSub(subRes.data as any);
    else setSystemSub(null);
    setLoading(false);
  };

  // ---- Non-superuser view: show current system subscription status ----
  if (!isSuperuser()) {
    if (loading) return <FormSkeleton />;

    const isActive = systemSub && systemSub.status === 'active' && (!systemSub.expires_at || new Date(systemSub.expires_at) > new Date());
    const planName = (systemSub as any)?.subscription_plans?.name || 'No Plan';

    return (
      <div className="max-w-md mx-auto pt-8 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {isActive ? `You're on ${planName}` : 'No Active Subscription'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isActive && systemSub?.expires_at
                    ? `Valid until ${new Date(systemSub.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : isActive ? 'No expiry set' : 'Contact your administrator'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant={isActive ? 'default' : 'destructive'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            {systemSub?.notes && (
              <p className="text-xs text-muted-foreground mt-2">{systemSub.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Superuser view: full management ----

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

  const handleActivate = async () => {
    setSavingActivate(true);
    const plan = plans.find(p => p.id === activateForm.plan_id);
    const expiresAt = plan ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null;
    try {
      // Delete any existing system subscription, then insert new one
      await (supabase.from('system_subscription' as any) as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error } = await (supabase.from('system_subscription' as any) as any).insert({
        plan_id: activateForm.plan_id,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        activated_by: (await supabase.auth.getUser()).data.user?.id,
        notes: activateForm.notes.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Subscription activated for all users' });
      setShowActivateDialog(false);
      setActivateForm({ plan_id: '', notes: '' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingActivate(false); }
  };

  const handleDeactivate = async () => {
    try {
      if (systemSub) {
        await (supabase.from('system_subscription' as any) as any).update({ status: 'expired' }).eq('id', systemSub.id);
        toast({ title: 'Subscription deactivated' });
        fetchAll();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <FormSkeleton />;

  const isActive = systemSub && systemSub.status === 'active' && (!systemSub.expires_at || new Date(systemSub.expires_at) > new Date());

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-6 w-6" /> Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Manage plans and control system-wide access</p>
      </div>

      {/* Current System Subscription Status */}
      <Card className={isActive ? 'border-primary/30' : 'border-destructive/30'}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            System Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemSub ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{(systemSub as any).subscription_plans?.name || 'Unknown Plan'}</p>
                <p className="text-xs text-muted-foreground">
                  {systemSub.expires_at
                    ? `Expires ${new Date(systemSub.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : 'No expiry'}
                </p>
              </div>
              <Badge variant={isActive ? 'default' : 'destructive'}>{isActive ? 'Active' : 'Expired'}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription set. The app is accessible to all users.</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowActivateDialog(true)} disabled={plans.filter(p => p.is_active).length === 0}>
              <Zap className="h-4 w-4 mr-1" /> {systemSub ? 'Change Plan' : 'Activate'}
            </Button>
            {isActive && (
              <Button size="sm" variant="outline" className="text-destructive" onClick={handleDeactivate}>
                Deactivate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Activate Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate System Subscription</AlertDialogTitle>
            <AlertDialogDescription>Choose a plan. This will apply to ALL users system-wide.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={activateForm.plan_id} onValueChange={v => setActivateForm(f => ({ ...f, plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — Rs {p.price} ({p.duration_days} days)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={activateForm.notes} onChange={e => setActivateForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={savingActivate || !activateForm.plan_id}>
              {savingActivate ? 'Activating...' : 'Activate for All Users'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this plan.</AlertDialogDescription>
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
