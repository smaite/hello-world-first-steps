import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DenominationCounter, calculateDenominationTotal } from './DenominationCounter';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit2 } from 'lucide-react';

interface EditClosingBalanceDialogProps {
  recordId: string;
  currentClosingNpr: number;
  currentClosingInr: number;
  onUpdate: () => void;
}

export function EditClosingBalanceDialog({
  recordId,
  currentClosingNpr,
  currentClosingInr,
  onUpdate,
}: EditClosingBalanceDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closingNprDenoms, setClosingNprDenoms] = useState<Record<string, number>>({});
  const [closingInrDenoms, setClosingInrDenoms] = useState<Record<string, number>>({});

  const handleSave = async () => {
    setSaving(true);
    try {
      const npr = calculateDenominationTotal(closingNprDenoms);
      const inr = calculateDenominationTotal(closingInrDenoms);

      const { error } = await supabase
        .from('staff_cash_tracker')
        .update({
          closing_npr: npr,
          closing_inr: inr,
        })
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: 'Closing Balance Updated',
        description: 'The closing balance has been successfully updated.',
      });

      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 className="h-4 w-4 mr-1" />
          Edit Closing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Closing Balance</DialogTitle>
          <DialogDescription>
            Current closing: NPR {currentClosingNpr.toLocaleString()} / INR {currentClosingInr.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <DenominationCounter
            currency="NPR"
            denominations={closingNprDenoms}
            onChange={setClosingNprDenoms}
          />
          <DenominationCounter
            currency="INR"
            denominations={closingInrDenoms}
            onChange={setClosingInrDenoms}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">New NPR:</span>
              <span className="font-bold ml-2">
                {calculateDenominationTotal(closingNprDenoms).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">New INR:</span>
              <span className="font-bold ml-2">
                {calculateDenominationTotal(closingInrDenoms).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Update Closing Balance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
