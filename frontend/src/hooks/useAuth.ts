import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for token on mount
    const token = localStorage.getItem('pluggable_auth_token');
    const uid = localStorage.getItem('pluggable_user_id');
    
    if (token) {
      setIsAuthenticated(true);
      if (uid) setUserId(uid);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('pluggable_auth_token');
    localStorage.removeItem('pluggable_user_id');
    setIsAuthenticated(false);
    setUserId(null);
    router.push('/login');
  };

  return {
    isAuthenticated,
    userId,
    logout
  };
}
