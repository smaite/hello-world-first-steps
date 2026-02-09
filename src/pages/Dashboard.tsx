import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Users, Wallet, Banknote, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileDashboard from '@/components/mobile/MobileDashboard';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExpenseTracker } from '@/components/dashboard/ExpenseTracker';

interface DashboardStats {
  todayTransactions: number;
  nprIn: number;  // NPR received from customers
  nprOut: number; // NPR given to customers
  inrIn: number;  // INR received from customers
  inrOut: number; // INR given to customers
  totalCustomers: number;
  openingNpr: number;
  openingInr: number;
}

const Dashboard = () => {
  const { profile, role } = useAuth();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    todayTransactions: 0,
    nprIn: 0,
    nprOut: 0,
    inrIn: 0,
    inrOut: 0,
    totalCustomers: 0,
    openingNpr: 0,
    openingInr: 0,
  });
  const [exchangeRate, setExchangeRate] = useState({ nprToInr: 0.625, inrToNpr: 1.6 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      // Fetch exchange rate
      const { data: rateData } = await supabase
        .from('exchange_settings')
        .select('npr_to_inr_rate, inr_to_npr_rate')
        .single();

      if (rateData) {
        setExchangeRate({
          nprToInr: Number(rateData.npr_to_inr_rate),
          inrToNpr: Number(rateData.inr_to_npr_rate),
        });
      }

      // Fetch transactions for selected date
      const { data: transactions, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      let nprIn = 0;  // NPR we received
      let nprOut = 0; // NPR we gave
      let inrIn = 0;  // INR we received
      let inrOut = 0; // INR we gave
      
      transactions?.forEach(t => {
        // Sell: Customer gives NPR, gets INR (we receive NPR, give INR)
        if (t.transaction_type === 'sell') {
          nprIn += Number(t.from_amount);
          inrOut += Number(t.to_amount);
        }
        // Buy: Customer gives INR, gets NPR (we receive INR, give NPR)
        if (t.transaction_type === 'buy') {
          inrIn += Number(t.from_amount);
          nprOut += Number(t.to_amount);
        }
      });

      // Fetch customer count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Fetch cash tracker for selected date
      const { data: cashData } = await supabase
        .from('staff_cash_tracker')
        .select('opening_npr, opening_inr')
        .eq('date', dateStr)
        .single();

      setStats({
        todayTransactions: count || 0,
        nprIn,
        nprOut,
        inrIn,
        inrOut,
        totalCustomers: customerCount || 0,
        openingNpr: cashData ? Number(cashData.opening_npr) : 0,
        openingInr: cashData ? Number(cashData.opening_inr) : 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: 'NPR' | 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'NPR' ? 'NPR' : 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Render mobile-specific dashboard for Android/mobile
  if (isMobile) {
    return (
      <MobileDashboard 
        stats={stats} 
        exchangeRate={exchangeRate} 
        loading={loading}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
          <p className="text-muted-foreground">
            {isToday ? "Today's" : format(selectedDate, 'dd MMM yyyy')} exchange overview
          </p>
        </div>
        
        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[140px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {isToday ? 'Today' : format(selectedDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Exchange Rate Card */}
      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Exchange Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm opacity-80">NPR → INR</p>
              <p className="text-3xl font-bold">1 : {exchangeRate.nprToInr}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">INR → NPR</p>
              <p className="text-3xl font-bold">1 : {exchangeRate.inrToNpr}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">Total exchanges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPR Received</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.nprIn, 'NPR')}</div>
            <p className="text-xs text-muted-foreground">Customer gave NPR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPR Given</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.nprOut, 'NPR')}</div>
            <p className="text-xs text-muted-foreground">We gave NPR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">INR Received</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.inrIn, 'INR')}</div>
            <p className="text-xs text-muted-foreground">Customer gave INR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">INR Given</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.inrOut, 'INR')}</div>
            <p className="text-xs text-muted-foreground">We gave INR</p>
          </CardContent>
        </Card>
      </div>

      {/* Opening Balance & Customers */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Opening Balance
            </CardTitle>
            <CardDescription>Cash on hand at start of day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>NPR</span>
                <span className="font-bold">{formatCurrency(stats.openingNpr, 'NPR')}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>INR</span>
                <span className="font-bold">{formatCurrency(stats.openingInr, 'INR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <ExpenseTracker />
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <a href="/exchange" className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <p className="font-medium">New Exchange</p>
              <p className="text-sm text-muted-foreground">Create a new currency exchange</p>
            </a>
            <a href="/cash-tracker" className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <p className="font-medium">Cash Tracker</p>
              <p className="text-sm text-muted-foreground">Set opening/closing balance</p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
