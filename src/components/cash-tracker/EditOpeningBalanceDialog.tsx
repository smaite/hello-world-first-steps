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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DenominationCounter, calculateDenominationTotal } from './DenominationCounter';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit2 } from 'lucide-react';

interface EditOpeningBalanceDialogProps {
  recordId: string;
  currentOpeningNpr: number;
  currentOpeningInr: number;
  currentNotes: string | null;
  onUpdate: () => void;
}

export function EditOpeningBalanceDialog({
  recordId,
  currentOpeningNpr,
  currentOpeningInr,
  currentNotes,
  onUpdate,
}: EditOpeningBalanceDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingNprDenoms, setOpeningNprDenoms] = useState<Record<string, number>>({});
  const [openingInrDenoms, setOpeningInrDenoms] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState(currentNotes || '');

  const calculateDenomsFromTotal = (total: number, currency: 'NPR' | 'INR'): Record<string, number> => {
    const denomValues = currency === 'NPR'
      ? [1000, 500, 100, 50, 20, 10, 5]
      : [500, 200, 100, 50, 20, 10];
    let remaining = total;
    const result: Record<string, number> = {};
    for (const denom of denomValues) {
      const count = Math.floor(remaining / denom);
      if (count > 0) {
        result[denom.toString()] = count;
        remaining -= count * denom;
      }
    }
    if (currency === 'INR' && remaining > 0) {
      result['coins'] = remaining;
    }
    return result;
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setNotes(currentNotes || '');
      setOpeningNprDenoms(calculateDenomsFromTotal(currentOpeningNpr, 'NPR'));
      setOpeningInrDenoms(calculateDenomsFromTotal(currentOpeningInr, 'INR'));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const npr = calculateDenominationTotal(openingNprDenoms);
      const inr = calculateDenominationTotal(openingInrDenoms);

      if (npr === 0 && inr === 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter at least one denomination count',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('staff_cash_tracker')
        .update({
          opening_npr: npr,
          opening_inr: inr,
          notes: notes || null,
        })
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: 'Opening Balance Updated',
        description: 'The opening balance and notes have been updated.',
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
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Day">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Opening Balance</DialogTitle>
          <DialogDescription>
            Current opening: NPR {currentOpeningNpr.toLocaleString()} / INR {currentOpeningInr.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <DenominationCounter
            currency="NPR"
            denominations={openingNprDenoms}
            onChange={setOpeningNprDenoms}
          />
          <DenominationCounter
            currency="INR"
            denominations={openingInrDenoms}
            onChange={setOpeningInrDenoms}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">New NPR:</span>
              <span className="font-bold ml-2">
                {calculateDenominationTotal(openingNprDenoms).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">New INR:</span>
              <span className="font-bold ml-2">
                {calculateDenominationTotal(openingInrDenoms).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes</Label>
          <Textarea
            id="edit-notes"
            placeholder="Any notes for today..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Update Opening Balance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
