import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Shield, Edit, Loader2, Trash2, XCircle, KeyRound, Copy, Check, Download, FileUp, Eye, MailCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  role: AppRole;
  permissions: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface LoginOtp {
  id: string;
  email: string;
  otp_code: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

const StaffManagement = () => {
  const { isOwner, isManager, user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [docsStaff, setDocsStaff] = useState<StaffMember | null>(null);
  const [docsData, setDocsData] = useState<{
    id_document_url: string | null;
    agreement_url: string | null;
    salary_agreement_url: string | null;
    signed_agreement_url: string | null;
  }>({ id_document_url: null, agreement_url: null, salary_agreement_url: null, signed_agreement_url: null });
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  // OTP generation state
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpExpiration, setOtpExpiration] = useState('24'); // hours
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const [activeOtps, setActiveOtps] = useState<LoginOtp[]>([]);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // New staff form
  const [newStaff, setNewStaff] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'staff' as AppRole,
  });

  useEffect(() => {
    fetchData();
    fetchActiveOtps();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch all staff permissions
      const { data: staffPerms, error: permsError } = await supabase
        .from('staff_permissions')
        .select('staff_id, permissions(name)');

      if (permsError) throw permsError;

      // Fetch available permissions
      const { data: allPerms, error: allPermsError } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true });

      if (allPermsError) throw allPermsError;
      setPermissions(allPerms || []);

      // Combine data
      const staffList: StaffMember[] = (profiles || []).map(profile => {
        const roleRecord = roles?.find(r => r.user_id === profile.id);
        const userPerms = staffPerms
          ?.filter(sp => sp.staff_id === profile.id)
          .map(sp => (sp.permissions as { name: string } | null)?.name)
          .filter(Boolean) as string[];

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          created_at: profile.created_at,
          role: roleRecord?.role || 'staff',
          permissions: userPerms || [],
        };
      });

      setStaff(staffList);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOtps = async () => {
    try {
      const { data, error } = await supabase
        .from('login_otps')
        .select('*')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveOtps(data || []);
    } catch (error: any) {
      console.error('Error fetching OTPs:', error);
    }
  };

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleGenerateOtp = async () => {
    if (!otpEmail) {
      toast({ title: 'Error', description: 'Please select a staff member', variant: 'destructive' });
      return;
    }

    setGeneratingOtp(true);
    try {
      const otp = generateOtp();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(otpExpiration));

      const { error } = await supabase.from('login_otps').insert({
        email: otpEmail.toLowerCase(),
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        created_by: user?.id,
      });

      if (error) throw error;

      setGeneratedOtp(otp);
      toast({ title: 'Success', description: 'Login code generated successfully' });
      fetchActiveOtps();
    } catch (error: any) {
      console.error('Error generating OTP:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setGeneratingOtp(false);
    }
  };

  const handleCopyOtp = async (otp: string) => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopiedOtp(otp);
      toast({ title: 'Copied!', description: 'Login code copied to clipboard' });
      setTimeout(() => setCopiedOtp(null), 2000);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDeleteOtp = async (otpId: string) => {
    try {
      const { error } = await supabase.from('login_otps').delete().eq('id', otpId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Login code revoked' });
      fetchActiveOtps();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetOtpDialog = () => {
    setOtpEmail('');
    setGeneratedOtp(null);
    setOtpDialogOpen(false);
  };

  const handleAddStaff = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.fullName) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Save current session before creating new user
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Create user via signup (handle_new_user trigger creates profile + 'pending' role)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStaff.email,
        password: newStaff.password,
        options: {
          data: {
            full_name: newStaff.fullName,
            phone: newStaff.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Restore the owner's session (signUp switches session)
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      // Update phone on profile if provided
      if (newStaff.phone) {
        await supabase.from('profiles').update({ phone: newStaff.phone }).eq('id', authData.user.id);
      }

      // Update role from 'pending' to the selected role (trigger already created 'pending')
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: newStaff.role })
        .eq('user_id', authData.user.id);

      if (roleError) throw roleError;

      toast({ title: 'Success', description: 'Staff member added successfully' });
      setAddDialogOpen(false);
      setNewStaff({ email: '', password: '', fullName: '', phone: '', role: 'staff' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openPermissionsDialog = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setSelectedPermissions(staffMember.permissions);
    setPermDialogOpen(true);
  };

  const handlePermissionToggle = (permName: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permName) ? prev.filter(p => p !== permName) : [...prev, permName]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;
    setSaving(true);

    try {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('staff_permissions')
        .delete()
        .eq('staff_id', selectedStaff.id);

      if (deleteError) throw deleteError;

      // Get permission IDs for selected permissions
      const permissionIds = permissions
        .filter(p => selectedPermissions.includes(p.name))
        .map(p => p.id);

      // Insert new permissions
      if (permissionIds.length > 0) {
        const { error: insertError } = await supabase.from('staff_permissions').insert(
          permissionIds.map(pid => ({
            staff_id: selectedStaff.id,
            permission_id: pid,
            granted_by: user?.id,
          }))
        );

        if (insertError) throw insertError;
      }

      toast({ title: 'Success', description: 'Permissions updated successfully' });
      setPermDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (staffId: string, newRole: AppRole) => {
    if (!isOwner()) {
      toast({ title: 'Error', description: 'Only owners can change roles', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', staffId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Role updated successfully' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRejectUser = async (staffId: string) => {
    setRejecting(staffId);
    try {
      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', staffId);

      if (roleError) throw roleError;

      // Delete staff permissions
      await supabase
        .from('staff_permissions')
        .delete()
        .eq('staff_id', staffId);

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', staffId);

      if (profileError) throw profileError;

      // Delete notifications for this user
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', staffId);

      toast({ title: 'Success', description: 'User rejected and removed' });
      fetchData();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setRejecting(null);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const openDocsDialog = async (member: StaffMember) => {
    setDocsStaff(member);
    setDocsDialogOpen(true);
    // Fetch document URLs from profile
    const { data } = await supabase.from('profiles').select('id_document_url, agreement_url, salary_agreement_url, signed_agreement_url').eq('id', member.id).single();
    if (data) {
      setDocsData({
        id_document_url: data.id_document_url,
        agreement_url: data.agreement_url,
        salary_agreement_url: data.salary_agreement_url,
        signed_agreement_url: data.signed_agreement_url,
      });
    }
  };

  const handleDocUpload = async (field: string, file: File) => {
    if (!docsStaff) return;
    setUploadingDoc(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${docsStaff.id}/${field}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('staff-documents').upload(fileName, file);
      if (uploadError) throw uploadError;

      // staff-documents is private, so we need to create a signed URL or store the path
      const { data: { publicUrl } } = supabase.storage.from('staff-documents').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase.from('profiles').update({ [field]: publicUrl }).eq('id', docsStaff.id);
      if (updateError) throw updateError;

      setDocsData(prev => ({ ...prev, [field]: publicUrl }));
      toast({ title: 'Uploaded', description: 'Document uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleVerifyEmail = async (staffId: string) => {
    setVerifyingEmail(staffId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://qybimxftznjqsfselrzl.supabase.co/functions/v1/verify-user-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ user_id: staffId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({ title: 'Success', description: 'Email verified successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setVerifyingEmail(null);
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'owner': return 'default';
      case 'manager': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'outline';
    }
  };

  const pendingStaff = staff.filter(s => s.role === 'pending');
  const activeStaff = staff.filter(s => s.role !== 'pending');

  const toggleSelectAll = () => {
    if (selectedIds.length === activeStaff.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeStaff.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!isOwner()) return;
    
    setBulkDeleting(true);
    try {
      // Delete user roles
      await supabase.from('user_roles').delete().in('user_id', selectedIds);
      
      // Delete staff permissions
      await supabase.from('staff_permissions').delete().in('staff_id', selectedIds);
      
      // Delete profiles
      const { error } = await supabase.from('profiles').delete().in('id', selectedIds);
      if (error) throw error;

      toast({
        title: 'Staff Members Deleted',
        description: `${selectedIds.length} member(s) removed`,
      });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchData();
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
      ? activeStaff.filter(s => selectedIds.includes(s.id))
      : activeStaff;

    const headers = ['Name', 'Email', 'Phone', 'Role', 'Permissions'];
    const rows = selected.map(s => [
      s.full_name,
      s.email || '',
      s.phone || '',
      s.role,
      s.role === 'owner' || s.role === 'manager' ? 'All' : s.permissions.join(', '),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Success',
      description: 'CSV exported successfully',
    });
  };

  if (!isOwner() && !isManager()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff members and their permissions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(isOwner() || isManager()) && (
            <Dialog open={otpDialogOpen} onOpenChange={(open) => { if (!open) resetOtpDialog(); else setOtpDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Generate Login Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Login Code</DialogTitle>
                  <DialogDescription>Generate a one-time login code for staff member</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {!generatedOtp ? (
                    <>
                      <div className="space-y-2">
                        <Label>Select Staff Member *</Label>
                        <Select value={otpEmail} onValueChange={setOtpEmail}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff
                              .filter(s => s.role === 'staff' && s.email)
                              .map(s => (
                                <SelectItem key={s.id} value={s.email!}>
                                  {s.full_name} ({s.email})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {staff.filter(s => s.role === 'staff' && s.email).length === 0 && (
                          <p className="text-xs text-muted-foreground">No staff members available</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Code Validity</Label>
                        <Select value={otpExpiration} onValueChange={setOtpExpiration}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="12">12 hours</SelectItem>
                            <SelectItem value="24">24 hours</SelectItem>
                            <SelectItem value="48">48 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleGenerateOtp} className="w-full" disabled={generatingOtp || !otpEmail}>
                        {generatingOtp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        {generatingOtp ? 'Generating...' : 'Generate Code'}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      <p className="text-sm text-muted-foreground">Login code for <strong>{otpEmail}</strong></p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-4xl font-mono font-bold tracking-widest bg-muted p-4 rounded-lg">
                          {generatedOtp}
                        </div>
                        <Button size="icon" variant="outline" onClick={() => handleCopyOtp(generatedOtp)}>
                          {copiedOtp === generatedOtp ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">This code expires in {otpExpiration} hour{parseInt(otpExpiration) > 1 ? 's' : ''}</p>
                      <Button onClick={resetOtpDialog} variant="outline" className="w-full">Done</Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isOwner() && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>Create a new account for a staff member</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={newStaff.fullName}
                    onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newStaff.role}
                    onValueChange={(value: AppRole) => setNewStaff({ ...newStaff, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddStaff} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  {saving ? 'Creating...' : 'Create Staff Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingStaff.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="bg-amber-50 dark:bg-amber-900/20">
            <CardTitle className="flex items-center gap-2">
              <Badge variant="destructive">{pendingStaff.length}</Badge>
              Pending Approvals
            </CardTitle>
            <CardDescription>These users are waiting for approval to access the system</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email || '-'}</TableCell>
                    <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleRoleChange(member.id, 'staff')}
                      >
                        Approve as Staff
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRoleChange(member.id, 'manager')}
                      >
                        Approve as Manager
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={rejecting === member.id}
                          >
                            {rejecting === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1" />
                            )}
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject User?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove {member.full_name} from the system. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRejectUser(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Reject & Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Active Login Codes Section */}
      {activeOtps.length > 0 && (isOwner() || isManager()) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Active Login Codes
            </CardTitle>
            <CardDescription>One-time login codes that have been generated and are still valid</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOtps.map((otp) => (
                  <TableRow key={otp.id}>
                    <TableCell className="font-medium">{otp.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{otp.otp_code}</code>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCopyOtp(otp.otp_code)}>
                          {copiedOtp === otp.otp_code ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(otp.expires_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteOtp(otp.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Card className="border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.length} staff member(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
                {isOwner() && (
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

      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>View and manage all staff members</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeStaff.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active staff members</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.length === activeStaff.length && activeStaff.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(member.id)}
                        onCheckedChange={() => toggleSelect(member.id)}
                        disabled={member.id === user?.id}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email || '-'}</TableCell>
                    <TableCell>{member.phone || '-'}</TableCell>
                    <TableCell>
                      {isOwner() && member.id !== user?.id ? (
                        <Select
                          value={member.role}
                          onValueChange={(value: AppRole) => handleRoleChange(member.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.role === 'owner' || member.role === 'manager' ? (
                          <Badge variant="secondary">All Permissions</Badge>
                        ) : member.permissions.length > 0 ? (
                          <>
                            {member.permissions.slice(0, 2).map((perm) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                            {member.permissions.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.permissions.length - 2} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">No permissions</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isOwner() && member.id !== user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyEmail(member.id)}
                            disabled={verifyingEmail === member.id}
                          >
                            {verifyingEmail === member.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <MailCheck className="h-4 w-4 mr-1" />
                            )}
                            Verify
                          </Button>
                        )}
                        {isOwner() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDocsDialog(member)}
                          >
                            <FileUp className="h-4 w-4 mr-1" />
                            Docs
                          </Button>
                        )}
                        {isOwner() && member.role === 'staff' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPermissionsDialog(member)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Permissions
                          </Button>
                        )}
                        {isOwner() && member.id !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {member.full_name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this staff member and all their data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRejectUser(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              {selectedStaff && `Configure permissions for ${selectedStaff.full_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold capitalize text-lg border-b pb-2">{category}</h3>
                <div className="grid gap-3">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={perm.id}
                        checked={selectedPermissions.includes(perm.name)}
                        onCheckedChange={() => handlePermissionToggle(perm.name)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={perm.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {perm.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        {perm.description && (
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setPermDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePermissions} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} staff member(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected staff members and all their data.
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

      {/* Staff Documents Dialog */}
      <Dialog open={docsDialogOpen} onOpenChange={(open) => { if (!open) { setDocsDialogOpen(false); setDocsStaff(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Staff Documents</DialogTitle>
            <DialogDescription>
              {docsStaff && `Upload documents for ${docsStaff.full_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {[
              { field: 'id_document_url', label: 'ID Document (Citizenship/Passport)' },
              { field: 'agreement_url', label: 'Agreement' },
              { field: 'salary_agreement_url', label: 'Salary Agreement' },
              { field: 'signed_agreement_url', label: 'Signed Agreement' },
            ].map(({ field, label }) => (
              <div key={field} className="space-y-2">
                <Label>{label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocUpload(field, file);
                    }}
                    disabled={uploadingDoc === field}
                  />
                  {(docsData as any)[field] && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open((docsData as any)[field], '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {uploadingDoc === field && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                  </p>
                )}
                {(docsData as any)[field] && (
                  <p className="text-xs text-primary">✓ Document uploaded</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
