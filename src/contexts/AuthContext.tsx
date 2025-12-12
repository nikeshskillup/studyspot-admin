import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'staff';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userRole: AppRole | null;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    return data?.role as AppRole | null;
  };

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth loading timeout - forcing completion');
        setIsLoading(false);
      }
    }, 5000);

    const initSession = async () => {
      try {
        const resp = await supabase.auth.getSession();
        if (!mounted) return;

        const session = resp?.data?.session ?? null;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const role = await fetchUserRole(session.user.id);
            if (mounted) setUserRole(role);
          } catch (roleErr) {
            console.error('Error fetching role:', roleErr);
          }
        }
      } catch (err) {
        console.error('Failed to get session in AuthProvider', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      try {
        setSession(session ?? null);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const role = await fetchUserRole(session.user.id);
            if (mounted) setUserRole(role);
          } catch (roleErr) {
            console.error('Error fetching role on auth change:', roleErr);
          }
        } else {
          setUserRole(null);
        }
      } catch (err) {
        console.error('Auth state change handler error', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe?.();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        userRole,
        isAdmin: userRole === 'admin',
        signUp,
        signIn,
        signOut,
      }}
    >
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

export const checkAdminExists = async (): Promise<boolean> => {
  const { count, error } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin');

  if (error) {
    console.error('Error checking admin existence:', error);
    return false;
  }
  return (count ?? 0) > 0;
};
