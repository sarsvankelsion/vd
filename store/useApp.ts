'use client';

import { create } from 'zustand';
import type { ChatMessage, SessionInfo, UserSettings } from '@/types/chat';
import { DEFAULT_SETTINGS, newId } from '@/types/chat';
import { extractor, ensureNlp } from '@/lib/zero-mem/extractor';
import { ZeroMemStore, type MemoryEntity } from '@/lib/zero-mem/memory-store';

export type AppPhase = 'boot' | 'ready';

interface AppState {
  phase: AppPhase;
  currentUserId: string;
  memoryVersion: number;
  settings: UserSettings;

  boot: () => Promise<void>;
  updateEntity: (name: string, value: string) => Promise<void>;
  deleteEntity: (name: string) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => void;
}

/** Zero-Mem store sống trong RAM của client. */
const mem = new ZeroMemStore();

/** Lấy store RAM (dùng cho Memory Inspector đọc trực tiếp). */
export function getMemoryStore(): ZeroMemStore {
  return mem;
}

export const useApp = create<AppState>((set, get) => ({
  phase: 'boot',
  currentUserId: '',
  memoryVersion: 0,
  settings: DEFAULT_SETTINGS,

  /* ---------------- Boot & Hydration từ Cloud Firestore ---------------- */

  boot: async () => {
    await ensureNlp();
    const userId = (typeof window !== 'undefined' ? localStorage.getItem('userId') : null) || 'default';
    set({ currentUserId: userId });

    try {
      const res = await fetch(`/api/memory?namespace=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.entities && Array.isArray(data.entities)) {
          data.entities.forEach((ent: MemoryEntity) => {
            mem.upsertEntity({
              name: ent.name,
              value: ent.value,
              category: ent.category,
              confidence: ent.confidence || 1.0,
              extractedAt: ent.updated_at || Date.now(),
            });
          });
        }
      }
    } catch (err) {
      console.warn('[Zero-Mem] Boot hydration warning:', err);
    } finally {
      set({ phase: 'ready', memoryVersion: Date.now() });
    }
  },

  /* ---------------- Entity Actions ---------------- */

  updateEntity: async (name, value) => {
    const userId = get().currentUserId || 'default';
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanValue = value.trim();

    mem.upsertEntity({
      name: cleanName,
      value: cleanValue,
      category: 'profile',
      confidence: 1.0,
      extractedAt: Date.now(),
    });

    set({ memoryVersion: Date.now() });

    // Sync to Cloud Firestore
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remember',
          text: `${cleanName}: ${cleanValue}`,
          namespace: userId,
        }),
      });
    } catch {
      // ignore
    }
  },

  deleteEntity: async (name) => {
    const userId = get().currentUserId || 'default';
    mem.deleteEntity(name);
    set({ memoryVersion: Date.now() });
  },

  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
  },
}));
