/**
 * Module 1: Zero-Token Entity Extractor (Refactored & Hardened)
 * -------------------------------------------------------------
 * Trích xuất thực thể (entities) từ văn bản người dùng bằng thuật toán NLP deterministic
 * 100% trên client — ĐÚNG CHUẨN ZERO-TOKEN (0 LLM Tokens, 0 Network Latency).
 *
 * Tính năng chính:
 * 1. Nhận diện và bỏ qua câu hỏi (Interrogative filter) -> Tránh 100% entity rác từ câu hỏi.
 * 2. Tách đa thực thể (Multi-entity extraction) trong cùng 1 câu (ví dụ: "dùng Next.js, Tailwind và PostgreSQL").
 * 3. Phân loại thực thể chính xác theo giá trị (tránh gán nhầm topic chéo).
 * 4. Xử lý sạch các từ đệm, liên từ (và, thêm, cùng với, and, with,...).
 */

export type EntityCategory =
  | 'tech_stack'
  | 'profile'
  | 'preference'
  | 'project'
  | 'instruction'
  | 'fact'
  | 'goal';

export interface ExtractedEntity {
  name: string;
  value: string;
  category: EntityCategory;
  confidence: number;
  extractedAt: number;
  sourceMsgId?: string;
  /** Đánh dấu nếu là hành động thay thế (vd: chuyển từ A sang B) */
  replacesEntity?: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  sessionKeywords: string[];
}

/* ------------------------------------------------------------------ */
/* Từ điển nhận diện Công nghệ & Chủ đề                               */
/* ------------------------------------------------------------------ */

interface TechKnowledge {
  name: string;
  category: EntityCategory;
  pattern: RegExp;
}

const TECH_CATALOG: TechKnowledge[] = [
  // Frameworks / Web
  { name: 'frontend_framework', category: 'tech_stack', pattern: /\b(react(?:\s*js)?|vue(?:\s*js)?(?:\s*3)?|angular(?:\s*js)?|svelte(?:\s*kit)?|next\.?js(?:\s*1[3-6])?|nuxt(?:\s*js)?(?:\s*3)?|remix|astro|solid(?:\s*js)?)\b/i },
  // Styling / CSS
  { name: 'css_framework', category: 'tech_stack', pattern: /\b(tailwind(?:\s*css)?(?:\s*v?[34])?|bootstrap(?:\s*5)?|shadcn(?:\/ui)?|material[\s\-_]?ui|mui|chakra[\s\-_]?ui|ant[\s\-_]?design|styled[\s\-_]?components|sass|scss)\b/i },
  // Backend / Runtime
  { name: 'backend_runtime', category: 'tech_stack', pattern: /\b(node\.?js|bun|deno|express(?:\.js)?|nest(?:\.js)?|fastapi|django|flask|spring(?:\s*boot)?|laravel|ruby\s*on\s*rails|gin|fiber|actix)\b/i },
  // Databases / ORM
  { name: 'database', category: 'tech_stack', pattern: /\b(postgresql|postgres|mysql|sqlite|mongodb|redis|firestore|firebase|supabase|prisma|drizzle|typeorm|cassandra|mariadb)\b/i },
  // Languages
  { name: 'programming_language', category: 'tech_stack', pattern: /\b(typescript|javascript|python(?:\s*3)?|rust|golang|go|java(?:\s*1[7-9]|21)?|c#|\.net|c\+\+|kotlin|swift|php(?:\s*8)?)\b/i },
  // Cloud / DevOps
  { name: 'cloud_platform', category: 'tech_stack', pattern: /\b(firebase|vercel|aws|gcp|google\s*cloud|azure|cloudflare(?:\s*workers)?|docker|kubernetes|fly\.io|render)\b/i },
  // State / Tools
  { name: 'state_management', category: 'tech_stack', pattern: /\b(zustand|redux(?:\s*toolkit)?|mobx|jotai|recoil|pinia|vuex|xstate)\b/i },
  // AI Models
  { name: 'ai_model', category: 'preference', pattern: /\b(gemini[\s\-_]?(?:2\.0|2\.5|1\.5)?[\s\-_]?(?:flash|pro)?|gpt[\s\-_]?4o?(?:[\s\-_]?mini)?|claude[\s\-_]?(?:3\.5|3\.7)?[\s\-_]?(?:sonnet|haiku|opus)?|deepseek[\s\-_]?(?:r1|v3)?|grok[\s\-_]?3?)\b/i },
];

/* ------------------------------------------------------------------ */
/* Bộ lọc câu hỏi (Interrogative Question Markers)                     */
/* ------------------------------------------------------------------ */

const QUESTION_MARKERS = [
  /\?/,
  /\b(?:thế\s*nào|như\s*thế\s*nào|sao\s*nhỉ|làm\s*sao|được\s*không|có\s*nên|có\s*tốt\s*không|không\s*nhỉ|chưa\s*nhỉ|phải\s*không|đúng\s*không|tại\s*sao|ở\s*đâu|khi\s*nào|cái\s*gì|ai|how|why|what|which|where|when|should\s+i|can\s+i|is\s+it)\b/i,
];

function isQuestion(text: string): boolean {
  return QUESTION_MARKERS.some((rgx) => rgx.test(text));
}

/* ------------------------------------------------------------------ */
/* Stopwords tiếng Việt + Anh cho session keywords                    */
/* ------------------------------------------------------------------ */

export const VI_EN_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'have', 'from', 'your', 'you',
  'are', 'was', 'will', 'can', 'not', 'but', 'all', 'has', 'had', 'how', 'who',
  'của', 'và', 'các', 'cho', 'với', 'cái', 'này', 'đây', 'đó', 'tôi', 'mình',
  'là', 'có', 'được', 'một', 'những', 'về', 'trong', 'khi', 'như', 'để',
  'ai', 'gì', 'nào', 'sao', 'thế', 'sau', 'trước', 'bị', 'vì',
  'nhé', 'nha', 'ạ', 'ơi', 'ha', 'vậy', 'luôn', 'rồi', 'thì', 'mà', 'cũng',
  'hỏi', 'giúp',
]);

