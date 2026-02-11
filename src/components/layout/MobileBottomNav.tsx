import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import {
  ArrowLeftRight,
  LayoutDashboard,
  Users,
  Wallet,
  MoreHorizontal,
  CreditCard,
  Building2,
  FileText,
  Receipt,
  Settings,
  UserCog,
  LogOut,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const MobileBottomNav = () => {
  const location = useLocation();
  const { role, signOut, hasPermission, isOwner, isManager } = useAuth();
  const { lightTap, mediumTap } = useHaptics();
  const [menuOpen, setMenuOpen] = useState(false);

  const mainNavItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Exchange', url: '/exchange', icon: ArrowLeftRight },
    { title: 'Cash', url: '/cash-tracker', icon: Wallet },
    { title: 'Customers', url: '/customers', icon: Users, permission: 'view_customers' },
  ];

  const moreMenuItems = [
    { title: 'Credit Management', url: '/credits', icon: CreditCard, permission: 'view_customer_credit' },
    { title: 'Bank Accounts', url: '/bank-accounts', icon: Building2, permission: 'view_bank_accounts' },
    { title: 'Daily Reports', url: '/reports/daily', icon: FileText, permission: 'view_daily_reports' },
    { title: 'Monthly Reports', url: '/reports/monthly', icon: FileText, permission: 'view_daily_reports' },
    { title: 'Transactions', url: '/reports/transactions', icon: Receipt, permission: 'view_transactions' },
    { title: 'Expenses', url: '/expenses', icon: Receipt, permission: 'view_expenses' },
    { title: 'Receivings', url: '/reports/receivings', icon: Receipt },
  ];

  const adminItems = [
    { title: 'Staff Management', url: '/staff', icon: UserCog },
    { title: 'Staff Salary', url: '/staff/salary', icon: Wallet },
    { title: 'User Activity', url: '/activity', icon: LayoutDashboard },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const isActive = (url: string) => location.pathname === url;

  const filteredMainItems = mainNavItems.filter(item => 
    !item.permission || hasPermission(item.permission) || isOwner() || isManager()
  );

  const filteredMoreItems = moreMenuItems.filter(item => 
    !item.permission || hasPermission(item.permission) || isOwner() || isManager()
  );

  const handleNavClick = () => {
    lightTap();
  };

  const handleMenuOpen = () => {
    mediumTap();
    setMenuOpen(true);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around py-2">
        {filteredMainItems.slice(0, 4).map((item) => (
          <Link
            key={item.url}
            to={item.url}
            onClick={handleNavClick}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
              isActive(item.url)
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.title}</span>
          </Link>
        ))}

        {/* More Menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              onClick={handleMenuOpen}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* More Items */}
              {filteredMoreItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium px-2 mb-2">Reports & Management</p>
                  {filteredMoreItems.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => {
                        lightTap();
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive(item.url)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Admin Items */}
              {(role === 'owner' || role === 'manager') && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium px-2 mb-2">Administration</p>
                  {adminItems.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => {
                        lightTap();
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive(item.url)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Logout */}
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    mediumTap();
                    setMenuOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;