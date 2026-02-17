import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import NotificationBell from '@/components/notifications/NotificationBell';
import PendingApproval from '@/pages/PendingApproval';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useKeybinds } from '@/hooks/useKeybinds';
import { Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SubscriptionExpiredScreen = ({ planName, expiresAt }: { planName?: string; expiresAt?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="max-w-sm w-full text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Crown className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <CardTitle className="text-lg">Subscription Expired</CardTitle>
        <CardDescription>
          {planName ? `Your "${planName}" plan` : 'The system subscription'} has expired
          {expiresAt ? ` on ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Please contact your administrator to renew the subscription.</p>
        <Badge variant="destructive" className="mt-3">Inactive</Badge>
      </CardContent>
    </Card>
  </div>
);

const AppLayout = () => {
  const { user, loading, isPending, isOwner, isManager, isSuperuser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  useActivityTracker();
  useKeybinds();

  const [subExpired, setSubExpired] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [subPlanName, setSubPlanName] = useState<string | undefined>();
  const [subExpiresAt, setSubExpiresAt] = useState<string | undefined>();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Check system-wide subscription
  useEffect(() => {
    if (!user || loading) return;
    // Superuser is never blocked
    if (isSuperuser()) {
      setSubLoading(false);
      setSubExpired(false);
      return;
    }

    const checkSub = async () => {
      const { data } = await supabase
        .from('system_subscription' as any)
        .select('*, subscription_plans:plan_id(name)')
        .order('created_at', { ascending: false } as any)
        .limit(1)
        .single();

      if (data) {
        const sub = data as any;
        const isActive = sub.status === 'active' && (!sub.expires_at || new Date(sub.expires_at) > new Date());
        setSubExpired(!isActive);
        setSubPlanName(sub.subscription_plans?.name);
        setSubExpiresAt(sub.expires_at);
      } else {
        // No subscription record = app is accessible (no lock set)
        setSubExpired(false);
      }
      setSubLoading(false);
    };
    checkSub();
  }, [user, loading, isSuperuser]);

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show pending approval page for pending users
  if (isPending()) {
    return <PendingApproval />;
  }

  // Show subscription expired screen (but allow /subscriptions page so they can see status)
  if (subExpired && location.pathname !== '/subscriptions') {
    return (
      <div className="min-h-screen flex flex-col">
        <SubscriptionExpiredScreen planName={subPlanName} expiresAt={subExpiresAt} />
        <div className="flex justify-center gap-3 pb-8">
          <Button variant="outline" size="sm" onClick={() => navigate('/subscriptions')}>
            View Subscription
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MobileHeader />
        <main className="flex-1 px-3 py-3 overflow-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop Layout
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="border-b px-4 py-3 flex items-center justify-between gap-4">
            <SidebarTrigger />
            {(isOwner() || isManager()) && <NotificationBell />}
          </header>
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
