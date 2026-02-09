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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, subDays } from 'date-fns';

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

  const formatCurrency = (amount: number, currency: 'NPR' | 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Main action tiles
  const mainActions = [
    { 
      title: 'Exchange', 
      icon: ArrowLeftRight, 
      url: '/exchange',
      gradient: 'from-primary to-primary/80',
    },
    { 
      title: 'Customers', 
      icon: Users, 
      url: '/customers',
      permission: 'view_customers',
      gradient: 'from-primary to-primary/80',
    },
    { 
      title: 'Cash Tracker', 
      icon: Wallet, 
      url: '/cash-tracker',
      gradient: 'from-primary to-primary/80',
    },
    { 
      title: 'Credits', 
      icon: CreditCard, 
      url: '/credits',
      permission: 'view_customer_credit',
      gradient: 'from-primary to-primary/80',
    },
    { 
      title: 'Banks', 
      icon: Building2, 
      url: '/bank-accounts',
      permission: 'view_bank_accounts',
      gradient: 'from-primary to-primary/80',
    },
    { 
      title: 'Reports', 
      icon: FileText, 
      url: '/reports/daily',
      permission: 'view_daily_reports',
      gradient: 'from-primary to-primary/80',
    },
  ];

  // Secondary actions
  const secondaryActions = [
    { title: 'Transactions', icon: Receipt, url: '/reports/transactions', permission: 'view_transactions' },
    { title: 'Expenses', icon: Receipt, url: '/expenses', permission: 'view_expenses' },
    { title: 'Staff', icon: UserCog, url: '/staff', adminOnly: true },
    { title: 'Settings', icon: Settings, url: '/settings', adminOnly: true },
  ];

  const filteredMainActions = mainActions.filter(item => 
    !item.permission || hasPermission(item.permission) || isOwner() || isManager()
  );

  const filteredSecondaryActions = secondaryActions.filter(item => {
    if (item.adminOnly) return isOwner() || isManager();
    if (item.permission) return hasPermission(item.permission) || isOwner() || isManager();
    return true;
  });

  const handleActionClick = (url: string) => {
    lightTap();
    navigate(url);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Compact Header */}
      <div className="bg-primary px-4 pt-2 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
              <span className="text-base font-bold text-primary">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-primary-foreground text-sm">{profile?.full_name || 'User'}</h2>
              <p className="text-xs text-primary-foreground/70 capitalize">{role || 'Staff'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary-foreground/80 bg-primary-foreground/10 px-2 py-1 rounded-full">
            <TrendingUp className="h-3 w-3" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between bg-card rounded-xl p-2 border border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDateChange(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 text-sm font-medium">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {isToday ? 'Today' : format(selectedDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Exchange Rate Cards */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card rounded-xl p-3 shadow-sm border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">NPR → INR</span>
            </div>
            <p className="text-lg font-bold text-foreground">1 : {exchangeRate.nprToInr}</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-sm border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">INR → NPR</span>
            </div>
            <p className="text-lg font-bold text-foreground">1 : {exchangeRate.inrToNpr}</p>
          </div>
        </div>
      </div>

      {/* Today's Stats - Expanded with In/Out */}
      <div className="px-4">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          {/* Transaction Count */}
          <div className="p-3 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Transactions</span>
            <span className="text-lg font-bold text-primary">{stats.todayTransactions}</span>
          </div>
          
          {/* NPR Row */}
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">NPR</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Received</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(stats.nprIn, 'NPR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-3 w-3 text-red-600" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Given</p>
                  <p className="text-sm font-bold text-red-600">{formatCurrency(stats.nprOut, 'NPR')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* INR Row */}
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">INR</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Received</p>
                  <p className="text-sm font-bold text-green-600">₹{formatCurrency(stats.inrIn, 'INR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-3 w-3 text-red-600" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Given</p>
                  <p className="text-sm font-bold text-red-600">₹{formatCurrency(stats.inrOut, 'INR')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Customers</span>
            <span className="text-sm font-bold text-foreground">{stats.totalCustomers}</span>
          </div>
        </div>
      </div>

      {/* Main Action Grid - Compact */}
      <div className="px-4 mt-3">
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-2">
          {filteredMainActions.map((action) => (
            <button
              key={action.url}
              onClick={() => handleActionClick(action.url)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl",
                "bg-card border border-border/50 shadow-sm",
                "active:scale-95 transition-all duration-150"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "bg-gradient-to-br",
                action.gradient
              )}>
                <action.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-medium text-foreground">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Opening Balance + More Options Row */}
      <div className="px-4 mt-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-card rounded-xl p-3 border border-border/50">
            <p className="text-[9px] text-muted-foreground">Opening NPR</p>
            <p className="text-sm font-bold text-foreground">NPR {formatCurrency(stats.openingNpr, 'NPR')}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border/50">
            <p className="text-[9px] text-muted-foreground">Opening INR</p>
            <p className="text-sm font-bold text-foreground">₹{formatCurrency(stats.openingInr, 'INR')}</p>
          </div>
        </div>
      </div>

      {/* Secondary Actions - Compact */}
      {filteredSecondaryActions.length > 0 && (
        <div className="px-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">More</h3>
          <div className="grid grid-cols-4 gap-2">
            {filteredSecondaryActions.map((action) => (
              <button
                key={action.url}
                onClick={() => handleActionClick(action.url)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg",
                  "bg-muted/50",
                  "active:scale-95 transition-all duration-150"
                )}
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">{action.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDashboard;
