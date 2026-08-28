'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [userId, setUserId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const id = localStorage.getItem('userId');
    setUserId(id);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUserId(null);
    window.location.href = '/login';
  };

  return (
    <nav className="border-b border-[#111] bg-[#050505]" suppressHydrationWarning>
      <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-2 h-2 bg-white rounded-full group-hover:bg-[#888] transition-colors" />
          <span className="text-xs font-medium tracking-[0.3em] text-white uppercase">void</span>
        </Link>
        <div className="flex items-center">
          <Link href="/forum" className={`nav-link ${pathname?.startsWith('/forum') ? 'text-white' : ''}`}>
            forum
          </Link>
          <span className="text-[#1a1a1a] mx-1">/</span>
          <Link href="/messages" className={`nav-link ${pathname?.startsWith('/messages') ? 'text-white' : ''}`}>
            msg
          </Link>
          <span className="text-[#1a1a1a] mx-1">/</span>
          {userId ? (
            <button
              onClick={handleLogout}
              className="nav-link text-[#aaa] hover:text-white cursor-pointer font-mono text-[11px]"
            >
              {userId.slice(0, 4)}...{userId.slice(-3)} (logout)
            </button>
          ) : (
            <Link href="/login" className="nav-link" id="nav-login">
              login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
