'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Register() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [result, setResult] = useState<{ userId: string; token: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getStrength = (pass: string) => {
    if (!pass) return { level: 0, label: '', cls: '' };
    let score = 0;
    if (pass.length >= 4) score++;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { level: 1, label: 'weak', cls: 'strength-weak' };
    if (score <= 4) return { level: 2, label: 'medium', cls: 'strength-medium' };
    return { level: 3, label: 'strong', cls: 'strength-strong' };
  };

  const strength = getStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('passwords do not match');
      return;
    }
    if (strength.level < 2) {
      setError('password too weak. use uppercase, lowercase, numbers, symbols.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('connection failed');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="py-20 max-w-md">
        <p className="text-xs text-[#555] mb-4 uppercase tracking-widest">account created</p>
        <div className="border border-[#1a1a1a] p-5 mb-4 bg-[#050505]">
          <p className="text-xs text-[#555] mb-2">your id (save this)</p>
          <p className="text-lg font-mono text-white tracking-wider select-all">{result.userId}</p>
        </div>
        <p className="text-xs text-[#555] mb-6">
          This is your only identifier. Save it. You cannot recover it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.userId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-xs border border-[#333] px-4 py-2 text-[#888] hover:text-white hover:border-[#555] transition-all cursor-pointer"
          >
            {copied ? 'copied!' : 'copy id'}
          </button>
          <Link
            href="/forum"
            className="text-xs bg-white text-black px-4 py-2 hover:opacity-90 transition-opacity inline-block font-medium"
          >
            enter forum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20 max-w-sm">
      <h1 className="text-sm font-medium text-white mb-1">Register</h1>
      <p className="text-xs text-[#555] mb-8">Enter a password. You will receive a random 15-char ID.</p>

      <form onSubmit={handleRegister} className="space-y-3">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            required
            minLength={4}
          />
          {password && (
            <>
              <div className="strength-bar">
                <div className={`strength-bar-fill ${strength.cls}`} />
              </div>
              <p
                className={`text-[10px] mt-1 ${
                  strength.level === 1
                    ? 'text-[#aa3333]'
                    : strength.level === 2
                    ? 'text-[#aa8833]'
                    : 'text-[#338833]'
                }`}
              >
                {strength.label}
                {strength.level === 1 && ' - add uppercase, numbers, symbols'}
                {strength.level === 2 && ' - acceptable'}
                {strength.level === 3 && ' - good'}
              </p>
            </>
          )}
        </div>

        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="confirm password"
          required
        />

        {error && <p className="text-xs text-[#aa3333]">{error}</p>}

        <button
          type="submit"
          disabled={loading || strength.level < 2}
          className="primary w-full cursor-pointer mt-2"
        >
          {loading ? '...' : 'create account'}
        </button>
      </form>

      <p className="text-xs text-[#555] mt-6">
        Already have an ID?{' '}
        <Link href="/login" className="text-[#888] hover:text-white">
          login
        </Link>
      </p>
    </div>
  );
}
