/**
 * Module 4: Context Injection & LLM Caller
 * ------------------------------------------
 * Lấy context liên quan từ RAM (Zero-Mem Store) -> dựng System Prompt tinh gọn
 * -> gọi Google Gemini API đúng 1 lần cho câu trả lời.
 *
 * Token overhead = System Prompt + Context nén + User Prompt.
 * Khâu quản lý trí nhớ: 0 token (entity extraction + calibration trên RAM).
 */

import type { MemoryEntity } from '@/lib/zero-mem/memory-store';
import type { AiModelChoice } from '@/types/chat';

export interface GeminiRequestBody {
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  systemInstruction: { parts: Array<{ text: string }> };
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/** Dựng System Prompt tinh gọn từ các entity liên quan (context nén). */
export function buildSystemPrompt(relevantEntities: MemoryEntity[]): string {
  if (relevantEntities.length === 0) {
    return [
      'Bạn là trợ lý AI có trí nhớ dài hạn về người dùng.',
      'Nếu chưa có thông tin về người dùng, hãy hỏi khéo léo để hiểu họ hơn.',
      'Trả lời bằng đúng ngôn ngữ người dùng đang dùng.',
    ].join('\n');
  }
  const lines = [
    'Bạn là trợ lý AI có trí nhớ dài hạn về người dùng. Dưới đây là các sự kiện đã ghi nhớ (mỗi dòng: tên -> giá trị).',
    'Dùng chúng một cách tự nhiên khi liên quan; đừng liệt kê lại trừ khi được yêu cầu.',
    'Nếu thông tin mới của người dùng mâu thuẫn với ghi nhớ, ưu tiên thông tin mới hơn theo thời gian.',
    'Trả lời bằng đúng ngôn ngữ người dùng đang dùng.',
    '',
    '### Bộ nhớ hiện tại:',
  ];
  for (const ent of relevantEntities) {
    lines.push(`- ${ent.name} -> ${ent.value} (cập nhật ${new Date(ent.updated_at).toISOString().slice(0, 10)})`);
  }
  return lines.join('\n');
}

/** Đếm ước lượng token (4 chars ~ 1 token) để hiển thị debug. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const MODEL_IDS: Record<AiModelChoice, string> = {
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-pro': 'gemini-2.5-pro',
};

export function modelId(choice: AiModelChoice): string {
  return MODEL_IDS[choice] ?? 'gemini-2.0-flash';
}

/**
 * Gọi Gemini API đúng 1 lần với context đã nén.
 * API key được đọc từ biến môi trường client (bắt buộc NEXT_PUBLIC_).
 */
export async function callGemini(opts: {
  apiKey: string;
  model: AiModelChoice;
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userPrompt: string;
  signal?: AbortSignal;
}): Promise<{ text: string; usage: GeminiResponse['usageMetadata'] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId(opts.model)}:generateContent?key=${opts.apiKey}`;

  const contents = [
    ...opts.history.slice(-6).map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: opts.userPrompt }] },
  ];

  const body: GeminiRequestBody = {
    contents,
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);
  }
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return { text, usage: data.usageMetadata };
}
