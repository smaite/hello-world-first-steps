import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

type AppRole = Database['public']['Enums']['app_role'];

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  permissions: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperuser: () => boolean;
  isOwner: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
  isPending: () => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for deep links on native (OAuth redirect back to app)
    let appUrlListener: any;
    if (Capacitor.isNativePlatform()) {
      appUrlListener = CapApp.addListener('appUrlOpen', async ({ url }) => {
        // Extract tokens from the redirect URL hash
        if (url.includes('access_token') || url.includes('refresh_token')) {
          const hashPart = url.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
          }
        }
        // Close the in-app browser
        try { await Browser.close(); } catch {}
      });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlListener) appUrlListener.remove();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (roleData) {
        setRole(roleData.role);
      }

      // Fetch permissions
      const { data: permissionsData } = await supabase
        .from('staff_permissions')
        .select('permissions(name)')
        .eq('staff_id', userId);
      
      if (permissionsData) {
        const permNames = permissionsData
          .map((p: any) => p.permissions?.name)
          .filter(Boolean);
        setPermissions(permNames);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isSuperuser = () => role === 'superuser';
  const isOwner = () => role === 'owner' || role === 'superuser';
  const isManager = () => role === 'manager';
  const isStaff = () => role === 'staff';
  const isPending = () => role === 'pending';
  
  const hasPermission = (permission: string) => {
    if (isSuperuser() || isOwner() || isManager()) return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      permissions,
      loading,
      signIn,
      signUp,
      signOut,
      isSuperuser,
      isOwner,
      isManager,
      isStaff,
      isPending,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
