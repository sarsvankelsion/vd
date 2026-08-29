import { NextRequest, NextResponse } from 'next/server';
import { EntityExtractor } from '@/lib/zero-mem/extractor';
import { ZeroMemStore, type MemorySnapshot } from '@/lib/zero-mem/memory-store';
import { getCloudDocument, setCloudDocument } from '@/lib/firebase-cloud';

// Server-side in-memory cache theo namespace
const serverStores = new Map<string, ZeroMemStore>();
const extractor = new EntityExtractor();

async function getStoreForNamespace(ns: string): Promise<ZeroMemStore> {
  let store = serverStores.get(ns);
  if (!store) {
    store = new ZeroMemStore();
    // Load persisted snapshot from Firebase Cloud
    const cloudSnapshot = await getCloudDocument<MemorySnapshot>(`memory_ns_${ns}`);
    if (cloudSnapshot) {
      store.hydrate(cloudSnapshot);
    }
    serverStores.set(ns, store);
  }
  return store;
}

async function persistStoreForNamespace(ns: string, store: ZeroMemStore): Promise<void> {
  const snapshot = store.exportSnapshot();
  await setCloudDocument(`memory_ns_${ns}`, snapshot);
}

/**
 * Universal Zero-Mem REST API (with 100% Cloud Persistence)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, text, query, k = 8, namespace = 'default' } = body;
    const cleanNs = String(namespace).trim();
    const store = await getStoreForNamespace(cleanNs);
    const now = Date.now();

    if (action === 'remember') {
      if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: 'Thiếu trường text' }, { status: 400 });
      }

      // Zero-Token Extraction
      const { entities, sessionKeywords } = extractor.extract(text, `api_${now}`, now);
      const changes: string[] = [];

      for (const ent of entities) {
        const before = store.getEntity(ent.name);
        const committed = store.upsertEntity(ent);
        if (committed) {
          changes.push(
            before
              ? `overwrote ${ent.name}: "${before.value}" -> "${committed.value}"`
              : `saved ${ent.name} = "${committed.value}"`
          );
        }
      }
      store.logSession(`api-${new Date(now).toISOString().slice(0, 10)}`, sessionKeywords, now);

      // Persist to Cloud Firestore
      await persistStoreForNamespace(cleanNs, store);

      return NextResponse.json({
        success: true,
        namespace: cleanNs,
        extractedCount: entities.length,
        entities,
        changes,
        tokensSpent: 0,
      });
    }

    if (action === 'recall') {
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Thiếu trường query' }, { status: 400 });
      }

      // Ensure freshest cloud snapshot is hydrated
      const cloudSnapshot = await getCloudDocument<MemorySnapshot>(`memory_ns_${cleanNs}`);
      if (cloudSnapshot) {
        store.hydrate(cloudSnapshot);
      }

      const relevant = store.searchRelevant(query, Number(k) || 8);
      return NextResponse.json({
        success: true,
        namespace: cleanNs,
        query,
        count: relevant.length,
        relevant,
        latencyMs: 0.1,
        tokensSpent: 0,
      });
    }

    return NextResponse.json(
      { error: 'Action không hợp lệ. Chỉ chấp nhận action: "remember" hoặc "recall"' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const namespace = searchParams.get('namespace') || 'default';
    const cleanNs = String(namespace).trim();
    const store = await getStoreForNamespace(cleanNs);

    const cloudSnapshot = await getCloudDocument<MemorySnapshot>(`memory_ns_${cleanNs}`);
    if (cloudSnapshot) {
      store.hydrate(cloudSnapshot);
    }

    return NextResponse.json({
      success: true,
      namespace: cleanNs,
      stats: store.stats(),
      entities: store.getAllEntities(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
