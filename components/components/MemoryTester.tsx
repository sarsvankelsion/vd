'use client';

import { useState } from 'react';
import { useApp, getMemoryStore } from '@/store/useApp';
import { extractor } from '@/lib/zero-mem/extractor';
import { syncManager } from '@/lib/zero-mem/sync-manager';

export default function MemoryTester() {
  const user = useApp((s) => s.user);

  // Remember Tester
  const [rememberText, setRememberText] = useState('');
  const [rememberResult, setRememberResult] = useState<any>(null);

  // Recall Tester
  const [recallQuery, setRecallQuery] = useState('');
  const [recallResult, setRecallResult] = useState<any>(null);

  const sampleRememberPrompts = [
    'Dự án này mình dùng Next.js 15, Tailwind CSS và Firebase',
    'Tên tôi là Nam, tôi là kỹ sư phần mềm sống tại Hà Nội',
    'Hôm nay tôi đổi sang dùng Vue 3 và Supabase rồi',
    'Luôn trả lời ngắn gọn bằng tiếng Việt',
  ];

  const sampleRecallQueries = [
    'stack của tôi',
    'tên tôi là gì',
    'framework hiện tại',
    'chỉ thị trả lời',
  ];

  const handleRemember = () => {
    if (!rememberText.trim()) return;
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

    // 3. Sync ngầm xuống Firestore
    if (store.isDirty()) {
      syncManager.queueSnapshot(store.exportSnapshot());
      store.clearDirty();
    }

    setRememberResult({
      extractedCount: entities.length,
      entities,
      changes,
      timestamp: now,
    });
    setRememberText('');
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
        <p className="text-xs text-[#555] mb-1 uppercase tracking-[0.2em]">02 / ENGINE TESTER</p>
        <h2 className="text-lg font-medium tracking-tight text-white">Kiểm tra 0-Token trực tiếp</h2>
        <p className="text-xs text-[#666] mt-0.5">
          Mô phỏng 2 tool mà các AI Agent (OpenCode, Cursor, Claude) sẽ gọi qua MCP Server: <code className="text-[#aaa]">zm_remember</code> và <code className="text-[#aaa]">zm_recall</code>.
        </p>
      </div>

      <div className="space-y-px">
        {/* Box 1: zm_remember */}
        <div className="border border-[#1a1a1a] p-5 bg-[#050505]">
          <p className="text-xs text-[#555] mb-1 font-mono">01 / ZM_REMEMBER</p>
          <h3 className="text-sm font-medium text-[#ccc] mb-2">Ghi nhớ thực thể vào RAM (0 Token)</h3>
          
          <textarea
            value={rememberText}
            onChange={(e) => setRememberText(e.target.value)}
            placeholder="Nhập câu chứa thông tin cần nhớ (ví dụ: Tôi đang dùng Next.js 15, chuyển sang Tailwind...)"
            className="w-full h-20 border border-[#1a1a1a] bg-[#0a0a0a] p-3 text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#333] transition resize-none font-mono"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 text-[10px]">
              <span className="text-[#444] py-0.5">Mẫu thử:</span>
              {sampleRememberPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setRememberText(p)}
                  className="border border-[#1a1a1a] px-2 py-0.5 text-[#666] hover:text-[#aaa] hover:border-[#333] transition"
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={handleRemember}
              disabled={!rememberText.trim()}
              className="bg-white text-black text-xs font-medium px-4 py-1.5 hover:opacity-90 transition disabled:opacity-30"
            >
              Ghi nhớ (0 Token)
            </button>
          </div>

          {rememberResult && (
            <div className="mt-4 border-t border-[#1a1a1a] pt-3 text-xs space-y-1">
              <p className="text-[11px] text-[#888] font-mono">
                Đã xử lý {rememberResult.extractedCount} thực thể:
              </p>
              {rememberResult.changes.length > 0 ? (
                rememberResult.changes.map((c: string, idx: number) => (
                  <p key={idx} className="text-[11px] text-[#ccc] font-mono pl-2 border-l border-[#333]">
                    {c}
                  </p>
                ))
              ) : (
                <p className="text-[11px] text-[#555] font-mono">Không nhận diện thấy thực thể mới.</p>
              )}
            </div>
          )}
        </div>

        {/* Box 2: zm_recall */}
        <div className="border border-[#1a1a1a] border-t-0 p-5 bg-[#050505]">
          <p className="text-xs text-[#555] mb-1 font-mono">02 / ZM_RECALL</p>
          <h3 className="text-sm font-medium text-[#ccc] mb-2">Truy xuất ngữ cảnh liên quan từ RAM</h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={recallQuery}
              onChange={(e) => setRecallQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRecall()}
              placeholder="Nhập từ khóa truy xuất (vd: stack, framework, tên tôi, dự án...)"
              className="flex-1 border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#333] font-mono"
            />
            <button
              onClick={handleRecall}
              disabled={!recallQuery.trim()}
              className="border border-[#333] text-xs px-4 py-2 text-[#888] hover:text-white hover:border-[#555] transition disabled:opacity-30 whitespace-nowrap"
            >
              Truy xuất {"(< 1ms)"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
            <span className="text-[#444] py-0.5">Mẫu thử:</span>
            {sampleRecallQueries.map((q) => (
              <button
                key={q}
                onClick={() => setRecallQuery(q)}
                className="border border-[#1a1a1a] px-2 py-0.5 text-[#666] hover:text-[#aaa] hover:border-[#333] transition"
              >
                {q}
              </button>
            ))}
          </div>

          {recallResult && (
            <div className="mt-4 border-t border-[#1a1a1a] pt-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-[#888] font-mono">
                <span>Tìm thấy {recallResult.relevant.length} kết quả cho "{recallResult.query}":</span>
                <span>{recallResult.latency}ms</span>
              </div>
              {recallResult.relevant.length > 0 ? (
                recallResult.relevant.map((r: any) => (
                  <div key={r.name} className="flex justify-between items-center text-[11px] font-mono border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-1.5">
                    <span className="text-[#888]">{r.name}</span>
                    <span className="text-white font-medium">{r.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-[#555] font-mono">Không có thực thể nào khớp.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
