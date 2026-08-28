/**
 * Zero-Mem MCP Server
 * =====================
 * Cho AI agent (opencode, Claude Code, Cursor…) dùng trí nhớ dài hạn Zero-Mem
 * thay cho trí nhớ mặc định vốn dễ lỗi/được nén mất dữ liệu.
 *
 * Chạy:  node --experimental-strip-types mcp-server/index.ts
 * Test:  node --experimental-strip-types mcp-server/index.ts --selftest
 *
 * Env:
 *  - ZERO_MEM_NAMESPACE                 namespace mặc định (vd "opencode-myproject")
 *  - ZERO_MEM_DATA_DIR                  thư mục lưu file (mặc định ./zero-mem-data)
 *  - ZERO_MEM_FIREBASE_SERVICE_ACCOUNT  đường dẫn service account JSON -> bật cloud sync
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "node:path";
import { z } from "zod";
import { EntityExtractor } from "../lib/zero-mem/extractor.ts";
import { ZeroMemStore } from "../lib/zero-mem/memory-store.ts";
import type { MemoryEntity } from "../lib/zero-mem/memory-store.ts";
import { getStorage, sanitizeNamespace, resetStorage } from "./storage.ts";

const extractor = new EntityExtractor();
const stores = new Map<string, ZeroMemStore>();
const lastTs = new Map<string, number>();

/** Timestamp đơn điệu tăng — chống 2 lần ghi cùng ms phá calibration */
function monotonicNow(ns: string): number {
  const now = Date.now();
  const prev = lastTs.get(ns) ?? 0;
  const ts = now > prev ? now : prev + 1;
  lastTs.set(ns, ts);
  return ts;
}

async function getStore(ns: string): Promise<ZeroMemStore> {
  const existing = stores.get(ns);
  if (existing) return existing;
  const storage = await getStorage();
  const snapshot = await storage.load(ns); // đúng 1 lần đọc khi khởi tạo
  const store = new ZeroMemStore();
  store.hydrate(snapshot);
  stores.set(ns, store);
  return store;
}

async function persist(ns: string, store: ZeroMemStore): Promise<void> {
  const storage = await getStorage();
  await storage.save(ns, store.exportSnapshot());
  store.clearDirty();
}

function fmtEntity(e: MemoryEntity): string {
  const date = new Date(e.updated_at).toISOString().slice(0, 16).replace("T", " ");
  return `- ${e.name}: ${e.value}  [${e.category}, cập nhật ${date}]`;
}

const NS_PARAM = {
  namespace: z
    .string()
    .optional()
    .describe("Memory namespace (vd: 'opencode-myproject'). Mặc định: env ZERO_MEM_NAMESPACE hoặc 'default'. Dùng namespace khác nhau cho khác dự án."),
};

/* ================= Tool handlers ================= */

async function remember(text: string, namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  const ts = monotonicNow(ns);
  const { entities, sessionKeywords } = extractor.extract(text, `mcp_${ts}`, ts);
  const lines: string[] = [];
  let saved = 0;
  for (const ent of entities) {
    const before = store.getEntity(ent.name);
    const committed = store.upsertEntity(ent);
    if (committed) {
      saved++;
      lines.push(
        before
          ? `overwrote ${ent.name}: "${before.value}" -> "${committed.value}"`
          : `saved ${ent.name} = "${committed.value}"`,
      );
    }
  }
  store.logSession(`mcp-${new Date(ts).toISOString().slice(0, 10)}`, sessionKeywords, ts);
  if (saved > 0) await persist(ns, store);
  const body =
    lines.length > 0
      ? `Zero-Mem: ${saved}/${entities.length} entity lưu vào "${ns}" (0 token):\n${lines.map((l) => "- " + l).join("\n")}`
      : "Zero-Mem: không nhận ra entity mới nào trong văn bản (không lưu gì).";
  return { content: [{ type: "text" as const, text: body }] };
}

