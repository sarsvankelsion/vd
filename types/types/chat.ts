/* Types dùng chung toàn app */

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Các entity tên được trích xuất từ tin nhắn này (provenance) */
  extracted_entities?: string[];
  /** Trạng thái sync: pending (chỉ RAM) / saved (đã xuống Firestore) */
  sync_status?: 'pending' | 'saved';
}

export interface SessionInfo {
  id: string;
  title: string;
  started_at: number;
  last_message_at: number;
}

export type AiModelChoice = 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface UserSettings {
  ai_model: AiModelChoice;
  context_top_k: number;
  auto_sync: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  ai_model: 'gemini-2.0-flash',
  context_top_k: 8,
  auto_sync: true,
};

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
