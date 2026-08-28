import { NextRequest, NextResponse } from 'next/server';
import { posts } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = posts.find((p) => p.id === id);

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const passwordAttempt = searchParams.get('password') || '';

    if (post.hasPassword) {
      if (post.password !== passwordAttempt) {
        return NextResponse.json({
          id: post.id,
          title: post.title,
          hasPassword: true,
          locked: true,
          authorMasked: post.authorMasked,
          createdAt: post.createdAt,
        });
      }
    }

    return NextResponse.json({
      id: post.id,
      title: post.title,
      content: post.content,
      hasPassword: post.hasPassword,
      locked: false,
      authorId: post.authorId,
      authorMasked: post.authorMasked,
      createdAt: post.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
