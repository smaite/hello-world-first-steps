 import { useState, useEffect } from 'react';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { useToast } from '@/hooks/use-toast';
 import { Settings as SettingsIcon, Clock, Save } from 'lucide-react';
 
 const Settings = () => {
   const { isOwner } = useAuth();
   const { toast } = useToast();
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [dayEndHour, setDayEndHour] = useState('0');
   const [dayEndMinute, setDayEndMinute] = useState('0');
 
   useEffect(() => {
     fetchSettings();
   }, []);
 
   const fetchSettings = async () => {
     try {
       const { data, error } = await supabase
         .from('system_settings')
         .select('*')
         .single();
 
       if (error && error.code !== 'PGRST116') throw error;
       
       if (data) {
         setDayEndHour(data.day_end_hour.toString());
         setDayEndMinute(data.day_end_minute.toString());
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
         .from('system_settings')
         .select('id')
         .single();
 
       if (existing) {
         const { error } = await supabase
           .from('system_settings')
           .update({
             day_end_hour: parseInt(dayEndHour),
             day_end_minute: parseInt(dayEndMinute),
           })
           .eq('id', existing.id);
 
         if (error) throw error;
       } else {
         const { error } = await supabase
           .from('system_settings')
           .insert({
             day_end_hour: parseInt(dayEndHour),
             day_end_minute: parseInt(dayEndMinute),
           });
 
         if (error) throw error;
       }
 
       toast({
         title: 'Settings Saved',
         description: 'System settings have been updated',
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
     return (
       <div className="flex items-center justify-center h-64">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
       </div>
     );
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
             <Clock className="h-5 w-5" />
             Business Day Boundary
           </CardTitle>
           <CardDescription>
             Set when your business day ends. The next day will start after this time.
             For example, if you close at 3 PM, transactions after 3 PM will count for the next day.
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           <div className="grid grid-cols-2 gap-4 max-w-md">
             <div className="space-y-2">
               <Label>Hour (24-hour format)</Label>
               <Select value={dayEndHour} onValueChange={setDayEndHour}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {Array.from({ length: 24 }, (_, i) => (
                     <SelectItem key={i} value={i.toString()}>
                       {i.toString().padStart(2, '0')}:00
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Minute</Label>
               <Select value={dayEndMinute} onValueChange={setDayEndMinute}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="0">00</SelectItem>
                   <SelectItem value="15">15</SelectItem>
                   <SelectItem value="30">30</SelectItem>
                   <SelectItem value="45">45</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
 
           <div className="p-4 bg-muted rounded-lg">
             <p className="text-sm">
               <strong>Current Setting:</strong> Business day ends at{' '}
               {dayEndHour.padStart(2, '0')}:{dayEndMinute.padStart(2, '0')}
             </p>
             <p className="text-xs text-muted-foreground mt-2">
               Midnight (00:00) means the day follows the standard calendar day.
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