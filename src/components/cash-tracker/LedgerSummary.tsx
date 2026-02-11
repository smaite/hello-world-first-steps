import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

interface LedgerData {
  openingNpr: number;
  ncToIc: number;
  takeNpr: number;
  esewaInNpr: number;
  nastaKharcha: number;
  icToNc: number;
  hunuParneNpr: number;
  chaNpr: number;
  farakNpr: number;
  
  openingInr: number;
  icToNc_inr: number;
  takeInr: number;
  esewaInInr: number;
  nastaKharchaInr: number;
  ncToIc_inr: number;
  hunuParneInr: number;
  chaInr: number;
  farakInr: number;
  
  // Staff owes (personal eSewa received)
  staffOwesNpr?: number;
  staffOwesInr?: number;
}

interface LedgerSummaryProps {
  data: LedgerData;
  showActual?: boolean;
  onSettlementComplete?: () => void;
}

export const LedgerSummary = ({ data, showActual = false, onSettlementComplete }: LedgerSummaryProps) => {
  const { user, isOwner, isManager } = useAuth();
  const { toast } = useToast();
  const [settling, setSettling] = useState(false);
  
  const formatNum = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  const LedgerRow = ({
    value,
    label,
    subLabel,
    isTotal = false,
    isHighlight = false,
    isDanger = false,
    isSuccess = false,
  }: {
    value: number;
    label: string;
    subLabel?: string;
    isTotal?: boolean;
    isHighlight?: boolean;
    isDanger?: boolean;
    isSuccess?: boolean;
  }) => (
    <tr
      className={cn(
        'border-b border-border/40 last:border-b-0',
        isTotal && 'bg-muted/60 font-semibold',
        isHighlight && 'bg-primary/5'
      )}
    >
      <td
        className={cn(
          'py-1.5 px-2 sm:py-2.5 sm:px-3 text-right font-mono tabular-nums text-xs sm:text-sm',
          isTotal && 'font-bold',
          isDanger && value !== 0 && 'text-destructive',
          isSuccess && value !== 0 && 'text-green-600'
        )}
      >
        {formatNum(value)}
      </td>
      <td className={cn('py-1.5 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm', isTotal && 'font-semibold')}>
        <span>{label}</span>
        {subLabel && (
          <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">({subLabel})</span>
        )}
      </td>
    </tr>
  );

  const hasStaffOwes = (data.staffOwesNpr ?? 0) > 0 || (data.staffOwesInr ?? 0) > 0;

  const handleSettle = async () => {
    if (!user) return;
    
    setSettling(true);
    try {
      const { error } = await supabase
        .from('staff_settlements')
        .insert({
          staff_id: user.id,
          npr_amount: data.staffOwesNpr || 0,
          inr_amount: data.staffOwesInr || 0,
          settled_by: user.id,
          notes: `Settled on ${new Date().toLocaleDateString()}`,
        } as any);
      
      if (error) throw error;
      
      toast({
        title: 'Settlement Recorded',
        description: 'The personal eSewa amount has been marked as settled.',
      });
      
      onSettlementComplete?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* NPR Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-primary text-primary-foreground text-center py-1.5 sm:py-2.5 font-semibold text-xs sm:text-sm">
            NPR
          </div>
          <table className="w-full text-sm">
            <tbody>
              <LedgerRow value={data.openingNpr} label="Opening Balance" />
              <LedgerRow value={data.ncToIc} label="NPR Received" subLabel="NC→IC" />
              <LedgerRow value={data.takeNpr} label="Cash In" subLabel="Take" />
              <LedgerRow value={data.esewaInNpr} label="Online In" subLabel="eSewa" />
              <LedgerRow value={data.nastaKharcha} label="Expenses" subLabel="Nasta" />
              <LedgerRow value={data.icToNc} label="NPR Paid Out" subLabel="IC→NC" />
              <LedgerRow value={data.hunuParneNpr} label="Expected Balance" isTotal isHighlight />
              {showActual && <LedgerRow value={data.chaNpr} label="Actual Balance" isTotal />}
              {showActual && (
                <LedgerRow 
                  value={data.farakNpr} 
                  label="Difference" 
                  isTotal 
                  isDanger={data.farakNpr > 0}
                  isSuccess={data.farakNpr < 0}
                />
              )}
            </tbody>
          </table>
        </div>

        {/* INR Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-primary text-primary-foreground text-center py-1.5 sm:py-2.5 font-semibold text-xs sm:text-sm">
            INR
          </div>
          <table className="w-full text-sm">
            <tbody>
              <LedgerRow value={data.openingInr} label="Opening Balance" />
              <LedgerRow value={data.icToNc_inr} label="INR Received" subLabel="IC→NC" />
              <LedgerRow value={data.takeInr} label="Cash In" subLabel="Take" />
              <LedgerRow value={data.esewaInInr} label="Online In" subLabel="eSewa" />
              <LedgerRow value={data.nastaKharchaInr} label="Expenses" subLabel="Nasta" />
              <LedgerRow value={data.ncToIc_inr} label="INR Paid Out" subLabel="Sell" />
              <LedgerRow value={data.hunuParneInr} label="Expected Balance" isTotal isHighlight />
              {showActual && <LedgerRow value={data.chaInr} label="Actual Balance" isTotal />}
              {showActual && (
                <LedgerRow 
                  value={data.farakInr} 
                  label="Difference" 
                  isTotal 
                  isDanger={data.farakInr > 0}
                  isSuccess={data.farakInr < 0}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Owes Section */}
      {hasStaffOwes && (
        <div className="border rounded-lg overflow-hidden border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
          <div className="bg-orange-500 text-white text-center py-2.5 font-bold text-sm flex items-center justify-center gap-2">
            Personal eSewa - Staff Owes
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">NPR Amount</p>
                <p className="text-xl font-bold text-orange-600">{formatNum(data.staffOwesNpr ?? 0)}</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">INR Amount</p>
                <p className="text-xl font-bold text-orange-600">₹{formatNum(data.staffOwesInr ?? 0)}</p>
              </div>
            </div>
            {(isOwner() || isManager()) && (
              <Button 
                onClick={handleSettle} 
                disabled={settling}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {settling ? 'Recording...' : 'Mark as Settled'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center mt-2">
              Amount received in personal account - submit to owner
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export type { LedgerData };
