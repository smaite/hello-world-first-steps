import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Edit, Trash2, QrCode, Upload, Download } from 'lucide-react';

interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number: string | null;
  account_type: string;
  current_balance: number;
  is_active: boolean;
  qr_code_url: string | null;
}

const BankAccounts = () => {
  const { user, isOwner, isManager } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_number: '',
    account_type: 'savings',
    current_balance: '',
    is_active: true,
    qr_code_url: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim() || !formData.bank_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Account name and bank name are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update({
            name: formData.name,
            bank_name: formData.bank_name,
            account_number: formData.account_number || null,
            account_type: formData.account_type,
            current_balance: parseFloat(formData.current_balance) || 0,
            is_active: formData.is_active,
          })
          .eq('id', editingAccount.id);

        if (error) throw error;

        toast({
          title: 'Account Updated',
          description: 'Bank account has been updated',
        });
      } else {
        const { data: newAccount, error } = await supabase
          .from('bank_accounts')
          .insert({
            name: formData.name,
            bank_name: formData.bank_name,
            account_number: formData.account_number || null,
            account_type: formData.account_type,
            current_balance: parseFloat(formData.current_balance) || 0,
            is_active: formData.is_active,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (error) throw error;

        // Upload QR code if selected
        if (qrFile && newAccount) {
          await handleQrUpload(newAccount.id);
        }

        toast({
          title: 'Account Added',
          description: 'New bank account has been added',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      bank_name: account.bank_name,
      account_number: account.account_number || '',
      account_type: account.account_type,
      current_balance: account.current_balance.toString(),
      is_active: account.is_active,
      qr_code_url: account.qr_code_url || '',
    });
    setDialogOpen(true);
  };

  const handleQrUpload = async (accountId: string) => {
    if (!qrFile) return;
    
    setUploadingQr(true);
    try {
      const fileExt = qrFile.name.split('.').pop();
      const fileName = `${accountId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('qr-codes')
        .upload(fileName, qrFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('qr-codes')
        .getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('bank_accounts')
        .update({ qr_code_url: publicUrl })
        .eq('id', accountId);

      if (updateError) throw updateError;

      toast({
        title: 'QR Code Uploaded',
        description: 'QR code has been added to the account',
      });
      
      setQrFile(null);
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingQr(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: 'Account Deleted',
        description: 'Bank account has been removed',
      });
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      bank_name: '',
      account_number: '',
      account_type: 'savings',
      current_balance: '',
      is_active: true,
      qr_code_url: '',
    });
    setEditingAccount(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'NPR',
    }).format(amount);
  };

  const canManage = isOwner();

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!canManage) return;
    
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: 'Accounts Deleted',
        description: `${selectedIds.length} account(s) removed`,
      });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const exportToCSV = () => {
    const selected = selectedIds.length > 0 
      ? accounts.filter(a => selectedIds.includes(a.id))
      : accounts;

    const headers = ['Account Name', 'Bank Name', 'Account Number', 'Type', 'Balance', 'Status'];
    const rows = selected.map(a => [
      a.name,
      a.bank_name,
      a.account_number || '',
      a.account_type,
      a.current_balance.toString(),
      a.is_active ? 'Active' : 'Inactive',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bank_accounts_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Success',
      description: 'CSV exported successfully',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage your bank accounts for online transactions</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Bank Account'}</DialogTitle>
                <DialogDescription>
                  {editingAccount ? 'Update account details' : 'Enter the bank account details'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Main Business Account"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="e.g., Nepal Bank Limited"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_balance">Current Balance</Label>
                    <Input
                      id="current_balance"
                      type="number"
                      value={formData.current_balance}
                      onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">Active</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>QR Code</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files && setQrFile(e.target.files[0])}
                      />
                      {qrFile && editingAccount && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleQrUpload(editingAccount.id)}
                          disabled={uploadingQr}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {uploadingQr ? 'Uploading...' : 'Upload'}
                        </Button>
                      )}
                    </div>
                    {editingAccount?.qr_code_url && !qrFile && (
                      <img 
                        src={editingAccount.qr_code_url} 
                        alt="QR Code" 
                        className="w-32 h-32 object-contain border rounded"
                      />
                    )}
                    {!editingAccount && qrFile && (
                      <p className="text-xs text-muted-foreground">QR will be uploaded after account is created</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAccount ? 'Update' : 'Add'} Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.length} account(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
                {canManage && (
                  <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No bank accounts found
          </div>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      checked={selectedIds.includes(account.id)}
                      onCheckedChange={() => toggleSelect(account.id)}
                    />
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <CardDescription>{account.bank_name}</CardDescription>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {account.account_number && (
                    <p className="text-sm text-muted-foreground">
                      Account: ****{account.account_number.slice(-4)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground capitalize">
                    Type: {account.account_type}
                  </p>
                  {account.qr_code_url && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(account.qr_code_url!, '_blank')}
                        className="w-full"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        View QR Code
                      </Button>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-xl font-bold">{formatCurrency(account.current_balance)}</p>
                  </div>
                  {!account.is_active && (
                    <span className="inline-block px-2 py-1 text-xs bg-muted rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} account(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected bank accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BankAccounts;
