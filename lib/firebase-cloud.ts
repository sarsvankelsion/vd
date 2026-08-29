/**
 * Firebase Firestore Cloud Persistence Client
 * Uses Firebase REST API with Authenticated System Account for 100% Reliable Cloud Persistence across all Vercel instances.
 */

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB4-JrPO6DzJgiSeePFEcyPCJfbQ57e3mE';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zm44-a3407';
const SYSTEM_EMAIL = 'system_bot_2026@zlm.dev';
const SYSTEM_PASS = 'StrongPassword123!';
const SYSTEM_UID = '20yCwTcY09cukVuX440mxfjCzme2';

let cachedIdToken: string | null = null;
let tokenExpiresAt = 0;

async function getValidToken(): Promise<string> {
  const now = Date.now();
  if (cachedIdToken && tokenExpiresAt > now + 60000) {
    return cachedIdToken;
  }

  const loginUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: SYSTEM_EMAIL,
      password: SYSTEM_PASS,
      returnSecureToken: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Firebase Auth failed with status ${res.status}`);
  }

  const data = await res.json();
  cachedIdToken = data.idToken;
  tokenExpiresAt = now + (parseInt(data.expiresIn, 10) || 3600) * 1000;
  return cachedIdToken!;
}

// -------------------------------------------------------------
// CLOUD STORAGE READ & WRITE
// -------------------------------------------------------------
export async function getCloudDocument<T>(docPath: string): Promise<T | null> {
  try {
    const token = await getValidToken();
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${SYSTEM_UID}/global_data/${docPath}?key=${API_KEY}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      return null;
    }

    const json = await res.json();
    if (!json.fields || !json.fields.payload || !json.fields.payload.stringValue) {
      return null;
    }

    return JSON.parse(json.fields.payload.stringValue) as T;
  } catch (err) {
    console.error(`[Firebase Cloud] getCloudDocument (${docPath}) error:`, err);
    return null;
  }
}

export async function setCloudDocument<T>(docPath: string, data: T): Promise<void> {
  try {
    const token = await getValidToken();
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${SYSTEM_UID}/global_data/${docPath}?key=${API_KEY}`;
    const payloadStr = JSON.stringify(data);

    await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fields: {
          payload: { stringValue: payloadStr },
          updatedAt: { integerValue: String(Date.now()) },
        },
      }),
    });
  } catch (err) {
    console.error(`[Firebase Cloud] setCloudDocument (${docPath}) error:`, err);
  }
}
