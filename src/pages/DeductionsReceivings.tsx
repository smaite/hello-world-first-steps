import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, ArrowUpRight } from 'lucide-react';
import Expenses from './Expenses';
import Receivings from './Receivings';

const DeductionsReceivings = () => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="deductions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deductions" className="gap-2">
            <Receipt className="h-4 w-4" />
            Deductions
          </TabsTrigger>
          <TabsTrigger value="receivings" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Receivings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="deductions" className="mt-4">
          <Expenses />
        </TabsContent>
        <TabsContent value="receivings" className="mt-4">
          <Receivings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeductionsReceivings;
