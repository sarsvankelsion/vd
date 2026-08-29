'use client';

import { useState } from 'react';
import { useApp, getMemoryStore } from '@/store/useApp';
import { extractor } from '@/lib/zero-mem/extractor';

export default function MemoryTester() {
  const currentUserId = useApp((s) => s.currentUserId);

  // Remember Tester
  const [rememberText, setRememberText] = useState('');
  const [rememberResult, setRememberResult] = useState<any>(null);
  const [remembering, setRemembering] = useState(false);

  // Recall Tester
  const [recallQuery, setRecallQuery] = useState('');
  const [recallResult, setRecallResult] = useState<any>(null);

  const sampleRememberPrompts = [
    'Dự án này mình dùng Next.js 15, Tailwind CSS và Firebase',
    'Tên tôi là Vương, tôi là kỹ sư phần mềm sáng lập Zero-Mem',
    'Hôm nay tôi đổi sang dùng Vue 3 và Supabase rồi',
    'Luôn trả lời ngắn gọn, súc tích và chuẩn xác',
  ];

  const sampleRecallQueries = [
    'stack của tôi',
    'tên tôi là gì',
    'framework hiện tại',
    'chỉ thị trả lời',
  ];

  const handleRemember = async () => {
    if (!rememberText.trim() || remembering) return;
    setRemembering(true);
    const now = Date.now();
    const store = getMemoryStore();

    // 1. Zero-Token Entity Extraction
    const { entities, sessionKeywords } = extractor.extract(rememberText, `manual_${now}`, now);

    // 2. Deterministic Calibration trên RAM
    const changes: string[] = [];
    for (const ent of entities) {
      const before = store.getEntity(ent.name);
      const committed = store.upsertEntity(ent);
      if (committed) {
        changes.push(
          before
            ? `ghi đè [${ent.name}]: "${before.value}" -> "${committed.value}"`
            : `lưu mới [${ent.name}] = "${committed.value}"`
        );
      }
    }
    store.logSession('tester-session', sessionKeywords, now);

    // 3. Sync to Cloud Firestore
    const ns = currentUserId || 'default';
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remember',
          text: rememberText,
          namespace: ns,
        }),
      });
    } catch {
      // ignore
    }

    setRememberResult({
      extractedCount: entities.length,
      entities,
      changes,
      timestamp: now,
    });
    setRememberText('');
    setRemembering(false);
    useApp.setState({ memoryVersion: Date.now() });
  };

  const handleRecall = () => {
    if (!recallQuery.trim()) return;
    const store = getMemoryStore();
    const startTime = performance.now();
    const relevant = store.searchRelevant(recallQuery, 6);
    const latency = (performance.now() - startTime).toFixed(2);

    setRecallResult({
      query: recallQuery,
      relevant,
      latency,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#1a1a1a] pb-4">
        <h2 className="text-sm font-medium text-white">Interactive AI Memory Benchmark</h2>
        <p className="text-xs text-[#555] mt-0.5">
          Kiểm thử trực tiếp cơ chế trích xuất thực thể 0-token và truy hồi tri thức với độ trễ dưới 1ms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Remember Tester */}
        <div className="border border-[#1a1a1a] bg-[#070707] p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                01 / Trích xuất &amp; Ghi nhớ (0-Token)
              </span>
              <span className="text-[10px] font-mono text-[#555]">Chi phí: 0 Token</span>
            </div>
            <p className="text-xs text-[#777] mt-1">
              Nhập câu mô tả bất kỳ. Hệ thống NLP trong RAM sẽ tự động trích xuất profile, tech stack...
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={rememberText}
              onChange={(e) => setRememberText(e.target.value)}
              placeholder="Nhập thông tin (vd: Dự án này mình dùng Next.js 15 và Supabase)..."
              className="text-xs w-full resize-none font-mono"
            />

            {/* Mẫu gợi ý */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-[#444] font-mono self-center">Mẫu:</span>
              {sampleRememberPrompts.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setRememberText(s)}
                  className="text-[10px] border border-[#222] bg-[#0a0a0a] px-2 py-0.5 text-[#888] hover:text-white hover:border-[#444] transition cursor-pointer"
                >
                  {s.slice(0, 24)}...
                </button>
              ))}
            </div>

            <button
              onClick={handleRemember}
              disabled={remembering || !rememberText.trim()}
              className="primary text-xs px-4 py-2 w-full cursor-pointer mt-2"
            >
              {remembering ? 'Đang phân tích...' : 'Trích xuất & Lưu vào RAM (0 Token)'}
            </button>
          </div>

          {/* Kết quả Remember */}
          {rememberResult && (
            <div className="border border-[#141414] bg-[#050505] p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-400">
                  Trích xuất thành công {rememberResult.extractedCount} thực thể:
                </span>
                <span className="text-[#555]">
                  {new Date(rememberResult.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="space-y-1">
                {rememberResult.changes.map((c: string, idx: number) => (
                  <div key={idx} className="text-[#aaa] text-[11px]">
                    &bull; {c}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Module 2: Recall Tester */}
        <div className="border border-[#1a1a1a] bg-[#070707] p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                02 / Truy hồi Trí nhớ (Sub-millisecond)
              </span>
              <span className="text-[10px] font-mono text-[#555]">Độ trễ: &lt;1ms</span>
            </div>
            <p className="text-xs text-[#777] mt-1">
              Nhập từ khóa hoặc câu hỏi cần AI ghi nhớ về bạn.
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={recallQuery}
              onChange={(e) => setRecallQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRecall()}
              placeholder="Nhập câu truy vấn (vd: stack của tôi, tên tôi là gì)..."
              className="text-xs w-full font-mono"
            />

            {/* Mẫu gợi ý */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-[#444] font-mono self-center">Mẫu:</span>
              {sampleRecallQueries.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setRecallQuery(s)}
                  className="text-[10px] border border-[#222] bg-[#0a0a0a] px-2 py-0.5 text-[#888] hover:text-white hover:border-[#444] transition cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={handleRecall}
              disabled={!recallQuery.trim()}
              className="border border-[#333] hover:border-[#666] text-xs px-4 py-2 w-full text-white bg-[#0a0a0a] hover:bg-[#111] transition cursor-pointer mt-2"
            >
              Truy hồi ngữ cảnh ngay (&lt;1ms)
            </button>
          </div>

          {/* Kết quả Recall */}
          {recallResult && (
            <div className="border border-[#141414] bg-[#050505] p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-cyan-400">
                  Tìm thấy {recallResult.relevant.length} thực thể liên quan:
                </span>
                <span className="text-[#555]">{recallResult.latency} ms</span>
              </div>

              {recallResult.relevant.length === 0 ? (
                <p className="text-[#555] text-[11px]">Không tìm thấy thực thể phù hợp.</p>
              ) : (
                <div className="space-y-1.5">
                  {recallResult.relevant.map((r: any, idx: number) => (
                    <div key={idx} className="bg-[#090909] p-2 border border-[#141414] flex justify-between">
                      <div>
                        <span className="text-white font-medium">{r.name}: </span>
                        <span className="text-[#aaa]">{r.value}</span>
                      </div>
                      <span className="text-[10px] text-[#555]">{r.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
