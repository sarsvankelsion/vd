/**
 * Zero-Mem MCP Storage — persistence cho AI agent namespaces.
 *
 * Hai chế độ:
 *  - FILE (mặc định, zero-config): mỗi namespace 1 file JSON trong zero-mem-data/
 *  - FILE+CLOUD (khi đặt ZERO_MEM_FIREBASE_SERVICE_ACCOUNT): file là nguồn chân lý
 *    cục bộ, sync song song xuống Firestore users/{ns}/memory_state/snapshot
 *    (Admin SDK, bypass rules) — web dashboard đăng nhập cùng user đó sẽ thấy được.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { MemorySnapshot } from "../lib/zero-mem/memory-store.ts";

/* ------------------------- Namespace ------------------------- */

/** Chỉ cho phép ký tự an toàn, chống path traversal */
export function sanitizeNamespace(ns: string): string {
  const clean = ns
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return clean || "default";
}

/* ------------------------- Adapter ------------------------- */

export interface StorageAdapter {
  readonly mode: "file" | "file+cloud";
  load(namespace: string): Promise<MemorySnapshot | null>;
  save(namespace: string, snapshot: MemorySnapshot): Promise<void>;
  remove?(namespace: string): void;
}

/** File store: zero-mem-data/{ns}.json */
export class FileStore implements StorageAdapter {
  readonly mode = "file" as const;
  readonly dir: string;

  constructor(dir?: string) {
    this.dir = resolve(
      dir ?? process.env.ZERO_MEM_DATA_DIR ?? join(process.cwd(), "zero-mem-data"),
    );
    mkdirSync(this.dir, { recursive: true });
  }

  private filePath(ns: string): string {
    return join(this.dir, `${sanitizeNamespace(ns)}.json`);
  }

  async load(namespace: string): Promise<MemorySnapshot | null> {
    const p = this.filePath(namespace);
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, "utf8")) as MemorySnapshot;
    } catch {
      return null; // file hỏng -> coi như rỗng, không crash agent
    }
  }

  async save(namespace: string, snapshot: MemorySnapshot): Promise<void> {
    const p = this.filePath(namespace);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(snapshot, null, 2), "utf8");
  }

  remove(namespace: string): void {
    const p = this.filePath(namespace);
    if (existsSync(p)) unlinkSync(p);
  }
}

/** File là truth cục bộ + sync Firestore Admin (debounced) */
export class CloudFileStore implements StorageAdapter {
  readonly mode = "file+cloud" as const;
  private fileStore: FileStore;
  private db: import("firebase-admin/firestore").Firestore | null = null;
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  private constructor(fileStore: FileStore) {
    this.fileStore = fileStore;
  }

  static async create(fileStore: FileStore, serviceAccountPath: string): Promise<CloudFileStore> {
    const store = new CloudFileStore(fileStore);
    try {
      const sa = JSON.parse(readFileSync(resolve(serviceAccountPath), "utf8"));
      const { initializeApp, cert } = await import("firebase-admin/app");
      const { getFirestore } = await import("firebase-admin/firestore");
      initializeApp({ credential: cert(sa) });
      store.db = getFirestore();
    } catch (err) {
      console.error(
        `[zero-mem] Cloud sync tắt — không nạp được service account: ${(err as Error).message}`,
      );
    }
    return store;
  }

  async load(namespace: string): Promise<MemorySnapshot | null> {
    // 1 read: ưu tiên cloud (nguồn chia sẻ đa thiết bị), fallback file cục bộ
    if (this.db) {
      try {
        const doc = await this.db.doc(`users/${sanitizeNamespace(namespace)}/memory_state/snapshot`).get();
        if (doc.exists) return doc.data() as MemorySnapshot;
      } catch (err) {
        console.error(`[zero-mem] Cloud load lỗi, dùng file: ${(err as Error).message}`);
      }
    }
    return this.fileStore.load(namespace);
  }

  async save(namespace: string, snapshot: MemorySnapshot): Promise<void> {
    await this.fileStore.save(namespace, snapshot); // truth cục bộ, luôn ghi ngay
    if (!this.db) return;
    const ns = sanitizeNamespace(namespace);
    const prev = this.pending.get(ns);
    if (prev) clearTimeout(prev);
    this.pending.set(
      ns,
      setTimeout(() => {
        this.pending.delete(ns);
        this.db!
          .doc(`users/${ns}/memory_state/snapshot`)
          .set(snapshot)
          .catch((err) => console.error(`[zero-mem] Cloud save lỗi: ${err.message}`));
      }, 2000),
    );
  }
}

let cached: StorageAdapter | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (cached) return cached;
  const fileStore = new FileStore();
  const saPath = process.env.ZERO_MEM_FIREBASE_SERVICE_ACCOUNT;
  cached = saPath ? await CloudFileStore.create(fileStore, saPath) : fileStore;
  return cached;
}

/** Reset cache (dùng cho selftest) */
export function resetStorage(): void {
  cached = null;
}
