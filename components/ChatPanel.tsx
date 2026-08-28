'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp, getMemoryStore } from '@/store/useApp';
import { extractor } from '@/lib/zero-mem/extractor';
import type { ExtractedEntity } from '@/lib/zero-mem/extractor';
import { SendHorizonal, SquarePlus, Gauge, Database, User, Sparkles } from 'lucide-react';

/** Render markdown mini: **bold**, `code`, ```code block```. */
function MiniMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{inline(text.slice(last, m.index))}</span>);
    parts.push(
      <pre key={key++} className="my-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/50 p-3">
        <code>{m[2]}</code>
      </pre>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{inline(text.slice(last))}</span>);
  return <div className="text-sm leading-relaxed">{parts}</div>;
}

function inline(s: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else
      nodes.push(
        <code key={k++} className="rounded bg-black/40 px-1 py-0.5 text-[0.85em] text-cyan-300">
          {tok.slice(1, -1)}
        </code>,
      );
    last = m.index + m[0].length;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return nodes;
}

export default function ChatPanel() {
  const { messages, input, setInput, send, sending, error, newSession, user, lastTokenEstimate, lastSyncInfo } =
    useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveExtract, setLiveExtract] = useState<ExtractedEntity[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, sending]);

  // Zero-token live extraction preview (chạy ngay khi user gõ, thuần RAM)
  useEffect(() => {
    if (!input.trim()) {
      setLiveExtract([]);
      return;
    }
    const { entities } = extractor.extract(input);
    setLiveExtract(entities);
  }, [input]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Sync & token HUD */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1">
          <Gauge className="h-3 w-3 text-cyan-400" />
          {lastTokenEstimate
            ? `~${lastTokenEstimate.system + lastTokenEstimate.context} token context`
            : 'chưa gọi LLM'}
        </span>
        <span className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1">
          <Database className="h-3 w-3 text-emerald-400" />
          {lastSyncInfo ? `${lastSyncInfo.reads} read · ${lastSyncInfo.writes} write` : '0 read / phiên'}
        </span>
        {user ? (
          <span className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1">
            <User className="h-3 w-3 text-violet-400" />
            {user.email ?? user.uid}
          </span>
        ) : (
          <span className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-2 py-1 text-amber-300">
            demo local (chưa kết nối Firebase)
          </span>
        )}
      </div>

      {/* Message stream */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-zinc-600">
            <Sparkles className="h-8 w-8" />
            <p className="text-sm">Hãy cho agent biết về bạn — mọi thông tin được ghi nhớ 0 token.</p>
            <p className="max-w-md text-center text-xs leading-relaxed text-zinc-500">
              Đây là <span className="text-zinc-300">Playground</span> để thử nghiệm engine trực tiếp. Agent thật
              (opencode / Claude Code) nối qua MCP server <code className="rounded bg-black/40 px-1">zm_remember / zm_recall</code> —
              xem SETUP_GUIDE.md phần 9.
            </p>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">Thử ngay kịch bản kiểm thử (bấm để điền):</p>
              <div className="flex flex-wrap justify-center gap-2">
                {TEST_PROMPTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setInput(t)}
                    className="rounded-full border border-[var(--border)] bg-black/20 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-violet-600 hover:text-violet-200"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`msg-fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user' ? 'bg-violet-600 text-white' : 'border border-[var(--border)] bg-black/30'
              }`}
            >
              {msg.role === 'assistant' ? <MiniMarkdown text={msg.content} /> : <p className="text-sm">{msg.content}</p>}
              {msg.extracted_entities && msg.extracted_entities.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.extracted_entities.map((name) => {
                    const ent = getMemoryStore().getEntity(name);
                    return (
                      <span
                        key={name}
                        className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] text-emerald-300"
                        title={`Đã ghi nhớ: ${name}`}
                      >
                        🧠 {name}
                        {ent ? ` = ${truncate(ent.value, 40)}` : ''}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-black/30 px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" />
            </div>
          </div>
        )}
      </div>

      {/* Live extraction preview */}
      {liveExtract.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <span>Phát hiện (0 token):</span>
          {liveExtract.map((e) => (
            <span
              key={e.name}
              className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-emerald-300"
            >
              {e.name} = {truncate(e.value, 30)}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {/* Composer */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <button
          type="button"
          onClick={newSession}
          title="Phiên mới"
          className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2.5 text-zinc-400 transition hover:text-zinc-100"
        >
          <SquarePlus className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 focus-within:border-violet-600">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tin nhắn… (thông tin về bạn sẽ được ghi nhớ miễn phí token)"
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-2xl bg-violet-600 p-3 text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** 3 câu test theo Verification Plan — bấm để điền nhanh */
const TEST_PROMPTS = [
  'Tôi đang dùng React 18',
  'Hôm nay tôi đổi sang dùng Next.js 15 rồi',
  'Viết code component cho stack của tôi',
];
