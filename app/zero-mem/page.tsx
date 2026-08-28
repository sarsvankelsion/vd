'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/useApp';
import MemoryInspector from '@/components/MemoryInspector';
import MemoryTester from '@/components/MemoryTester';
import McpGuide from '@/components/McpGuide';
import SettingsPanel from '@/components/SettingsPanel';

type Tab = 'memory' | 'tester' | 'mcp' | 'settings';

function ZeroMemContent() {
  const phase = useApp((s) => s.phase);
  const boot = useApp((s) => s.boot);
  const [tab, setTab] = useState<Tab>('memory');

  useEffect(() => {
    void boot();
  }, [boot]);

  if (phase === 'boot') {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#555]">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <span>INITIALIZING ZERO-MEM...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      {/* Subnav for Zero-Mem Modules */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            onClick={() => setTab('memory')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'memory' ? 'bg-[#111] text-white border-b-2 border-white' : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            01 / memory
          </button>
          <button
            onClick={() => setTab('tester')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'tester' ? 'bg-[#111] text-white border-b-2 border-white' : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            02 / tester
          </button>
          <button
            onClick={() => setTab('mcp')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'mcp' ? 'bg-[#111] text-white border-b-2 border-white' : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            03 / universal
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'settings' ? 'bg-[#111] text-white border-b-2 border-white' : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            04 / sync
          </button>
        </div>

        <span className="text-[10px] text-[#444] font-mono hidden sm:inline">
          1-read ram-first engine
        </span>
      </div>

      {/* Main Tab Panels */}
      {tab === 'memory' && <MemoryInspector />}
      {tab === 'tester' && <MemoryTester />}
      {tab === 'mcp' && <McpGuide />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}

export default function ZeroMemPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="py-24 text-xs text-[#555] text-center" suppressHydrationWarning>loading...</div>;
  }

  return <ZeroMemContent />;
}
