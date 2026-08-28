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
    getMemoryStore().upsertEntity({
      name: newName.trim().toLowerCase().replace(/\s+/g, '_'),
      value: newValue.trim(),
      category: newCat,
      confidence: 1.0,
      extractedAt: Date.now(),
    });
    setNewName('');
    setNewValue('');
    setShowAdd(false);
    useApp.setState({ memoryVersion: Date.now() });
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Meta */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1a1a1a] pb-4">
        <div>
          <p className="text-xs text-[#555] mb-1 uppercase tracking-[0.2em]">01 / MEMORY GRAPH</p>
          <h2 className="text-lg font-medium tracking-tight text-white">Đồ thị thực thể (RAM-First)</h2>
          <p className="text-xs text-[#666] mt-0.5">
            Toàn bộ trí nhớ dài hạn được lưu giữ trong RAM client · Đọc đúng 1 lần từ Firestore khi mở web.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#666]">
          <span className="border border-[#1a1a1a] px-2.5 py-1 bg-[#0a0a0a]">
            {stats.entities} entities
          </span>
          <span className="border border-[#1a1a1a] px-2.5 py-1 bg-[#0a0a0a] text-[#888]">
            {stats.readsPerformed} read / session
          </span>
          <span className="border border-[#1a1a1a] px-2.5 py-1 bg-[#0a0a0a] text-emerald-400">
            0 token management
          </span>
        </div>
      </div>

      {/* Toolbar: Search + Add */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm thực thể theo tên, giá trị, danh mục..."
          className="flex-1 border border-[#1a1a1a] bg-[#050505] px-3.5 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none transition-colors focus:border-[#333]"
        />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="border border-[#333] px-3.5 py-2 text-xs text-[#888] hover:border-[#666] hover:text-white transition-all whitespace-nowrap"
        >
          {showAdd ? 'Đóng' : '+ Thêm thủ công'}
        </button>
      </div>

      {/* Form thêm mới */}
      {showAdd && (
        <form onSubmit={handleAdd} className="border border-[#1a1a1a] bg-[#080808] p-4 space-y-3">
          <p className="text-xs text-white font-medium">Thêm thực thể mới vào RAM</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên thực thể (vd: tech_stack)"
              className="border border-[#1a1a1a] bg-[#050505] px-3 py-1.5 text-xs text-[#ccc] outline-none focus:border-[#444]"
            />
            <input
              type="text"
              required
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Giá trị (vd: Next.js 15, Tailwind)"
              className="border border-[#1a1a1a] bg-[#050505] px-3 py-1.5 text-xs text-[#ccc] outline-none focus:border-[#444]"
            />
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as any)}
              className="border border-[#1a1a1a] bg-[#050505] px-3 py-1.5 text-xs text-[#888] outline-none focus:border-[#444]"
            >
              <option value="tech_stack">tech_stack</option>
              <option value="profile">profile</option>
              <option value="preference">preference</option>
              <option value="project">project</option>
              <option value="instruction">instruction</option>
              <option value="fact">fact</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1 text-xs text-[#555] hover:text-[#888]"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-white px-4 py-1 text-xs font-medium text-black hover:opacity-90"
            >
              Lưu vào RAM
            </button>
          </div>
        </form>
      )}

      {/* Entity List (Minimalist Cards / Table) */}
      <div className="space-y-px">
        {entities.length === 0 ? (
          <div className="border border-[#1a1a1a] p-8 text-center">
            <p className="text-xs text-[#555]">
              {query ? `Không tìm thấy thực thể nào khớp với "${query}"` : 'Bộ nhớ hiện đang trống. Hãy thêm thực thể hoặc chạy kiểm thử bên tab Tester.'}
            </p>
          </div>
        ) : (
          entities.map((ent, idx) => (
            <div
              key={ent.name}
              className={`border border-[#1a1a1a] p-4 transition-colors hover:border-[#262626] bg-[#050505] ${
                idx > 0 ? 'border-t-0' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-[#444]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-white">{ent.name}</span>
                      <span className="text-[10px] text-[#555] font-mono border border-[#1a1a1a] px-1.5 py-0.2">
                        [{ent.category}]
                      </span>
                    </div>
                    {editing === ent.name ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="border border-[#333] bg-[#0a0a0a] px-2 py-1 text-xs text-[#ccc] outline-none"
                        />
                        <button
                          onClick={() => {
                            updateEntity(ent.name, editValue);
                            setEditing(null);
                          }}
                          className="bg-white px-2.5 py-1 text-[11px] text-black font-medium"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-[11px] text-[#555] hover:text-[#888] px-1"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-[#999] leading-relaxed break-words">{ent.value}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center text-[11px]">
                  <span className="text-[#444] text-[10px] font-mono">{timeAgo(ent.updated_at)}</span>
                  {editing !== ent.name && (
                    <>
                      <button
                        onClick={() => {
                          setEditing(ent.name);
                          setEditValue(ent.value);
                        }}
                        className="text-[#666] hover:text-[#ccc] transition-colors"
                      >
                        sửa
                      </button>
                      <button
                        onClick={() => deleteEntity(ent.name)}
                        className="text-[#555] hover:text-red-400 transition-colors"
                      >
                        xóa
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
