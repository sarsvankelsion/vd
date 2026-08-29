import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { saveMessage, listMessages } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'void-secret-key-2026';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: login required.' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired session token.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const peerId = searchParams.get('peerId')?.toUpperCase() || '';
    const currentUserId = decoded.userId.toUpperCase();

    const userMessages = await listMessages(currentUserId);

    if (!peerId) {
      const peers = new Set<string>();
      for (const m of userMessages) {
        if (m.fromId === currentUserId && m.toId) peers.add(m.toId);
        if (m.toId === currentUserId && m.fromId) peers.add(m.fromId);
      }
      return NextResponse.json({ peers: Array.from(peers) });
    }

    const chat = userMessages.filter(
      (m) =>
        (m.fromId === currentUserId && m.toId === peerId) ||
        (m.fromId === peerId && m.toId === currentUserId)
    );

    return NextResponse.json({ messages: chat });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: login required.' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired session token.' }, { status: 401 });
    }

    const { toId, content, fileName, fileContent } = await req.json();

    if (!toId || (!content && !fileContent)) {
      return NextResponse.json({ error: 'toId and message content are required.' }, { status: 400 });
    }

    const newMsg = {
      id: Math.random().toString(36).substring(2, 10),
      fromId: decoded.userId.toUpperCase(),
      toId: String(toId).trim().toUpperCase(),
      content: (content || '').trim(),
      fileName: fileName ? String(fileName).trim() : undefined,
      fileContent: fileContent ? String(fileContent).trim() : undefined,
      createdAt: Date.now(),
    };

    await saveMessage(newMsg);

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