async function recall(query: string, k: number, namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  const relevant = store.searchRelevant(query, k);
  const body =
    relevant.length > 0
      ? `Zero-Mem [${ns}] — ${relevant.length} entity liên quan (0 token):\n${relevant.map(fmtEntity).join("\n")}`
      : `Zero-Mem [${ns}]: trí nhớ trống hoặc không có gì liên quan tới "${query}".`;
  return { content: [{ type: "text" as const, text: body }] };
}

async function contextBlock(taskDescription: string, maxChars: number, namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  const relevant = store.searchRelevant(taskDescription, 16);
  const lines: string[] = [];
  let used = 0;
  for (const e of relevant) {
    const line = `- ${e.name}: ${e.value}`;
    if (used + line.length > maxChars && lines.length >= 3) break;
    lines.push(line);
    used += line.length;
  }
  const body =
    lines.length > 0
      ? `[Zero-Mem persistent memory — background knowledge, dùng khi liên quan, đừng đọc lại cho user]\n${lines.join("\n")}`
      : `[Zero-Mem] Chưa có trí nhớ nào liên quan tới task này.`;
  return { content: [{ type: "text" as const, text: body }] };
}

async function listEntities(namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  const all = store.getAllEntities().sort((a, b) => a.category.localeCompare(b.category) || b.updated_at - a.updated_at);
  const body =
    all.length > 0
      ? `Zero-Mem [${ns}] — ${all.length} entity:\n${all.map(fmtEntity).join("\n")}`
      : `Zero-Mem [${ns}]: trống.`;
  return { content: [{ type: "text" as const, text: body }] };
}

async function updateEntity(name: string, value: string, namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  const updated = store.updateEntityManually(name, value);
  if (!updated) {
    return { content: [{ type: "text" as const, text: `Zero-Mem [${ns}]: không tìm thấy entity "${name}". Dùng zm_list để xem tên đúng.` }] };
  }
  await persist(ns, store);
  return { content: [{ type: "text" as const, text: `Zero-Mem [${ns}]: đã cập nhật ${name} = "${value}"` }] };
}

async function forgetEntity(name: string, namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  const ok = store.deleteEntity(name);
  if (ok) await persist(ns, store);
  return { content: [{ type: "text" as const, text: ok ? `Zero-Mem [${ns}]: đã xóa "${name}"` : `Zero-Mem [${ns}]: không có "${name}"` }] };
}

async function snapshot(namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  return { content: [{ type: "text" as const, text: JSON.stringify(store.exportSnapshot(), null, 2) }] };
}

async function stats(namespace?: string) {
  const ns = sanitizeNamespace(namespace ?? process.env.ZERO_MEM_NAMESPACE ?? "default");
  const store = await getStore(ns);
  const storage = await getStorage();
  const s = store.stats();
  return {
    content: [
      {
        type: "text" as const,
        text: `Zero-Mem [${ns}]: ${s.entities} entities · ${s.sessions} phiên · hydration reads: ${s.readsPerformed} · storage mode: ${storage.mode}`,
      },
    ],
  };
}

/* ================= Server ================= */

