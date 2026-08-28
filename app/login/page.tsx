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
        body: JSON.stringify({ userId: userId.trim().toUpperCase(), password }),
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
        <div>
          <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">15-char ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value.toUpperCase())}
            placeholder="e.g. 9H5QPXFCUKPCKEX"
            required
            maxLength={15}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 text-xs text-white tracking-widest font-mono placeholder-[#444] focus:border-[#555] outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="your password"
            required
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 text-xs text-white placeholder-[#444] focus:border-[#555] outline-none transition-colors"
          />
        </div>

        {error && <p className="text-xs text-[#aa3333] pt-1">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black text-xs font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-30 cursor-pointer mt-2"
        >
          {loading ? 'authenticating...' : 'login'}
        </button>
      </form>

      <p className="text-xs text-[#555] mt-6">
        No account?{' '}
        <Link href="/register" className="text-[#888] hover:text-white transition-colors">
          register
        </Link>
      </p>
    </div>
  );
}
