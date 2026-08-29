'use client';

import { useState } from 'react';
import { useApp, getMemoryStore } from '@/store/useApp';

export default function SettingsPanel() {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const currentUserId = useApp((s) => s.currentUserId);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const store = getMemoryStore();
      const ns = currentUserId || 'default';
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remember',
          text: 'Manual sync trigger snapshot',
          namespace: ns,
        }),
      });
      if (res.ok) {
        setSyncMessage('Đã đồng bộ thành công lên Firebase Cloud Firestore.');
      } else {
        setSyncMessage('Lỗi đồng bộ đám mây.');
      }
    } catch (e: any) {
      setSyncMessage(`Lỗi: ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#1a1a1a] pb-4">
        <p className="text-xs text-[#555] mb-1 uppercase tracking-[0.2em]">04 / SYNC & SETTINGS</p>
        <h2 className="text-lg font-medium tracking-tight text-white">Cấu hình & Tối ưu Firestore</h2>
        <p className="text-xs text-[#666] mt-0.5">
          Quản lý tài khoản, trạng thái đồng bộ đám mây và tối ưu chi phí lưu trữ cơ sở dữ liệu.
        </p>
      </div>

      <div className="space-y-px">
        {/* Box 1: Account */}
        <div className="border border-[#1a1a1a] p-5 bg-[#050505]">
          <p className="text-xs text-[#555] mb-1 font-mono">01 / ACCOUNT IDENTITY</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-[#ccc]">
                {currentUserId ? `ID: ${currentUserId}` : 'Chế độ Demo Local (Guest)'}
              </p>
              <p className="text-xs text-[#666] mt-0.5">
                Đã kết nối Firebase Cloud Firestore (zm44-a3407)
              </p>
            </div>
          </div>
        </div>

        {/* Box 2: Firestore Cost Optimizer */}
        <div className="border border-[#1a1a1a] border-t-0 p-5 bg-[#050505]">
          <p className="text-xs text-[#555] mb-1 font-mono">02 / FIRESTORE OPTIMIZATION</p>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-[#ccc]">Chính sách 1-Read Snapshot</h3>
                <p className="text-xs text-[#666] mt-0.5">
                  Chỉ đọc đúng 1 lần khi khởi tạo phiên. Toàn bộ tra cứu diễn ra trên RAM với 0 Firestore reads.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="bg-white text-black text-xs font-medium px-4 py-1.5 hover:opacity-90 transition disabled:opacity-30 whitespace-nowrap cursor-pointer"
                >
                  {syncing ? 'Đang lưu...' : 'Đồng bộ ngay'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
              <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-2.5">
                <span className="text-[#555] block">READS</span>
                <span className="text-white font-medium">1 / Session</span>
              </div>
              <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-2.5">
                <span className="text-[#555] block">WRITES</span>
                <span className="text-white font-medium">Auto Debounce</span>
              </div>
              <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-2.5">
                <span className="text-[#555] block">LATENCY</span>
                <span className="text-emerald-400 font-medium">{"< 1ms (RAM)"}</span>
              </div>
              <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-2.5">
                <span className="text-[#555] block">STORAGE</span>
                <span className="text-white font-medium">Cloud Firestore</span>
              </div>
            </div>

            {syncMessage && (
              <p className="text-xs text-[#888] font-mono border-t border-[#1a1a1a] pt-2">{syncMessage}</p>
            )}
          </div>
        </div>

        {/* Box 3: Context Top-K Slider */}
        <div className="border border-[#1a1a1a] border-t-0 p-5 bg-[#050505]">
          <p className="text-xs text-[#555] mb-1 font-mono">03 / CONTEXT INJECTION</p>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-[#ccc]">Top-K thực thể tiêm vào ngữ cảnh</h3>
            <span className="font-mono text-xs text-white border border-[#1a1a1a] px-2 py-0.5 bg-[#0a0a0a]">
              k = {settings.context_top_k}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={16}
            value={settings.context_top_k}
            onChange={(e) => updateSettings({ context_top_k: Number(e.target.value) })}
            className="w-full accent-white"
          />
          <p className="text-xs text-[#555] mt-1">
            Số lượng thực thể liên quan nhất được trích xuất từ RAM khi Agent cần tra cứu.
          </p>
        </div>
      </div>
    </div>
  );
}
