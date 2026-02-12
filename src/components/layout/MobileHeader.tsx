import { ArrowLeftRight, LogOut, UserPen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MobileHeader = () => {
  const { profile, isOwner, isManager, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide header on dashboard as it has its own header
  if (location.pathname === '/dashboard') {
    return null;
  }

  return (
    <header 
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2.5" 
      style={{ paddingTop: `max(0.625rem, env(safe-area-inset-top, 0.625rem))` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground">Madani Exchange</h1>
            <p className="text-[10px] text-muted-foreground">NPR ⇄ INR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isOwner() || isManager()) && (
            <div className="text-foreground">
              <NotificationBell />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="text-right outline-none">
              <p className="text-xs font-medium text-foreground">{profile?.full_name}</p>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserPen className="h-4 w-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;