'use client';

import { useMemo, useState } from 'react';
import { useApp, getMemoryStore } from '@/store/useApp';
import type { MemoryEntity } from '@/lib/zero-mem/memory-store';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins}m trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h trước`;
  return `${Math.floor(hours / 24)}d trước`;
}

export default function MemoryInspector() {
  const memoryVersion = useApp((s) => s.memoryVersion);
  const updateEntity = useApp((s) => s.updateEntity);
  const deleteEntity = useApp((s) => s.deleteEntity);
  const currentUserId = useApp((s) => s.currentUserId);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Form thêm entity thủ công
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCat, setNewCat] = useState<MemoryEntity['category']>('tech_stack');

  const entities = useMemo(() => {
    void memoryVersion;
    const all = getMemoryStore().getAllEntities();
    if (!query.trim()) return all.sort((a, b) => b.updated_at - a.updated_at);
    const q = query.toLowerCase();
    return all
      .filter((e) => e.name.toLowerCase().includes(q) || e.value.toLowerCase().includes(q) || e.category.includes(q))
      .sort((a, b) => b.updated_at - a.updated_at);
  }, [memoryVersion, query]);

  const stats = useMemo(() => {
    void memoryVersion;
    return getMemoryStore().stats();
  }, [memoryVersion]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) return;
    const cleanName = newName.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanVal = newValue.trim();

    getMemoryStore().upsertEntity({
      name: cleanName,
      value: cleanVal,
      category: newCat,
      confidence: 1.0,
      extractedAt: Date.now(),
    });

    const ns = currentUserId || 'default';
    void fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remember',
        text: `${cleanName}: ${cleanVal}`,
        namespace: ns,
      }),
    });

    setNewName('');
    setNewValue('');
    setShowAdd(false);
    useApp.setState({ memoryVersion: Date.now() });
  };

  const handleSaveEdit = (name: string) => {
    if (!editValue.trim()) return;
    void updateEntity(name, editValue);
    setEditing(null);
    setEditValue('');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1a1a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-white">Entity-Context Knowledge Graph</h2>
            {currentUserId && (
              <span className="text-[10px] font-mono border border-[#222] bg-[#0a0a0a] px-2 py-0.5 text-[#888]">
                ID: {currentUserId}
              </span>
            )}
          </div>
          <p className="text-xs text-[#555] mt-0.5">
            Trí nhớ được lưu trữ & hiệu chỉnh trực tiếp trên RAM và đồng bộ đám mây Firebase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs border border-[#333] px-3 py-1.5 text-[#888] hover:text-white hover:border-[#555] transition cursor-pointer"
          >
            {showAdd ? 'hủy' : '+ thêm thực thể'}
          </button>
        </div>
      </div>

      {/* Form thêm thực thể */}
      {showAdd && (
        <form onSubmit={handleAdd} className="border border-[#1a1a1a] bg-[#080808] p-4 space-y-3">
          <p className="text-xs font-mono text-white">Thêm thực thể mới vào bộ nhớ</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Tên (vd: tech_stack)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-xs"
              required
            />
            <input
              type="text"
              placeholder="Giá trị (vd: Next.js 15)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="text-xs"
              required
            />
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as any)}
              className="text-xs bg-[#0a0a0a] border border-[#222] text-[#888] px-3 py-2"
            >
              <option value="tech_stack">tech_stack</option>
              <option value="profile">profile</option>
              <option value="preference">preference</option>
              <option value="instruction">instruction</option>
              <option value="constraint">constraint</option>
            </select>
          </div>
          <button type="submit" className="primary text-xs px-4 py-2 cursor-pointer">
            Lưu vào RAM
          </button>
        </form>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-[#141414] bg-[#070707] p-3">
          <div className="text-[10px] font-mono text-[#555]">TỔNG THỰC THỂ</div>
          <div className="text-lg font-light text-white font-mono">{stats.entities}</div>
        </div>
        <div className="border border-[#141414] bg-[#070707] p-3">
          <div className="text-[10px] font-mono text-emerald-500">TOKEN TIẾT KIỆM</div>
          <div className="text-lg font-light text-emerald-400 font-mono">~{stats.tokensSavedEstimate}</div>
        </div>
        <div className="border border-[#141414] bg-[#070707] p-3">
          <div className="text-[10px] font-mono text-cyan-500">THAO TÁC 0-TOKEN</div>
          <div className="text-lg font-light text-cyan-400 font-mono">{stats.zeroTokenOps}</div>
        </div>
        <div className="border border-[#141414] bg-[#070707] p-3">
          <div className="text-[10px] font-mono text-[#555]">ĐỌC CLOUD TRONG PHIÊN</div>
          <div className="text-lg font-light text-white font-mono">{stats.readsPerformed} (1-read)</div>
        </div>
      </div>

      {/* Search Input */}
      <div>
        <input
          type="text"
          placeholder="tìm kiếm thực thể trong bộ nhớ..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="text-xs w-full"
        />
      </div>

      {/* Entities Table */}
      <div className="border border-[#1a1a1a]">
        {entities.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#555]">
            Chưa có thực thể nào trong bộ nhớ. Hãy dùng tab <strong>02 / benchmark tester</strong> hoặc bấm nút <strong>+ thêm thực thể</strong> ở trên!
          </div>
        ) : (
          <div className="divide-y divide-[#141414]">
            {entities.map((e) => (
              <div key={e.name} className="p-3.5 hover:bg-[#080808] transition flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-white">{e.name}</span>
                    <span className="text-[10px] font-mono text-[#555] border border-[#1a1a1a] px-1.5 py-0.5">
                      {e.category}
                    </span>
                  </div>

                  {editing === e.name ? (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(ev) => setEditValue(ev.target.value)}
                        className="text-xs flex-1 py-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(e.name)}
                        className="text-xs bg-white text-black px-3 py-1 font-medium"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-xs border border-[#333] px-3 py-1 text-[#888]"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#aaa] font-mono break-all">{e.value}</p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-[10px] text-[#444] font-mono hidden sm:inline">
                    {timeAgo(e.updated_at)}
                  </span>
                  {editing !== e.name && (
                    <button
                      onClick={() => {
                        setEditing(e.name);
                        setEditValue(e.value);
                      }}
                      className="text-[11px] text-[#666] hover:text-white transition"
                    >
                      sửa
                    </button>
                  )}
                  <button
                    onClick={() => void deleteEntity(e.name)}
                    className="text-[11px] text-[#aa3333] hover:text-[#ff5555] transition"
                  >
                    xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
