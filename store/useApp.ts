/**
 * App Store (Zustand) — điều phối toàn bộ luồng RAM-First:
 * User Prompt -> Extract (0 token) -> Calibrate trên RAM -> Inject Context
 * -> Gemini (1 call) -> Optimistic UI -> Debounced Sync.
 */

'use client';

import { create } from 'zustand';
import type { ChatMessage, SessionInfo, UserSettings } from '@/types/chat';
import { DEFAULT_SETTINGS, newId } from '@/types/chat';
import { extractor, ensureNlp } from '@/lib/zero-mem/extractor';
import { ZeroMemStore } from '@/lib/zero-mem/memory-store';
import { syncManager } from '@/lib/zero-mem/sync-manager';
import { buildSystemPrompt, callGemini, estimateTokens } from '@/lib/ai/gemini';
import { getFirebaseApp, isFirebaseConfigured } from '@/lib/firebase/config';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';

export type AppPhase = 'boot' | 'auth' | 'ready';

interface AppState {
  phase: AppPhase;
  user: User | null;
  authError: string | null;
  authBusy: boolean;

  sessionId: string;
  messages: ChatMessage[];
  sessions: SessionInfo[];
  input: string;
  sending: boolean;
  error: string | null;

  lastTokenEstimate: { system: number; context: number; user: number } | null;
  lastSyncInfo: { reads: number; writes: number } | null;
  memoryVersion: number;
  settings: UserSettings;

  boot: () => Promise<void>;
  loginGoogle: () => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setInput: (v: string) => void;
  send: () => Promise<void>;
  newSession: () => void;
  selectSession: (id: string) => void;
  updateEntity: (name: string, value: string) => void;
  deleteEntity: (name: string) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
}

/** Zero-Mem store sống ngoài Zustand (plain class, sống trong RAM). */
const mem = new ZeroMemStore();

/** Lấy store RAM (dùng cho Memory Inspector đọc trực tiếp). */
export function getMemoryStore(): ZeroMemStore {
  return mem;
}

