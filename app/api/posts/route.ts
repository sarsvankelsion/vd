import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { posts, maskId } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'void-secret-key-2026';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 10;
    const total = posts.length;
    const totalPages = Math.ceil(total / limit) || 1;

    const start = (page - 1) * limit;
    const paginated = posts
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(start, start + limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        preview: p.preview,
        authorId: p.authorId,
        authorMasked: p.authorMasked,
        hasPassword: p.hasPassword,
        createdAt: p.createdAt,
      }));

    return NextResponse.json({
      posts: paginated,
      page,
      totalPages,
      total,
    });
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

    const { title, content, password } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    const preview = content.slice(0, 150).replace(/[#*`\n]/g, ' ').trim();
    const newPost = {
      id: Math.random().toString(36).substring(2, 10),
      title: title.trim(),
      content: content.trim(),
      preview,
      authorId: decoded.userId,
      authorMasked: maskId(decoded.userId),
      hasPassword: Boolean(password && password.trim()),
      password: password ? password.trim() : undefined,
      createdAt: Date.now(),
    };

    posts.unshift(newPost);

    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
