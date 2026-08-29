import crypto from 'node:crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  type Firestore,
} from 'firebase/firestore';

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

// In-Memory Fast Cache
export const usersCache: Map<string, User> = new Map();
export const postsCache: Post[] = [];
export const messagesCache: Message[] = [];

// Firebase Configuration with production fallback
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB4-JrPO6DzJgiSeePFEcyPCJfbQ57e3mE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'zm44-a3407.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zm44-a3407',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'zm44-a3407.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '24267145764',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:24267145764:web:0134520b0346daac74ceb1',
};

function getDb(): Firestore | null {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
  } catch (err) {
    console.error('[Firebase] Firestore init warning:', err);
    return null;
  }
}

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
// FIRESTORE PERSISTENT OPERATIONS (USERS)
// -------------------------------------------------------------
export async function getUser(userId: string): Promise<User | null> {
  const normalizedId = userId.trim().toUpperCase();
  if (usersCache.has(normalizedId)) {
    return usersCache.get(normalizedId)!;
  }

  const db = getDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'void_users', normalizedId));
      if (snap.exists()) {
        const u = snap.data() as User;
        usersCache.set(normalizedId, u);
        return u;
      }
    } catch (err) {
      console.error('[Firestore] getUser error:', err);
    }
  }
  return null;
}

export async function saveUser(user: User): Promise<void> {
  const normalizedId = user.userId.trim().toUpperCase();
  usersCache.set(normalizedId, user);

  const db = getDb();
  if (db) {
    try {
      await setDoc(doc(db, 'void_users', normalizedId), user);
    } catch (err) {
      console.error('[Firestore] saveUser error:', err);
    }
  }
}

// -------------------------------------------------------------
// FIRESTORE PERSISTENT OPERATIONS (POSTS)
// -------------------------------------------------------------
export async function savePost(post: Post): Promise<void> {
  postsCache.unshift(post);

  const db = getDb();
  if (db) {
    try {
      await setDoc(doc(db, 'void_posts', post.id), post);
    } catch (err) {
      console.error('[Firestore] savePost error:', err);
    }
  }
}

export async function getPost(postId: string): Promise<Post | null> {
  const found = postsCache.find((p) => p.id === postId);
  if (found) return found;

  const db = getDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'void_posts', postId));
      if (snap.exists()) {
        const p = snap.data() as Post;
        postsCache.unshift(p);
        return p;
      }
    } catch (err) {
      console.error('[Firestore] getPost error:', err);
    }
  }
  return null;
}

export async function listPosts(page: number = 1, limitPerPage: number = 20): Promise<{ posts: Post[]; total: number; totalPages: number }> {
  const db = getDb();
  let allPosts: Post[] = [];

  if (db) {
    try {
      const q = query(collection(db, 'void_posts'), orderBy('createdAt', 'desc'), firestoreLimit(100));
      const querySnap = await getDocs(q);
      const fetched: Post[] = [];
      querySnap.forEach((d) => fetched.push(d.data() as Post));
      if (fetched.length > 0) {
        allPosts = fetched;
        // update cache
        allPosts.forEach((p) => {
          if (!postsCache.some((cp) => cp.id === p.id)) {
            postsCache.push(p);
          }
        });
      }
    } catch (err) {
      console.error('[Firestore] listPosts error:', err);
    }
  }

  if (allPosts.length === 0) {
    allPosts = [...postsCache].sort((a, b) => b.createdAt - a.createdAt);
  }

  const total = allPosts.length;
  const totalPages = Math.ceil(total / limitPerPage) || 1;
  const start = (page - 1) * limitPerPage;
  const paginated = allPosts.slice(start, start + limitPerPage);

  return { posts: paginated, total, totalPages };
}

// -------------------------------------------------------------
// FIRESTORE PERSISTENT OPERATIONS (MESSAGES)
// -------------------------------------------------------------
export async function saveMessage(msg: Message): Promise<void> {
  messagesCache.push(msg);

  const db = getDb();
  if (db) {
    try {
      await setDoc(doc(db, 'void_messages', msg.id), msg);
    } catch (err) {
      console.error('[Firestore] saveMessage error:', err);
    }
  }
}

export async function listMessages(userId: string): Promise<Message[]> {
  const db = getDb();
  let allMsgs: Message[] = [];

  if (db) {
    try {
      const q = query(collection(db, 'void_messages'), orderBy('createdAt', 'asc'), firestoreLimit(200));
      const querySnap = await getDocs(q);
      const fetched: Message[] = [];
      querySnap.forEach((d) => fetched.push(d.data() as Message));
      if (fetched.length > 0) {
        allMsgs = fetched;
      }
    } catch (err) {
      console.error('[Firestore] listMessages error:', err);
    }
  }

  if (allMsgs.length === 0) {
    allMsgs = messagesCache;
  }

  // Filter messages involving this user
  return allMsgs.filter((m) => m.fromId === userId || m.toId === userId);
}
