import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const LOCAL_MODE_KEY = 'dev_local_supabase_mode';
const LOCAL_URL_KEY = 'dev_local_supabase_url';
const LOCAL_KEY_KEY = 'dev_local_supabase_key';

export const isLocalMode = () => {
  return localStorage.getItem(LOCAL_MODE_KEY) === 'true';
};

export const getSupabaseConfig = () => {
  if (isLocalMode()) {
    return {
      url: localStorage.getItem(LOCAL_URL_KEY) || 'http://localhost:54321',
      key: localStorage.getItem(LOCAL_KEY_KEY) || '',
      isLocal: true
    };
  }
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    isLocal: false
  };
};

export function DevModeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [localUrl, setLocalUrl] = useState('http://localhost:54321');
  const [localKey, setLocalKey] = useState('');
  const [keySequence, setKeySequence] = useState('');

  // Secret keyboard shortcut: Type "devmode" quickly
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const newSequence = (keySequence + e.key).slice(-7);
      setKeySequence(newSequence);
      
      if (newSequence === 'devmode') {
        setIsOpen(true);
        setKeySequence('');
      }
    };

    // Reset sequence after 2 seconds of no typing
    const timeout = setTimeout(() => setKeySequence(''), 2000);
    
    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [keySequence]);

  // Load saved settings
  useEffect(() => {
    setLocalMode(localStorage.getItem(LOCAL_MODE_KEY) === 'true');
    setLocalUrl(localStorage.getItem(LOCAL_URL_KEY) || 'http://localhost:54321');
    setLocalKey(localStorage.getItem(LOCAL_KEY_KEY) || '');
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(LOCAL_MODE_KEY, localMode.toString());
    localStorage.setItem(LOCAL_URL_KEY, localUrl);
    localStorage.setItem(LOCAL_KEY_KEY, localKey);
    
    toast.success('Settings saved! Refreshing...', {
      description: localMode ? 'Switching to Local Supabase' : 'Switching to Cloud'
    });
    
    // Refresh to apply new settings
    setTimeout(() => window.location.reload(), 1000);
  };

  const currentConfig = getSupabaseConfig();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔧 Dev Mode Settings
            <Badge variant={currentConfig.isLocal ? "destructive" : "secondary"}>
              {currentConfig.isLocal ? 'LOCAL' : 'CLOUD'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Secret developer settings. Type "devmode" anywhere to open this.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="local-mode" className="font-medium">
              Use Local Supabase
            </Label>
            <Switch
              id="local-mode"
              checked={localMode}
              onCheckedChange={setLocalMode}
            />
          </div>

          {localMode && (
            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="local-url">Local Supabase URL</Label>
                <Input
                  id="local-url"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  placeholder="http://localhost:54321"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="local-key">Anon Key</Label>
                <Input
                  id="local-key"
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="Your local anon key"
                  type="password"
                />
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Current URL:</strong> {currentConfig.url?.slice(0, 40)}...</p>
            <p className="mt-2"><strong>Local Setup (requires Docker):</strong></p>
            <code className="block bg-muted p-2 rounded text-[10px]">
              npm install -g supabase<br/>
              supabase init<br/>
              supabase start
            </code>
          </div>

          <Button onClick={handleSave} className="w-full">
            Save & Reload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
