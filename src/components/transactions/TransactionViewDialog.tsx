import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Printer, Edit2 } from 'lucide-react';
import { printTransactionReceipt } from '@/utils/printUtils';

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
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  customers: { name: string } | null;
}

interface TransactionViewDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (transaction: Transaction) => void;
  canEdit?: boolean;
}

const formatCurrency = (amount: number, currency: string = 'NPR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency === 'INR' ? 'INR' : 'NPR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const TransactionViewDialog = ({
  transaction,
  open,
  onOpenChange,
  onEdit,
  canEdit = false,
}: TransactionViewDialogProps) => {
  if (!transaction) return null;

  const handlePrint = () => {
    printTransactionReceipt({
      id: transaction.id,
      date: new Date(transaction.created_at),
      transactionType: transaction.transaction_type as 'buy' | 'sell',
      fromCurrency: transaction.from_currency,
      toCurrency: transaction.to_currency,
      fromAmount: transaction.from_amount,
      toAmount: transaction.to_amount,
      exchangeRate: transaction.exchange_rate,
      customerName: transaction.customers?.name,
      paymentMethod: transaction.payment_method,
      isCredit: transaction.is_credit,
      notes: transaction.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Transaction Details</span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
              {canEdit && onEdit && (
                <Button variant="outline" size="icon" onClick={() => onEdit(transaction)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Type Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={transaction.transaction_type === 'buy' ? 'default' : 'secondary'}>
              {transaction.transaction_type.toUpperCase()}
            </Badge>
            {transaction.is_credit && (
              <Badge variant="destructive">Credit</Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {transaction.payment_method}
            </Badge>
          </div>

          {/* Exchange Details */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(transaction.from_amount, transaction.from_currency)}
            </div>
            <div className="text-xl my-2 text-muted-foreground">↓</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(transaction.to_amount, transaction.to_currency)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Rate: 1 {transaction.from_currency} = {transaction.exchange_rate} {transaction.to_currency}
            </div>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(transaction.created_at), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">{format(new Date(transaction.created_at), 'HH:mm:ss')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{transaction.customers?.name || 'Walk-in'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Transaction ID</p>
              <p className="font-medium font-mono text-xs">{transaction.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {transaction.notes && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-sm">Notes</p>
                <p className="text-sm mt-1">{transaction.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
