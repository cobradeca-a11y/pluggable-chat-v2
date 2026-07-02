'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    // O client oficial já processa o token do hash da URL sozinho
    // (detectSessionInUrl: true); só precisamos redirecionar quando
    // uma sessão válida existir.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/');
    });

    const oauthError = searchParams?.get('error_description');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, [router, searchParams]);

  const handleGoogleLogin = async () => {
    const redirectTo = `${window.location.origin}/login`;
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (oauthErr) setError(oauthErr.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 transition-colors">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pluggable Chat</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">Entre com sua conta Google para acessar seu histórico</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.7 35 27 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C41.9 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
          </svg>
          Entrar com Google
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
