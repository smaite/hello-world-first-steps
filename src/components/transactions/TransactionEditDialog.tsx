import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PaymentMethod = Database['public']['Enums']['payment_method'];

interface Transaction {
  id: string;
  staff_id: string;
  transaction_type: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  payment_method: string;
  is_credit: boolean;
  is_personal_account?: boolean;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  bank_account_id?: string | null;
  customers: { name: string } | null;
}

interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
}

interface TransactionEditDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const TransactionEditDialog = ({
  transaction,
  open,
  onOpenChange,
  onSaved,
}: TransactionEditDialogProps) => {
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('sell');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isCredit, setIsCredit] = useState(false);
  const [isPersonalAccount, setIsPersonalAccount] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    if (transaction) {
      setTransactionType(transaction.transaction_type as 'buy' | 'sell');
      setFromAmount(transaction.from_amount.toString());
      setToAmount(transaction.to_amount.toString());
      setExchangeRate(transaction.exchange_rate.toString());
      setPaymentMethod(transaction.payment_method as PaymentMethod);
      setIsCredit(transaction.is_credit);
      setIsPersonalAccount(transaction.is_personal_account || false);
      setSelectedBank(transaction.bank_account_id || '');
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  useEffect(() => {
    const fetchBanks = async () => {
      const { data } = await supabase
        .from('bank_accounts')
        .select('id, name, bank_name')
        .eq('is_active', true);
      if (data) setBankAccounts(data);
    };
    if (open) fetchBanks();
  }, [open]);

  if (!transaction) return null;

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    const amount = parseFloat(value);
    const rate = parseFloat(exchangeRate);
    if (!isNaN(amount) && !isNaN(rate)) {
      setToAmount((amount * rate).toFixed(2));
    }
  };

  const handleRateChange = (value: string) => {
    setExchangeRate(value);
    const amount = parseFloat(fromAmount);
    const rate = parseFloat(value);
    if (!isNaN(amount) && !isNaN(rate)) {
      setToAmount((amount * rate).toFixed(2));
    }
  };

  const handleSave = async () => {
    const fromAmt = parseFloat(fromAmount);
    const toAmt = parseFloat(toAmount);
    const rate = parseFloat(exchangeRate);

    if (isNaN(fromAmt) || fromAmt <= 0) {
      toast.error('Please enter a valid from amount');
      return;
    }
    if (isNaN(toAmt) || toAmt <= 0) {
      toast.error('Please enter a valid to amount');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid exchange rate');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          transaction_type: transactionType,
          from_amount: fromAmt,
          to_amount: toAmt,
          exchange_rate: rate,
          payment_method: paymentMethod,
          is_credit: isCredit,
          is_personal_account: paymentMethod === 'online' && isPersonalAccount,
          bank_account_id: paymentMethod === 'online' && !isPersonalAccount ? selectedBank || null : null,
          notes: notes || null,
        })
        .eq('id', transaction.id);

      if (error) throw error;
      
      toast.success('Transaction updated');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Type */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={transactionType === 'sell' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setTransactionType('sell')}
            >
              Sell
            </Button>
            <Button
              type="button"
              variant={transactionType === 'buy' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setTransactionType('buy')}
            >
              Buy
            </Button>
          </div>

          {/* Currency Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">From Currency</p>
              <p className="font-semibold">{transaction.from_currency}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">To Currency</p>
              <p className="font-semibold">{transaction.to_currency}</p>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Amount ({transaction.from_currency})</Label>
              <Input
                type="number"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>To Amount ({transaction.to_currency})</Label>
              <Input
                type="number"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="space-y-2">
            <Label>Exchange Rate</Label>
            <Input
              type="number"
              value={exchangeRate}
              onChange={(e) => handleRateChange(e.target.value)}
              min="0"
              step="0.001"
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
            <>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Personal Account</Label>
                  <p className="text-xs text-muted-foreground">Received in my eSewa/Wallet</p>
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
            </>
          )}

          {/* Credit Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>Credit Transaction</Label>
              <p className="text-xs text-muted-foreground">Mark as credit/udhar</p>
            </div>
            <Switch checked={isCredit} onCheckedChange={setIsCredit} />
          </div>

          {/* Customer (Read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Customer</Label>
            <Input value={transaction.customers?.name || 'Walk-in Customer'} disabled />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
