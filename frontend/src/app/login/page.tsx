'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SettingsModal } from '@/components/SettingsModal';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If the URL has ?verify=true, Supabase redirects here with token hash in URL
    // or we might handle standard Supabase auth redirects here if needed.
    // For magic links without SSR, Supabase typically puts tokens in the URL hash.
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        localStorage.setItem('pluggable_auth_token', accessToken);
        router.push('/');
      }
    } else if (searchParams?.get('token') && searchParams?.get('email')) {
      // Backend custom verify fallback
      verifyToken(searchParams.get('email')!, searchParams.get('token')!);
    }
  }, [router, searchParams]);

  const verifyToken = async (emailToVerify: string, token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify, token })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        localStorage.setItem('pluggable_auth_token', data.session.access_token);
        localStorage.setItem('pluggable_user_id', data.session.user_id);
        router.push('/');
      } else {
        setError('Token inválido ou expirado.');
      }
    } catch (err) {
      setError('Erro ao verificar token.');
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setMessage('Magic link enviado! Verifique seu email.');
      } else {
        setError(data.detail || 'Erro ao enviar link.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 transition-colors">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pluggable Chat</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">Faça login com Magic Link para acessar seu histórico</p>
        </div>
        
        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-900 dark:text-white transition-colors"
              placeholder="seu@email.com"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Magic Link'}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm">
            {message}
          </div>
        )}

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
