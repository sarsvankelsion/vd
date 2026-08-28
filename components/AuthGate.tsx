'use client';

import { useState } from 'react';
import { useApp } from '@/store/useApp';

export default function AuthGate() {
  const { loginGoogle, loginEmail, registerEmail, authBusy, authError } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4">
      <div className="w-full max-w-sm border border-[#1a1a1a] bg-[#050505] p-6 sm:p-8">
        <div className="mb-8">
          <p className="text-xs text-[#555] mb-1 uppercase tracking-[0.2em]">00 / AUTH</p>
          <h1 className="text-xl font-medium tracking-tight text-white mb-1">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="text-xs text-[#666]">
            {mode === 'login'
              ? 'Kết nối với Firestore để đồng bộ trí nhớ trên mây.'
              : 'Đăng ký tài khoản để kích hoạt Zero-Mem Cloud.'}
          </p>
        </div>

        <button
          onClick={() => void loginGoogle()}
          disabled={authBusy}
          className="mb-4 flex w-full items-center justify-center gap-2 bg-white px-4 py-2.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Tiếp tục với Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-[10px] text-[#444] uppercase tracking-wider">
          <div className="h-px flex-1 bg-[#1a1a1a]" />
          hoặc email
          <div className="h-px flex-1 bg-[#1a1a1a]" />
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'login') void loginEmail(email, password);
            else void registerEmail(email, password);
          }}
        >
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2.5 text-xs text-[#ccc] placeholder-[#444] outline-none transition-colors focus:border-[#444]"
            />
          </div>
          <div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              className="w-full border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2.5 text-xs text-[#ccc] placeholder-[#444] outline-none transition-colors focus:border-[#444]"
            />
          </div>
          <button
            type="submit"
            disabled={authBusy}
            className="mt-1 flex w-full items-center justify-center border border-[#333] px-4 py-2.5 text-xs text-[#888] transition-all hover:border-[#555] hover:text-white disabled:opacity-50"
          >
            {authBusy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

        <div className="mt-4 flex justify-between items-center text-[11px] text-[#555]">
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="hover:text-[#888] transition-colors"
          >
            {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>

        {authError && (
          <p className="mt-4 border border-red-950/80 bg-red-950/20 p-2.5 text-xs text-red-400">
            {authError}
          </p>
        )}
      </div>
    </div>
  );
}
