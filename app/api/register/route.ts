import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUser, saveUser, generate15CharId } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'void-secret-key-2026';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
    }

    let userId = generate15CharId();
    let existing = await getUser(userId);
    while (existing) {
      userId = generate15CharId();
      existing = await getUser(userId);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = { userId, passwordHash, createdAt: Date.now() };
    await saveUser(user);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({ userId, token, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