async function main(): Promise<void> {
  const server = new McpServer({ name: "zero-mem", version: "1.0.0" });

  server.tool(
    "zm_remember",
    "Save durable facts/context into long-term memory. Pass the raw sentence(s) or a chunk of conversation containing facts (preferences, stack decisions, constraints, environment quirks). Zero-token extraction; latest info wins on conflict. Call this whenever you learn something durable about the user/project.",
    { text: z.string().min(2).describe("Raw text containing facts to remember"), ...NS_PARAM },
    async ({ text, namespace }) => remember(text, namespace),
  );

  server.tool(
    "zm_recall",
    "Search persistent memory for entities relevant to a query. Call at session start or before tasks that may depend on known context (user prefs, stack, decisions). Returns top-K entities.",
    { query: z.string().min(1).describe("Keywords/phrasing of what you need"), k: z.number().int().min(1).max(32).optional().describe("Max results (default 8)"), ...NS_PARAM },
    async ({ query, k, namespace }) => recall(query, k ?? 8, namespace),
  );

  server.tool(
    "zm_context_block",
    "Get a ready-to-paste context block for the current task, built from persistent memory (0 token). Prefer this when you want the full relevant background injected into your working context.",
    { task_description: z.string().min(1).describe("What you are about to do"), max_chars: z.number().int().min(100).max(8000).optional().describe("Budget in characters (default 1200)"), ...NS_PARAM },
    async ({ task_description, max_chars, namespace }) => contextBlock(task_description, max_chars ?? 1200, namespace),
  );

  server.tool(
    "zm_list",
    "List all entities currently in persistent memory.",
    NS_PARAM,
    async ({ namespace }) => listEntities(namespace),
  );

  server.tool(
    "zm_update",
    "Manually correct an entity value by exact name.",
    { name: z.string().min(1).describe("Entity name (from zm_list)"), value: z.string().min(1).describe("New value"), ...NS_PARAM },
    async ({ name, value, namespace }) => updateEntity(name, value, namespace),
  );

  server.tool(
    "zm_forget",
    "Delete an entity from persistent memory by exact name.",
    { name: z.string().min(1).describe("Entity name to delete"), ...NS_PARAM },
    async ({ name, namespace }) => forgetEntity(name, namespace),
  );

  server.tool(
    "zm_snapshot",
    "Export the full memory snapshot as JSON (backup/inspection).",
    NS_PARAM,
    async ({ namespace }) => snapshot(namespace),
  );

  server.tool(
    "zm_stats",
    "Memory stats: entity count, sessions, storage mode.",
    NS_PARAM,
    async ({ namespace }) => stats(namespace),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout chỉ dành cho MCP protocol — mọi log phải đi stderr
  console.error(`[zero-mem] MCP server sẵn sàng (namespace: ${process.env.ZERO_MEM_NAMESPACE ?? "default"})`);
}

/* ================= Selftest ================= */

async function selftest(): Promise<void> {
  process.env.ZERO_MEM_DATA_DIR = join(process.cwd(), "zero-mem-data", `selftest-${Date.now()}`);
  resetStorage();
  let passed = 0;
  let failed = 0;
  const check = (cond: boolean, label: string) => {
    if (cond) { passed++; console.log(`  PASS ${label}`); }
    else { failed++; console.error(`  FAIL ${label}`); }
  };

  const ns = "selftest";
  const r1 = await remember("Tôi đang dùng React 18", ns);
  check(r1.content[0].text.includes("React"), "zm_remember lưu React 18");

  const rec1 = await recall("stack của tôi", 8, ns);
  check(rec1.content[0].text.includes("React"), "zm_recall tìm thấy React 18");

  const r2 = await remember("Hôm nay tôi đổi sang dùng Next.js 15 rồi", ns);
  check(r2.content[0].text.includes("Next.js 15"), "zm_remember lưu Next.js 15");

  const rec2 = await recall("framework hiện tại", 8, ns);
  check(rec2.content[0].text.includes("Next.js 15"), "calibration: recall trả Next.js 15");
  check(!rec2.content[0].text.includes('"React 18"'), "giá trị cũ React 18 bị ghi đè");

  await updateEntity("frontend_framework", "Next.js 15 (đã xác nhận)", ns);
  const rec3 = await recall("framework", 8, ns);
  check(rec3.content[0].text.includes("đã xác nhận"), "zm_update sửa thủ công");

  await forgetEntity("frontend_framework", ns);
  const rec4 = await recall("framework", 8, ns);
  check(!rec4.content[0].text.includes("frontend_framework"), "zm_forget xóa entity");

  const snap = await snapshot(ns);
  const parsed = JSON.parse(snap.content[0].text);
  check(typeof parsed.last_updated === "number", "zm_snapshot trả JSON hợp lệ");

  const st = await stats(ns);
  check(st.content[0].text.includes("file"), "zm_stats báo storage mode");

  // dọn file selftest
  try {
    const { rmSync } = await import("node:fs");
    rmSync(process.env.ZERO_MEM_DATA_DIR, { recursive: true, force: true });
  } catch { /* ignore */ }

  console.log(`\nKẾT QUẢ MCP SELFTEST: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

if (process.argv.includes("--selftest")) {
  await selftest();
} else {
  await main();
}
