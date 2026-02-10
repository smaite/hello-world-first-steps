import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import NotificationBell from '@/components/notifications/NotificationBell';
import PendingApproval from '@/pages/PendingApproval';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActivityTracker } from '@/hooks/useActivityTracker';

const AppLayout = () => {
  const { user, loading, isPending, isOwner, isManager } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useActivityTracker();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MobileHeader />
        <main className="flex-1 p-4 overflow-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
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