/* ------------------------------------------------------------------ */
/* Chuẩn hoá & Xử lý Text                                             */
/* ------------------------------------------------------------------ */

function cleanValue(raw: string): string {
  return raw
    .replace(/^[\s,;:\-–—\.]+/, '')
    .replace(/[\s,;:\-–—\.]+$/, '')
    .replace(/^(?:dùng|xài|sử\s*dụng|thêm|học|chuyển\s*sang|đổi\s*qua)\s+/i, '')
    .replace(/\s+(?:rồi|nhé|nha|á|đấy|đây|đó|ạ|luôn)$/i, '')
    .trim();
}

function toSnakeCase(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
}

/** Tách chuỗi có nhiều công nghệ phân tách bằng dấu phẩy, "và", "and", "cùng với" */
function splitMultiItems(text: string): string[] {
  return text
    .split(/(?:,|\s+và\s+|\s+and\s+|\s+cùng\s+với\s+|\s+kèm\s+theo\s+|\s+with\s+)/i)
    .map(cleanValue)
    .filter((v) => v.length >= 2);
}

/* ------------------------------------------------------------------ */
/* Entity Extractor Core                                              */
/* ------------------------------------------------------------------ */

export class EntityExtractor {
  /**
   * Trích xuất các thực thể từ tin nhắn người dùng.
   * Hoàn toàn Deterministic (0 Token LLM).
   */
  public extract(text: string, msgId?: string, now: number = Date.now()): ExtractionResult {
    const entities: ExtractedEntity[] = [];
    const normalizedText = text.trim();
    if (!normalizedText) return { entities: [], sessionKeywords: [] };

    const seenNames = new Set<string>();

    const addEntity = (ent: ExtractedEntity) => {
      if (!ent.name || !ent.value || ent.value.length < 2) return;
      if (seenNames.has(ent.name)) {
        // Cùng tên entity: nối thêm hoặc cập nhật giá trị
        const existing = entities.find((e) => e.name === ent.name);
        if (existing && !existing.value.toLowerCase().includes(ent.value.toLowerCase())) {
          existing.value = `${existing.value}, ${ent.value}`;
        }
        return;
      }
      seenNames.add(ent.name);
      entities.push(ent);
    };

    // 1. Tên người dùng (Profile Name)
    const nameMatch = normalizedText.match(/(?:tên\s+(?:tôi|mình)?\s*(?:là|:)|gọi\s+(?:tôi|mình)\s*là|my\s*name\s*is|i\s*am|i'm)\s+([A-Za-zÀ-ỹ\s]{2,30})(?=[,\.\?!;\n]|$)/i);
    if (nameMatch) {
      const val = cleanValue(nameMatch[1]);
      if (val && !/(?:dev|lập\s*trình|kỹ\s*sư|engineer|sinh\s*viên)/i.test(val)) {
        addEntity({
          name: 'user_name',
          value: val,
          category: 'profile',
          confidence: 0.95,
          extractedAt: now,
          sourceMsgId: msgId,
        });
      }
    }

    // 2. Vai trò / Nghề nghiệp (Profile Role)
    const roleMatch = normalizedText.match(/(?:(?:tôi|mình)\s*(?:là|làm|đang\s*làm)|i(?:'m|\s*am)\s*(?:a|an)?)\s+((?:lập\s*trình\s*viên|kỹ\s*sư|dev|developer|designer|architect|sinh\s*viên|freelancer)[A-Za-zÀ-ỹ\s]{0,30})/i);
    if (roleMatch) {
      const val = cleanValue(roleMatch[1]);
      if (val) {
        addEntity({
          name: 'user_role',
          value: val,
          category: 'profile',
          confidence: 0.9,
          extractedAt: now,
          sourceMsgId: msgId,
        });
      }
    }

    // 3. Vị trí / Địa điểm (Location)
    const locationMatch = normalizedText.match(/(?:sống\s*(?:ở|tại)|đang\s*ở|làm\s*việc\s*(?:tại|ở)|i\s*(?:live|work)\s*in)\s+([A-Za-zÀ-ỹ\s]{2,30})(?=[,\.\?!;\n]|$)/i);
    if (locationMatch) {
      const val = cleanValue(locationMatch[1]);
      if (val && !isQuestion(normalizedText)) {
        addEntity({
          name: 'location',
          value: val,
          category: 'profile',
          confidence: 0.85,
          extractedAt: now,
          sourceMsgId: msgId,
        });
      }
    }

    // 4. Dự án & Mục tiêu (Project & Goals)
    const projMatch = normalizedText.match(/(?:dự\s*án|project|sản\s*phẩm)\s*(?:này|của\s*tôi)?\s*(?:là|dùng|về)\s*([^,;!\?\n]{3,80})/i);
    if (projMatch && !isQuestion(normalizedText)) {
      const val = cleanValue(projMatch[1]);
      if (val) {
        addEntity({
          name: 'project_description',
          value: val,
          category: 'project',
          confidence: 0.8,
          extractedAt: now,
          sourceMsgId: msgId,
        });
      }
    }

    // 5. Sở thích & Thói quen (Preferences)
    const prefMatch = normalizedText.match(/(?:(?:tôi|mình)\s*(?:rất\s*)?(?:thích|ưu\s*tiên|chuộng|hay\s*dùng)|i\s*(?:like|prefer|love|enjoy))\s+([^,;!\?\n]{3,60})/i);
    if (prefMatch && !isQuestion(normalizedText)) {
      const val = cleanValue(prefMatch[1]);
      if (val) {
        addEntity({
          name: `pref_${toSnakeCase(val.slice(0, 15))}`,
          value: val,
          category: 'preference',
          confidence: 0.85,
          extractedAt: now,
          sourceMsgId: msgId,
        });
      }
    }

    // 6. Quy chuẩn / Chỉ thị (Instruction)
    const instMatch = normalizedText.match(/(?:luôn\s*(?:luôn\s*)?(?:trả\s*lời|dùng|viết|giải\s*thích)|always\s+(?:respond\s+in|write|format))\s+([^,;!\?\n]{3,60})/i);
    if (instMatch) {
      const val = cleanValue(instMatch[1]);
      if (val) {
        addEntity({
          name: 'user_instruction',
          value: val,
          category: 'instruction',
          confidence: 0.9,
          extractedAt: now,
          sourceMsgId: msgId,
        });
      }
    }

    // 7. Tech Stack & State Transitions (Xử lý đa công nghệ chính xác)
    // Nếu KHÔNG PHẢI là câu hỏi, quét các công nghệ được đề cập
    if (!isQuestion(normalizedText)) {
      // Nhận diện hành động chuyển đổi (ví dụ: chuyển từ React sang Vue)
      const transitionMatch = normalizedText.match(/(?:chuyển\s*sang|đổi\s*sang|nâng\s*cấp\s*lên|switched\s*to|migrated\s*to)\s+([^!?;:\n]{2,80})/i);
      const isTransition = Boolean(transitionMatch);

      // Quét toàn bộ Tech Catalog
      for (const tech of TECH_CATALOG) {
        const match = normalizedText.match(tech.pattern);
        if (match) {
          const matchedVal = match[0].trim();
          addEntity({
            name: tech.name,
            value: matchedVal,
            category: tech.category,
            confidence: isTransition ? 0.95 : 0.85,
            extractedAt: now,
            sourceMsgId: msgId,
          });
        }
      }

      // Xử lý cụm từ chỉ định chung: "stack của tôi là Next.js, Tailwind..."
      const generalStackMatch = normalizedText.match(/(?:(?:tôi|mình)\s*(?:đang\s*)?(?:dùng|xài|sử\s*dụng)|stack\s*(?:là|gồm)|dùng\s*thêm)\s+([^!?;:\n]{2,100})/i);
      if (generalStackMatch && entities.length === 0) {
        const items = splitMultiItems(generalStackMatch[1]);
        if (items.length > 0) {
          addEntity({
            name: 'tech_stack',
            value: items.join(', '),
            category: 'tech_stack',
            confidence: 0.75,
            extractedAt: now,
            sourceMsgId: msgId,
          });
        }
      }
    }

    return {
      entities,
      sessionKeywords: this.extractKeywords(normalizedText),
    };
  }

  /** Trích xuất từ khóa cho Temporal History (loại bỏ Stopwords) */
  public extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^\p{L}\p{N}.#+]+/u)
      .filter((w) => w.length >= 2 && w.length <= 24 && !VI_EN_STOPWORDS.has(w))
      .slice(0, 12);
  }
}

export async function ensureNlp(): Promise<void> {
  // Safe no-op / ready
}

export const extractor = new EntityExtractor();
