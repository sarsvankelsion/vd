/**
 * IndexedDB Fallback — cache snapshot dự phòng khi mất mạng.
 * Dùng thư viện `idb` nhẹ, gói API promise-friendly.
 */

import type { MemorySnapshot } from './memory-store';
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'zero-mem-cache';
const STORE = 'snapshots';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB không khả dụng trong môi trường này'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSnapshotCache(uid: string, snapshot: MemorySnapshot): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE, snapshot, uid);
  } catch {
    // Cache dự phòng fail-safe: bỏ qua lỗi
  }
}

export async function readSnapshotCache(uid: string): Promise<MemorySnapshot | null> {
  try {
    const db = await getDB();
    const result = (await db.get(STORE, uid)) as MemorySnapshot | undefined;
    return result ?? null;
  } catch {
    return null;
  }
}

export async function clearSnapshotCache(uid: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE, uid);
  } catch {
    // bỏ qua
  }
}