export const useApp = create<AppState>((set, get) => ({
  phase: 'boot',
  user: null,
  authError: null,
  authBusy: false,

  sessionId: newId('sess'),
  messages: [],
  sessions: [],
  input: '',
  sending: false,
  error: null,

  lastTokenEstimate: null,
  lastSyncInfo: null,
  memoryVersion: 0,
  settings: DEFAULT_SETTINGS,

  /* ---------------- Boot & Hydration (1 Read) ---------------- */

  boot: async () => {
    await ensureNlp();
    if (!isFirebaseConfigured()) {
      mem.hydrate(null);
      set({ phase: 'ready' });
      return;
    }
    const app = getFirebaseApp();
    const auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        syncManager.attach(app, user.uid);
        const { snapshot } = await syncManager.hydrate();
        mem.hydrate(snapshot);
        set({ user, phase: 'ready', memoryVersion: Date.now() });
      } else {
        syncManager.detach();
        set({ user: null, phase: 'auth' });
      }
    });
  },

  /* ---------------- Auth actions ---------------- */

  loginGoogle: async () => {
    set({ authBusy: true, authError: null });
    try {
      await signInWithPopup(getAuth(getFirebaseApp()), new GoogleAuthProvider());
      set({ authBusy: false });
    } catch (e) {
      set({ authBusy: false, authError: (e as Error).message });
    }
  },

  loginEmail: async (email, password) => {
    set({ authBusy: true, authError: null });
    try {
      await signInWithEmailAndPassword(getAuth(getFirebaseApp()), email, password);
      set({ authBusy: false });
    } catch (e) {
      set({ authBusy: false, authError: (e as Error).message });
    }
  },

  registerEmail: async (email, password) => {
    set({ authBusy: true, authError: null });
    try {
      await createUserWithEmailAndPassword(getAuth(getFirebaseApp()), email, password);
      set({ authBusy: false });
    } catch (e) {
      set({ authBusy: false, authError: (e as Error).message });
    }
  },

  logout: async () => {
    await syncManager.flushNow('logout');
    await signOut(getAuth(getFirebaseApp()));
    set({ user: null, phase: 'auth', messages: [], sessions: [] });
  },

  /* ---------------- Chat flow ---------------- */

  setInput: (v) => set({ input: v }),

  send: async () => {
    const { input, sending, sessionId, settings } = get();
    if (!input.trim() || sending) return;
    set({ sending: true, error: null, input: '' });

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: newId('msg'),
      session_id: sessionId,
      role: 'user',
      content: input.trim(),
      timestamp: now,
      sync_status: 'pending',
    };

    // 1) Zero-token extraction trên RAM
    const { entities, sessionKeywords } = extractor.extract(userMsg.content, userMsg.id, now);
    userMsg.extracted_entities = entities.map((e) => e.name);

    // 2) Deterministic Calibration trên RAM (0 token, 0 read)
    let graphChanged = false;
    for (const ent of entities) {
      const committed = mem.upsertEntity(ent);
      if (committed) graphChanged = true;
    }
    mem.logSession(sessionId, sessionKeywords, now);

    // 3) Optimistic UI
    set({
      messages: [...get().messages, userMsg],
      memoryVersion: graphChanged ? Date.now() : get().memoryVersion,
    });

    // 4) Queue đồng bộ ngầm (debounce 2s)
    syncManager.queueMessage(userMsg);
    if (mem.isDirty()) syncManager.queueSnapshot(mem.exportSnapshot());
    mem.clearDirty();

    // 5) Context injection từ RAM (0 read thêm)
    const relevant = mem.searchRelevant(userMsg.content, settings.context_top_k);
    const systemPrompt = buildSystemPrompt(relevant);
    set({
      lastTokenEstimate: {
        system: estimateTokens(systemPrompt),
        context: relevant.reduce((s, e) => s + estimateTokens(e.name + e.value), 0),
        user: estimateTokens(userMsg.content),
      },
    });

    // 6) Xử lý phản hồi (Tự động hoặc qua LLM nếu có key)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      let replyText = '';

      if (apiKey) {
        // Nếu có API key -> Gọi Gemini
        const history = get()
          .messages.slice(-6)
          .map((m) => ({ role: m.role, content: m.content }));
        const { text, usage } = await callGemini({
          apiKey,
          model: settings.ai_model,
          systemPrompt,
          history,
          userPrompt: userMsg.content,
        });
        replyText = text || '(không có nội dung trả về)';
        if (usage) console.info('[zero-mem] Gemini usage:', usage);
      } else {
        // Chế độ Zero-Mem Engine thuần túy (Không cần bất kỳ API key nào)
        const lines: string[] = [];
        if (entities.length > 0) {
          lines.push(`✅ **Đã ghi nhớ ${entities.length} thực thể mới vào RAM (0 Token)**:`);
          for (const e of entities) {
            lines.push(`- **${e.name}**: \`${e.value}\` *(Category: ${e.category})*`);
          }
        } else {
          lines.push(`ℹ️ Không có thực thể mới cần lưu trong câu này.`);
        }

        if (relevant.length > 0) {
          lines.push(`\n🔍 **Ngữ cảnh liên quan được trích xuất từ RAM (< 1ms)**:`);
          for (const r of relevant) {
            lines.push(`- \`${r.name}\` = **${r.value}**`);
          }
        }

        lines.push(`\n💡 *Zero-Mem sẵn sàng phục vụ các Agent (Cursor, OpenCode, Claude Code) qua MCP Server mà không tốn token quản lý.*`);
        replyText = lines.join('\n');
      }

      const aiMsg: ChatMessage = {
        id: newId('msg'),
        session_id: sessionId,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
        sync_status: 'pending',
      };
      set({ messages: [...get().messages, aiMsg], sending: false });
      syncManager.queueMessage(aiMsg);
    } catch (e) {
      set({ sending: false, error: (e as Error).message });
    } finally {
      if (get().settings.auto_sync) syncManager.flushNow('turn-end');
      set({ lastSyncInfo: { reads: syncManager.reads, writes: syncManager.writes } });
    }
  },

  /* ---------------- Session management ---------------- */

  newSession: () => {
    syncManager.flushNow('new-session');
    const sid = newId('sess');
    set({ sessionId: sid, messages: [] });
  },

  selectSession: (id) => {
    if (id === get().sessionId) return;
    syncManager.flushNow('switch-session');
    set({ sessionId: id, messages: [] });
  },

  /* ---------------- Memory Inspector actions ---------------- */

  updateEntity: (name, value) => {
    mem.updateEntityManually(name, value);
    syncManager.queueSnapshot(mem.exportSnapshot());
    set({ memoryVersion: Date.now() });
  },

  deleteEntity: (name) => {
    mem.deleteEntity(name);
    syncManager.queueSnapshot(mem.exportSnapshot());
    set({ memoryVersion: Date.now() });
  },

  updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
}));
