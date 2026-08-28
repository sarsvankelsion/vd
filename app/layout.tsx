import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'VOID',
  description: 'Anonymous forum. No names, no traces. Share markdown files, send encrypted messages. Your identity is a 15-character code.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-[#050505] text-[#ccc] flex flex-col justify-between" suppressHydrationWarning>
        <Navbar />
        <main className="max-w-4xl w-full mx-auto px-6 min-h-[calc(100vh-90px)] flex-1">
          {children}
        </main>
        <footer className="border-t border-[#111] bg-[#050505] mt-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <p className="text-[10px] text-[#333]">© 2026 void. all rights reserved.</p>
            <p className="text-[10px] text-[#333]">
              made by <span className="text-[#555]">sarsRS</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
