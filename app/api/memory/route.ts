import { NextRequest, NextResponse } from 'next/server';
import { EntityExtractor } from '@/lib/zero-mem/extractor';
import { ZeroMemStore } from '@/lib/zero-mem/memory-store';

// Server-side in-memory cache theo namespace
const serverStores = new Map<string, ZeroMemStore>();
const extractor = new EntityExtractor();

function getStore(ns: string): ZeroMemStore {
  let store = serverStores.get(ns);
  if (!store) {
    store = new ZeroMemStore();
    serverStores.set(ns, store);
  }
  return store;
}

/**
 * Universal Zero-Mem REST API
 * Dùng cho bất kỳ Agent, tool (fx.sh, curl, Python, Node.js, LangChain, Custom Bot...)
 * 
 * 1. POST /api/memory
 *    - Remember: { "action": "remember", "text": "Tôi dùng Next.js 15", "namespace": "default" }
 *    - Recall:   { "action": "recall", "query": "stack của tôi", "k": 8, "namespace": "default" }
 * 
 * 2. GET /api/memory?namespace=default
 *    - Inspect:  Lấy toàn bộ thực thể trong namespace
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, text, query, k = 8, namespace = 'default' } = body;
    const store = getStore(namespace);
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

      return NextResponse.json({
        success: true,
        namespace,
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

      const relevant = store.searchRelevant(query, Number(k) || 8);
      return NextResponse.json({
        success: true,
        namespace,
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
    const store = getStore(namespace);

    return NextResponse.json({
      success: true,
      namespace,
      stats: store.stats(),
      entities: store.getAllEntities(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
