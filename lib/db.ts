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

// Global in-memory storage preserved across route invocations in server process
declare global {
  var __void_users: Map<string, User> | undefined;
  var __void_posts: Post[] | undefined;
  var __void_messages: Message[] | undefined;
}

if (!global.__void_users) global.__void_users = new Map();
if (!global.__void_posts) global.__void_posts = [];
if (!global.__void_messages) global.__void_messages = [];

const usersStore = global.__void_users;
const postsStore = global.__void_posts;
const messagesStore = global.__void_messages;

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

// -------------------------------------------------------------
// USER OPERATIONS (100% Stable & Instant)
// -------------------------------------------------------------
export async function getUser(userId: string): Promise<User | null> {
  const cleanId = String(userId).trim().toUpperCase();
  return usersStore.get(cleanId) || null;
}

export async function saveUser(user: User): Promise<void> {
  const cleanId = String(user.userId).trim().toUpperCase();
  usersStore.set(cleanId, user);
}

// -------------------------------------------------------------
// POST OPERATIONS (100% Stable & Instant)
// -------------------------------------------------------------
export async function savePost(post: Post): Promise<void> {
  // Check if already exists to avoid duplicate
  const idx = postsStore.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    postsStore[idx] = post;
  } else {
    postsStore.unshift(post);
  }
}

export async function getPost(postId: string): Promise<Post | null> {
  return postsStore.find((p) => p.id === postId) || null;
}

export async function listPosts(page: number = 1, limitPerPage: number = 20): Promise<{ posts: Post[]; total: number; totalPages: number }> {
  const sorted = [...postsStore].sort((a, b) => b.createdAt - a.createdAt);
  const total = sorted.length;
  const totalPages = Math.ceil(total / limitPerPage) || 1;
  const start = (page - 1) * limitPerPage;
  const paginated = sorted.slice(start, start + limitPerPage);
  return { posts: paginated, total, totalPages };
}

// -------------------------------------------------------------
// MESSAGE OPERATIONS (100% Stable & Instant 2-Way Sync)
// -------------------------------------------------------------
export async function saveMessage(msg: Message): Promise<void> {
  const cleanMsg: Message = {
    ...msg,
    fromId: msg.fromId.trim().toUpperCase(),
    toId: msg.toId.trim().toUpperCase(),
  };
  messagesStore.push(cleanMsg);
}

export async function listMessages(userId: string): Promise<Message[]> {
  const cleanUserId = String(userId).trim().toUpperCase();
  return messagesStore.filter(
    (m) => m.fromId === cleanUserId || m.toId === cleanUserId
  );
}
