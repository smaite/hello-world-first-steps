import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DenominationCounterProps {
  currency: 'NPR' | 'INR';
  denominations: Record<string, number>;
  onChange: (denominations: Record<string, number>) => void;
  disabled?: boolean;
}

const NPR_DENOMINATIONS = [
  { value: 1000, label: '1000' },
  { value: 500, label: '500' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
  { value: 5, label: '5' },
];

const INR_DENOMINATIONS = [
  { value: 500, label: '500' },
  { value: 200, label: '200' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
  { value: 'coins', label: 'Coins' },
];

export const DenominationCounter = ({
  currency,
  denominations,
  onChange,
  disabled = false,
}: DenominationCounterProps) => {
  const denomList = currency === 'NPR' ? NPR_DENOMINATIONS : INR_DENOMINATIONS;

  const handleChange = (key: string, count: number) => {
    onChange({
      ...denominations,
      [key]: count,
    });
  };

  const calculateTotal = () => {
    return Object.entries(denominations).reduce((sum, [key, count]) => {
      const numValue = key === 'coins' ? 1 : parseInt(key);
      return sum + numValue * count;
    }, 0);
  };

  const formatNum = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {currency}
      </Label>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="py-1.5 px-2 text-left font-medium text-muted-foreground">Note</th>
              <th className="py-1.5 px-2 text-center font-medium text-muted-foreground">Qty</th>
              <th className="py-1.5 px-2 text-right font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {denomList.map((denom) => {
              const key = denom.value.toString();
              const count = denominations[key] || 0;
              const numValue = key === 'coins' ? 1 : parseInt(key);
              const total = numValue * count;

              return (
                <tr key={key} className="border-t border-border/50">
                  <td className="py-1 px-2 font-medium">{denom.label}</td>
                  <td className="py-1 px-2">
                    <Input
                      type="number"
                      min="0"
                      value={count || ''}
                      onChange={(e) =>
                        handleChange(key, parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-7 text-center mx-auto text-xs"
                      disabled={disabled}
                    />
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-muted-foreground">{formatNum(total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-primary/5">
            <tr className="border-t">
              <td colSpan={2} className="py-1.5 px-2 font-semibold text-xs">Total</td>
              <td className="py-1.5 px-2 text-right font-mono font-bold text-sm">
                {formatNum(calculateTotal())}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export const calculateDenominationTotal = (denominations: Record<string, number>) => {
  return Object.entries(denominations).reduce((sum, [key, count]) => {
    const numValue = key === 'coins' ? 1 : parseInt(key);
    return sum + numValue * count;
  }, 0);
};
