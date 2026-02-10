import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  const isMobile = /Mobi|Android/i.test(ua);
  const device = isMobile ? 'Mobile' : 'Desktop';

  return { browser, os, device_info: `${device} - ${browser} on ${os}` };
};

export const useActivityTracker = () => {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const trackActivity = async () => {
      try {
        const { browser, os, device_info } = getBrowserInfo();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase.functions.invoke('track-activity', {
          body: { browser, os, device_info },
        });
      } catch (err) {
        console.error('Activity tracking error:', err);
      }
    };

    // Track immediately on mount
    trackActivity();

    // Then every 60 seconds
    intervalRef.current = setInterval(trackActivity, 60000);

    // Mark offline on unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
};
