/**
 * Module 2: Client RAM Memory Engine (Zero-Mem Store - Refactored)
 * ----------------------------------------------------------------
 * Quản lý Entity-Context Graph + Temporal Hierarchy Logs hoàn toàn trong RAM.
 * - 0 Token LLM
 * - 0 Lượt đọc Firestore trong phiên (Single-Read Hydration)
 * - Deterministic Calibration giải quyết mâu thuẫn thông tin tức thì.
 */

import type { ExtractedEntity, EntityCategory } from './extractor.ts';
import { VI_EN_STOPWORDS } from './extractor.ts';

export interface MemoryEntity {
  name: string;
  value: string;
  category: EntityCategory;
  updated_at: number;
  source_msg_id?: string;
  confidence: number;
}

export interface TemporalSessionSummary {
  session_id: string;
  started_at: number;
  summary_keywords: string[];
}

export interface MemorySnapshot {
  last_updated: number;
  entities: Record<string, MemoryEntity>;
  temporal_summary: TemporalSessionSummary[];
  stats?: {
    zeroTokenOperations: number;
    tokensSaved: number;
  };
}

export type ConflictPolicy = 'latest-wins' | 'higher-confidence-wins';

export interface StoreStats {
  entities: number;
  sessions: number;
  readsPerformed: number;
  writesQueued: number;
  zeroTokenOps: number;
  tokensSavedEstimate: number;
}

export class ZeroMemStore {
  private entities: Record<string, MemoryEntity> = {};
  private temporal: TemporalSessionSummary[] = [];
  private lastUpdated = 0;
  private readsPerformed = 0;
  private writesQueued = 0;
  private zeroTokenOps = 0;
  private dirty = false;

  /** Nạp snapshot từ Firestore / IndexedDB vào RAM (gọi 1 lần duy nhất / phiên). */
  public hydrate(snapshot: MemorySnapshot | null | undefined): void {
    this.readsPerformed++;
    this.entities = {};
    this.temporal = [];
    if (!snapshot) return;

    for (const [key, ent] of Object.entries(snapshot.entities ?? {})) {
      this.entities[key] = { ...ent };
    }
    this.temporal = (snapshot.temporal_summary ?? []).map((s) => ({ ...s }));
    this.lastUpdated = snapshot.last_updated ?? 0;
    this.zeroTokenOps = snapshot.stats?.zeroTokenOperations ?? 0;
    this.dirty = false;
  }

