import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, ArrowLeftRight, Save } from 'lucide-react';
import { FormSkeleton } from '@/components/ui/page-skeleton';

const Settings = () => {
  const { isOwner } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

      toast({
        title: 'Settings Saved',
        description: 'Exchange rates have been updated',
      });
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

  if (!isOwner()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to access settings.</p>
      </div>
    );
  }

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-lg sm:text-3xl font-bold flex items-center gap-2">
           <SettingsIcon className="h-5 w-5 sm:h-8 sm:w-8" />
           Settings
         </h1>
         <p className="text-xs sm:text-sm text-muted-foreground">Configure preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Custom Exchange Rates
          </CardTitle>
          <CardDescription>
            Set the default exchange rates for INR ⇄ NPR conversions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label>INR → NPR Rate</Label>
              <Input
                type="number"
                step="0.01"
                value={inrToNprRate}
                onChange={(e) => setInrToNprRate(e.target.value)}
                placeholder="e.g. 1.60"
              />
            </div>
            <div className="space-y-2">
              <Label>NPR → INR Rate</Label>
              <Input
                type="number"
                step="0.01"
                value={nprToInrRate}
                onChange={(e) => setNprToInrRate(e.target.value)}
                placeholder="e.g. 0.625"
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Current Rates:</strong> 1 INR = {inrToNprRate || '—'} NPR | 1 NPR = {nprToInrRate || '—'} INR
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;