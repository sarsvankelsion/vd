import crypto from 'node:crypto';
import { getCloudDocument, setCloudDocument } from './firebase-cloud';

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

// In-memory hot cache
declare global {
  var __cached_users: Map<string, User> | undefined;
  var __cached_posts: Post[] | undefined;
  var __cached_messages: Message[] | undefined;
}

if (!global.__cached_users) global.__cached_users = new Map();
if (!global.__cached_posts) global.__cached_posts = [];
if (!global.__cached_messages) global.__cached_messages = [];

const usersCache = global.__cached_users;
let postsCache = global.__cached_posts;
let messagesCache = global.__cached_messages;

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
// USER OPERATIONS (100% Shared Cloud Persistence)
// -------------------------------------------------------------
export async function getUser(userId: string): Promise<User | null> {
  const cleanId = String(userId).trim().toUpperCase();
  if (usersCache.has(cleanId)) {
    return usersCache.get(cleanId)!;
  }

  const cloudUsers = await getCloudDocument<Record<string, User>>('users_table');
  if (cloudUsers && cloudUsers[cleanId]) {
    usersCache.set(cleanId, cloudUsers[cleanId]);
    return cloudUsers[cleanId];
  }

  return null;
}

export async function saveUser(user: User): Promise<void> {
  const cleanId = String(user.userId).trim().toUpperCase();
  usersCache.set(cleanId, user);

  const cloudUsers = (await getCloudDocument<Record<string, User>>('users_table')) || {};
  cloudUsers[cleanId] = user;
  await setCloudDocument('users_table', cloudUsers);
}

// -------------------------------------------------------------
// POST OPERATIONS (100% Shared Cloud Persistence)
// -------------------------------------------------------------
export async function savePost(post: Post): Promise<void> {
  const cloudPosts = (await getCloudDocument<Post[]>('posts_table')) || [];
  const idx = cloudPosts.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    cloudPosts[idx] = post;
  } else {
    cloudPosts.unshift(post);
  }
  postsCache = cloudPosts;
  await setCloudDocument('posts_table', cloudPosts);
}

export async function getPost(postId: string): Promise<Post | null> {
  const cloudPosts = (await getCloudDocument<Post[]>('posts_table')) || postsCache;
  return cloudPosts.find((p) => p.id === postId) || null;
}

export async function listPosts(page: number = 1, limitPerPage: number = 20): Promise<{ posts: Post[]; total: number; totalPages: number }> {
  const cloudPosts = (await getCloudDocument<Post[]>('posts_table')) || postsCache;
  const sorted = [...cloudPosts].sort((a, b) => b.createdAt - a.createdAt);
  const total = sorted.length;
  const totalPages = Math.ceil(total / limitPerPage) || 1;
  const start = (page - 1) * limitPerPage;
  const paginated = sorted.slice(start, start + limitPerPage);
  return { posts: paginated, total, totalPages };
}

// -------------------------------------------------------------
// MESSAGE OPERATIONS (100% Shared Cloud Persistence & 2-Way Realtime)
// -------------------------------------------------------------
export async function saveMessage(msg: Message): Promise<void> {
  const cleanMsg: Message = {
    ...msg,
    fromId: msg.fromId.trim().toUpperCase(),
    toId: msg.toId.trim().toUpperCase(),
  };

  const cloudMessages = (await getCloudDocument<Message[]>('messages_table')) || [];
  cloudMessages.push(cleanMsg);
  messagesCache = cloudMessages;
  await setCloudDocument('messages_table', cloudMessages);
}

export async function listMessages(userId: string): Promise<Message[]> {
  const cleanUserId = String(userId).trim().toUpperCase();
  const cloudMessages = (await getCloudDocument<Message[]>('messages_table')) || messagesCache;
  return cloudMessages.filter(
    (m) => m.fromId === cleanUserId || m.toId === cleanUserId
  );
}
