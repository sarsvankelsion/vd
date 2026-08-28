/**
 * Module 3: Sync & Persistence Manager (Refactored)
 * ------------------------------------------------
 * - Hydration: Đọc 1 lần duy nhất Document Snapshot từ Firestore -> nạp vào RAM (1 Read / Session).
 * - Optimistic Local Update: Cập nhật RAM & UI ngay tức thì.
 * - Debounced Batch Write: Gom tin nhắn & snapshot, ghi xuống Firestore sau 2s hoặc khi kết thúc lượt.
 * - Batch Chunking: Chia nhỏ lô ghi nếu vượt quá giới hạn 450 thao tác của Firestore.
 * - IndexedDB Fallback: Hoạt động mượt mà cả khi offline hoặc chưa cấu hình Firebase.
 */

import { getFirestore, doc, getDoc, writeBatch } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';
import type { MemorySnapshot } from './memory-store.ts';
import { saveSnapshotCache, readSnapshotCache } from './idb-fallback.ts';
import type { ChatMessage } from '@/types/chat';

export interface SyncStats {
  reads: number;
  writes: number;
  lastSyncAt: number | null;
  online: boolean;
}

export interface QueuedMessage extends ChatMessage {
  saved?: boolean;
}

const SNAPSHOT_PATH = (uid: string) => `users/${uid}/memory_state/snapshot`;

export class SyncManager {
  private db: ReturnType<typeof getFirestore> | null = null;
  private uid: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessages: QueuedMessage[] = [];
  private pendingSnapshot: MemorySnapshot | null = null;
  private online = true;
  readonly debounceMs: number;

  reads = 0;
  writes = 0;
  lastSyncAt: number | null = null;

  constructor(debounceMs = 2000) {
    this.debounceMs = debounceMs;
    if (typeof window !== 'undefined') {
      this.online = navigator.onLine;
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void this.flushNow('visibility-hidden');
      });
      window.addEventListener('pagehide', () => void this.flushNow('pagehide'));
    }
  }

  public setOnline(online: boolean): void {
    this.online = online;
    if (online) void this.flushNow('back-online');
  }

  public attach(app: FirebaseApp, uid: string): void {
    this.db = getFirestore(app);
    this.uid = uid;
  }

  public detach(): void {
    void this.flushNow('detach');
    this.db = null;
    this.uid = null;
  }

  /**
   * Hydration: đọc đúng 1 lần snapshot từ Firestore.
   * Nếu offline hoặc chưa có cloud data -> fallback IndexedDB.
   */
  public async hydrate(): Promise<{ snapshot: MemorySnapshot | null; source: 'cloud' | 'cache' | 'empty' }> {
    const localUid = this.uid ?? 'local_user';
    if (!this.db || !this.uid) {
      const cached = await readSnapshotCache(localUid);
      return { snapshot: cached, source: cached ? 'cache' : 'empty' };
    }

    try {
      const snap = await getDoc(doc(this.db, SNAPSHOT_PATH(this.uid)));
      this.reads++; // ĐÚNG 1 Document Read / phiên
      if (snap.exists()) {
        const data = snap.data() as MemorySnapshot;
        void saveSnapshotCache(this.uid, data);
        return { snapshot: data, source: 'cloud' };
      }
      // Thử đọc cache nếu cloud chưa có
      const cached = await readSnapshotCache(this.uid);
      return { snapshot: cached, source: cached ? 'cache' : 'empty' };
    } catch {
      const cached = await readSnapshotCache(this.uid);
      return { snapshot: cached, source: cached ? 'cache' : 'empty' };
    }
  }

  public queueMessage(msg: ChatMessage): void {
    if (!this.pendingMessages.some((m) => m.id === msg.id)) {
      this.pendingMessages.push({ ...msg, saved: false });
    }
    this.schedule();
  }

  public queueSnapshot(snapshot: MemorySnapshot): void {
    this.pendingSnapshot = snapshot;
    this.schedule();
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flushNow('debounce'), this.debounceMs);

    const targetUid = this.uid ?? 'local_user';
    if (this.pendingSnapshot) {
      void saveSnapshotCache(targetUid, this.pendingSnapshot);
    }
  }

  /** Ghi toàn bộ thay đổi đang chờ xuống Firestore (chia batch an toàn). */
  public async flushNow(reason: string): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const messages = [...this.pendingMessages];
    const snapshot = this.pendingSnapshot;
    if (messages.length === 0 && !snapshot) return;

    const targetUid = this.uid ?? 'local_user';
    if (snapshot) {
      void saveSnapshotCache(targetUid, snapshot);
    }

    // Nếu chưa đăng nhập / chưa kết nối Firestore -> chỉ lưu IndexedDB
    if (!this.db || !this.uid) {
      this.pendingMessages = [];
      this.pendingSnapshot = null;
      this.lastSyncAt = Date.now();
      return;
    }

    this.pendingMessages = [];
    this.pendingSnapshot = null;

    try {
      // Chunk messages thành các batch nhỏ hơn 450 items (Firestore limit = 500)
      const chunkSize = 450;
      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        const batch = writeBatch(this.db);
        for (const msg of chunk) {
          const path = `users/${this.uid}/sessions/${msg.session_id}/messages/${msg.id}`;
          batch.set(doc(this.db, path), {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            session_id: msg.session_id,
            extracted_entities: msg.extracted_entities ?? [],
          });
        }
        await batch.commit();
        this.writes += chunk.length;
      }

      if (snapshot) {
        const batch = writeBatch(this.db);
        batch.set(doc(this.db, SNAPSHOT_PATH(this.uid)), snapshot as unknown as Record<string, unknown>);
        await batch.commit();
        this.writes += 1;
      }

      this.lastSyncAt = Date.now();
    } catch {
      // Nếu ghi cloud lỗi -> khôi phục hàng chờ để thử lại
      for (const m of messages) {
        if (!this.pendingMessages.some((pm) => pm.id === m.id)) {
          this.pendingMessages.push(m);
        }
      }
      this.pendingSnapshot = snapshot ?? this.pendingSnapshot;
    }
  }

  public stats(): SyncStats {
    return {
      reads: this.reads,
      writes: this.writes,
      lastSyncAt: this.lastSyncAt,
      online: this.online,
    };
  }
}

export const syncManager = new SyncManager();
