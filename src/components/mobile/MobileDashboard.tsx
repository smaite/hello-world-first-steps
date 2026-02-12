import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ArrowLeftRight, 
  Users, 
  Wallet, 
  CreditCard, 
  Building2, 
  FileText, 
  Receipt,
  Settings,
  UserCog,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, subDays } from 'date-fns';
import { ExpenseTracker } from '@/components/dashboard/ExpenseTracker';
import { Skeleton } from '@/components/ui/skeleton';

interface MobileDashboardProps {
  stats: {
    todayTransactions: number;
    nprIn: number;
    nprOut: number;
    inrIn: number;
    inrOut: number;
    totalCustomers: number;
    openingNpr: number;
    openingInr: number;
  };
  exchangeRate: {
    nprToInr: number;
    inrToNpr: number;
  };
  loading: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const MobileDashboard = ({ stats, exchangeRate, loading, selectedDate, onDateChange }: MobileDashboardProps) => {
  const navigate = useNavigate();
  const { profile, role, hasPermission, isOwner, isManager } = useAuth();
  const { lightTap } = useHaptics();

  const fmt = (amount: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const mainActions = [
    { title: 'Exchange', icon: ArrowLeftRight, url: '/exchange', color: 'bg-blue-500' },
    { title: 'Customers', icon: Users, url: '/customers', permission: 'view_customers', color: 'bg-orange-500' },
    { title: 'Cash', icon: Wallet, url: '/cash-tracker', color: 'bg-green-500' },
    { title: 'Credits', icon: CreditCard, url: '/credits', permission: 'view_customer_credit', color: 'bg-purple-500' },
    { title: 'Banks', icon: Building2, url: '/bank-accounts', permission: 'view_bank_accounts', color: 'bg-cyan-500' },
    { title: 'Reports', icon: FileText, url: '/reports/daily', permission: 'view_daily_reports', color: 'bg-pink-500' },
  ];

  const moreActions = [
    { title: 'Transactions', icon: Receipt, url: '/reports/transactions', permission: 'view_transactions' },
    { title: 'Expenses', icon: Receipt, url: '/expenses', permission: 'view_expenses' },
    
    { title: 'Staff', icon: UserCog, url: '/staff', adminOnly: true },
    { title: 'Settings', icon: Settings, url: '/settings', adminOnly: true },
  ];

  const filteredMain = mainActions.filter(i => !i.permission || hasPermission(i.permission) || isOwner() || isManager());
  const filteredMore = moreActions.filter(i => {
    if (i.adminOnly) return isOwner() || isManager();
    if (i.permission) return hasPermission(i.permission) || isOwner() || isManager();
    return true;
  });

  const handleNav = (url: string) => { lightTap(); navigate(url); };

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      {/* Header + Date row combined */}
      <div className="bg-background px-4 pt-safe">
        <div className="pt-3 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
            </p>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-tight">{profile?.full_name || 'User'}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onDateChange(subDays(selectedDate, 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-7 text-xs font-medium rounded-lg px-2">
                  <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                  {isToday ? 'Today' : format(selectedDate, 'MMM d')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && onDateChange(d)} initialFocus />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onDateChange(addDays(selectedDate, 1))} disabled={isToday}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-3 space-y-2.5 mt-2">
        {loading ? (
          <>
            {/* Skeleton: Rates + Txns */}
            <div className="flex gap-2">
              <div className="flex-1 bg-background rounded-xl p-2.5 shadow-sm space-y-2">
                <Skeleton className="h-3 w-12" />
                <div className="flex gap-3">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <div className="bg-background rounded-xl p-2.5 shadow-sm flex flex-col items-center justify-center min-w-[72px] gap-1">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-7 w-10" />
              </div>
            </div>
            {/* Skeleton: NPR/INR Stats */}
            <div className="bg-background rounded-xl shadow-sm p-2.5 space-y-2">
              <Skeleton className="h-3 w-8" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
              <Skeleton className="h-3 w-8" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            </div>
            {/* Skeleton: Opening Balance */}
            <Skeleton className="h-10 rounded-xl" />
            {/* Skeleton: Quick Actions */}
            <div>
              <Skeleton className="h-3 w-20 mb-1.5" />
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6].map(i => (
                  <Skeleton key={i} className="h-[72px] rounded-xl" />
                ))}
              </div>
            </div>
            {/* Skeleton: Expense Tracker */}
            <Skeleton className="h-24 rounded-xl" />
            {/* Skeleton: More */}
            <div>
              <Skeleton className="h-3 w-12 mb-1.5" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </>
        ) : (
          <>
            {/* Exchange Rate + Transactions - Inline row */}
            <div className="flex gap-2">
              <div className="flex-1 bg-background rounded-xl p-2.5 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Rates</span>
                </div>
                <div className="flex gap-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground">NPR→INR</p>
                    <p className="text-sm font-bold text-foreground">1:{exchangeRate.nprToInr}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">INR→NPR</p>
                    <p className="text-sm font-bold text-foreground">1:{exchangeRate.inrToNpr}</p>
                  </div>
                </div>
              </div>
              <div className="bg-background rounded-xl p-2.5 shadow-sm flex flex-col items-center justify-center min-w-[72px]">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Txns</span>
                <span className="text-2xl font-bold text-foreground leading-tight">{stats.todayTransactions}</span>
              </div>
            </div>

            {/* NPR + INR Stats - Compact 2-row grid */}
            <div className="bg-background rounded-xl shadow-sm p-2.5">
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">NPR</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center gap-2 bg-green-500/8 rounded-lg px-2.5 py-1.5">
                  <ArrowDownLeft className="h-3 w-3 text-green-600 shrink-0" />
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-none">In</p>
                    <p className="text-xs font-bold text-green-600">रू {fmt(stats.nprIn)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-destructive/8 rounded-lg px-2.5 py-1.5">
                  <ArrowUpRight className="h-3 w-3 text-destructive shrink-0" />
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-none">Out</p>
                    <p className="text-xs font-bold text-destructive">रू {fmt(stats.nprOut)}</p>
                  </div>
                </div>
              </div>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">INR</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-green-500/8 rounded-lg px-2.5 py-1.5">
                  <ArrowDownLeft className="h-3 w-3 text-green-600 shrink-0" />
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-none">In</p>
                    <p className="text-xs font-bold text-green-600">₹ {fmt(stats.inrIn)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-destructive/8 rounded-lg px-2.5 py-1.5">
                  <ArrowUpRight className="h-3 w-3 text-destructive shrink-0" />
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-none">Out</p>
                    <p className="text-xs font-bold text-destructive">₹ {fmt(stats.inrOut)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Balance */}
            <div className="bg-background rounded-xl shadow-sm p-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Open:</span>
                <span className="font-semibold text-foreground">रू {fmt(stats.openingNpr)}</span>
                <span className="text-muted-foreground mx-0.5">|</span>
                <span className="font-semibold text-foreground">₹ {fmt(stats.openingInr)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-foreground">{stats.totalCustomers}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">Quick Actions</p>
              <div className="grid grid-cols-3 gap-2">
                {filteredMain.map((action) => (
                  <button
                    key={action.url}
                    onClick={() => handleNav(action.url)}
                    className="flex flex-col items-center gap-1.5 py-3 bg-background rounded-xl shadow-sm active:scale-95 transition-all duration-150"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", action.color)}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-foreground">{action.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expense Tracker */}
            <div className="bg-background rounded-xl shadow-sm overflow-hidden">
              <ExpenseTracker compact />
            </div>

            {/* More */}
            {filteredMore.length > 0 && (
              <div>
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">More</p>
                <div className="bg-background rounded-xl shadow-sm overflow-hidden">
                  {filteredMore.map((action, i) => (
                    <div key={action.url}>
                      {i > 0 && <div className="h-px bg-border ml-11" />}
                      <button
                        onClick={() => handleNav(action.url)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 active:bg-secondary/50 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                          <action.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="flex-1 text-xs font-medium text-foreground text-left">{action.title}</span>
                        <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MobileDashboard;
