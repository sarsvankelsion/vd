'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId.toUpperCase(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        router.push('/forum');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 max-w-sm">
      <h1 className="text-sm font-medium text-white mb-1">Login</h1>
      <p className="text-xs text-[#555] mb-8">Enter your 15-char ID and password.</p>

      <form onSubmit={handleLogin} className="space-y-3">
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value.toUpperCase())}
          placeholder="your 15-char ID"
          required
          maxLength={15}
          className="tracking-widest font-mono"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          required
        />

        {error && <p className="text-xs text-[#aa3333]">{error}</p>}

        <button type="submit" disabled={loading} className="primary w-full cursor-pointer mt-2">
          {loading ? '...' : 'login'}
        </button>
      </form>

      <p className="text-xs text-[#555] mt-6">
        No account?{' '}
        <Link href="/register" className="text-[#888] hover:text-white">
          register
        </Link>
      </p>
    </div>
  );
}
