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
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {currency} Denominations
      </Label>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Note</th>
              <th className="p-2 text-center">Count</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {denomList.map((denom) => {
              const key = denom.value.toString();
              const count = denominations[key] || 0;
              const numValue = key === 'coins' ? 1 : parseInt(key);
              const total = numValue * count;

              return (
                <tr key={key} className="border-t">
                  <td className="p-2 font-medium">{denom.label}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      value={count || ''}
                      onChange={(e) =>
                        handleChange(key, parseInt(e.target.value) || 0)
                      }
                      className="w-20 text-center mx-auto"
                      disabled={disabled}
                    />
                  </td>
                  <td className="p-2 text-right font-mono">{formatNum(total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-primary/10">
            <tr className="border-t-2">
              <td colSpan={2} className="p-2 font-bold">Total</td>
              <td className="p-2 text-right font-mono font-bold text-lg">
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
