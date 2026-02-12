import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, ArrowUpRight } from 'lucide-react';
import Expenses from './Expenses';
import Receivings from './Receivings';

const DeductionsReceivings = () => {
  return (
    <Tabs defaultValue="deductions" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10">
        <TabsTrigger value="deductions" className="gap-1.5 text-xs sm:text-sm">
          <Receipt className="h-3.5 w-3.5" />
          Deductions
        </TabsTrigger>
        <TabsTrigger value="receivings" className="gap-1.5 text-xs sm:text-sm">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Receivings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="deductions" className="mt-3">
        <Expenses />
      </TabsContent>
      <TabsContent value="receivings" className="mt-3">
        <Receivings />
      </TabsContent>
    </Tabs>
  );
};

export default DeductionsReceivings;
