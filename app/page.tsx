'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/useApp';
import MemoryInspector from '@/components/MemoryInspector';
import MemoryTester from '@/components/MemoryTester';
import McpGuide from '@/components/McpGuide';
import SettingsPanel from '@/components/SettingsPanel';

type Tab = 'memory' | 'tester' | 'mcp' | 'settings';

function AppContent() {
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
          <span>INITIALIZING ZERO-MEM ENGINE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      {/* Header: Clear Explanation of the AI Memory Architecture */}
      <div className="border-b border-[#1a1a1a] pb-6 space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-[#1a1a1a] bg-[#0a0a0a] text-[11px] font-mono text-[#888]">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span>AI LONG-TERM MEMORY ENGINE // ZERO-TOKEN ARCHITECTURE</span>
        </div>

        <h1 className="text-xl font-light text-white sm:text-2xl">
          Zero-Mem: Client-Side Persistent Memory for AI Agents
        </h1>

        <p className="text-xs text-[#777] leading-relaxed max-w-2xl">
          A deterministic RAM memory engine designed for AI Chatbots, Agents, and LLM applications. Automatically
          extracts and recalls user profile, tech stack, and instructions on the client side with{' '}
          <span className="text-white font-medium">0 Prompt Token overhead</span> and{' '}
          <span className="text-white font-medium">&lt;1ms latency</span>.
        </p>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="border border-[#141414] bg-[#070707] p-3 space-y-1">
            <div className="text-[10px] font-mono text-emerald-400">01 / ZERO-TOKEN COST</div>
            <p className="text-[11px] text-[#888]">
              NLP entity parser extracts facts in RAM without burning LLM context tokens.
            </p>
          </div>
          <div className="border border-[#141414] bg-[#070707] p-3 space-y-1">
            <div className="text-[10px] font-mono text-cyan-400">02 / 1-READ FIREBASE SYNC</div>
            <p className="text-[11px] text-[#888]">
              Loads once on app launch. Offline-first in IndexedDB with lazy background cloud snapshot.
            </p>
          </div>
          <div className="border border-[#141414] bg-[#070707] p-3 space-y-1">
            <div className="text-[10px] font-mono text-purple-400">03 / UNIVERSAL & MCP API</div>
            <p className="text-[11px] text-[#888]">
              Connects instantly with Claude Desktop, Cursor, OpenCode, Python, and cURL.
            </p>
          </div>
        </div>
      </div>

      {/* Subnav for Zero-Mem Modules */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
        <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
          <button
            onClick={() => setTab('memory')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'memory'
                ? 'bg-[#111] text-white border-b-2 border-white font-medium'
                : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            01 / memory graph
          </button>
          <button
            onClick={() => setTab('tester')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'tester'
                ? 'bg-[#111] text-white border-b-2 border-white font-medium'
                : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            02 / benchmark tester
          </button>
          <button
            onClick={() => setTab('mcp')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'mcp'
                ? 'bg-[#111] text-white border-b-2 border-white font-medium'
                : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            03 / universal api & mcp
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              tab === 'settings'
                ? 'bg-[#111] text-white border-b-2 border-white font-medium'
                : 'text-[#666] hover:text-[#aaa]'
            }`}
          >
            04 / cloud sync
          </button>
        </div>

        <span className="text-[10px] text-[#444] font-mono hidden sm:inline">
          1-read ram-first engine
        </span>
      </div>

      {/* Main Tab Panels */}
      <div>
        {tab === 'memory' && <MemoryInspector />}
        {tab === 'tester' && <MemoryTester />}
        {tab === 'mcp' && <McpGuide />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="py-24 text-xs text-[#555] text-center" suppressHydrationWarning>
        loading...
      </div>
    );
  }

  return <AppContent />;
}