  /** Xuất snapshot hiện tại của RAM (để sync xuống Firestore). */
  public exportSnapshot(): MemorySnapshot {
    return {
      last_updated: this.lastUpdated,
      entities: structuredClone(this.entities),
      temporal_summary: structuredClone(this.temporal),
      stats: {
        zeroTokenOperations: this.zeroTokenOps,
        tokensSaved: this.zeroTokenOps * 150, // Ước tính 150 tokens cho mỗi lần LLM tóm tắt/tìm kiếm
      },
    };
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public markDirty(): void {
    this.dirty = true;
    this.lastUpdated = Date.now();
  }

  /* ---------------- Entity Graph & Deterministic Calibration ---------------- */

  public getEntity(name: string): MemoryEntity | null {
    return this.entities[name] ?? null;
  }

  public getAllEntities(): MemoryEntity[] {
    return Object.values(this.entities);
  }

  /**
   * Deterministic Calibration: giải quyết xung đột thông tin trên RAM.
   * - Entity mới có updated_at > existing -> ghi đè.
   * - Cùng timestamp -> ưu tiên confidence cao hơn.
   */
  public upsertEntity(
    incoming: ExtractedEntity,
    policy: ConflictPolicy = 'latest-wins',
    now: number = Date.now(),
  ): MemoryEntity | null {
    this.zeroTokenOps++;
    const existing = this.entities[incoming.name];

    if (existing) {
      if (policy === 'latest-wins') {
        if (incoming.extractedAt > existing.updated_at) {
          return this.commit(incoming, now);
        }
        if (incoming.extractedAt === existing.updated_at && incoming.confidence >= existing.confidence) {
          return this.commit(incoming, now);
        }
        return null; // Stale write bị từ chối
      }
      // higher-confidence-wins
      if (incoming.confidence > existing.confidence) {
        return this.commit(incoming, now);
      }
      if (incoming.confidence === existing.confidence && incoming.extractedAt >= existing.updated_at) {
        return this.commit(incoming, now);
      }
      return null;
    }

    return this.commit(incoming, now);
  }

  private commit(incoming: ExtractedEntity, now: number): MemoryEntity {
    const ent: MemoryEntity = {
      name: incoming.name,
      value: incoming.value,
      category: incoming.category,
      updated_at: incoming.extractedAt || now,
      source_msg_id: incoming.sourceMsgId,
      confidence: incoming.confidence,
    };
    this.entities[ent.name] = ent;
    this.markDirty();
    this.writesQueued++;
    return ent;
  }

  public updateEntityManually(name: string, value: string): MemoryEntity | null {
    const existing = this.entities[name];
    if (!existing) return null;
    existing.value = value;
    existing.updated_at = Date.now();
    this.markDirty();
    return existing;
  }

  public deleteEntity(name: string): boolean {
    if (!(name in this.entities)) return false;
    delete this.entities[name];
    this.markDirty();
    return true;
  }

  /* ---------------- Temporal Hierarchy ---------------- */

  public logSession(sessionId: string, keywords: string[], now: number = Date.now()): void {
    this.zeroTokenOps++;
    const filtered = keywords.filter((k) => !VI_EN_STOPWORDS.has(k.toLowerCase()));
    const existing = this.temporal.find((s) => s.session_id === sessionId);
    if (existing) {
      existing.summary_keywords = Array.from(
        new Set([...existing.summary_keywords, ...filtered]),
      ).slice(-30);
    } else {
      this.temporal.push({
        session_id: sessionId,
        started_at: now,
        summary_keywords: filtered.slice(0, 30),
      });
      if (this.temporal.length > 50) this.temporal.shift();
    }
    this.markDirty();
  }

  /* ---------------- Context Retrieval (0 Token, Clean Filter) ---------------- */

  /**
   * Tìm top-K entity liên quan nhất tới prompt người dùng.
   * Lọc bỏ stopwords để không bị ô nhiễm kết quả.
   */
  public searchRelevant(prompt: string, topK = 8): MemoryEntity[] {
    this.zeroTokenOps++;
    const promptLower = prompt.toLowerCase();
    const promptTokens = tokenize(prompt);
    const now = Date.now();

    if (promptTokens.length === 0) {
      return this.recent(topK);
    }

    const scored = this.getAllEntities().map((ent) => {
      const entNameLower = ent.name.toLowerCase();
      const entValLower = ent.value.toLowerCase();
      const entTokens = [...tokenize(ent.name), ...tokenize(ent.value)];
      let matchScore = 0;

      // 1. Direct Substring Match (Khớp chuỗi trực tiếp)
      if (promptLower.includes(entValLower) || entValLower.includes(promptLower)) {
        matchScore += 8;
      }
      for (const pt of promptTokens) {
        if (entValLower.includes(pt) || entNameLower.includes(pt) || pt.includes(entNameLower)) {
          matchScore += 4;
        }
      }

      // 2. Token Set Match
      for (const pt of promptTokens) {
        for (const et of entTokens) {
          if (pt === et || et.includes(pt) || pt.includes(et)) {
            matchScore += 3;
          }
        }
      }

      // 3. Domain Context Intent Boost
      if (ent.category === 'tech_stack' && /\b(code|stack|viết|xây|hàm|component|lỗi|build|project|dự\s*án|app|database|bảng|api)\b/i.test(promptLower)) {
        matchScore += 3;
      }
      if (ent.category === 'profile' && /\b(ai|bạn|tên|nghề|role|job|profile|tôi\s+là)\b/i.test(promptLower)) {
        matchScore += 2;
      }
      if (ent.category === 'instruction') {
        matchScore += 2; // Luôn giữ chỉ thị hoạt động
      }

      // 4. Recency Boost nhẹ cho entity mới
      const ageDays = (now - ent.updated_at) / 86_400_000;
      const recencyBoost = Math.max(0, 1.0 - ageDays / 30);

      return {
        ent,
        score: matchScore > 0 ? matchScore + recencyBoost : 0,
      };
    });

    const relevant = scored
      .filter((s) => s.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.ent);

    if (relevant.length === 0) {
      const instructions = this.getAllEntities().filter((e) => e.category === 'instruction');
      return instructions.length > 0 ? instructions : this.recent(Math.min(3, topK));
    }

    return relevant;
  }

  public recent(topK = 8): MemoryEntity[] {
    return this.getAllEntities()
      .slice()
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, topK);
  }

  public stats(): StoreStats {
    return {
      entities: Object.keys(this.entities).length,
      sessions: this.temporal.length,
      readsPerformed: this.readsPerformed,
      writesQueued: this.writesQueued,
      zeroTokenOps: this.zeroTokenOps,
      tokensSavedEstimate: this.zeroTokenOps * 150,
    };
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}.#+]+/u)
    .filter((w) => w.length >= 2 && !VI_EN_STOPWORDS.has(w));
}

export function createZeroMemStore(snapshot?: MemorySnapshot | null): ZeroMemStore {
  const store = new ZeroMemStore();
  if (snapshot) store.hydrate(snapshot);
  return store;
}
