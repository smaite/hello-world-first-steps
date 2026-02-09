import { ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useLocation } from 'react-router-dom';

const MobileHeader = () => {
  const { profile, isOwner, isManager } = useAuth();
  const location = useLocation();
  
  // Hide header on dashboard as it has its own header
  if (location.pathname === '/dashboard') {
    return null;
  }

  return (
    <header 
      className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3" 
      style={{ paddingTop: `max(0.75rem, env(safe-area-inset-top, 0.75rem))` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold text-base">Madani Exchange</h1>
            <p className="text-xs opacity-80">NPR ⇄ INR</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(isOwner() || isManager()) && (
            <div className="text-primary-foreground">
              <NotificationBell />
            </div>
          )}
          <div className="text-right">
            <p className="text-sm font-medium">{profile?.full_name}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;