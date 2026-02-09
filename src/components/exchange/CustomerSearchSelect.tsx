import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, User, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  credit_balance: number;
  credit_limit: number;
}

interface CustomerSearchSelectProps {
  customers: Customer[];
  value: string;
  onValueChange: (value: string) => void;
  onCustomerAdded?: (customer: Customer) => void;
}

export function CustomerSearchSelect({
  customers,
  value,
  onValueChange,
  onCustomerAdded,
}: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [adding, setAdding] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === value),
    [customers, value]
  );

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Please enter a customer name');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: newCustomerName.trim(),
          credit_limit: 0,
          credit_balance: 0,
        })
        .select('id, name, credit_balance, credit_limit')
        .single();

      if (error) throw error;

      toast.success('Customer added successfully');
      setShowAddDialog(false);
      setNewCustomerName('');
      
      // Select the new customer and notify parent
      if (data) {
        onValueChange(data.id);
        onCustomerAdded?.(data);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    } finally {
      setAdding(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('NPR', '₹');
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-11"
          >
            <div className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selectedCustomer ? (
                <span className="truncate">{selectedCustomer.name}</span>
              ) : (
                <span className="text-muted-foreground">Select customer...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search customer..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-2 text-center">
                  <p className="text-sm text-muted-foreground mb-2">No customer found</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewCustomerName(searchQuery);
                      setShowAddDialog(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add "{searchQuery}"
                  </Button>
                </div>
              </CommandEmpty>
              
              {/* Add New Customer Option */}
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setNewCustomerName('');
                    setShowAddDialog(true);
                    setOpen(false);
                  }}
                  className="text-primary cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="font-medium">Add New Customer</span>
                </CommandItem>
              </CommandGroup>
              
              <CommandSeparator />
              
              {/* No Customer Option */}
              <CommandGroup heading="Quick Select">
                <CommandItem
                  value=""
                  onSelect={() => {
                    onValueChange('');
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Walk-in Customer</span>
                </CommandItem>
              </CommandGroup>
              
              {filteredCustomers.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Customers (${filteredCustomers.length})`}>
                    {filteredCustomers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id}
                        onSelect={() => {
                          onValueChange(customer.id);
                          setOpen(false);
                          setSearchQuery('');
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            value === customer.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-1 items-center justify-between min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium truncate">{customer.name}</span>
                          </div>
                          {customer.credit_balance > 0 && (
                            <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                              <CreditCard className="h-3 w-3" />
                              <span>{formatCurrency(customer.credit_balance)}</span>
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                placeholder="Enter customer name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomer();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} disabled={adding}>
              {adding ? 'Adding...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
