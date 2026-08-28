import crypto from 'node:crypto';

export interface User {
  userId: string; // 15-character uppercase ID (e.g. A1B2C3D4E5F6G7H)
  passwordHash: string;
  createdAt: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  preview: string;
  authorId: string;
  authorMasked: string;
  hasPassword: boolean;
  password?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  fileName?: string;
  fileContent?: string;
  createdAt: number;
}

// In-Memory Database (RAM-First, persistent per runtime instance)
export const users: Map<string, User> = new Map();
export const posts: Post[] = [];
export const messages: Message[] = [];

// Helper: Mask 15-char ID for public display (e.g. A1B2...G7H)
export function maskId(id: string): string {
  if (!id || id.length < 8) return id || 'ANON';
  return `${id.slice(0, 4)}...${id.slice(-3)}`;
}

// Helper: Generate 15-character uppercase ID
export function generate15CharId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = crypto.randomBytes(15);
  for (let i = 0; i < 15; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
