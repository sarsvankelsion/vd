import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'VOID x ZERO-MEM',
  description: 'Anonymous Markdown Forum & Zero-Token Memory Engine for AI Agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                      if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                        mutation.target.removeAttribute('bis_skin_checked');
                      }
                    }
                  });
                  observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['bis_skin_checked'] });

                  const _err = console.error;
                  console.error = function(...args) {
                    if (typeof args[0] === 'string' && (args[0].includes('bis_skin_checked') || args[0].includes('hydration-mismatch'))) {
                      return;
                    }
                    _err.apply(console, args);
                  };
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#050505] text-[#ccc] flex flex-col justify-between" suppressHydrationWarning>
        <Navbar />
        <main className="max-w-4xl w-full mx-auto px-6 min-h-[calc(100vh-90px)] flex-1">
          {children}
        </main>
        <footer className="border-t border-[#111] bg-[#050505] mt-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <p className="text-[10px] text-[#333]">© 2026 void x zero-mem. all rights reserved.</p>
            <p className="text-[10px] text-[#333]">
              ram-first <span className="text-[#555]">zero-token ecosystem</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
