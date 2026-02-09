import { format } from 'date-fns';
import { MoreVertical, Eye, Pencil, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  invoice_number: string | null;
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

interface TransactionCardProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const TransactionCard = ({
  transaction,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: TransactionCardProps) => {
  const isSell = transaction.transaction_type === 'sell';
  
  return (
    <div 
      className={cn(
        "relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
        isSell 
          ? "bg-primary/5 border-l-4 border-l-primary" 
          : "bg-destructive/5 border-l-4 border-l-destructive"
      )}
      onClick={() => onView(transaction)}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
        isSell ? "bg-primary/10" : "bg-destructive/10"
      )}>
        {isSell ? (
          <ArrowUpRight className={cn("h-5 w-5", "text-primary")} />
        ) : (
          <ArrowDownRight className={cn("h-5 w-5", "text-destructive")} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isSell ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
          )}>
            {isSell ? 'Sold' : 'Bought'}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(transaction.created_at), 'HH:mm')}
          </span>
          {transaction.is_credit && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
              Credit
            </span>
          )}
        </div>
        
        <p className="font-semibold mt-1 truncate">
          {transaction.from_amount.toLocaleString()} {transaction.from_currency} → {transaction.to_amount.toLocaleString()} {transaction.to_currency}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground truncate">
            {transaction.customers?.name || 'Walk-in'} • Rate: {transaction.exchange_rate}
          </span>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(transaction); }}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          {canEdit && onEdit && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Transaction
            </DropdownMenuItem>
          )}
          {canDelete && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(transaction); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Transaction
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
