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
    { title: 'Receivings', icon: ArrowUpRight, url: '/reports/receivings' },
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
      {/* Greeting Header - Clean white */}
      <div className="bg-background px-5 pt-safe">
        <div className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</p>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{profile?.full_name || 'User'}</h1>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-2">
        {/* Date Navigator - Pill style */}
        <div className="flex items-center justify-between bg-background rounded-2xl p-1.5 shadow-sm">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onDateChange(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-9 text-sm font-medium rounded-xl">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {isToday ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && onDateChange(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onDateChange(addDays(selectedDate, 1))} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Exchange Rate - Clean card */}
        <div className="bg-background rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exchange Rates</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">NPR → INR</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">1:{exchangeRate.nprToInr}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">INR → NPR</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">1:{exchangeRate.inrToNpr}</p>
            </div>
          </div>
        </div>

        {/* Stats Overview - Apple-style grouped sections */}
        <div className="bg-background rounded-2xl shadow-sm overflow-hidden">
          {/* Transactions count */}
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today's Transactions</span>
            <span className="text-2xl font-bold text-foreground">{stats.todayTransactions}</span>
          </div>
          <div className="h-px bg-border mx-4" />

          {/* NPR */}
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Nepalese Rupee (NPR)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
                    <ArrowDownLeft className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Received</span>
                </div>
                <p className="text-base font-bold text-green-600">रू {fmt(stats.nprIn)}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center">
                    <ArrowUpRight className="h-3 w-3 text-destructive" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Given</span>
                </div>
                <p className="text-base font-bold text-destructive">रू {fmt(stats.nprOut)}</p>
              </div>
            </div>
          </div>
          <div className="h-px bg-border mx-4" />

          {/* INR */}
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Indian Rupee (INR)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
                    <ArrowDownLeft className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Received</span>
                </div>
                <p className="text-base font-bold text-green-600">₹ {fmt(stats.inrIn)}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center">
                    <ArrowUpRight className="h-3 w-3 text-destructive" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Given</span>
                </div>
                <p className="text-base font-bold text-destructive">₹ {fmt(stats.inrOut)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Opening Balance - Minimal row */}
        <div className="bg-background rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Opening NPR</span>
            </div>
            <span className="text-sm font-semibold text-foreground">रू {fmt(stats.openingNpr)}</span>
          </div>
          <div className="h-px bg-border mx-4" />
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Opening INR</span>
            </div>
            <span className="text-sm font-semibold text-foreground">₹ {fmt(stats.openingInr)}</span>
          </div>
          <div className="h-px bg-border mx-4" />
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Customers</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{stats.totalCustomers}</span>
          </div>
        </div>

        {/* Quick Actions - Apple-style icon grid */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Quick Actions</p>
          <div className="grid grid-cols-3 gap-3">
            {filteredMain.map((action) => (
              <button
                key={action.url}
                onClick={() => handleNav(action.url)}
                className="flex flex-col items-center gap-2 py-4 bg-background rounded-2xl shadow-sm active:scale-95 transition-all duration-150"
              >
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", action.color)}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] font-medium text-foreground">{action.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Expense Tracker */}
        <div className="bg-background rounded-2xl shadow-sm overflow-hidden">
          <ExpenseTracker compact />
        </div>

        {/* More - Apple Settings list style */}
        {filteredMore.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">More</p>
            <div className="bg-background rounded-2xl shadow-sm overflow-hidden">
              {filteredMore.map((action, i) => (
                <div key={action.url}>
                  {i > 0 && <div className="h-px bg-border ml-14" />}
                  <button
                    onClick={() => handleNav(action.url)}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground text-left">{action.title}</span>
                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground/50" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDashboard;
