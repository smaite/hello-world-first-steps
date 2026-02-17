import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import {
  Settings as SettingsIcon,
  ArrowLeftRight,
  Save,
  Moon,
  RotateCcw,
  ChevronRight,
  LogOut,
  Trash2,
  Keyboard,
  RotateCw,
} from 'lucide-react';
import { FormSkeleton } from '@/components/ui/page-skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getKeybinds, saveKeybinds, resetKeybinds, type KeyBind } from '@/hooks/useKeybinds';

const SettingsItem = ({
  icon: Icon,
  label,
  description,
  onClick,
  trailing,
  destructive,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 ${
      destructive ? 'text-destructive' : ''
    }`}
  >
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
      <Icon className={`h-4 w-4 ${destructive ? 'text-destructive' : 'text-muted-foreground'}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium ${destructive ? 'text-destructive' : ''}`}>{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {trailing ?? (onClick ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /> : null)}
  </button>
);

const SettingsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
      {title}
    </p>
    <div className="rounded-xl border bg-card divide-y divide-border overflow-hidden">
      {children}
    </div>
  </div>
);

const Settings = () => {
  const { isOwner, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showRatesDialog, setShowRatesDialog] = useState(false);
  const [showKeybindsDialog, setShowKeybindsDialog] = useState(false);
  const [keybindEdits, setKeybindEdits] = useState<KeyBind[]>(getKeybinds());
  const [inrToNprRate, setInrToNprRate] = useState('');
  const [nprToInrRate, setNprToInrRate] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setInrToNprRate(data.inr_to_npr_rate.toString());
        setNprToInrRate(data.npr_to_inr_rate.toString());
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('exchange_settings')
        .select('id')
        .single();

      const payload = {
        inr_to_npr_rate: parseFloat(inrToNprRate),
        npr_to_inr_rate: parseFloat(nprToInrRate),
      };

      if (existing) {
        const { error } = await supabase
          .from('exchange_settings')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exchange_settings')
          .insert(payload);
        if (error) throw error;
      }

      toast({ title: 'Settings Saved', description: 'Exchange rates have been updated' });
      setShowRatesDialog(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('reset-app', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      toast({ title: 'App Reset', description: `All data cleared. ${res.data.deleted_users} users removed.` });
      setShowResetDialog(false);
    } catch (error: any) {
      toast({ title: 'Reset Failed', description: error.message, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  if (!isOwner()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to access settings.</p>
      </div>
    );
  }

  if (loading) return <FormSkeleton />;

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-24">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* General */}
      <SettingsGroup title="General">
        <SettingsItem
          icon={ArrowLeftRight}
          label="Exchange Rates"
          description={`1 INR = ${inrToNprRate || '—'} NPR`}
          onClick={() => setShowRatesDialog(true)}
        />
        <SettingsItem
          icon={Moon}
          label="Dark Mode"
          trailing={
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')}
            />
          }
        />
      </SettingsGroup>

      {/* Shortcuts */}
      <SettingsGroup title="Shortcuts">
        <SettingsItem
          icon={Keyboard}
          label="Keyboard Shortcuts"
          description="Press a key to navigate to a page"
          onClick={() => {
            setKeybindEdits(getKeybinds());
            setShowKeybindsDialog(true);
          }}
        />
      </SettingsGroup>

      {/* Danger Zone */}
      <SettingsGroup title="Danger Zone">
        <SettingsItem
          icon={Trash2}
          label="Reset App"
          description="Delete all data & non-owner users"
          onClick={() => setShowResetDialog(true)}
          destructive
        />
      </SettingsGroup>

      {/* Account */}
      <div className="pt-2">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-1 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>

      {/* Exchange Rates Dialog */}
      <AlertDialog open={showRatesDialog} onOpenChange={setShowRatesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Exchange Rates
            </AlertDialogTitle>
            <AlertDialogDescription>
              Set the default exchange rates for INR ⇄ NPR conversions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>INR → NPR</Label>
              <Input
                type="number"
                step="0.01"
                value={inrToNprRate}
                onChange={(e) => setInrToNprRate(e.target.value)}
                placeholder="1.60"
              />
            </div>
            <div className="space-y-2">
              <Label>NPR → INR</Label>
              <Input
                type="number"
                step="0.01"
                value={nprToInrRate}
                onChange={(e) => setNprToInrRate(e.target.value)}
                placeholder="0.625"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reset Entire App?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>all transactions, customers, expenses, bank accounts, reports, staff users</strong> and their auth accounts. Only owner accounts will be preserved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keybinds Dialog */}
      <AlertDialog open={showKeybindsDialog} onOpenChange={setShowKeybindsDialog}>
        <AlertDialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </AlertDialogTitle>
            <AlertDialogDescription>
              Assign a single key to quickly navigate to each page. Keys are case-insensitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            {keybindEdits.map((kb, i) => (
              <div key={kb.path} className="flex items-center gap-3">
                <span className="text-sm flex-1 min-w-0 truncate">{kb.label}</span>
                <Input
                  className="w-16 text-center uppercase font-mono"
                  maxLength={1}
                  value={kb.key}
                  onChange={(e) => {
                    const updated = [...keybindEdits];
                    updated[i] = { ...kb, key: e.target.value.slice(-1) };
                    setKeybindEdits(updated);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetKeybinds();
                setKeybindEdits(getKeybinds());
                toast({ title: 'Reset', description: 'Keybinds restored to defaults' });
              }}
            >
              <RotateCw className="h-3.5 w-3.5 mr-1.5" />
              Reset defaults
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                saveKeybinds(keybindEdits);
                toast({ title: 'Saved', description: 'Keyboard shortcuts updated. Reload to apply.' });
                setShowKeybindsDialog(false);
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
