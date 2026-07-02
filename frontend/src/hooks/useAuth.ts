import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Sessão inicial (o client já lida com refresh automático a partir daqui)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id ?? null);
      setAccessToken(session?.access_token ?? null);
    });

    // Mantém estado sincronizado a cada refresh de token, login ou logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id ?? null);
      setAccessToken(session?.access_token ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserId(null);
    setAccessToken(null);
    router.push('/login');
  };

  return {
    isAuthenticated,
    userId,
    accessToken,
    logout
  };
}
