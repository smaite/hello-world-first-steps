import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSearchSelect } from '@/components/exchange/CustomerSearchSelect';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { printTransactionReceipt } from '@/utils/printUtils';
import { ArrowLeftRight, RefreshCw, Printer, Settings2, PenLine, Wallet } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];
type CurrencyType = Database['public']['Enums']['currency_type'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

interface Customer {
  id: string;
  name: string;
  credit_balance: number;
  credit_limit: number;
}

interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
}

const Exchange = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { sendCreditLimitAlert } = useNotifications();
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [defaultRate, setDefaultRate] = useState({ nprToInr: 0.625, inrToNpr: 1.6 });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Form state
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('sell');
  const [fromCurrency, setFromCurrency] = useState<CurrencyType>('NPR');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Custom rate state
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState('');
  
  // Manual adjustment state
  const [useManualAdjust, setUseManualAdjust] = useState(false);
  
  // Personal account state (for eSewa received in staff's personal account)
  const [isPersonalAccount, setIsPersonalAccount] = useState(false);

  // Get the effective exchange rate
  const getEffectiveRate = () => {
    if (useCustomRate && customRate) {
      return parseFloat(customRate);
    }
    return fromCurrency === 'NPR' ? defaultRate.nprToInr : defaultRate.inrToNpr;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculateToAmount();
  }, [fromAmount, fromCurrency, defaultRate, useCustomRate, customRate]);

  const fetchInitialData = async () => {
    try {
      // Fetch exchange rate
      const { data: rateData } = await supabase
        .from('exchange_settings')
        .select('npr_to_inr_rate, inr_to_npr_rate')
        .single();

      if (rateData) {
        setDefaultRate({
          nprToInr: Number(rateData.npr_to_inr_rate),
          inrToNpr: Number(rateData.inr_to_npr_rate),
        });
      }

      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, credit_balance, credit_limit')
        .order('name');

      if (customersData) {
        setCustomers(customersData);
      }

      // Fetch bank accounts
      const { data: banksData } = await supabase
        .from('bank_accounts')
        .select('id, name, bank_name')
        .eq('is_active', true);

      if (banksData) {
        setBankAccounts(banksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateToAmount = () => {
    if (useManualAdjust) return; // Skip auto-calculation when manually adjusting
    
    const amount = parseFloat(fromAmount);
    if (isNaN(amount)) {
      setToAmount('');
      return;
    }

    const rate = getEffectiveRate();
    const result = amount * rate;
    setToAmount(result.toFixed(2));
  };

  const swapCurrencies = () => {
    setFromCurrency(fromCurrency === 'NPR' ? 'INR' : 'NPR');
    setFromAmount(toAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(fromAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'online' && !selectedBank && !isPersonalAccount) {
      toast({
        title: 'Bank Required',
        description: 'Please select a bank account or mark as personal account',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const toCurrency: CurrencyType = fromCurrency === 'NPR' ? 'INR' : 'NPR';
      const rate = getEffectiveRate();
      
      const txType: TransactionType = transactionType === 'sell' ? 'sell' : 'buy';

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          staff_id: user.id,
          customer_id: selectedCustomer || null,
          transaction_type: txType,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          from_amount: amount,
          to_amount: parseFloat(toAmount),
          exchange_rate: rate,
          payment_method: paymentMethod,
          bank_account_id: paymentMethod === 'online' && !isPersonalAccount ? selectedBank : null,
          is_credit: isCredit,
          notes: notes || null,
          is_personal_account: paymentMethod === 'online' && isPersonalAccount,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // If it's a credit transaction, update customer credit balance
      if (isCredit && selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          const newBalance = Number(customer.credit_balance) + parseFloat(toAmount);
          
          await supabase
            .from('customers')
            .update({ credit_balance: newBalance })
            .eq('id', selectedCustomer);

          // Record credit transaction
          await supabase
            .from('credit_transactions')
            .insert({
              customer_id: selectedCustomer,
              staff_id: user.id,
              amount: parseFloat(toAmount),
              transaction_type: 'credit_given',
              payment_method: paymentMethod,
              bank_account_id: paymentMethod === 'online' ? selectedBank : null,
              reference_transaction_id: data.id,
              notes: notes || null,
            });

          // Send credit limit notification if needed
          if (customer.credit_limit > 0) {
            await sendCreditLimitAlert(customer.name, newBalance, customer.credit_limit);
          }
        }
      }

      // If online payment, record bank transaction
      if (paymentMethod === 'online' && selectedBank) {
        await supabase
          .from('bank_transactions')
          .insert({
            bank_account_id: selectedBank,
            transaction_id: data.id,
            amount: parseFloat(toAmount),
            transaction_type: 'deposit',
            created_by: user.id,
          });
      }

      // Store last transaction for printing
      const customer = customers.find(c => c.id === selectedCustomer);
      setLastTransaction({
        id: data.id,
        date: new Date(),
        transactionType: transactionType,
        fromCurrency,
        toCurrency,
        fromAmount: parseFloat(fromAmount),
        toAmount: parseFloat(toAmount),
        exchangeRate: rate,
        customerName: customer?.name,
        paymentMethod,
        isCredit,
        staffName: profile?.full_name,
        notes,
      });

      toast({
        title: 'Transaction Complete',
        description: `Exchanged ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}`,
      });

      // Reset form
      setFromAmount('');
      setToAmount('');
      setSelectedCustomer('');
      setSelectedBank('');
      setIsCredit(false);
      setNotes('');
      setUseCustomRate(false);
      setUseManualAdjust(false);
      setIsPersonalAccount(false);
      setCustomRate('');
    } catch (error: any) {
      toast({
        title: 'Transaction Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toCurrency = fromCurrency === 'NPR' ? 'INR' : 'NPR';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Currency Exchange</h1>
        <p className="text-muted-foreground">Exchange NPR and INR currencies</p>
      </div>

      {/* Exchange Rate Display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Current Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-around text-center">
            <div>
              <p className="text-sm text-muted-foreground">NPR → INR</p>
              <p className="text-xl font-bold">1 : {defaultRate.nprToInr}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">INR → NPR</p>
              <p className="text-xl font-bold">1 : {defaultRate.inrToNpr}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Exchange</CardTitle>
          <CardDescription>Create a new currency exchange transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant={transactionType === 'sell' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTransactionType('sell')}
              >
                Sell {fromCurrency}
              </Button>
              <Button
                type="button"
                variant={transactionType === 'buy' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTransactionType('buy')}
              >
                Buy {fromCurrency}
              </Button>
            </div>

            {/* Amount Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
                <div className="space-y-2">
                  <Label>From ({fromCurrency})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={swapCurrencies}
                  className="mb-0.5"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="space-y-2">
                  <Label>To ({toCurrency})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={toAmount}
                    onChange={(e) => useManualAdjust && setToAmount(e.target.value)}
                    readOnly={!useManualAdjust}
                    className={useManualAdjust ? "border-primary" : "bg-muted"}
                  />
                </div>
              </div>

              {/* Custom Rate & Adjust Amount - Compact Row */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUseCustomRate(!useCustomRate)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
                    useCustomRate ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Settings2 className="h-3 w-3" />
                  Custom Rate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !useManualAdjust;
                    setUseManualAdjust(next);
                    if (!next) {
                      const amount = parseFloat(fromAmount);
                      if (!isNaN(amount)) {
                        const rate = getEffectiveRate();
                        setToAmount((amount * rate).toFixed(2));
                      }
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
                    useManualAdjust ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <PenLine className="h-3 w-3" />
                  Adjust Amount
                </button>
              </div>

              {useCustomRate && (
                <div className="space-y-2">
                  <Label className="text-xs">Custom Rate (1 {fromCurrency} = ? {toCurrency})</Label>
                  <Input
                    type="number"
                    placeholder={`e.g., ${fromCurrency === 'NPR' ? defaultRate.nprToInr : defaultRate.inrToNpr}`}
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    step="0.001"
                    className="h-9"
                  />
                </div>
              )}
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Customer (Optional)</Label>
              <CustomerSearchSelect
                customers={customers}
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
                onCustomerAdded={(newCustomer) => {
                  setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
                }}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account (for online) */}
            {paymentMethod === 'online' && (
              <div className="space-y-4">
                {/* Personal Account Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-500" />
                    <div>
                      <Label>My Personal Account</Label>
                      <p className="text-xs text-muted-foreground">
                        Received in my eSewa/Wallet (will be tracked as Staff Owes)
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={isPersonalAccount} 
                    onCheckedChange={(checked) => {
                      setIsPersonalAccount(checked);
                      if (checked) setSelectedBank('');
                    }} 
                  />
                </div>
                
                {!isPersonalAccount && (
                  <div className="space-y-2">
                    <Label>Bank Account</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name} - {bank.bank_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Credit Toggle */}
            {selectedCustomer && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label>Credit Transaction</Label>
                  <p className="text-sm text-muted-foreground">Customer will pay later</p>
                </div>
                <Switch checked={isCredit} onCheckedChange={setIsCredit} />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this transaction..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Processing...' : (
                <>
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Complete Exchange
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Print Receipt Button */}
      {lastTransaction && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Last Transaction</p>
                <p className="text-sm text-muted-foreground">
                  {lastTransaction.fromAmount} {lastTransaction.fromCurrency} → {lastTransaction.toAmount} {lastTransaction.toCurrency}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => printTransactionReceipt(lastTransaction)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Exchange;
