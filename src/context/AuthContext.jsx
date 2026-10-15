import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

const getInitialStoredAuth = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const u = parsed?.user || parsed?.currentSession?.user;
          if (u?.id) {
            return {
              session: parsed,
              user: u,
              profile: {
                id: u.id,
                name: u.user_metadata?.name || u.user_metadata?.full_name || 'Customer',
                phone: u.user_metadata?.phone || '',
                email: u.email || '',
                role: u.user_metadata?.role || 'customer',
              },
            };
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading initial auth token:', e);
  }
  return { session: null, user: null, profile: null };
};

export function AuthProvider({ children }) {
  const initial = getInitialStoredAuth();
  const [session, setSession] = useState(initial.session);
  const [user, setUser] = useState(initial.user);
  const [profile, setProfile] = useState(initial.profile);
  const [loading, setLoading] = useState(!initial.user);

  const fetchProfile = async (userId, userMetadata = {}, userEmail = '') => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      } else {
        // Fallback to auth metadata if public.users record is not yet created
        setProfile({
          id: userId,
          name: userMetadata?.name || userMetadata?.full_name || 'Customer',
          phone: userMetadata?.phone || '',
          email: userEmail,
          role: 'customer',
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata, session.user.email);
      }
      setLoading(false);
    });

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user.user_metadata, newSession.user.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.user_metadata, user.email);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
